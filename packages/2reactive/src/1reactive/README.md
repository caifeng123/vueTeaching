### 1、reactive

> reactive 包裹对象生成响应式对象，一个最基本的代理 proxy，配合上收集触发依赖
>
> 实际上就是对一个对象的部分方法上添加上 track、trigger，从而实现响应式

创建 `const obj = reactive({a: 1, b: [1, 2]})` 获取到的 obj 为一个代理对象

#### get

-   代理取值函数 `obj.a`
-   若访问的是 `obj.raw` 则直接返回原对象 即 `{a: 1, b: [1, 2]}` ，不调用 `track` 向存储桶中添加追踪当前的 effect 函数
-   使用 `Reflect.get` 取值前进行 `track` 追踪原对象的 `key`，当 `obj.a` 变化时，会自动调用当前依赖集合。

#### set

-   代理赋值函数 `obj.a = 2 `
-   使用 `Reflect.set` 赋值后 判断值是否有变化(注意值为 null 的情况)。
-   当变化时
    -   当原先不存在时则触发 `trigger[ADD]` ，会调用 length 变化依赖函数集&key 变化依赖函数集
    -   当原先存在时则触发 `trigger[SET]`，会调用 key 变化依赖函数集

#### has

-   代理存在函数 `'a' in obj`
-   使用 `Reflect.has` 判断前，和 get 一样追踪 `obj.a`

#### ownKeys

-   代理自生键 `for(let i in obj)` 对于 for in 循环底层回调用 ownKeys 函数
-   由于 for in 循环迭代的是 keys，因此 key 的增多减少都会影响，赋值不会
-   因此我们需要在使用 `Reflect.ownKeys` 返回前追踪一个专门处理 key 数量(keys.length)的值

#### deleteProperty

-   代理删除函数 `delete obj.a`
-   调用 `Reflect.deleteProperty` 删除
-   若删除成功则会触发 `trigger[Delete]` ，会调用 length 变化依赖函数集&key 变化依赖函数集
