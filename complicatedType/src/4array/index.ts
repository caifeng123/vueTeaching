/**
 * @file readonly & shallowReadonly 演示
 * @author caifeng01
 */

import {effect, reactive} from "./myvue";

const arr = reactive([1]);

effect(() => {
    console.log(`数组arr[1] = ${arr[1]}`);
});

effect(() => {
    console.log(`数组arr[0] = ${arr[0]}`);
});

effect(() => {
    console.log(`数组length = ${arr.length}`);
});

setTimeout(() => {
    console.log("添加了数组第4项后");
    arr[4] = 0;
}, 2000);

setTimeout(() => {
    console.log("清空了数组后");
    arr.length = 0;
}, 4000);
