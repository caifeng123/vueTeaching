/**
 * @file 演示
 * @author caifeng01
 */

import {effect, ref} from "./reactivity";

const num = ref(1);

effect(() => {
    console.log(num.value);
});

setTimeout(() => {
    num.value = 10;
}, 1000);
