/**
 * 创建renderer函数
 * 适配于各种环境(spa、服务端渲染)
 */

import {getType, Type} from "@/utils";
import {VNODE_TYPE, PositionType} from "./constants";
import {getSequence, hasPropsChanged, normalizeClass, queueJob, resolveProps, shouldSetAsProps} from "./utils";
import {reactive, effect, shallowReactive, shallowReadonly} from "../reactivity";

// 记录当前挂载组件信息
export let currentVnodeComponent = null;

// const vnode = {
//     type: 'div',
//     props: {
//         id: 'pp'
//     },
//     children: [
//         {
//             type: 'p',
//             children: '123'
//         }
//     ]
// };

// 通过传入不同环境的操作节点方法
export const createRenderer = ({
    createElement,
    setElementText,
    insert,
    patchProps,
    createText,
    setText,
}) => {
    // 简单diff算法
    const easyDiff = (oldChildren, newChildren, container) => {
        // 最后操作的数值
        let lastIndex = 0;
        // 1、迭代newChildren确保新数据都被挂载
        for(let i = 0;i < newChildren.length;i++) {
            const newVnode = newChildren[i];
            // 用来判断当前新节点是否能复用
            let hasOldNode = false;
            for(let j = 0;j < oldChildren;j++) {
                const oldVnode = oldChildren[j];
                // 只有key相同!可复用
                if(newVnode.key === oldVnode.key) {

                    hasOldNode = true;
                    // 更新同key的新老节点
                    patch(oldVnode, newVnode, container);

                    // 是否要移动当前挂载位置
                    if(j < lastIndex) {
                        // 若小于当前挂载最后位置，则说明需要移动
                        // - 获取上一个真实节点
                        //   - 若存在则需要移动到最后一个位置
                        //   - 不存在则说明顺序正确

                        // 获取newVnode的前一个vnode
                        const prevVnode = newChildren[i - 1];
                        // 若第一个则没有前节点不需要调整位置
                        if(prevVnode) {
                            // 在prevVnode真实dom后添加上新vnode节点
                            insert(newVnode.el, prevVnode.el, 'afterend')
                        }
                    } else {
                        // 大于等于最后位置, 则说明顺序正确不需要移动，更新最后位置
                        lastIndex = j;
                    }
                    break;
                }
            }
            // 没有老节点匹配说明当前需要新增!
            if (!hasOldNode) {
                // 获取newVnode的前一个vnode
                const prevVnode = newChildren[i - 1];
                // 若有前一个则在其后添加一个新节点
                if (prevVnode) {
                    // 在prevVnode真实dom后添加上新vnode节点
                    patch(null, newVnode, prevVnode.el, 'afterend')
                } else {
                    // 说明是第一项
                    patch(null, newVnode, container, 'afterbegin');
                }
            }
        }
        // 2、移除oldChildren中没被复用的老节点
        for(let i = 0;i < oldChildren.length;i++) {
            const oldVnode = oldChildren[i];
            const isUsed = !!newChildren.find(({key}) => key === oldVnode.key);
            if (!isUsed) {
                unmount(oldVnode);
            }
        }
    }
    // 双端diff算法
    const twiceDiff = (oldChildren, newChildren, container) => {
        let oldStart = 0;
        let oldEnd = oldChildren.length - 1;
        let newStart = 0;
        let newEnd = newChildren.length - 1;

        while (oldStart <= oldEnd && newStart <= newEnd) {
            const oldStartVnode = oldChildren[oldStart];
            const oldEndVnode = oldChildren[oldEnd];
            const newStartVnode = newChildren[newStart];
            const newEndVnode = newChildren[newEnd];

            // 1.复用key
            if (oldStartVnode.key === newStartVnode.key) {
                // 新老start相同 无需换位置

                // 统一新老node - 两者指向统一,参数更新
                patch(oldStartVnode, newStartVnode, container);
                oldStart++;
                newStart++;
            } else if (oldEndVnode.key === newEndVnode.key) {
                // 新老start相同 无需换位置

                // 统一新老node - 两者指向统一,参数更新
                patch(oldEndVnode, newEndVnode, container);
                oldEnd--;
                newEnd--;
            } else if (oldStartVnode.key === newEndVnode.key) {
                // 老start新end相同 需要将start拽到当前未排序的队列最下面[newEnd的后面一个]使得位置变为未排序最后一个

                // 统一新老node - 两者指向统一,参数更新
                patch(oldStartVnode, newEndVnode, container);
                // 将当前dom移动到老末尾dom的后面
                insert(newEndVnode.el, oldEndVnode.el, 'afterend');
                oldStart++;
                newEnd--;
            } else if (oldEndVnode.key === newStartVnode.key) {
                // 老end新start相同 需要将end拽到当前未排序的队列最前面[newStart最前面]使得位置变为未排序第一个

                patch(oldEndVnode, newStartVnode, container);
                // 将当前dom移动到老起始dom之前
                insert(newStartVnode.el, oldStartVnode.el, 'beforebegin');
                oldEnd--;
                newStart++;
            } else {
                // 2.四个可选的key都没命中,则按朴素算法获取dom
                const indInOld = oldChildren.findIndex(({key}) => key === newStartVnode.key);
                if (indInOld > 0) {
                    // 2.1找到了则需要进行更新+移动操作
                    const oldVnode = oldChildren[indInOld];
                    // 2.1.1更新
                    patch(oldVnode, newStartVnode, container);
                    // 2.1.2移动 - 把最新节点移动到对位start dom的前面
                    insert(newStartVnode.el, oldStartVnode.el, 'beforebegin');
                    // 清空原dom点，防止后面继续比较
                    oldChildren[indInOld] = undefined;
                }else{
                    // 2.2 没找到需要新增
                    patch(null, newStartVnode, oldStartVnode.el, 'beforebegin');
                }
                newStart++;
            }
        }
        // 处理老虚拟dom数组遍历完, 新虚拟dom还有余【说明老虚拟dom都被复用 需要进行新增】
        while (oldStart > oldEnd && newStart <= newEnd) {
            const newStartVnode = newChildren[newStart++];
            patch(null, newStartVnode, container)
        }
        // 处理新虚拟dom数组遍历完，老虚拟dom还有余【说明新虚拟dom都被处理了 需要删除老无用dom】
        while (oldStart <= oldEnd && newStart > newEnd) {
            const oldStartVnode = oldChildren[oldStart++];
            unmount(oldStartVnode);
        }
    }
    // 快速diff算法
    const fastDiff = (oldChildren, newChildren, container) => {
        // 1 快速过滤头相同的节点
        let start = 0;
        while (oldChildren[start].key === newChildren[start].key){
            patch(oldChildren[start], newChildren[start], container);
            start++;
        }

        let oldEnd = oldChildren.length - 1;
        let newEnd = newChildren.length - 1;

        // 当新老节点数量、key都相同【可能里面的内容不一样】则直接头对比结束后退出
        // 既新老节点都不剩的情况对应3中缺失的点
        if (start > oldEnd && start > newEnd) {
            return;
        }

        // 2 快速过滤尾相同的节点
        while (oldChildren[oldEnd].key === newChildren[newEnd].key){
            patch(oldChildren[oldEnd], newChildren[newEnd], container);
            oldEnd--;
            newEnd--;
        }

        // 3 处理其余节点情况
        // 3.1 当老节点都被过滤完且新节点还有剩, 需要新增新节点
        if (start > oldEnd && start <= newEnd) {
            const beforeStart = start - 1;
            // 将未处理的新节点都新增
            // 倒序新增 例如 start = 2; newEnd = 5; newChildren = [1, 2, 3, 4, 5];
            // [1, 5] => [1, 4, 5] => [1, 3, 4, 5] => [1, 2, 3, 4, 5]
            while (start <= newEnd) {
                patch(null, newChildren[newEnd], newChildren[beforeStart], 'afterend');
                newEnd--;
            }
        // 3.2 当新节点都被过滤完时且老节点还有剩, 需要删除老节点
        } else if (start <= oldEnd && start > newEnd) {
            // 将未处理的老节点都删除
            while (start <= oldEnd) {
                unmount(oldChildren[oldEnd]);
                oldEnd--;
            }
        // 3.3 其他情况 - 新节点和老节点都有剩余
        } else {
            // 生成新节点列表对应的老节点下标[相同key则指向老节点下标否则为-1]
            const source = new Array(newEnd - start + 1).fill(-1);
            // 生成新节点 {key: index} 组合对象
            const keyIndex = {};
            for (let i = start; i <= newEnd;i++) {
                keyIndex[newChildren[i].key] = i;
            };

            // 是否需要节点位置变化
            let move = false;
            // 记录上一节点位置 - 标志位
            let pos = 0;
            // 更新节点数量 - 提前退出循环
            let patched = 0;

            // 3.3.1 复用老节点
            for (let i = start;i <= oldEnd;i++) {
                const oldVnode = oldChildren[i];
                const k = keyIndex[oldVnode.key];
                // 3.3.2 若更新过的节点数量少于需要更新的数量，则要进行判断更新
                if (patched < source.length) {
                    // 3.3.1.1 key存在 可复用
                    if (oldVnode.key in keyIndex) {
                        const newVnode = newChildren[k];
                        patch(oldVnode, newVnode, container);
                        // 填充到source数组中
                        source[k - start] = i;

                        // 可复用更新值+1
                        patched++;
                        // 若相对位置有冲突 则需要进行dom节点移动
                        if (k < pos) {
                            move = true;
                        } else {
                            pos = k;
                        }
                    } else {
                    // 3.3.1.2 key不存在 不可复用 卸载
                        unmount(oldVnode);
                    }
                } else {
                    // 3.3.2.1 否则直接卸载
                    unmount(oldVnode);
                }
            }

            // 3.3.3 处理复用节点位置移动 + 其他新增节点
            if (move) {
                // 3.3.3.1 计算最长递增子序列 - 用作无需移动列表
                const lis = getSequence(source);

                let headInd = 0;
                // 3.3.3.2 循环source列表
                for (let i = 0;i < source.length;i++) {
                    const newVnodeInd = i + start;
                    // 3.3.3.2.1 不存在可复用节点时说明需要新增
                    if (source[i] === -1) {
                        if (newVnodeInd) {
                            // 非第0个 有前一项进行定位插入
                            patch(null, newChildren[newVnodeInd], newChildren[newVnodeInd - 1].el, 'afterend');
                        } else {
                            // 第0个 直接插入在第一项
                            patch(null, newChildren[newVnodeInd], container, 'beforeend');
                        }
                    // 3.3.3.2.2 若命中了递增子序列时无需操作
                    } else if (source[i] === lis[headInd]) {
                        headInd++;
                    // 3.3.3.2.3 其余情况说明需要移动dom了
                    } else {
                        if (newVnodeInd) {
                            // 非第0个 有前一项进行定位插入
                            insert(newChildren[newVnodeInd].el, newChildren[newVnodeInd - 1].el, 'afterend');
                        } else {
                            // 第0个 直接插入在第一项
                            insert(newChildren[newVnodeInd].el, container);
                        }
                    }
                }
            }
        }
    }
    // 更新children
    const patchChildren = (oldVnode, newVnode, container) => {
        const oldChildren = oldVnode.children;
        const newChildren = newVnode.children;
        const oldChildrenType = getType(oldChildren);
        const newChildrenType = getType(newChildren);
        // 类型只有string | array两种
        // 当相同时 string 直接赋值 array进行diff
        if (oldChildrenType === newChildrenType) {
            if (oldChildrenType === Type.String) {
                setElementText(container, newChildren);
            } else {
                // 1、朴素做法全删再全加
                // oldChildren.forEach(unmount);
                // newChildren.forEach((el) => mountElement(el, container));

                // 2、简单diff算法
                easyDiff(oldChildren, newChildren, container);

                // 3、双端diff
                twiceDiff(oldChildren, newChildren, container);

                // 4、快速diff算法
                fastDiff(oldChildren, newChildren, container);
            }
        }
        // 不同时 老string则删除挂载新数组，老array先卸载再挂载文本
        else {
            if (oldChildrenType === Type.String) {
                setElementText(container, "");
                newChildren.forEach((el) => mountElement(el, container));
            } else {
                oldChildren.forEach(unmount);
                setElementText(container, newChildren);
            }
        }
    };
    // 挂载节点
    const mountElement = (vnode, container, position: PositionType = 'beforeend') => {
        const {type, children, props} = vnode;
        const element = (vnode.el = createElement(type));
        const Mount_Node_MAP = {
            string: () => setElementText(element, children),
            array: () =>
                vnode.children.forEach((tempVnode) =>
                    mountElement(tempVnode, element)
                ),
        };
        Mount_Node_MAP[typeof children]();
        if (props) {
            for (const key in props) {
                patchProps(element, key, null, props[key]);
            }
        }
        insert(element, container, position)
    };
    // 卸载节点
    const unmount = (vnode) => {
        // Fragment类型需要卸载所有
        if (vnode.type === VNODE_TYPE.FRAGMENT) {
            vnode.children.forEach(unmount);
            return;
        }
        const {parentNode} = vnode.el;
        if (parentNode) parentNode.remove(vnode.el);
    };
    // 更新节点
    const patchElement = (oldVnode, newVnode) => {
        const el = (oldVnode.el = newVnode.el);

        // 处理props
        const oldProps = oldVnode.props;
        const newProps = newVnode.props;
        // 获取前后props的key
        const allKeys = Object.keys({...oldProps, ...newProps});
        for (const key of allKeys) {
            if (newProps[key] !== oldProps[key]) {
                patchProps(el, key, oldProps[key], newProps[key]);
            }
        }

        // 处理children
        patchChildren(oldVnode, newVnode, el);
    };
    // 挂载组件
    const mountComponent = (vnode, container, position) => {
        // 此时vnode.type为自定义组件
        // demo:
        // <MyComponent name="111" :hehe="nice" />
        //
        // const VNode = {
        //     type: MyComponent,
        //     props: {
        //         name: '111',
        //         hehe: this.nice
        //     },
        // };
        //
        // const MyComponent = {
        //     name: 'MyComponent',
        //     props: {
        //         name: String
        //     },
        //     data() {
        //         return {
        //             text: '123'
        //         }
        //     },
        //     render() { // 返回虚拟dom
        //         return {
        //             type: 'div',
        //             children: this.text
        //         }
        //     }
        // };
        // 获取用户自定义信息 - 渲染函数、数据、生命周期等
        let {
            render,
            data,
            props: propsType,
            beforeCreate,
            created,
            beforeMount,
            mounted,
            beforeUpdate,
            updated,
            setup
        } = vnode.type;
        // beforeCreate钩子
        beforeCreate?.();

        // 将数据变为响应式
        const state = reactive(data());

        const [props, attrs] = resolveProps(propsType, vnode.props);

        const slots = vnode.children || {};

        // 初始化数据用于后期更新时检查上次数据
        vnode.component = {
            // 当前数据
            state,
            // props数据浅响应
            props: shallowReactive(props),
            // 当前挂载状态
            isMount: false,
            // 当前真实vnode
            realVnode: null,
            // 记录插槽
            slots,
            // 生命周期钩子
            mounted: [],
            updated: [],
            beforemount: [],
            beforeupdate: []
        };
        // 设置当前currentVnodeComponent 在setup时执行
        currentVnodeComponent = vnode.component;
        /**
         * setup内部调用触发父组件自定义注册的事件
         */
        const emit = (eventName: string, ...payload) => {
            const eventNewName = `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
            const handler = vnode.component.props[eventNewName];
            if (handler) {
                handler(...payload)
            } else {
                console.error('事件不存在')
            }
        };

        const setupContext = {attrs, emit, slots};

        // setup会返回组件实例或数据
        const setupResult = setup(shallowReadonly(vnode.component.props), setupContext);

        // setup执行完后清空
        currentVnodeComponent = null;
        let setupState = null;
        // 若返回组件模板实例则替换render进行渲染
        if(getType(setupResult) === Type.Function) {
            if (render) console.error('setup 函数返回render, 覆盖原先模板');
            render = setupResult;
        // 若返回state则也与state合并数据
        } else {
            setupState = setupResult;
        }

        const renderContext = new Proxy(vnode.component, {
            get(target, key, receiver) {
                // 获取state与props
                const {state, props, slots} = target;
                if (key === '$slots') {
                    return slots;
                }
                if (state && key in state) {
                    return Reflect.get(state, key, receiver);
                }
                if (key in props) {
                    return Reflect.get(props, key, receiver);
                }
                if (setupState && key in setupState) {
                    return Reflect.get(setupState, key, receiver);
                }
                console.error(`key: ${key as string} 不存在`);
            },
            set(target, key, value, receiver) {
                // 获取state与props
                const {state, props} = target;
                if (state && key in state) {
                    return Reflect.set(state, key, value, receiver);
                }
                if (key in props) {
                    return Reflect.set(props, key, value, receiver);
                }
                if (setupState && key in setupState) {
                    return Reflect.set(setupState, key, value, receiver);
                }
                console.error(`key: ${key as string} 不存在`);
            },
        })

        // created 钩子
        created?.(renderContext);

        // 当state数据变化时，自动执行render渲染+挂载操作
        effect(() => {
            // 执行渲染函数获取真实虚拟dom, 将state作为this
            const realVnode = render.call(renderContext);
            // 已挂载
            if (vnode.component.isMount) {
                // beforeUpdate 钩子
                beforeUpdate?.(renderContext);
                // setup中注册的函数
                vnode.component.beforeupdate.forEach(func => func.call(renderContext));
                // 更新虚拟dom
                patch(vnode.component.realVnode, realVnode, container, position);
                // updated 钩子
                updated?.(renderContext);
                // setup中注册的函数
                vnode.component.updated.forEach(func => func.call(renderContext));
            // 未挂载
            } else {
                // beforeMount 钩子
                beforeMount?.(renderContext);
                // setup中注册的函数
                vnode.component.beforemount.forEach(func => func.call(renderContext));
                // 挂载真实虚拟dom
                patch(null, realVnode, container, position);
                vnode.component.isMount = true;

                // mounted 钩子
                mounted?.(renderContext);
                // setup中注册的函数
                vnode.component.mounted.forEach(func => func.call(renderContext));
            }
            vnode.component.realVnode = realVnode;
        }, {
            // 自定义执行时机【加入微任务执行】
            scheduler: queueJob
        });
    };
    // 更新组件
    const patchComponent = (oldVnode, newVnode, container, position) => {
        // 获取老组件props
        const {props} = (newVnode.component = oldVnode.component);
        // 判断实际props是否变化
        if (hasPropsChanged(oldVnode.props, newVnode.props)) {
            // 获取最新的props
            const [newProps] = resolveProps(newVnode.type.props, newVnode.props);
            // 更新props
            for (const key in newProps) {
                props[key] = newProps[key];
            }
            // 删除不存在的key
            for (const key in props) {
                if (!(key in newProps)) {
                    delete props[key];
                }
            }
        }
    };

    // 处理前后节点
    const patch = (oldVnode, newVnode, container, position?: PositionType) => {
        // 处理前后vnode类型不同情况div -> input 先卸载在挂载
        if (oldVnode && oldVnode.type !== newVnode.type) {
            unmount(oldVnode);
            oldVnode = null;
        }
        const {type} = newVnode;
        // 处理普通标签情况
        if (getType(type) === Type.String) {
            if (!oldVnode) {
                mountElement(newVnode, container, position);
            } else {
                patchElement(oldVnode, newVnode);
            }
        // 处理文本节点
        } else if (type === VNODE_TYPE.TEXT) {
            // 当老节点不存在生成一个TextNode
            if (!oldVnode) {
                const element = (newVnode.el = createText(
                    newVnode.children
                ));
                insert(element, container);
            } else {
                // 存在直接用nodeValue赋值替换
                const element = (newVnode.el = oldVnode.el);
                if (oldVnode.children !== newVnode.children) {
                    setText(element, newVnode.children);
                }
            }
        // 片段节点
        } else if (type === VNODE_TYPE.FRAGMENT) {
            if (!oldVnode) {
                // 没有老节点则将所有子节点都新增到容器末尾
                newVnode.children.forEach((element) =>
                    patch(null, element, container)
                );
            } else {
                // 更新所有children
                patchChildren(oldVnode, newVnode, container);
            }
        // 自定义组件情况
        } else if (getType(type) === Type.Object) {
            if (!oldVnode) {
                // 挂载组件
                mountComponent(newVnode, container, position);
            } else {
                // 更新组件
                patchComponent(oldVnode, newVnode, container, position);
            }
        };
    };
    // 渲染
    const render = (vnode, container) => {
        if (vnode) {
            patch(container._vnode, vnode, container);
        } else if (container._vnode) {
            unmount(container._vnode);
        }
        container._vnode = vnode;
    };
    return {
        render,
    };
};

// 浏览器端方式
export const client = createRenderer({
    /**
     * 创建节点
     */
    createElement: document.createElement,
    /*
     * 设置文本节点信息
     */
    setElementText: (element, text) => (element.text = text),
    /**
     * 向容器中追加节点
     */
    insert: (element, anchorElement, position: PositionType = 'beforeend') => {
        // 1、直接在容器最后添加child即可
        // anchorElement.appendChild(element);

        // 2、为满足定位模式, 当anchor为空时直接追加在最后
        // container.insertBefore(element, anchor)

        // 3、学习一个添加元素的api insertAdjacentElement
        anchorElement.insertAdjacentElement(position, element);
    },
    /**
     * 对新节点做更新
     * 设置属性若是标签自带属性则使用赋值，其他使用setAttribute方式
     * 原因参考 input.value 与 input.setAttribute() 差异
     * 前者能修改value后者不行。setAttribute是设置初始值
     * 并且要处理不可变标签值
     */
    patchProps: (
        element: Element & Record<string, any>,
        propKey: string,
        preValue,
        nowValue
    ) => {
        // 处理自定义事件
        if (propKey.startsWith("on")) {
            const invokers = element._invokers ?? (element._invokers = {});
            const rowKey = propKey.slice(2).toLowerCase();
            // 不存在说明首次加载, 创建invoker函数, 并添加新的事件挂载
            if (!invokers[rowKey]) {
                invokers[rowKey] = (e) => {
                    // 保证触发时间在注册时间之后
                    if (e.timeStamp < invokers[rowKey].attached) return;
                    invokers[rowKey].value.map((x) => x?.(e));
                };
                element.addEventListener(rowKey, invokers[rowKey]);
            }
            // 注册函数时同时添加
            invokers[rowKey].attached = performance.now();
            // 将新值自动变为数组型, 用于直接触发
            invokers[rowKey].value = Array.isArray(nowValue)
                ? nowValue
                : [nowValue];
        }
        // class样式组件特殊处理
        if (propKey === "class") {
            // element.className = normalizeClass(nowValue);
            element.className = nowValue;
        }
        // 标签属性且不是不可变属性,直接赋值
        else if (shouldSetAsProps(element, propKey)) {
            // 对于判断布尔值的需要挑出处理
            // 比如: [disabled] => [disabled: ''] 预期生效为true
            // 但实际[input.disabled = ''] => [input.disabled = false]
            if (typeof element[propKey] === "boolean" && nowValue === "") {
                element[propKey] = true;
            } else {
                element[propKey] = nowValue;
            }
        } else {
            element.setAttribute(propKey, nowValue);
        }
    },
    /**
     * 创建纯文本
     */
    createText: document.createTextNode,
    /**
     * 修改纯文本
     */
    setText: (element, text) => (element.nodeValue = text),
});
