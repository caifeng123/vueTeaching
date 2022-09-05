/**
 * @file 常用工具函数
 * @author caifeng01
 */

import {Type} from "./type";
import {reactive} from "..";

/**
 * 判断Type类型，对应 ${Type} 中类型
 */
export const getType = (obj: any) =>
    Object.prototype.toString.call(obj).match(/(?<=\w+\s)\w+/g)[0] as Type;

export const wrap = (val) => (typeof val === "object" ? reactive(val) : val);

/**
 * 判断新旧两值是否相同，包含处理 NaN !== NaN 情况
 */
export const isChanged = (oldValue, newValue) =>
    oldValue !== newValue && (oldValue === oldValue || newValue === newValue);
