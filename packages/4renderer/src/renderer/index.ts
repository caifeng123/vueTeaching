/**
 * 创建renderer函数
 * 适配于各种环境(spa、服务端渲染)
 */

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

import {getType, Type} from "@/utils";

const shouldSetAsProps = (element, key) => {
    // 不可变标签特殊处理
    if (element.tagName === "INPUT" && key === "form") {
        return false;
    }
    return key in element;
};

// 通过传入不同环境的操作节点方法
export const createRenderer = ({
    createElement,
    setElementText,
    insert,
    patchProps,
}) => {
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

    const patch = (oldVNode, newVNode, container) => {
        if (!oldVNode) {
            mountElement(newVNode, container);
        }
    };
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
    createElement: document.createElement,
    setElementText: (element, text) => (element.text = text),
    insert: (element, container) => container.appendChild(element),
    patchProps: (element, propKey, propValue) => {
        // 设置属性若是标签自带属性则使用赋值，其他使用setAttribute方式
        // 原因参考 input.value 与 input.setAttribute() 差异
        // 前者能修改value后者不行。setAttribute是设置初始值
        // 并且要处理不可变标签值
        if (shouldSetAsProps(element, propKey)) {
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
