# 使用

-   最外层 `lerna bootstrap # 安装依赖`
-   cd packages/*
-   yarn dev 启动项目
-   修改 packages/*/index.ts中的文件引用查看不同demo



# effect 族

## 作用

响应式函数，自动收集内部依赖，当内部依赖变化时会触发当前的 effect 副作用函数。相比于 react 中的 useEffect 无需手写控制依赖，当依赖项，自动会采集。

因此 effect 都是用来书写响应式变化的副作用，对于每个 vue 组件来说，实际上每个组件都是一个 effect，在数据变化时内部调用 render。

## 内容

从 0 -> 1 的基本响应式带写，effect、computed、watch

|     | title           | describe                                                                                                                                                                                             | wrong                                                                                                                                     |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | basic           | 运用 proxy 和 set 作为存储桶实现基本响应式框架                                                                                                                                                       | 使用 set 存入所有副作用会导致无关依赖触发也会运行所有副作用                                                                               |
| 2   | weakMap         | 使用 weakMap 实现存储桶，能够收集副作用，并适时触发。<br>当无依赖时自动销毁。<br/>effect 首次执行会收集好所有依赖                                                                                    | 对于 effect 注册函数时会将相关函数都进行存储在 weakMap 中<br/>导致可能 effect 中出现判断语句时，不被执行的语句相关副作用也会被执行。      |
| 3   | changedeps      | 当依赖函数被触发时，先清空依赖项，重新收集依赖后在执行，保证只会执行符合要求(if 语句满足)的依赖函数                                                                                                  | 当出现 effect 中嵌套 effect 时(父组件子组件)会出现 activeEffect 错乱，因为递归执行在退出递归时没有恢复上层依赖函数                        |
| 4   | nestedEffects   | 使用 活跃函数栈[activeStack]替代 活跃函数[activeEffect]，这样递归时同步操作出入栈即可                                                                                                                | `i++; =》 i = i + 1; `<br>对于 proxy 会发生读值和赋值操作<br>当 i 变化时触发副作用 A 此时会读取 i 触发副作用 B<BR>无限循环最终溢出        |
| 5   | overflow        | 在每次触发副作用时判断与触发者是否相同，相同则不执行避免循环调用                                                                                                                                     | 用户可能需要自己配置触发时机与触发条件等                                                                                                  |
| 6   | scheduler       | 对 effect 添加调度器配置，判断是否用户有自定义调度器，没有则默认直接执行，有则交由调度器执行                                                                                                         | 有时需要首次不加载，用户自行控制注册 effect 时机                                                                                          |
| 7   | lazy            | 使用 lazy 字段配置，首次判断是否有配置，没有则默认首次执行，否则不执行返回当前 effect，在需要到时候进行注册响应式(调用执行即可)                                                                      | 只有自我控制注册时机，但往往有时是要使用时再执行副作用【缺少计算属性】                                                                    |
| 8   | computed        | 使用 effect 的 lazy 特性，通过修改对象的 value 返回值为 lazy 的返回值调用。使得每次调用 xx.value 时，再去获取当前执行结果                                                                            | 每次调用 xx.value 都会执行一次副作用整套流程，实际上没有必要。因为数据可能并没有被修改，此时应该缓存数据                                  |
| 9   | computed-cache  | 使用缓存将数据保留，当依赖值没变化时直接返回缓存。否则重新执行。<br>第 6 点中当调度器调用说明依赖值被修改。因此使用 scheduler 添加一个调度器其中设置脏数据标志位，每次取值时去判断标志位是否正常即可 | 将计算属性使用 effect 包裹时，当计算属性变化时不会调用 effect 函数。因为使用的是 lazy 手动调用加载。                                      |
| 10  | computed-react  | 通过在读取值时添加监听对计算属性 value 字段的变化，并在 scheduler 中触发对应的响应函数。此时当计算属性的 value 变化时就能监听触发了                                                                  | 计算属性只有手动需要时再回去调用触发，可往往我们需要监听一个大对象的内部变化，可能一个大对象内部小改变需要被实时监听到【缺少 watch 函数】 |
| 11  | watch           | watch 相较于普通 effect 区别在于前者监听内部所有变化后者是监听调用值的变化<br>因此我们只需要在 effect 中把所有当前对象的属性都递归调用一遍注册响应式依赖，scheduler 中触发用户回调                   | 有时我们可能不是对一个不变的对象进行 watch，还可能对一个函数返回值进行 watch，此时可能需要对函数进行操作执行                              |
| 12  | watch-Fn        | 只需要在接收监听项时对其进行类型判断，若是函数则调用执行对其返回值监听即可                                                                                                                           | 无法每次都能 watch 到变化前和变化后的值                                                                                                   |
| 13  | watch-oldvalue  | scheduler 触发回调时添加新旧值的参数，将其改写成 lazy 使得新值通过手动调用函数获取，老值通过缓存获取并每次更新                                                                                       | 此时 watch 的自定义函数是当内部变化时才会去调用执行的，但有时我们需要首次创建时立即执行                                                   |
| 14  | watch-immediate | 添加 immediate 选项，若被设定则立即执行一次调度器依赖函数即可                                                                                                                                        | 请求快慢导致的竞态问题十分常见，因此在 watch 内部中需要合理将过时调用进行丢弃                                                             |
| 15  | watch-race      | 在 scheduler 中触发时会调用上一次的非法函数，使得上一次的依赖触发时先判断到非法标志位后丢弃                                                                                                          | 完美撒花 🎉🎉🎉                                                                                                                           |



