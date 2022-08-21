import {DataType, DepsMap, EffectFnType} from "./type";

// @add 劫持迭代器用的key, 桶中作为迭代对象专用迭代key
export const ITERATE_KEY = Symbol();

/**
 * @describe 依赖桶，存储所有数据&所有依赖关系
 * weakMap: <[target对象]: map<[key路径]: Set<EffectFnType>[]>>
 * @set track添加, cleanup删除
 * @use 依赖项被trigger
 */
export const bucket = new WeakMap<DataType, DepsMap>();

// 活跃函数栈
export let activeStack: EffectFnType[] = [];
