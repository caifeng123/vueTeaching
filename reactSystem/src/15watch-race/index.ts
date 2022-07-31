/**
 * @file watch添加过期事件
 * @author caifeng01
 */

import {watch, obj} from "./effect";

const promises = [
    new Promise<string>((resolve, reject) => {
        setTimeout(() => {
            resolve("第一次请求的结果,理论应该显示第二次");
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
    async (newValue, oldValue, onInvalidate) => {
        let expire = false;
        onInvalidate(() => (expire = true));
        const temp = await promises[index++];
        if (!expire) {
            document.body.innerText = temp;
        }
    }
);

obj.text = "1";
obj.text = "1";
