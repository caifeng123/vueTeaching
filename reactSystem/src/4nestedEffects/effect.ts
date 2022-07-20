/**
 * @file effect函数嵌套时，会导致 activeEffect 错乱因为只有一个指针。对于递归嵌套来说需要处理完内部函数后返回执行上层函数
 * 因此需要一个栈去记录当前执行的函数, activeEffect指向栈顶元素
 * @author caifeng01
 */

// 基本数据
const data = {
	go: true,
	text: "cc123nice",
};

type DepsSet = Set<() => void>;

type DepsMap = Map<string | symbol, DepsSet>;

type DataType = Record<string | symbol, any>;

type EffectFnType = {
	(): void;
	deps: DepsSet[];
};

/**
 * @describe 依赖桶，存储所有数据&所有依赖关系
 * weakMap: <[target对象]: map<[key路径]: Set<EffectFnType>[]>>
 * @set track添加, cleanup删除
 * @use 依赖项被trigger
 */
const bucket = new WeakMap<DataType, DepsMap>();

/**
 * @describe 当前的活跃函数 @add 依赖集合DepsSet数组存储相关的effect函数
 * @set 注册effect函数时覆盖 @change 依赖项被注册 | 依赖项被trigger
 * @use track调用 -> 收集依赖项到bucket依赖桶中
 */
let activeEffect: EffectFnType | null = null;

// 活跃函数栈
let activeStack: EffectFnType[] = [];

/**
 * @describe 收集依赖, 组成bucket依赖桶 @add 添加依赖set到活跃函数依赖deps中。因为此前会调用clean将依赖函数deps清空
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
 * @describe 触发相关依赖
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
	 */
	const effectsToRun = new Set(depsSet);
	effectsToRun.forEach((fn) => fn());
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

// effect注册事件[响应式依赖事件], 类似react的useEffect自动添加依赖项
const effect = (fn: () => void) => {
	const effectFn: EffectFnType = () => {
		cleanup(effectFn);
		activeStack.unshift(effectFn);
		fn();
		activeStack.shift();
	};
	effectFn.deps = [];
	effectFn();
};

export {effect, obj};
