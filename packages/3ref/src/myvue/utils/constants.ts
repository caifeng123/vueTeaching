/**
 * @file 静态公用数据
 * @author caifeng01
 */

import {DepsMap, EffectFnType} from "./type";

// 劫持迭代器用的key, 桶中作为迭代对象专用迭代key
export const ITERATE_KEY = Symbol();

/**
 * 劫持迭代器用的key, 桶中作为Map keys()专用迭代key
 */
export const MAP_KEYS_ITERATE_KEY = Symbol();

/**
 * @describe 依赖桶，存储所有数据&所有依赖关系
 * weakMap: <[target对象]: map<[key路径]: Set<EffectFnType>[]>>
 * @set track添加, cleanup删除
 * @use 依赖项被trigger
 */
export const bucket = new WeakMap<any, DepsMap>();

// 活跃函数栈
export let activeStack: EffectFnType[] = [];

/**
 * 存储响应式map, 防止相同索引重复生成多个响应式对象
 * 目的是对于arr.includes(arr[0])情况
 * arr[0]会生成响应式 proxy1
 * arr.includes 访问又会递归生成arr[0]的响应式 proxy2
 * 两者不同因此永远返回 false
 */
export const reactiveMap = new Map();

/**
 * 用来存储公用变量的索引对象
 * esmodule 形式的对象是传递索引区别于 commonjs复制对象 因此可以同步数据用
 */
export const PUBLIC_MAP = {
    shouldTrack: true,
};
