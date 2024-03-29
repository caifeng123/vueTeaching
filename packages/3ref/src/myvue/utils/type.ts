/**
 * @file 类型集合
 * @author caifeng01
 */

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

export type DepsMap = Map<any, DepsSet>;

export type WatchValueMapType<T> = {
    new?: T;
    old?: T;
};

export type WatchOptions = {
    immediate?: boolean;
};

// 设置属性枚举类型
export enum TriggerType {
    SET = "SET",
    ADD = "ADD",
    DELETE = "DELETE",
}

// 类型type枚举类, 校验类型用
export enum Type {
    String = "String",
    Number = "Number",
    Boolean = "Boolean",
    BigInt = "BigInt",
    Symbol = "Symbol",
    Null = "Null",
    Undefined = "Undefined",
    Map = "Map",
    Set = "Set",
    Object = "Object",
    Function = "Function",
    Date = "Date",
    Array = "Array",
}

export type BasicType =
    | string
    | number
    | boolean
    | bigint
    | null
    | undefined
    | symbol;
