/**
 * @file 演示
 * @author caifeng01
 */

import {effect, reactive} from "./myvue";

const arr = reactive([1]);

console.log("初始化 -----");

effect(() => {
    console.log(`数组arr[1] = ${arr[1]}`);
});

effect(() => {
    console.log(`数组arr[0] = ${arr[0]}`);
});

effect(() => {
    console.log(`数组length = ${arr.length}`);
});

effect(() => {
    console.log("for in遍历 start");
    for (let i in arr) {
        console.log(`key: ${i};value: ${arr[i]}`);
    }
    console.log("for in遍历 end");
});

effect(() => {
    console.log("for of遍历 start");
    for (let i of arr) {
        console.log(`value: ${i}`);
    }
    console.log("for of遍历 end");
});

const obj = {1: 2};
const objArr = reactive([obj, obj]);

setTimeout(() => {
    console.log("添加了数组第4项后 -----");
    arr[4] = 0;
}, 2000);

setTimeout(() => {
    console.log("清空了数组后 -----");
    arr.length = 0;
}, 4000);

setTimeout(() => {
    console.log(`调用includes直接检索值${objArr.includes(obj)}`);
    console.log(`调用indexOf直接检索值${objArr.indexOf(obj)}`);
    console.log(`调用lastIndexOf直接检索值${objArr.lastIndexOf(obj)}`);
}, 6000);

effect(() => {
    arr.push(1);
});

effect(() => {
    arr.push(1);
});
