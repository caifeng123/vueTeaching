/**
 * 创建renderer函数
 * 适配于各种环境(spa、服务端渲染)
 */

import {getType, Type} from "@/utils";
import {VNODE_TYPE, PositionType} from "./constants";
import {normalizeClass, shouldSetAsProps} from "./utils";

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
        }
        const TEXT_NODE = {
            // 处理文本节点
            [VNODE_TYPE.TEXT]: () => {
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
            },
            [VNODE_TYPE.FRAGMENT]: () => {
                if (!oldVnode) {
                    // 没有老节点则将所有子节点都新增到容器末尾
                    newVnode.children.forEach((element) =>
                        patch(null, element, container)
                    );
                } else {
                    // 更新所有children
                    patchChildren(oldVnode, newVnode, container);
                }
            },
        };
        TEXT_NODE[type]?.();
        // 自定义组件情况
        if (typeof type === "object") {
        }
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