# reactive

## 作用

使用 reactive 包裹的变量都将会变成 proxy 代理对象，对代理对象的各个方法进行劫持。在取值时进行追踪 track，在赋值时进行 trigger，对于迭代器有其他情况。

## 内容

### 0、前情提要

> 对一些工具函数、effect 的辅助函数进行说明

| name    | params                                                                | describe                                                                                                                                                                                                                                     |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| track   | target: 代理的原始对象 <br>key: 对象的 key                            | 追踪函数，将当前执行的 effect 函数与 key 挂钩加入到收集桶中                                                                                                                                                                                  |
| trigger | target: 代理的原始对象 <br/>key: 对象的 key<br>type: 触发类型(增删改) | 从收集桶中取出对应的依赖函数 set 集合进行遍历执行，此外增删改时会触发不同操作<br>增/删: 会影响 Object.keys、Array、Set、Map 的 length，需要进行触发 length 依赖函数集<br>改: 只会影响 Map 的部分循环，因为其循环需要获得对应 value(其他不会) |
| getType | obj: 检测对象                                                         | 使用 `Object.prototype.toString.call` 获取对象类型，并指定全局 Type 确保在里面                                                                                                                                                               |
| wrap    | val: 包裹对象                                                         | 判断是否是对象，若是则变为响应式 - 用 reactive 包裹                                                                                                                                                                                          |

trigger 中 type 为`TriggerType.ADD | TriggerType.Delete` 则会触发相关迭代器执行，因为增删会导致整体 length|size 变化，从而影响到迭代器

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

### 2、shallowReactive

> 在 1 中实现的 reactive 实际上就是浅代理响应，因此需要实现深响应

#### 深、浅响应区别

比如当调用 `obj.b.push(3)` 时，实际上对于 `obj.b` 指向索引没有变化因此不会去发生响应。

对于正常逻辑（深响应）来说，肯定需要在 push 后也触发当前的 effect 函数集。

#### 问题

实际上问题出在应当在取值 `get` 时的 track 仅仅收集了当前的 key。

而我们需要判断取到的值类型，若为对象，则需要继续调用 reactive 包裹。此时就能进行追踪下方的子对象的变化了(包裹后成为响应式)

#### 改动点

**get**

-   代理取值函数 `obj.a`
-   若访问的是 `obj.raw` 则直接返回原对象 即 `{a: 1, b: [1, 2]}` ，不调用 `track` 向存储桶中添加追踪当前的 effect 函数
-   使用 `Reflect.get` 取值前进行 `track` 追踪原对象的 `key`，当 `obj.a` 变化时，会自动调用当前依赖集合。

