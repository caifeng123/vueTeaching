/**
 * @file 实现了依赖桶数据结构的构建,搭建地基
 * @author caifeng01
 */

// 基本数据
const data = {
	text: "cc123nice",
};

type DepsSet = Set<() => void>;

type DepsMap = Map<string | symbol, DepsSet>;

type DataType = Record<string | symbol, any>;

/**
 * @describe 依赖桶，存储所有数据&所有依赖关系
 * weakMap: <[target对象]: map<[key路径]: DepsSet[]>>
 * @set track添加, cleanup删除
 * @use  依赖项被trigger
 */
const bucket = new WeakMap<DataType, DepsMap>();

/**
 * @describe 当前的活跃函数
 * @set 注册effect函数时覆盖
 * @use track调用 -> 收集依赖项到bucket依赖桶中
 */
let activeEffect = null;

/**
 * @describe 收集依赖, 组成bucket依赖桶
 * @use proxy被get时调用
 */
const track = (target: DataType, key: string | symbol) => {
	if (!activeEffect) return;
	let depsMap = bucket.get(target);
	if (!depsMap) {
		bucket.set(target, (depsMap = new Map() as DepsMap));
	}
	let depsSet = depsMap.get(key);
	if (!depsSet) {
		depsMap.set(key, (depsSet = new Set() as DepsSet));
	}
	depsSet.add(activeEffect);
};

/**
 * @describe 触发相关依赖
 * @use proxy被set时调用
 */
const trigger = (target: DataType, key: string | symbol) => {
	const depsMap = bucket.get(target);

	if (!depsMap) {
		return;
	}
	const depsSet = depsMap.get(key);
	depsSet?.forEach((fn) => fn());
};

const obj = new Proxy(data, {
	get(target, key) {
		console.log("get");
		track(target, key);
		return target[key];
	},
	set(target, key, value) {
		console.log("set");
		target[key] = value;
		trigger(target, key);
		return true;
	},
});

function effect(fn: () => void) {
	activeEffect = fn;
	fn();
}

export {effect, obj};
