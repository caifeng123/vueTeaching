/**
 * @file readonly & shallowReadonly 演示
 * @author caifeng01
 */

import {effect, shallowReadonly, readonly} from "./myvue";

const shallowObj = shallowReadonly({foo: {haha: 1}});
const obj = readonly({foo: {haha: 1}});

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
    console.info(
        "但只在warning信息中有显示,因为readonly保证了都不进行追踪, 且深只读有响应"
    );
}, 4000);
