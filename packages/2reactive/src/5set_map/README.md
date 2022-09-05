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
+	[Symbol.iterator]() {
+		return this;
+	},
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
