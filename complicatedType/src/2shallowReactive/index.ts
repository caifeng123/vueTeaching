/**
 * @file shallowReactive演示
 * @author caifeng01
 */

import {effect, shallowReactive, reactive} from "./myvue";

const shallowObj = shallowReactive({foo: {haha: 1}});
const obj = reactive({foo: {haha: 1}});

effect(() => {
    console.log(
        `%cshallowObj.foo.haha: ${shallowObj.foo.haha}`,
        "color: darkblue"
    );
});
effect(() => {
    console.log(`%cobj.foo.haha: ${obj.foo.haha}`, "color: purplr");
});
console.log(
    `%c起初值都为 {foo: {haha: 1}}
4s后shallowObj.foo.haha和obj.foo.haha都变了`,
    "color: red"
);

setTimeout(() => {
    shallowObj.foo.haha++;
    obj.foo.haha++;
}, 4000);
