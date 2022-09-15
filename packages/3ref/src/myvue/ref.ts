/**
 * @file: ref 包裹简单类型生成响应式
 * @author: caifeng01
 */

import {reactive} from ".";
import {BasicType} from "./utils";

/**
 * 基本类型转换为响应式ref
 */
export const ref = (value: BasicType) => {
    const temp = {
        value,
    };
    Object.defineProperty(temp, "__v_isRef", {
        value: true,
    });
    return reactive(temp);
};

/**
 * 将reactive响应式中的某项变成ref
 */
const toRef = (proxy, key) => {
    const temp = {
        get value() {
            return proxy[key];
        },
        set value(newValue) {
            proxy[key] = newValue;
        },
    };
    Object.defineProperty(temp, "__v_isRef", {
        value: true,
    });
    return temp;
};

/**
 * 将reactive响应式中的所有项变为ref
 */
export const toRefs = (proxy) => {
    const temp = {};
    for (const key in reactive) {
        temp[key] = toRef(proxy, key);
    }
    return temp;
};

/**
 * 判断是否为ref, 无需手动取值
 * 用在html中直接取值，自动脱ref
 */
export const proxyRefs = (proxy) =>
    new Proxy(proxy, {
        // 获取时自动判断是否是ref，是则返回对应value值
        get(target, key, receiver) {
            const value = Reflect.get(target, key, receiver);
            return value.__v_isRef ? value.value : value;
        },
        // 赋值前先判断是否是ref，是则将新值赋值给ref.value
        set(target, key, newValue, receiver) {
            const value = Reflect.get(target, key, receiver);
            if (value.__v_isRef) {
                value.value = newValue;
                return true;
            }
            return Reflect.set(target, key, newValue, receiver);
        },
    });
