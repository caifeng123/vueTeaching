/**
 * @file 常用类型
 * @author caifeng01
 */

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
