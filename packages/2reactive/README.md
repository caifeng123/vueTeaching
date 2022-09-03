# reactive

## 作用

使用reactive包裹的变量都将会变成proxy代理对象，对代理对象的各个方法进行劫持。在取值时进行追踪track，在赋值时进行trigger，对于迭代器有其他情况。



## 内容

### 0、前情提要

> 对一些工具函数、effect的辅助函数进行说明

| name    | params                                                       | describe                                                     |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| track   | target: 代理的原始对象 <br>key: 对象的key                    | 追踪函数，将当前执行的effect函数与key挂钩加入到收集桶中      |
| trigger | target: 代理的原始对象 <br/>key: 对象的key<br>type: 触发类型(增删改) | 从收集桶中取出对应的依赖函数set集合进行遍历执行，此外增删改时会触发不同操作<br>增/删: 会影响Object.keys、Array、Set、Map的length，需要进行触发length依赖函数集<br>改: 只会影响Map的部分循环，因为其循环需要获得对应value(其他不会) |
| getType | obj: 检测对象                                                | 使用 `Object.prototype.toString.call` 获取对象类型，并指定全局Type确保在里面 |
| wrap    | val: 包裹对象                                                | 判断是否是对象，若是则变为响应式 - 用reactive包裹            |

### 1、reactive

> reactive 包裹对象生成响应式对象，一个最基本的代理proxy，配合上收集触发依赖
>
> 实际上就是对一个对象的部分方法上添加上track、trigger，从而实现响应式

创建 `const obj = reactive({a: 1, b: [1, 2]})` 获取到的obj为一个代理对象

#### get

- 代理取值函数 `obj.a` 
- 若访问的是 `obj.raw` 则直接返回原对象 即 `{a: 1, b: [1, 2]}` ，不调用 `track` 向存储桶中添加追踪当前的effect函数
- 使用  `Reflect.get`  取值前进行 `track` 追踪原对象的 `key`，当 `obj.a` 变化时，会自动调用当前依赖集合。

#### set

- 代理赋值函数 `obj.a = 2 `
- 使用 `Reflect.set` 赋值后 判断值是否有变化(注意值为null的情况)。
- 当变化时
  - 当原先不存在时则触发 `trigger[ADD]` ，会调用length变化依赖函数集&key变化依赖函数集
  - 当原先存在时则触发 `trigger[SET]`，会调用key变化依赖函数集

#### has

- 代理存在函数 `'a' in obj`
- 使用 `Reflect.has` 判断前，和get一样追踪 `obj.a`

#### ownKeys

- 代理自生键 `for(let i in obj)` 对于 for in 循环底层回调用ownKeys函数
- 由于for in循环迭代的是keys，因此key的增多减少都会影响，赋值不会
- 因此我们需要在使用 `Reflect.ownKeys` 返回前追踪一个专门处理key数量(keys.length)的值

#### deleteProperty

- 代理删除函数 `delete obj.a` 
- 调用 `Reflect.deleteProperty` 删除
- 若删除成功则会触发 `trigger[Delete]` ，会调用length变化依赖函数集&key变化依赖函数集

### 2、shallowReactive

> 在1中实现的reactive实际上就是浅代理响应，因此需要实现深响应

#### 深、浅响应区别

比如当调用 `obj.b.push(3)` 时，实际上对于 `obj.b` 指向索引没有变化因此不会去发生响应。

对于正常逻辑（深响应）来说，肯定需要在push后也触发当前的effect函数集。



#### 问题

实际上问题出在应当在取值 `get` 时的track仅仅收集了当前的key。

而我们需要判断取到的值类型，若为对象，则需要继续调用reactive包裹。此时就能进行追踪下方的子对象的变化了(包裹后成为响应式)



#### 改动点

**get**

- 代理取值函数 `obj.a` 
- 若访问的是 `obj.raw` 则直接返回原对象 即 `{a: 1, b: [1, 2]}` ，不调用 `track` 向存储桶中添加追踪当前的effect函数
- 使用  `Reflect.get`  取值前进行 `track` 追踪原对象的 `key`，当 `obj.a` 变化时，会自动调用当前依赖集合。

- <span style="color:green">+ 判断当前需要深响应还是浅响应，浅响应直接返回，深响应则需要将值变为响应式【在返回取到的值前进行判断类型，若为复杂类型则用reactive包裹后返回】</span>

### 3、readonly

#### 深、浅只读区别

只读顾名思义只读响应式，无法被修改！

***其实我开始很好奇，要是想当前值是一个无法被修改的值，那么这个值直接设置为一个普通对象不就好了？何必还需要设置响应式呢？毕竟修改值的方式都被限制死，没有地方能触发响应式。***

后来才发现，对于深只读来说，确实没必要实现响应式，因为所有数据的改变都不会被触发副作用。

借鉴上面的深浅响应类比可知，对于浅只读来说只会对第一层的值限制只读不修改，对于深层值变化还是会触发响应式的。

因此顺便回答上面的问题，为什么要设置为响应式：**为了浅只读**



#### 改动点

只读肯定需要限制原先改值的地方，因此需要在 `set` 与 `deleteProperty` 两处进行限制，判断若是只读则不执行修改操作与触发副作用操作。

### 4、array

> 前面对于对象的代理都基本完成，此时需要对数组进行接管代理，因为其中有部分函数区别

#### length

作为array特有的属性，我们可以通过设置length长度快速截断。

##### 采集track