-   <span style="color:green">+ 判断当前需要深响应还是浅响应，浅响应直接返回，深响应则需要将值变为响应式【在返回取到的值前进行判断类型，若为复杂类型则用 reactive 包裹后返回】</span>

### 3、readonly

#### 深、浅只读区别

只读顾名思义只读响应式，无法被修改！

**_其实我开始很好奇，要是想当前值是一个无法被修改的值，那么这个值直接设置为一个普通对象不就好了？何必还需要设置响应式呢？毕竟修改值的方式都被限制死，没有地方能触发响应式。_**

后来才发现，对于深只读来说，确实没必要实现响应式，因为所有数据的改变都不会被触发副作用。

借鉴上面的深浅响应类比可知，对于浅只读来说只会对第一层的值限制只读不修改，对于深层值变化还是会触发响应式的。

因此顺便回答上面的问题，为什么要设置为响应式：**为了浅只读**

#### 改动点

只读肯定需要限制原先改值的地方，因此需要在 `set` 与 `deleteProperty` 两处进行限制，判断若是只读则不执行修改操作与触发副作用操作。

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

### 5.1 Set

> 都是复杂类型，基本逻辑可复用原先的对象代理，但和 Array 一样，部分特殊函数需要特殊处理

#### size

**问题**

> 对于 set&map 数据结构来说，size 就和 array.length 一样，会和整体的 key 体积挂钩。

按照原有逻辑写的 demo，发现直接读取 size 会报错

![image-20220903221731755](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220903221731755.png)

这是由于 size 是一个属性访问器, 内部会访问原对象的属性对于代理对象上没有

**解决**

