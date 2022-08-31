/**
 * @file 常用工具函数
 * @author caifeng01
 */

import {Type} from "./type";
import {reactive} from "..";

export const getType = (obj: any) =>
    Object.prototype.toString.call(obj).match(/(?<=\w+\s)\w+/g)[0] as Type;

export const wrap = (val) => (typeof val === "object" ? reactive(val) : val);
