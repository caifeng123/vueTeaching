/**
 * @file Reflect反射替换原有直接读取\删除
 * @author caifeng01
 */

import {effect, reactive} from "./effect";

const proxyObj = reactive({foo: 1, hehe: "xixi"});

effect(() => {
    console.log(
        `%cfoo is in proxyObj: ${"foo" in proxyObj}`,
        "color: darkblue"
    );
});

effect(() => {
    console.log(`%cfoo被修改了: ${proxyObj.foo}`, "color: pink");
});

effect(() => {
    console.log("%c---for in迭代访问--- start", "color: purple");
    for (let item in proxyObj) {
        console.log(`key: ${item}, value: ${proxyObj[item]}`);
    }
    console.log("%c---for in迭代访问--- end", "color: purple");
});

// start
console.log("%c5秒后添加 name: cc123nice", "color: green");

setTimeout(() => {
    proxyObj.name = "cc123nice";
    console.log("%c5秒后删除 foo", "color: red");
}, 5000);

setTimeout(() => {
    delete proxyObj.foo;
    console.log("%c5秒后给name赋值相同的值cc123nice", "color: lightgreen");
}, 10000);

setTimeout(() => {
    proxyObj.name = "cc123nice";
    console.log("the same value, nothing happen");
}, 15000);
