/**
 * @file: effect 响应式自动收集依赖, 并在依赖变化时执行
 * @author: caifeng01
 */

import {activeStack, EffectFnType, EffectOptions} from "./utils";

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
export const effect = (fn: () => any, options: EffectOptions = {}) => {
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
