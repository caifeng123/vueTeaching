/**
 * @file 演示
 * @author caifeng01
 */

import {effect, reactive} from "./myvue";

const set1 = new Set([1, 2, 3]);
const set = new Set([set1]);

const map = new Map([[1, set]]);
const setProxy = reactive(set);
const mapProxy = reactive(map);

effect(() => {
    // console.log(setProxy.has("1"));
    // console.log(mapProxy.size);
    // console.log(setProxy.size);
    // console.log(map);
    // mapProxy.forEach((value) => {
    //     console.log(value.size);
    // });
    // for (let [key, value] of mapProxy.entries()) {
    //     console.log(key, value.size);
    // }
    for (let value of setProxy.values()) {
        console.log(value.size);
    }
});
// mapProxy.set(2, setProxy);
setTimeout(() => {
    //     // const set = mapProxy.get(1);
    setProxy.forEach((value) => {
        value.add(14);
    });
    // set1.add(21);
    // set.add(22);
    //     // setProxy.delete(1);
}, 1000);
