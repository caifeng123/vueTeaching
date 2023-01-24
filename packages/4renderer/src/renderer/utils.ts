/**
 * @file 渲染器所用工具函数
 * @author caifeng01
 */
import {getType, Type} from "@/utils";

/**
 * 对不可变标签特殊处理不进行修改操作
 * 只用setAttribute操作(大部分情况类似初始化)
 */
export const shouldSetAsProps = (element: Element, key: string) => {
    // 不可变标签特殊处理
    if (element.tagName === "INPUT" && key === "form") {
        return false;
    }
    return key in element;
};
type classNameType = string | Record<string, boolean>;

/**
 * 将className进行打平
 * ['123', {ok: true}] => '123 ok'
 * 三种改变class的方式性能比较 el.className > el.classList > setAttribute
 */
export const normalizeClass = (
    classNames: classNameType[] | classNameType
): string => {
    const dealNormalMap = {
        [Type.Array]: (classNames: classNameType[]) =>
            classNames.reduce(
                (all, temp) => `${all} ${normalizeClass(temp)}`,
                ""
            ),
        [Type.String]: (classNames: string) => classNames,
        [Type.Object]: (classNames: Record<string, boolean>) => {
            let temp = "";
            for (const key in classNames) {
                if (classNames[key]) {
                    temp += key;
                }
            }
            return temp;
        },
    };
    return dealNormalMap[getType(classNames)].trim();
};

/**
 * 最长递增子序列
 */
export const getSequence = arr => {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    // 遍历数组
    for (i = 0; i < len; i++) {
        const arrI = arr[i]
        // 此算法中排除了等于0的情况，原因是0成为了diff算法中的占位符，在上面的流程图中已经忽略了，不影响对算法的了解
        if (arrI !== 0) {
        j = result[result.length - 1]
        // 用当前num与result中的最后一项对比
        if (arr[j] < arrI) {
            // 当前数值大于result子序列最后一项时，直接往后新增，并将当前数值的前一位result保存
            p[i] = j
            result.push(i)
            continue
        }
        u = 0
        v = result.length - 1
        // 当前数值小于result子序列最后一项时，使用二分法找到第一个大于当前数值的下标
        while (u < v) {
            c = ((u + v) / 2) | 0
            if (arr[result[c]] < arrI) {
            u = c + 1
            } else {
            v = c
            }
        }
        if (arrI < arr[result[u]]) {
            // 找到下标，将当前下标对应的前一位result保存(如果找到的是第一位，不需要操作，第一位前面没有了)
            if (u > 0) {
            p[i] = result[u - 1]
            }
            // 找到下标，直接替换result中的数值
            result[u] = i
        }
        }
    }
    u = result.length
    v = result[u - 1]
    // 回溯，直接从最后一位开始，将前面的result全部覆盖，如果不需要修正，则p中记录的每一项都是对应的前一位，不会有任何影响
    while (u-- > 0) {
        result[u] = v
        v = p[v]
    }
    return result
}

// 任务队列set 去重用
const queueJobSet = new Set<Function>();
// 是否处于刷新态
let isFlushing = false;
// resolve的微任务
const p = Promise.resolve();

export const queueJob = fn => {
    queueJobSet.add(fn);
    if (!isFlushing) {
        try {
            isFlushing = true;
            // 加入微任务执行
            p.then(() => queueJobSet.forEach(job => job()));
        } finally {
            // 清空重置
            isFlushing = false;
            queueJobSet.clear();
        }
    }
};

/**
 * 将props进行区分
 * @param options 组件定义props
 * @param propsData 真实传入props
 * @returns [props, attrs] [真实参数, 其他属性]
 */
export const resolveProps = (options: Record<string, any>, propsData: Record<string, any>) => {
    const props = {};
    const attrs = {};
    for (const key in propsData) {
        if (key in options || key.startsWith('on')) {
            props[key] = propsData[key];
        } else {
            attrs[key] = propsData[key];
        }
    };
    return [props, attrs]
}

/**
 * 判断新props是否有变化, 确保是否需要重新渲染
 * @param oldProps 
 * @param newProps 
 * @returns boolean
 */
export const hasPropsChanged = (oldProps: Record<string, any>, newProps: Record<string, any>) => {
    // 避免访问原型链
    const newKeys = Object.keys(newProps);
    if (Object.keys(oldProps).length !== newKeys.length) {
        return true;
    }
    for (const key of newKeys) {
        if (oldProps[key] !== newProps[key]) {
            return true;
        }
    }
    return false;
};
