/**
 * @file proxy简单实现响应式 demo
 * @author caifeng01
 */

import {effect, obj} from "./effect";

effect(() => {
    document.body.innerText = obj.text;
});
let index = 0;

setInterval(() => {
    obj.text = `${obj.text}${index++}`;
}, 1000);
