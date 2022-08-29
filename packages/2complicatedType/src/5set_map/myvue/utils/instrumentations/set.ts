/**
 * @file 重写Set的查找&改值方法
 * @author caifeng01
 */

import {ITERATE_KEY, track, TriggerType, trigger, wrap} from "..";

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
        track(raw, ITERATE_KEY);
        raw.forEach((item) => callback.call(thisArg, wrap(item), this));
    },
};
