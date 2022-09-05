### 4、array

> 前面对于对象的代理都基本完成，此时需要对数组进行接管代理，因为其中有部分函数区别

#### length

作为 array 特有的属性，我们可以通过设置 length 长度快速截断。

##### 采集 track

> 往往我们需要清空数组的值时，往往都直接设置 `length = 0` 即可。当我们修改 length 属性时，理论上若我们对数组的迭代循环则需要重新执行，因此添加 length 这个特殊的属性专门用作收集和触发数组长度相关的事件

对于数组的非函数调用的迭代（for in / for of）内部会调用 `ownKeys` 函数，因此我们需要去代理该函数，需要对 length 进行追踪，将当前副作用 effect 收集在 target.length 副作用集合上。

```js
new Proxy(target, {
    ownKeys(target) {
        // 追踪迭代器的key, 当迭代器变化时需要触发ITERATE_KEY对应函数, 因此此处添加追踪
      	// + 判断若被代理原对象为数组时，需要对length进行追踪，将当前副作用effect附在存储桶中target的length上
        track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(target);
    },
  	...
})
```

##### **触发 trigger**

-   对于设置值 set 时，若新增的下标 >= 当前数组的长度，说明数组总长度增大
-   对于删除 delete 调用时，说明数组总长度变小
-   当将数组的 length 属性设置比当前小时，则说明大于等于 length 的下标都被删除了，此时我们需要触发之前这些被删除的 key 的副作用列表

#### 其他函数

##### find 查找类函数

> 例如:indexOf|findIndex|includes 等

**问题**

当我们直接使用此类函数查找基本类型数组时`[1,2,3]`是正常的。但当遇到带有复杂类型的数组时就会出现怎么也找不到的情况，例如：

```js
// 直接使用原生函数时
const pre = {b: 2};
const obj = reactive([pre]);
obj.includes(pre); // false
```

会出现这种情况的原因也很简单，我们在[深响应](# 问题)中提到我们取值时会对子属性也做成响应式，从而实现深响应。

对于 `pre` 来说显然是一个复杂类型，因此会被 reactive 包裹，导致当前我们 includes 不到原属性，只能 includes 到被 reactive 包裹的 proxy

**解决**

既然被查找的对象所困扰，那么此时我们只需在查找前访问代理对象的 raw 属性，从而获取到原生对象，此时用原生对象查找自然能找到了。

```js
/**
 * 重写Array查询原型方法, 目的是为了proxy对象能直接检索到原对象数据
 * 例如:
 * const obj = {1: 2};
 * const objArr = reactive([obj]);
 * objArr.includes(obj) // 不重写则为false
 * 因为objArr是proxy对象, 内部对象会被递归成reactive,因此只能找到被reactive的obj proxy对象，无法通过直接includes找到原对象
 * 因此我们需要重写, 在找不到时会去找raw原生对象
 */
const FindFuncs = FIND_FUNC.reduce((all, {funcName, failValue}) => {
    const originMethod = Array.prototype[funcName];
    all[funcName] = function (...args) {
        let res = originMethod.apply(this, args);
        if (res === failValue) {
            res = originMethod.apply(this.raw, args);
        }
        return res;
    };
    return all;
}, {});
```

##### change 改值类函数

> 例如: push|shift|pop|unshift

在读取改值类函数时，内部会去调用 length 获取数组长度，那么肯定会将当前 effect 收集到 length 下。

**问题**

要是只写一次的 effect 函数则是正常的，因为 trigger length 副作用函数集合时会避免掉当前的 effect 函数，所以不会影响。

但写两次时会互相影响。因为 arr.push 内部会读取 length,导致 effectA 与 effectB 都被采集到 length 的依赖集合中。

虽然能避免当前 effect 但会触发另一个的 effect 函数，导致两边无限获取 length 的 effect 函数，最终栈溢出

```js
effectA: effect(() => {
    arr.push(1);
});
effectB: effect(() => {
    arr.push(2);
});
```

##### 解决

我们发现改值函数调用的 length 实际上是无用的，我们无需去收集使用，因此我们需要去避免收集这个 length 的情况。

可以定义一个公共变量专门存储是否当前需要追踪，告知 track 判断下是否需要追踪

```js
/**
 * 重写Array修改原型方法, 目的是为了在调用时规避掉对length的读取
 */
const ChangeFuncs = CHANGE_FUNC.reduce((all, funcName) => {
    const originMethod = Array.prototype[funcName];
    all[funcName] = function (...args) {
        PUBLIC_MAP.shouldTrack = false;
        let res = originMethod.apply(this, args);
        PUBLIC_MAP.shouldTrack = true;
        return res;
    };
    return all;
}, {});

export const track = (target: DataType, key: string | symbol) => {
  	...
    if (!PUBLIC_MAP.shouldTrack) return;
};
```

#### 部分处理

> for of 迭代访问默认是在访问 [Symbol.iterator] 属性，获取到迭代器从而调用内部的 next 获取到值

但由于 [Symbol.iterator]是一辈子不会被触发的属性，因此没有 track 存储入桶的必要

```js
// 对于数组的for of循环来说, 会调用执行Symbol.iterator属性,因此此处会被阅读读取,此处避免掉symbol的追踪
if (getType(key) !== Type.Symbol) {
    track(target, key);
}
```
