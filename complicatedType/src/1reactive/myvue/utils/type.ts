export type EffectOptions = {
    lazy?: boolean;
    scheduler?: (fn: () => any) => void;
};

export type EffectFnType = {
    (): any;
    deps: DepsSet[];
    options: EffectOptions;
};

export type DepsSet = Set<EffectFnType>;

export type DepsMap = Map<string | symbol, DepsSet>;

export type DataType = Record<string | symbol, any>;

export type WatchValueMapType<T> = {
    new?: T;
    old?: T;
};

export type WatchOptions = {
    immediate?: boolean;
};

// @add 设置属性枚举类型
export enum TriggerType {
    SET = "SET",
    ADD = "ADD",
    DELETE = "DELETE",
}
