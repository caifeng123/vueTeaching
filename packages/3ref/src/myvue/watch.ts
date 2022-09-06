/**
 * @file: watch监听obj内的所有数据,变化则会调用fn 可添加immediate表示立即执行
 * @tips 对于effect来说, 内部的取值引用都会被记录。但要是没有引用则不会，因此需要在effect中递归调用所有数据
 * @author: caifeng01
 */

import {effect} from "./effect";
import {WatchOptions, WatchValueMapType} from "./utils";

export const watch = (
    source: any,
    fn: (newValue, oldValue, onInvalidate) => any,
    option: WatchOptions = {}
) => {
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

    // 设置值存储,理论上这边类型应该是泛型，但为了省事直接any了
    // 存有先前一次的值和新的值
    let value = {} as WatchValueMapType<any>;

    // 存储上次的清除函数, 在下次被effect执行时调用
    let clean = null;

    // 记录用户的过期函数
    const onInvalidate = (fn) => {
        clean = fn;
    };

    // 抽离调度函数, 动态调用手动执行
    const scheduler = () => {
        // 手动调用进行获取新值
        value.new = lazyEffect();
        // 添加过期数据处理, 下次调用前先执行上次的过期函数，防止多次执行
        clean?.();
        fn(value.old, value.new, onInvalidate);
        // 新值变为老值下次使用
        value.old = value.new;
    };

    // 使用traverse递归调用obj, 当被引用到的值(所有值)变了调用scheduler
    // 变成lazy手动调用执行，通过值专门存储对应的
    const lazyEffect = effect(() => getter(), {
        lazy: true,
        scheduler,
    });

    if (option.immediate) {
        scheduler();
    } else {
        // 首次直接运行，手动调用懒加载函数将得到的值存储到老值中
        value.old = lazyEffect();
    }
};
