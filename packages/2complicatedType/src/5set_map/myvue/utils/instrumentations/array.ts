/**
 * @file 重写Array的查找&改值方法
 * @author caifeng01
 */

import {PUBLIC_MAP} from "..";

const FIND_FUNC = [
    {
        funcName: "includes",
        failValue: false,
    },
    {
        funcName: "indexOf",
        failValue: -1,
    },
    {
        funcName: "lastIndexOf",
        failValue: -1,
    },
];

const CHANGE_FUNC = ["push", "pop", "unshift", "shift", "splice"];

/**
 * 重写Array查询原型方法, 目的是为了proxy对象能直接检索到原对象数据
 * 例如:
 * const obj = {1: 2};
 * const objArr = reactive([obj]);
 * objArr.includes(obj) // 不重写则为false
 * 因为objArr是proxy对象, 内部对象会被递归成reactive,因此只能找到被reactive的obj proxy对象，无法通过直接includes找到原对象
 * 因此我们需要重写, 在找不到时会去找raw原生对象
 */
const FindFuncs = FIND_FUNC.reduce((all, {funcName, failValue}) => {
    const originMethod = Array.prototype[funcName];
    all[funcName] = function (...args) {
        let res = originMethod.apply(this, args);
        if (res === failValue) {
            res = originMethod.apply(this.raw, args);
        }
        return res;
    };
    return all;
}, {});

/**
 * 重写Array修改原型方法, 目的是为了在调用时规避掉对length的读取
 * 例如:
 * effectA: effect(() => {arr.push(1)});
 * effectB: effect(() => {arr.push(1)});
 * 写两次时会互相影响, 出现栈溢出。因为arr.push内部会读取length, 本身实现又会set length 导致effectA与effectB的get和set都会触发副作用
 */
const ChangeFuncs = CHANGE_FUNC.reduce((all, funcName) => {
    const originMethod = Array.prototype[funcName];
    all[funcName] = function (...args) {
        PUBLIC_MAP.shouldTrack = false;
        let res = originMethod.apply(this, args);
        PUBLIC_MAP.shouldTrack = true;
        return res;
    };
    return all;
}, {});

export const ArrayCustomFunc = {...ChangeFuncs, ...FindFuncs};
