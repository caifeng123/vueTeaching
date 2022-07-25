/**
 * @file 添加lazy参数,可接收effect返回值手动调用执行，且得到调用返回值
 * @author caifeng01
 */

import {computed, obj, effect} from "./effect";

const res = computed(() => {
    console.log("----");
    return obj.go + obj.text;
});

document.body.innerText = `看日志中打印
此时已经可以正确收集了
`;

effect(() => {
    console.log(res.value);
});

setInterval(() => {
    obj.text = obj.text + "0";
}, 1500);
