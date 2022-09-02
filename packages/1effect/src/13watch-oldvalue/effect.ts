/**
 * @file watch自定义函数中能以新旧值作为参数使用
 * @author caifeng01
 */

// 基本数据
const data = {
    go: true,
    text: "cc123nice",
};

type EffectOptions = {
    lazy?: boolean;
    scheduler?: (fn: () => any) => void;
};

type EffectFnType = {
    (): any;
    deps: DepsSet[];
    options: EffectOptions;
};

type DepsSet = Set<EffectFnType>;

type DepsMap = Map<string | symbol, DepsSet>;

type DataType = Record<string | symbol, any>;

type WatchValueMapType<T> = {
    new?: T;
    old?: T;
};

/**
 * @describe 依赖桶，存储所有数据&所有依赖关系
 * weakMap: <[target对象]: map<[key路径]: Set<EffectFnType>[]>>
 * @set track添加, cleanup删除
 * @use 依赖项被trigger
 */
const bucket = new WeakMap<DataType, DepsMap>();

// 活跃函数栈
let activeStack: EffectFnType[] = [];

/**
 * @describe 收集依赖, 组成bucket依赖桶, 添加依赖set到活跃函数依赖deps中。因为此前会调用clean将依赖函数deps清空
 * @use proxy被get时调用
 */
const track = (target: DataType, key: string | symbol) => {
    if (!activeStack.length) return;
    let depsMap = bucket.get(target);
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map() as DepsMap));
    }
    let depsSet = depsMap.get(key);
    if (!depsSet) {
        depsMap.set(key, (depsSet = new Set() as DepsSet));
    }
    depsSet.add(activeStack[0]);
    activeStack[0].deps.push(depsSet);
};

/**
 * @describe 触发相关依赖，添加了避免set时重复添加当前effect事件，导致无效递归调用
 * @use proxy被set时调用
 */
const trigger = (target: DataType, key: string | symbol) => {
    const depsMap = bucket.get(target);

    if (!depsMap) {
        return;
    }
    const depsSet = depsMap.get(key);

    /**
     * Q: 为什么要重新生成一个set去迭代执行，不直接执行
     * A: 因为在执行函数时,会重新收集依赖，像set中添加，导致循环一直继续且重复。使用新Set迭代使得更新原set不导致新set不停止
     * Q: 为什么需要循环且不记录当前活跃函数（栈顶元素即为活跃函数）
     * A: 因为对于 i++ 情况来说, 先回取值调用 track 再调用 trigger 执行赋值操作，当前的活跃函数就是 i++ 操作，不应再次被加入副作用队列执行。否则会死循环
     */
    const effectsToRun = new Set() as DepsSet;
    for (let item of depsSet) {
        if (item !== activeStack[0]) {
            effectsToRun.add(item);
        }
    }
    // 触发调度器,当用户自定义了调度器则交给用户调用副作用，否则直接调用副作用
    effectsToRun.forEach((fn) => {
        if (fn.options.scheduler) {
            fn.options.scheduler(fn);
        } else {
            fn();
        }
    });
};

const obj = new Proxy(data, {
    get(target, key) {
        track(target, key);
        return target[key];
    },
    set(target, key, value) {
        target[key] = value;
        trigger(target, key);
        return true;
    },
});

// 被trigger后, 清除依赖中的自己，防止重复调用
const cleanup = (effectFn: EffectFnType) => {
    /**
     * Q: 为什么不直接length = 0 清空数组，就会被回收了，为什么需要循环删除？
     * A: 通过查看deps类型发现存储的是DepsSet数组, 这个是被存在依赖桶里的。依赖桶是存储所有依赖的桶, 在trigger被取出调用。若不清则会重复调用自己。
     * Q: 清除函数何时被调用？
     * A: 当被trigger后, 由于自身还在自己的deps中, 需要清除否则会重复调用
     */
    effectFn.deps.forEach((fn) => fn.delete(effectFn));
    effectFn.deps.length = 0;
};

/**
 * effect注册事件[响应式依赖事件], 类似react的useEffect自动添加依赖项，添加options参数接收
 */
const effect = (fn: () => any, options: EffectOptions = {}) => {
    // 添加自定义effect调用执行后return结果
    const effectFn: EffectFnType = () => {
        cleanup(effectFn);
        activeStack.unshift(effectFn);
        const res = fn();
        activeStack.shift();
        return res;
    };
    effectFn.deps = [];
    effectFn.options = options;
    // 若options中指定lazy则不立即触发，并将其返回给用户调用，手动触发
    !effectFn.options.lazy && effectFn();
    return effectFn;
};

/**
 * 被读取时调用副作用获取，计算属性,即effect延时执行
 */
const computed = (fn: () => any) => {
    // 用作缓存数据
    let dirty = true;
    let val = null;

    const effectFn = effect(fn, {
        lazy: true,
        // 添加调度器，当调度器被调用时说明依赖项变化了被调用，因此需要重新缓存
        scheduler: () => {
            dirty = true;
            // 手动触发temp.value 的所有依赖
            trigger(temp, "value");
        },
    });

    const temp = {
        get value() {
            // 只有需要被缓存时在调用
            if (dirty) {
                val = effectFn();
                dirty = false;
            }
            // 手动添加 temp.value 依赖, 当依赖项变化时才能实时相应自身发生变化
            track(temp, "value");
            return val;
        },
    };

    return temp;
};

/**
 * watch监听obj内的所有数据,变化则会调用fn
 * @tips 对于effect来说, 内部的取值引用都会被记录。但要是没有引用则不会，因此需要在effect中递归调用所有数据
 */
const watch = (source: any, fn: (newValue, oldValue) => any) => {
    // 递归调用所有引用值, seen存放所有引用过的值
    // 普通值和循环引用无需被调用（ps: 否则会无限循环溢出）
    const traverse = (source: any, seen = new Set()) => {
        if (typeof source !== "object" || !source || seen.has(source)) {
            return;
        }
        seen.add(source);
        for (let key in source) {
            traverse(source[key], seen);
        }
        return source;
    };

    // 接受的第一个参数可能为函数也可能是非函数,非函数需要递归引用。否则是函数形式直接调用即可
    const getter =
        typeof source === "function" ? source : () => traverse(source);

    // @add 设置值存储,理论上这边类型应该是泛型，但为了省事直接any了
    // 存有先前一次的值和新的值
    let value = {} as WatchValueMapType<any>;
    // 使用traverse递归调用obj, 当被引用到的值(所有值)变了调用scheduler
    // @add 变成lazy手动调用执行，通过值专门存储对应的
    const lazyEffect = effect(() => getter(), {
        lazy: true,
        scheduler: () => {
            // @add 手动调用进行获取新值
            value.new = lazyEffect();
            fn(value.old, value.new);
            // @add 新值变为老值下次使用
            value.old = value.new;
        },
    });

    // @add 首次直接运行，手动调用懒加载函数将得到的值存储到老值中
    value.old = lazyEffect();
};

export {obj, effect, computed, watch};
