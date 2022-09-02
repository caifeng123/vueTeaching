/**
 * @file proxy简单实现响应式
 * @author caifeng01
 */

const data = {
    text: "cc123nice",
};

const bucket = new Set<() => void>();

let activeEffect = () => {
    console.log(11);
};

const obj = new Proxy(data, {
    get(target, key) {
        bucket.add(activeEffect);
        return target[key];
    },
    set(target, key, value) {
        target[key] = value;
        bucket.forEach((fn) => fn());
        return true;
    },
});

function effect(fn: () => void) {
    activeEffect = fn;
    fn();
}

export {effect, obj};
