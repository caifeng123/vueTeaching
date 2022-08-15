const ARRAY_FUNC = [
    {
        funcName: "includes",
        failValue: false,
    },
    {
        funcName: "indexOf",
        failValue: -1,
    },
    {
        funcName: "lastIndexOf",
        failValue: -1,
    },
];

/**
 * 重写Array原型方法, 目的是为了proxy对象能直接检索到原对象数据
 * 例如:
 * const obj = {1: 2};
 * const objArr = reactive([obj]);
 * objArr.includes(obj) // 不重写则为false
 * 因为objArr是proxy对象, 内部对象会被递归成reactive,因此只能找到被reactive的obj proxy对象，无法通过直接includes找到原对象
 * 因此我们需要重写, 在找不到时会去找raw原生对象
 */
export const ArrayCustomerFunc = ARRAY_FUNC.reduce(
    (all, {funcName, failValue}) => {
        const originMethod = Array.prototype[funcName];
        all[funcName] = function (...args) {
            let res = originMethod.apply(this, args);
            if (res === failValue) {
                res = originMethod.apply(this.raw, args);
            }
            return res;
        };
        return all;
    },
    {}
);
