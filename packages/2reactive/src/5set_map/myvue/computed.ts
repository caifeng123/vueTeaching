/**
 * @file: computed 计算属性, 当值被使用时会自动计算(执行依赖)
 * @author: caifeng01
 */

import {effect} from "./effect";
import {track, trigger} from "./utils";

/**
 * 被读取时调用副作用获取，计算属性,即effect延时执行
 */
export const computed = (fn: () => any) => {
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
