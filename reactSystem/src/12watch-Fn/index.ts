/**
 * @file 监听回调出现的引用
 * @author caifeng01
 */

import {watch, obj} from "./effect";

watch(
    () => obj.text,
    () => console.log("数据变了")
);

document.body.innerText = `看日志中打印
监听obj,改变内部值时回调用回调
`;

setInterval(() => {
    obj.text = obj.text + "0";
}, 1500);
