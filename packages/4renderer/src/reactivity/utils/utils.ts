/**
 * @file 常用工具函数
 * @author caifeng01
 */

import {reactive} from "..";

export const wrap = (val) => (typeof val === "object" ? reactive(val) : val);
