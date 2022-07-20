/**
 * @file effect嵌套 demo
 * @author caifeng01
 */

import {effect, obj} from "./effect";

document.body.innerText = "看上个demo的打印";

let temp1, temp2;

effect(() => {
	console.log("effect1执行");
	effect(() => {
		console.log("effect2执行");
		temp2 = obj.text;
	});
	temp1 = obj.go;
});

setTimeout(() => {
	console.log("---------两秒后修改变量后的情况---------");
	obj.text = "111"; // 先内部
	obj.go = false; // 再外部effect -> 导致内部再次被触发打印
	console.log(
		"发现副作用正常能按顺序执行,1.先内部2.再外部effect -> 导致内部再次被触发打印"
	);
}, 2000);
