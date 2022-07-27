/**
 * @file watch中可获取新旧值进行自定义操作
 * @author caifeng01
 */

import {watch, obj} from "./effect";

watch(
    () => obj.text,
    (newValue, oldValue) => {
        console.log(`数据变了 新：${newValue} 老：${oldValue}`);
    }
);

document.body.innerText = `看日志中打印
监听obj,改变内部值时回调用回调
`;

setInterval(() => {
    obj.text = obj.text + "0";
}, 1500);
