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

/**
 * 使用insertAdjacentElement插入dom插入位置
 * <!-- beforebegin -->
 * <p>
 * <!-- afterbegin -->
 *     foo
 * <!-- beforeend -->
 * </p>
 * <!-- afterend -->
 */
export type PositionType = 'afterbegin' | 'afterend' | 'beforebegin' | 'beforeend';