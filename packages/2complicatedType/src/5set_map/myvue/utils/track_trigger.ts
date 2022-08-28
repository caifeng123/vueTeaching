/**
 * @file track 收集依赖 & trigger 触发依赖
 * @author caifeng01
 */

import {DepsMap, DepsSet, TriggerType} from "./type";
import {activeStack, bucket, ITERATE_KEY, PUBLIC_MAP} from "./constants";

/**
 * @describe 收集依赖, 组成bucket依赖桶, 添加依赖set到活跃函数依赖deps中。因为此前会调用clean将依赖函数deps清空
 * @use proxy被get时调用
 */
export const track = (target, key) => {
    if (!activeStack.length) return;
    // shouldTrack 对于数组push、pop等操作数组的方法 要避免掉读取length操作引发的无限循环
    if (!PUBLIC_MAP.shouldTrack) return;
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
export const trigger = (target, key, type?: TriggerType, newValue?) => {
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
    depsSet?.forEach((item) => {
        if (item !== activeStack[0]) {
            effectsToRun.add(item);
        }
    });

    // 对象赋值当触发类型为新增或删除时,需要触发迭代器函数
    if (type !== TriggerType.SET) {
        // 添加迭代器的effect触发
        const iterateSet = depsMap.get(ITERATE_KEY);
        iterateSet?.forEach((item) => {
            if (item !== activeStack[0]) {
                effectsToRun.add(item);
            }
        });
    }

    // 数组类型新增项时, 需要触发和length相关副作用, 因为length将会增加
    if (type === TriggerType.ADD && Array.isArray(target)) {
        const iterateSet = depsMap.get("length");
        iterateSet?.forEach((item) => {
            if (item !== activeStack[0]) {
                effectsToRun.add(item);
            }
        });
    }

    // 数组length被修改时, 触发所有大于等于length的下标项的副作用
    if (Array.isArray(target) && key === "length") {
        depsMap.forEach((set, key) => {
            if (Number(key) >= newValue) {
                set.forEach((item) => {
                    if (item !== activeStack[0]) {
                        effectsToRun.add(item);
                    }
                });
            }
        });
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
