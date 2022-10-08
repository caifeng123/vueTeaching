/**
 * 虚拟node的类型
 */
export const VNODE_TYPE = {
    /**
     * 文本
     */
    TEXT: Symbol(),
    /**
     * 注释
     */
    COMMENT: Symbol(),
    /**
     * Fragment 空代码段
     */
    FRAGMENT: Symbol(),
};
