/**
 * @file watch添加过期事件
 * @author caifeng01
 */

import {watch, obj} from "./effect";

const promises = [
    new Promise<string>((resolve, reject) => {
        setTimeout(() => {
            resolve("第一次结果");
        }, 3000);
    }),
    new Promise<string>((resolve, reject) => {
        setTimeout(() => {
            resolve("第二次结果");
        }, 1000);
    }),
];

let index = 0;

watch(
    () => obj.text,
    async (newValue, oldValue) => {
        const temp = await promises[index++];
        document.body.innerText = temp;
    }
);
