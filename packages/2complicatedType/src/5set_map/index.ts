/**
 * @file 演示
 * @author caifeng01
 */

import {effect, reactive} from "./myvue";

const set = new Set([2]);

const map = new Map([[1, set]]);
const setProxy = reactive(set);
const mapProxy = reactive(map);

effect(() => {
    // console.log(setProxy.has("1"));
    // console.log(mapProxy.size);
    // console.log(setProxy.size);
    // console.log(map);
    setProxy.forEach(console.log);
});
// mapProxy.set(2, setProxy);
setTimeout(() => {
    // const set = mapProxy.get(1);
    setProxy.add(1);
    // setProxy.add(2);
    // setProxy.delete(1);
}, 1000);

// setTimeout(() => {
// mapProxy.set(2, 2);
// }, 2000);
