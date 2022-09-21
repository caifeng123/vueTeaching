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
