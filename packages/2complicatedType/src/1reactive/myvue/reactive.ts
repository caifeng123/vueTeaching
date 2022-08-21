/**
 * @file: reactive 包裹对象生成响应式对象
 * @author: caifeng01
 */

import {ITERATE_KEY, TriggerType, track, trigger} from "./utils";

// @add 提供对复杂类型包装的能力, 自由调用提供对应能力
export const reactive = (obj: Record<string | symbol, any>) => {
    return new Proxy(obj, {
        // @add a.b
        // 底层调用[[Get]]因此此处对get进行劫持
        get(target, key, receiver) {
            // @add 当访问raw属性时, 直接返回原对象target, receiver - 代理对象
            // 添加raw属性将receiver[proxy对象]与target[当前目标]进行挂钩, 使得receiver.raw === target
            if (key === "raw") {
                return target;
            }
            track(target, key);
            return Reflect.get(target, key, receiver);
        },
        // @add a.b = c - 赋值操作
        // 底层调用[[Set]]
        set(target, key, value, receiver) {
            const type = Object.prototype.hasOwnProperty.call(target, key)
                ? TriggerType.SET
                : TriggerType.ADD;

            const oldValue = target[key];
            const res = Reflect.set(target, key, value, receiver);

            // @add 用于隔绝继承带来的重复调用, 判断当前proxy(receiver)的原始对象是否就是当前的target, 若不是则将继承导致的副作用屏蔽掉
            if (target === receiver.raw) {
                // @add 老值与新值不等时才触发副作用, 减少无效副作用
                // 为处理 NaN !== NaN 需要单独处理
                if (
                    oldValue !== value &&
                    (oldValue === oldValue || value === value)
                ) {
                    trigger(target, key, type);
                }
            }
            return res;
        },
        // @add a in b - 存在
        // 底层调用[[hasProperty]]
        has(target, key) {
            track(target, key);
            return Reflect.has(target, key);
        },
        // @add for(let i in obj) - for in循环
        // 底层调用EnumerateObjectProperties(obj) 内部会调用ownKeys获取自身键
        ownKeys(target) {
            // @add 追踪迭代器的key, 当迭代器变化时需要触发ITERATE_KEY对应函数, 因此此处添加追踪
            track(target, ITERATE_KEY);
            return Reflect.ownKeys(target);
        },
        // @add delete a.b - 劫持删除操作
        // 底层调用[[Delete]]
        deleteProperty(target, key) {
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
