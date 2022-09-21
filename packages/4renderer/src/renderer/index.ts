/**
 * 创建renderer函数
 * 适配于各种环境(spa、服务端渲染)
 */

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
    // 挂载节点
    const mountElement = (vnode, container) => {
        const {type, children, props} = vnode;
        const element = createElement(vnode.type);
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
                patchProps(element, key, props[key]);
            }
        }
        insert(element, container);
    };
    // 更新节点
    const patch = (oldVNode, newVNode, container) => {
        if (!oldVNode) {
            mountElement(newVNode, container);
        }
    };
    // 渲染
    const render = (vnode, container) => {
        if (vnode) {
            patch(container._vnode, vnode, container);
        } else if (container._vnode) {
            container.innerHTML = "";
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
    patchProps: (element: Element, propKey, propValue) => {
        // 设置属性若是标签自带属性则使用赋值，其他使用setAttribute方式
        // 原因参考 input.value 与 input.setAttribute() 差异
        // 前者能修改value后者不行。setAttribute是设置初始值
        // 并且要处理不可变标签值

        // class样式组件特殊处理
        if (propKey === "class") {
            // element.className = normalizeClass(propValue);
            element.className = propValue;
        }
        // 标签属性且不是不可变属性,直接赋值
        else if (shouldSetAsProps(element, propKey)) {
            // 对于判断布尔值的需要挑出处理
            // 比如: [disabled] => [disabled: ''] 预期生效为true
            // 但实际[input.disabled = ''] => [input.disabled = false]
            if (typeof element[propKey] === "boolean" && propValue === "") {
                element[propKey] = true;
            } else {
                element[propKey] = propValue;
            }
        } else {
            element.setAttribute(propKey, propValue);
        }
    },
});
