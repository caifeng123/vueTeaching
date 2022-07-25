/**
 * @file 添加lazy参数,可接收effect返回值手动调用执行，且得到调用返回值
 * @author caifeng01
 */

import {computed, obj} from "./effect";

const res = computed(() => {
    console.log("----");
    return obj.go + obj.text;
});

document.body.innerText = `看日志中打印
确实能做到运行时调用effect函数但实际上不会缓存
理论上当值不变时 返回值不变因此无需重新调用
`;

console.log(res.value);
console.log(res.value);
console.log(res.value);
