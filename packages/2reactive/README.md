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