> 往往我们需要清空数组的值时，往往都直接设置 `length = 0` 即可。当我们修改length属性时，理论上若我们对数组的迭代循环则需要重新执行，因此添加length这个特殊的属性专门用作收集和触发数组长度相关的事件

对于数组的非函数调用的迭代（for in / for of）内部会调用 `ownKeys` 函数，因此我们需要去代理该函数，需要对length进行追踪，将当前副作用effect收集在target.length副作用集合上。

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

##### **触发trigger**

- 对于设置值set时，若新增的下标 >= 当前数组的长度，说明数组总长度增大
- 对于删除delete调用时，说明数组总长度变小
- 当将数组的length属性设置比当前小时，则说明大于等于length的下标都被删除了，此时我们需要触发之前这些被删除的key的副作用列表

#### 其他函数

##### find查找类函数

> 例如:indexOf|findIndex|includes等

**问题**

当我们直接使用此类函数查找基本类型数组时`[1,2,3]`是正常的。但当遇到带有复杂类型的数组时就会出现怎么也找不到的情况，例如：

```js
// 直接使用原生函数时
const pre = {b: 2};
const obj = reactive([pre]);
obj.includes(pre); // false
```

会出现这种情况的原因也很简单，我们在[深响应](# 问题)中提到我们取值时会对子属性也做成响应式，从而实现深响应。

对于 `pre` 来说显然是一个复杂类型，因此会被reactive包裹，导致当前我们includes不到原属性，只能includes到被reactive包裹的proxy

**解决**

既然被查找的对象所困扰，那么此时我们只需在查找前访问代理对象的raw属性，从而获取到原生对象，此时用原生对象查找自然能找到了。

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

##### change改值类函数

> 例如: push|shift|pop|unshift

在读取改值类函数时，内部会去调用length获取数组长度，那么肯定会将当前effect收集到length下。

**问题**

要是只写一次的effect函数则是正常的，因为trigger length 副作用函数集合时会避免掉当前的effect函数，所以不会影响。

但写两次时会互相影响。因为arr.push内部会读取length,导致effectA与effectB都被采集到length的依赖集合中。

虽然能避免当前effect但会触发另一个的effect函数，导致两边无限获取length的effect函数，最终栈溢出

```js
effectA: effect(() => {arr.push(1)});
effectB: effect(() => {arr.push(2)});
```

##### 解决

我们发现改值函数调用的length实际上是无用的，我们无需去收集使用，因此我们需要去避免收集这个length的情况。

可以定义一个公共变量专门存储是否当前需要追踪，告知track判断下是否需要追踪

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

> for of 迭代访问默认是在访问 [Symbol.iterator] 属性，获取到迭代器从而调用内部的next获取到值

但由于 [Symbol.iterator]是一辈子不会被触发的属性，因此没有track存储入桶的必要

```js
// 对于数组的for of循环来说, 会调用执行Symbol.iterator属性,因此此处会被阅读读取,此处避免掉symbol的追踪
if (getType(key) !== Type.Symbol) {
		track(target, key);
}
```



### 5、Set & Map

> 都是复杂类型，基本逻辑可复用原先的对象代理，但和Array一样，部分特殊函数需要特殊处理

#### size

**问题**

> 对于set&map数据结构来说，size就和array.length一样，会和整体的key体积挂钩。

按照原有逻辑写的demo，发现直接读取size会报错

![image-20220903221731755](/Users/caifeng01/Library/Application Support/typora-user-images/image-20220903221731755.png)

这是由于size是一个属性访问器, 内部会访问原对象的属性对于代理对象上没有

**解决**

和[Array处理find查找类函数](#find查找类函数)一样，代理对象取不到，则直接从target上获取

```js
// 对set进行处理
if (getType(target) === Type.Set || getType(target) === Type.Map) {
    if (key === "size") {
        // 对于set部分方法会导致size变化，需要单独对它进行跟踪。类似与array的length属性
        track(target, ITERATE_KEY);
        return Reflect.get(target, key, target); // 也可以是target[key]或target.size
    }
}
```

此时就不再会报错了

![image-20220903222603279](/Users/caifeng01/Library/Application Support/typora-user-images/image-20220903222603279.png)



#### 其他函数

当调用add、delete的赋值函数时，还是报this指针不对的问题(receiver就是Reflect/proxy - this指针)

![image-20220903223145821](/Users/caifeng01/Library/Application Support/typora-user-images/image-20220903223145821.png)

原因是对于 `proxy.add(2)` 方法，先会去获取 `proxy.add` 函数，再去执行这个函数，此时执行时的this指针又被指向为了调用者 即`proxy`对象。因此此时得强行设置this指针，才能正确执行

![image-20220903224517550](/Users/caifeng01/Library/Application Support/typora-user-images/image-20220903224517550.png)



##### Add&Delete

> 类似数组的增删情况，肯定会影响到size属性，因此我们需要触发size属性对应的依赖函数集合。
>
> 只有真正增删成功时，再去触发，减少无效执行

```ts
add<T>(key: T) {
    const target = this.raw as Set<T>;
    const hasValue = target.has(key);
    const res = target.add(key);
    if (!hasValue) {
      	// 触发size已经集合在ADD触发中
        trigger(target, key, TriggerType.ADD);
    }
    return res;
},
delete<T>(key: T) {
		const target = this.raw as Set<T>;
		const hasValue = target.has(key);
		const res = target.delete(key);
		if (hasValue) {
        // 触发size已经集合在DELETE触发中
				trigger(target, key, TriggerType.DELETE);
		}
		return res;
}
```



##### ForEach

> 
