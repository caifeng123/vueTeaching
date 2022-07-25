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
此时添加了对数据的缓存后成功缓存
当schedule被调用说明,依赖项被改变导致调用，此时需要重新缓存数据。否则直接返回
`;

console.log(res.value);
console.log(res.value);
console.log(res.value);
console.log(
    "当我们手动修改值时, 理论上计算属性值也会变化,但发现compute是懒加载执行函数, effect无法正确收集依赖"
);
effect(() => {
    console.log(res.value);
});

console.log(
    "%c理论上此处应该interval执行导致计算属性变化 对应的effect会打印最新值。但实际没有",
    "color: red"
);
setInterval(() => {
    obj.text = obj.text + "0";
}, 1500);
