/**
 * @file 重写Map的查找&改值方法
 * @author caifeng01
 */

import {ITERATE_KEY, TriggerType, trigger, track, wrap} from "..";
import {reactive} from "../..";

function iterationMethod() {
    const raw = this.raw;
    const iterator = raw[Symbol.iterator]();
    track(raw, ITERATE_KEY);
    return {
        next() {
            const {value, done} = iterator.next();
            return {
                value: value?.map(wrap),
                done,
            };
        },
        [Symbol.iterator]() {
            return this;
        },
    };
}

export const MapCustomFunc = {
    set(key, newValue) {
        const target = this.raw;
        const has = target.has(key);
        const oldValue = target.get(key);
        const res = target.set(key, newValue?.raw ?? newValue);

        // 当不存在时 触发新增
        if (!has) {
            trigger(target, key, TriggerType.ADD);
        }
        // 当存在且值被改变(新旧非null)
        else if (
            oldValue !== newValue &&
            (oldValue === oldValue || newValue === newValue)
        ) {
            trigger(target, key, TriggerType.SET);
        }
        return res;
    },
    get<K, V>(key: K) {
        const target = this.raw as Map<K, V>;
        const has = target.has(key);
        track(target, key);
        if (has) {
            const value = target.get(key);
            // 对map递归生成响应式对象，即对Map<string, obj> 修改obj也会响应式
            return typeof value === "object" ? reactive(value) : value;
        }
        return;
    },
    forEach(callback, thisArg) {
        const raw = this.raw;
        // 每次调用都会和size挂钩追踪变化 - 增删导致的size变化 重新调用forEach
        track(raw, ITERATE_KEY);
        // 触发原对象的forEach函数
        raw.forEach((value, key) =>
            callback.apply(thisArg, [wrap(value), wrap(key), this])
        );
    },
    [Symbol.iterator]: iterationMethod,
    entries: iterationMethod,
};
