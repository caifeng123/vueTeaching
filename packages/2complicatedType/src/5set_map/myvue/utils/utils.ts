import {reactive} from "..";
export const getType = (obj: any) =>
    Object.prototype.toString.call(obj).match(/(?<=\w+\s)\w+/g)[0];

export const wrap = (val) => (typeof val === "object" ? reactive(val) : val);
