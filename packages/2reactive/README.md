# reactive

## 作用

使用reactive包裹的变量都将会变成proxy代理对象，对代理对象的各个方法进行劫持。在取值时进行追踪track，在赋值时进行trigger，对于迭代器有其他情况。



## 内容

### 0、前情提要

> 对一些工具函数、effect的辅助函数进行说明

| name    | params                                                       | describe                                                     |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| track   | target: 代理的原始对象 <br>key: 对象的key                    | 追踪函数，将当前执行的effect函数与key挂钩加入到收集桶中      |
| trigger | target: 代理的原始对象 <br/>key: 对象的key<br>type: 触发类型(增删改) | 从收集桶中取出对应的依赖函数set集合进行遍历执行，此外增删改时会触发不同操作<br>增/删: 会影响Array、Set、Map的length，需要进行触发length依赖函数集<br>改: 只会影响Map的部分循环，因为其循环需要获得对应value(其他不会) |
| getType | obj: 检测对象                                                | 使用 `Object.prototype.toString.call` 获取对象类型，并指定全局Type确保在里面 |
| wrap    | val: 包裹对象                                                | 判断是否是对象，若是则变为响应式 - 用reactive包裹            |

### 1、reactive

> reactive 包裹对象生成响应式对象，一个最基本的代理proxy，配合上收集触发依赖