和[Array 处理 find 查找类函数](#find查找类函数)一样，代理对象取不到，则直接从 target 上获取

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

![image-20220903222603279](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220903222603279.png)

#### 常见函数

当调用 add、delete 的赋值函数时，还是报 this 指针不对的问题(receiver 就是 Reflect/proxy - this 指针)

![image-20220903223145821](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220903223145821.png)

原因是对于 `proxy.add(2)` 方法，先会去获取 `proxy.add` 函数，再去执行这个函数，此时执行时的 this 指针又被指向为了调用者 即`proxy`对象。因此此时得强行设置 this 指针，才能正确执行

![image-20220903224517550](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220903224517550.png)

##### Add&Delete

> 类似数组的增删情况，肯定会影响到 size 属性，因此我们需要触发 size 属性对应的依赖函数集合。
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

> 当 size 变化时，理论上会再次触发 forEach 函数

因此我们需要接管 forEach 函数，添加上对 size 的追踪，再调用原生 forEach 方法

```js
forEach(callback, thisArg) {
    const raw = this.raw;
    // 每次调用都会和size挂钩追踪变化 - 增删导致的size变化 重新调用forEach
    track(raw, ITERATE_KEY);
    // 触发原对象的forEach函数, 内部对象也设定为响应式
    raw.forEach((item) => callback.apply(thisArg, [wrap(item), this]));
},
```

ps: 此处学到 forEach 第二个参数 是改变函数 this 指针的，需要进行透传。

#### 迭代器族

##### 重写原因

对于数组的长度变化，肯定是需要引起迭代器的重新执行，因此我们需要对迭代方法进行代理，对其添加 track size 的操作。

##### 分析

通过观察发现 set 的 `keys/values/[Symbol.iterator] `三者指向的都是同一地址，但 `entries` 却不是一个地址。因此我们分类为两种，一种是获取值的迭代器，一种是获取 entries(键值对)的迭代器。

![image-20220904192603888](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220904192603888.png)

##### 迭代器与可迭代方法

迭代器与可迭代方法是完全不同的两个概念。

对于可迭代方法来说，只需要一个对象拥有了 next 方法返回 done 与 value 两个字段即可

```js
const iteratable = {
  next(){
    return {
      done: boolean;
      value: any;
    }
  }
};
```

对于迭代器来说，严格要求有一个 `[Symbol.iterator]` 方法，内部通过调用它获取到迭代方法，即上面说的有 next 函数的值

```js
const iterator = {
  [Symbol.iterator](){
    return {
      next(){
        return {
          done: boolean;
          value: any;
        }
      }
    }
  }
};
// 或者将其扁平化
const iterator = {
  next(){
    return {
      done: boolean;
      value: any;
    }
  },
  [Symbol.iterator](){
    return this;
  }
};
```

-   平时获取的值迭代器，都是访问 `原型的迭代器`，即访问 `原型[Symbol.iterator]` 得到可迭代方法。

-   entries(键值对)的迭代器，本身需要一个迭代器，因此访问 `原型.entries()` 方法得到的迭代器，内部需要实现 `[Symbol.iterator]` 属性指向一个可迭代方法，返回的 value 为键值对的形式

经过分析了迭代器和可迭代方法的差异，可以得出结论为 **`迭代器[Symbol.iterator] === 可迭代方法`**

##### 值迭代器

通过上面的分析，我们知道值迭代器实际上就是访问了原型的[Symbol.iterator]得到的一个可迭代方法，因此我们首先得先实现一个可迭代函数，使得三个都指向一个函数地址

```js
function iterationMethod() {
  const raw = this.raw;
  const itr = raw[Symbol.iterator]();
  track(raw, ITERATE_KEY);
  next() {
    const {value, done} = itr.next();
    return {
      // 用作包裹的原因是将子数据变为响应式
      value: wrap(value),
      done,
    };
  },
}

// 代理对象
{
    [Symbol.iterator]: iterationMethod,
    keys: iterationMethod,
    values: iterationMethod
}
```

此时发现 for of 迭代 代理对象是成功的，说明[Symbol.iterator]正常访问，但 keys 与 values 会报错

![image-20220904225211269](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220904225211269.png)

![image-20220904224823042](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220904224823042.png)

这是因为对于这两个来说，返回的不是真正的迭代器，缺少了[Symbol.iterator]属性，因此得给他们添加上这个属性

```js
function iterationMethod() {
  const raw = this.raw;
  const itr = raw[Symbol.iterator]();
  track(raw, ITERATE_KEY);
  next() {
    const {value, done} = itr.next();
    return {
      // 用作包裹的原因是将子数据变为响应式
      value: wrap(value),
      done,
    };
  },
+ [Symbol.iterator]() {
+   return this;
+ },
}
```

此时就正常了

##### 键值对迭代器

set 的 entries 和[Symbol.iterator]不同 是键值对形式 key value 都是同一个指向

```js
entries() {
  const raw = this.raw;
  const itr = raw[Symbol.iterator]();
  track(raw, ITERATE_KEY);
  return {
    next() {
      const {value, done} = itr.next();
      return {
        value: value?.map(wrap),
        done,
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
},
```

### 5.2 Map

#### 常见函数

##### Get&Set&Delete

-   get 获取键值对值，必然要追踪当前值的变化。对于值也应当变为响应式
-   set 设置键值对值，必然会出现新增与修改的情况
    -   对于新增需要触发 size 相关进行追踪变化
    -   对于修改需要触发迭代器的相关副作用
        -   对于 Map 大部分的迭代器都追踪了值变化，因此需要追踪当值变化时同时触发 size 依赖桶的副作用
        -   对于 keys 迭代器，只追踪 key 的变化，因此对于值变化时不应该触发 size 依赖，因此需要单独处理
-   delete 删除键值对，在删除成功后需要触发删除当前 key 的值与 size 的追踪函数

```js
set(key, newValue) {
    const target = this.raw;
    const has = target.has(key);
    const oldValue = target.get(key);
    const res = target.set(key, newValue?.raw ?? newValue);

    // 当不存在时 触发新增
    if (!has) {
        trigger(target, key, TriggerType.ADD);
    }
    // 当存在且值被改变
    else if (isChanged(oldValue, newValue)) {
        trigger(target, key, TriggerType.SET);
    }
    return res;
},
get<K, V>(key: K) {
    const target = this.raw as Map<K, V>;
    const has = target.has(key);
    track(target, key);
    if (has) {
        const value = target.get(key);
        // 对map值生成响应式对象，即对Map<string, obj> 修改obj也会响应式
        return typeof value === "object" ? reactive(value) : value;
    }
    return;
},
delete(key) {
    const target = this.raw;
    const res = target.delete(key);
    if(res) {
        trigger(target, key, TriggerType.DELETE)
    }
    return res;
},
```

##### ForEach

> 当 size 变化时，理论上会再次触发 forEach 函数

map 的 foreach 方法分别接收的是 value，key，this 指针

![image-20220905102606212](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220905102606212.png)

为满足每项 key 与 value 都为响应式，需要单独处理进行包裹 reactive 变为响应式。

```js
forEach(callback, thisArg) {
    const raw = this.raw;
    // 每次调用都会和size挂钩追踪变化 - 增删导致的size变化 重新调用forEach
    track(raw, ITERATE_KEY);
    // 触发原对象的forEach函数
    raw.forEach((value, key) =>
        callback.apply(thisArg, [wrap(value), wrap(key), this])
    );
}
```

#### 迭代器族

通过观察发现

-   `Map.entries` 与 `map[Symbol.iterator]` 等价，是键值对的迭代器
-   keys 为 map 键数组迭代器
-   values 为 map 值数组迭代器。

![image-20220905094509176](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220905094509176.png)

##### 键值对迭代器

> 由于触发条件已经在 trigger 时实现了，因此只需要将 ITERATE_KEY 与其进行挂钩追踪

-   重新触发条件:

    -   当 size 变化时
    -   当触发 set 修改值时

-   特点：value 为键值对的 `[key, value]` 组成。

![image-20220905103651858](https://raw.githubusercontent.com/caifeng123/pictures/master/image-20220905103651858.png)

因此我们接管塞入 size 追踪的同时，需要注意需要将返回值变为 `[reactive(key), [reactive(value)] `数组即可。

```js
// 自定义迭代器，需要有[Symbol.iterator]与可迭代对象的next方法
function iterationMethod() {
    const raw = this.raw;
    const itr = raw[Symbol.iterator]();
    track(raw, ITERATE_KEY);
    return {
        next() {
            const {value, done} = itr.next();
            return {
                value: value?.map(wrap),
                done,
            };
        },
        [Symbol.iterator]() {
            return this;
        },
    };
}

// map函数接管，确保两者指向相同
{
    [Symbol.iterator]: iterationMethod,
    entries: iterationMethod,
}
```

##### 值数组迭代器

> 由于触发条件已经在 trigger 时实现了，因此只需要将 ITERATE_KEY 与其进行挂钩追踪

-   重新触发条件:
    -   当 size 变化时(新增删除)
    -   当触发 set 修改值时
-   特点: 将所有值组合成数组每一项都为 `reactive(value)`

```js
values() {
    const raw = this.raw;
    const itr = raw.values();
    track(raw, ITERATE_KEY);

    return {
        next() {
            const {value, done} = itr.next();
            return {
                value: wrap(value),
                done,
            };
        },
        [Symbol.iterator]() {
            return this;
        },
    };
},
```

##### 键数组迭代器

> 分析过 keys 获取到所有 key 值，当值的变化不应该被监听与重新触发，因此需要单独起一个变量进行追踪 - `MAP_KEYS_ITERATE_KEY`
>
> 由于触发条件已经在 trigger 时实现了，因此只需要将`MAP_KEYS_ITERATE_KEY`与其进行挂钩追踪

-   重新触发条件:
    -   当 size 变化时(新增删除)
    -   当触发 set 修改值时
-   特点: 将所有值组合成数组，每一项都为 `reactive(key)`

```js
keys() {
    const raw = this.raw;
    const itr = raw.keys();
    track(raw, MAP_KEYS_ITERATE_KEY);

    return {
        next() {
            const {value, done} = itr.next();
            return {
                value: wrap(value),
                done,
            };
        },
        [Symbol.iterator]() {
            return this;
        },
    };
},
```
