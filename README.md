# 使用

-   最外层 `lerna bootstrap # 安装依赖`
-   cd packages/*
-   yarn dev 启动项目
-   修改 packages/*/index.ts中的文件引用查看不同demo

# vueTeaching

从 0 -> 1 的基本响应式带写，effect、computed、watch

|      | title           | describe                                                     | wrong                                                        |
| ---- | --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1    | basic           | 运用proxy和set作为存储桶实现基本响应式框架                   | 使用set存入所有副作用会导致无关依赖触发也会运行所有副作用    |
| 2    | weakMap         | 使用weakMap实现存储桶，能够收集副作用，并适时触发。<br>当无依赖时自动销毁。<br/>effect首次执行会收集好所有依赖 | 对于effect注册函数时会将相关函数都进行存储在weakMap中<br/>导致可能effect中出现判断语句时，不被执行的语句相关副作用也会被执行。 |
| 3    | changedeps      | 当依赖函数被触发时，先清空依赖项，重新收集依赖后在执行，保证只会执行符合要求(if语句满足)的依赖函数 | 当出现effect中嵌套effect时(父组件子组件)会出现activeEffect错乱，因为递归执行在退出递归时没有恢复上层依赖函数 |
| 4    | nestedEffects   | 使用 活跃函数栈[activeStack]替代 活跃函数[activeEffect]，这样递归时同步操作出入栈即可 | `i++; =》 i = i + 1; `<br>对于proxy会发生读值和赋值操作<br>当i变化时触发副作用A此时会读取i触发副作用B<BR>无限循环最终溢出 |
| 5    | overflow        | 在每次触发副作用时判断与触发者是否相同，相同则不执行避免循环调用 | 用户可能需要自己配置触发时机与触发条件等                     |
| 6    | scheduler       | 对effect添加调度器配置，判断是否用户有自定义调度器，没有则默认直接执行，有则交由调度器执行 | 有时需要首次不加载，用户自行控制注册effect时机               |
| 7    | lazy            | 使用lazy字段配置，首次判断是否有配置，没有则默认首次执行，否则不执行返回当前effect，在需要到时候进行注册响应式(调用执行即可) | 只有自我控制注册时机，但往往有时是要使用时再执行副作用【缺少计算属性】 |
| 8    | computed        | 使用effect的lazy特性，通过修改对象的value返回值为 lazy的返回值调用。使得每次调用xx.value时，再去获取当前执行结果 | 每次调用xx.value都会执行一次副作用整套流程，实际上没有必要。因为数据可能并没有被修改，此时应该缓存数据 |
| 9    | computed-cache  | 使用缓存将数据保留，当依赖值没变化时直接返回缓存。否则重新执行。<br>第6点中当调度器调用说明依赖值被修改。因此使用scheduler添加一个调度器其中设置脏数据标志位，每次取值时去判断标志位是否正常即可 | 将计算属性使用effect包裹时，当计算属性变化时不会调用effect函数。因为使用的是lazy手动调用加载。 |
| 10   | computed-react  | 通过在读取值时添加监听对计算属性value字段的变化，并在scheduler中触发对应的响应函数。此时当计算属性的value变化时就能监听触发了 | 计算属性只有手动需要时再回去调用触发，可往往我们需要监听一个大对象的内部变化，可能一个大对象内部小改变需要被实时监听到【缺少watch函数】 |
| 11   | watch           | watch相较于普通effect区别在于前者监听内部所有变化后者是监听调用值的变化<br>因此我们只需要在effect中把所有当前对象的属性都递归调用一遍注册响应式依赖，scheduler中触发用户回调 | 有时我们可能不是对一个不变的对象进行watch，还可能对一个函数返回值进行watch，此时可能需要对函数进行操作执行 |
| 12   | watch-Fn        | 只需要在接收监听项时对其进行类型判断，若是函数则调用执行对其返回值监听即可 | 无法每次都能watch到变化前和变化后的值                        |
| 13   | watch-oldvalue  | scheduler触发回调时添加新旧值的参数，将其改写成lazy使得新值通过手动调用函数获取，老值通过缓存获取并每次更新 | 此时watch的自定义函数是当内部变化时才会去调用执行的，但有时我们需要首次创建时立即执行 |
| 14   | watch-immediate | 添加immediate选项，若被设定则立即执行一次调度器依赖函数即可  | 请求快慢导致的竞态问题十分常见，因此在watch内部中需要合理将过时调用进行丢弃 |
| 15   | watch-race      | 在scheduler中触发时会调用上一次的非法函数，使得上一次的依赖触发时先判断到非法标志位后丢弃 | 完美撒花🎉🎉🎉                                                  |
