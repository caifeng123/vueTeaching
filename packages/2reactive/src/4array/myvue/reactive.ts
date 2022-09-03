/**
 * @file: reactive 包裹对象生成响应式对象
 * 使用工厂函数
 * shallowReactive - 浅响应 与 reactive - 深响应区分
 * readonly只读 与 reactive响应式区分[shallowReadonly只读浅响应]
 * @author: caifeng01
 */

import {
    ITERATE_KEY,
    TriggerType,
    track,
    trigger,
    DataType,
    reactiveMap,
    ArrayCustomerFunc,
} from "./utils";

// 提供对复杂类型包装的能力, 自由调用提供对应能力
// isShallow - 深浅响应区分
// isReadonly - 只读区分
const createReactive = (
    obj: DataType,
    {isShallow = false, isReadonly = false} = {}
) => {
    return new Proxy(obj, {
        // a.b
        // 底层调用[[Get]]因此此处对get进行劫持
        get(target, key, receiver) {
            // 当访问raw属性时, 直接返回原对象target, receiver - 代理对象
            // 添加raw属性将receiver[proxy对象]与target[当前目标]进行挂钩, 使得receiver.raw === target
            if (key === "raw") {
                return target;
            }

            // 对部分数组方法调用进行拦截, 走自定义方法 - 作用详情看 ArrayCustomerFunc
            if (
                Array.isArray(target) &&
                ArrayCustomerFunc.hasOwnProperty(key)
            ) {
                return Reflect.get(ArrayCustomerFunc, key, receiver);
            }

            // 对获取值进行判断, 若是shallow响应则直接返回不做追踪
            const res = Reflect.get(target, key, receiver);

            // 如果当前非只读, 则进行追踪数据
            // @add 对于数组的for of循环来说, 会调用执行Symbol.iterator属性,因此此处会被阅读读取,此处避免掉symbol的追踪
            if (!isReadonly && typeof key !== "symbol") {
                track(target, key);
            }

            if (isShallow) {
                return res;
            }
            // 当前结果不是shallow且是对象，则需要递归响应式
            // 当判断是 非浅只读时进行深递归操作
            if (typeof res === "object" && res !== null) {
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        },
        // a.b = c - 赋值操作
        // 底层调用[[Set]]
        set(target, key, value, receiver) {
            // 判断当是只读时, 打印警告信息并不做修改
            if (isReadonly) {
                console.warn(`属性 ${key as string} 是只读的`);
                return true;
            }
            const type = Array.isArray(target)
                ? target.length <= Number(key)
                    ? TriggerType.ADD
                    : TriggerType.SET
                : Object.prototype.hasOwnProperty.call(target, key)
                ? TriggerType.SET
                : TriggerType.ADD;

            const oldValue = target[key];
            const res = Reflect.set(target, key, value, receiver);

            // 用于隔绝继承带来的重复调用, 判断当前proxy(receiver)的原始对象是否就是当前的target, 若不是则将继承导致的副作用屏蔽掉
            if (target === receiver.raw) {
                // 老值与新值不等时才触发副作用, 减少无效副作用
                // 为处理 NaN !== NaN 需要单独处理
                if (
                    oldValue !== value &&
                    (oldValue === oldValue || value === value)
                ) {
                    trigger(target, key, type, value);
                }
            }
            return res;
        },
        // a in b - 存在
        // 底层调用[[hasProperty]]
        has(target, key) {
            track(target, key);
            return Reflect.has(target, key);
        },
        // for(let i in obj) - for in循环
        // 底层调用EnumerateObjectProperties(obj) 内部会调用ownKeys获取自身键
        // @add 当数组使用for in时,需要追踪新增与length = 0的情况, 因此需要追踪"length"key
        ownKeys(target) {
            // 追踪迭代器的key, 当迭代器变化时需要触发ITERATE_KEY对应函数, 因此此处添加追踪
            track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
            return Reflect.ownKeys(target);
        },
        // delete a.b - 劫持删除操作
        // 底层调用[[Delete]]
        deleteProperty(target, key) {
            // 判断当是只读时, 打印警告信息并不做修改
            if (isReadonly) {
                console.warn(`属性 ${key as string} 是只读的`);
                return true;
            }
            const hasKey = Object.prototype.hasOwnProperty.call(target, key);
            const res = Reflect.deleteProperty(target, key);

            // 只有当key存在 & 删除成功时触发删除effect
            if (hasKey && res) {
                trigger(target, key, TriggerType.DELETE);
            }
            return res;
        },
    });
};

// 递归式生成响应式对象 - 深响应
export const reactive = (obj: DataType) => {
    /*
     * 目的是对于arr.includes(arr[0])情况
     * arr[0]会生成响应式 proxy1
     * arr.includes 访问又会递归生成arr[0]的响应式 proxy2
     * 两者不同因此永远返回 false
     */
    if (reactiveMap.has(obj)) {
        return reactiveMap.get(obj);
    }
    const proxyObj = createReactive(obj);
    reactiveMap.set(obj, proxyObj);
    return proxyObj;
};

// 只对第一层生成响应式对象 - 浅响应
export const shallowReactive = (obj: DataType) =>
    createReactive(obj, {isShallow: true});

// 只读深响应式
export const readonly = (obj: DataType) =>
    createReactive(obj, {isReadonly: true});

// 只读浅响应式
export const shallowReadonly = (obj: DataType) =>
    createReactive(obj, {isReadonly: true, isShallow: true});
