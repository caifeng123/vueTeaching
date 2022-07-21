/**
 * @file effect嵌套 demo
 * @author caifeng01
 */

import {effect, obj} from "./effect";

document.body.innerText = `
看上个demo的打印
最后记得打开代码注释，观察i++情况(track&trigger同时触发时)会出现栈溢出
`;

effect(() => {
	console.log("effect1执行");
	effect(() => {
		console.log("effect2执行");
		obj.text;
	});
	obj.go;
});

setTimeout(() => {
	console.log("---------两秒后修改变量后的情况---------");
	obj.text = "111"; // 先内部
	obj.go = false; // 再外部effect -> 导致内部再次被触发打印
	console.log(
		"发现副作用正常能按顺序执行,1.先内部2.再外部effect -> 导致内部再次被触发打印"
	);
}, 2000);

// 下个代码例子

// 注释上面代码，解开下面代码，发现出现栈溢出

// effect(() => {
// 	obj.text = obj.text + "0";
// });
