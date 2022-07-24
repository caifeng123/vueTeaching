/**
 * @file 添加lazy参数,可接收effect返回值手动调用执行，且得到调用返回值
 * @author caifeng01
 */

import {effect, obj} from "./effect";

const effectFn = effect(
    () => {
        obj.text = "1111";
        return obj.text + "xxx";
    },
    {
        lazy: true,
    }
);

const res = effectFn();

console.log(res);
