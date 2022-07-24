/**
 * @file 内部依赖变化 demo
 * @author caifeng01
 */

import {effect, obj} from "./effect";

effect(() => {
    document.body.innerText = obj.go ? obj.text : "nop";
});
let index = 0;
obj.text = `${obj.text}${index++}`;

setTimeout(() => {
    obj.go = false;
}, 1500);

setInterval(() => {
    obj.text = `${obj.text}${index++}`;
}, 1000);

effect(() => {
    console.log("effect1执行");
    effect(() => {
        console.log("effect2执行");
        obj.text;
    });
    obj.go;
});

setTimeout(() => {
    console.log("---------两秒后修改变量后的情况---------");
    obj.go = false;
    obj.text = "111";
    console.log("发现当前activeEffect指向内部函数，外部已经丢失");
}, 2000);
