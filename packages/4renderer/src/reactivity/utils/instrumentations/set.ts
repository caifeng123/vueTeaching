/**
 * @file 重写Set的查找&改值方法
 * @author caifeng01
 */

import {ITERATE_KEY, track, TriggerType, trigger, wrap} from "..";

function iterationMethod() {
    const raw = this.raw;
    const itr = raw[Symbol.iterator]();
    track(raw, ITERATE_KEY);
    return {
        next() {
            const {value, done} = itr.next();
            return {
                // 用作包裹的原因是将子数据变为响应式
                value: wrap(value),
                done,
            };
        },
        [Symbol.iterator]() {
            return this;
        },
    };
}

export const SetCustomFunc = {
    add<T>(key: T) {
        const target = this.raw as Set<T>;
        const hasValue = target.has(key);
        const res = target.add(key);
        if (!hasValue) {
            trigger(target, key, TriggerType.ADD);
        }
        return res;
    },
    delete<T>(key: T) {
        const target = this.raw as Set<T>;
        const hasValue = target.has(key);
        const res = target.delete(key);
        if (hasValue) {
            trigger(target, key, TriggerType.DELETE);
        }
        return res;
    },
    forEach(callback, thisArg) {
        const raw = this.raw;
        // 每次调用都会和size挂钩追踪变化 - 增删导致的size变化 重新调用forEach
        track(raw, ITERATE_KEY);
        // 触发原对象的forEach函数, 内部对象也设定为响应式
        raw.forEach((item) => callback.apply(thisArg, [wrap(item), this]));
    },
    [Symbol.iterator]: iterationMethod,
    keys: iterationMethod,
    values: iterationMethod,
    // set的entries和[Symbol.iterator]不同 是键值对形式 key value都是同一个指向
    entries() {
        const raw = this.raw;
        const itr = raw[Symbol.iterator]();
        track(raw, ITERATE_KEY);
        return {
            next() {
                const {value, done} = itr.next();
                return {
                    value: value?.map(wrap),
                    done,
                };
            },
            [Symbol.iterator]() {
                return this;
            },
        };
    },
};
