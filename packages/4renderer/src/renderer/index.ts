/**
 * 创建renderer函数
 * 适配于各种环境(spa、服务端渲染)
 */

import {getType, Type} from "@/utils";
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
}) => {
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
                // diff算法
                // 此处朴素做法全删再全加
                oldChildren.forEach(unmount);
                newChildren.forEach((el) => mountElement(el, container));
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
    const mountElement = (vnode, container) => {
        const {type, children, props} = vnode;
        const element = (vnode.el = createElement(vnode.type));
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
        insert(element, container);
    };
    // 卸载节点
    const unmount = (vnode) => {
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
    const patch = (oldVnode, newVnode, container) => {
        // 处理前后vnode类型不同情况div -> input 先卸载在挂载
        if (oldVnode && oldVnode.type !== newVnode.type) {
            unmount(oldVnode);
            oldVnode = null;
        }
        const {type} = newVnode;
        // 处理普通标签情况
        if (typeof type === "string") {
            if (!oldVnode) {
                mountElement(newVnode, container);
            } else {
                patchElement(oldVnode, newVnode);
            }
        }
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
createRenderer({
    // 创建节点
    createElement: document.createElement,
    // 设置文本节点信息
    setElementText: (element, text) => (element.text = text),
    // 向容器中追加节点
    insert: (element, container) => container.appendChild(element),
    // 对新节点做更新
    // 设置属性若是标签自带属性则使用赋值，其他使用setAttribute方式
    // 原因参考 input.value 与 input.setAttribute() 差异
    // 前者能修改value后者不行。setAttribute是设置初始值
    // 并且要处理不可变标签值
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
});
