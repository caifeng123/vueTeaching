/**
 * @file effect嵌套 demo
 * @author caifeng01
 */

import {effect, obj} from "./effect";

effect(() => {
    obj.text = obj.text + "0";
    document.body.innerText = `
        此时打开控制台发现不会出现溢出情况
        ${obj.text}
    `;
});
