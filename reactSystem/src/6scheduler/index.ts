/**
 * @file effect添加自定义调度
 * @author caifeng01
 */

import {effect, obj} from "./effect";

effect(
    () => {
        console.log(obj.text);
    },
    // options ,尝试注释options查看打印区别
    {
        scheduler: (fn) => setTimeout(fn, 0),
    }
);
obj.text = "变化";

console.log("结束");
