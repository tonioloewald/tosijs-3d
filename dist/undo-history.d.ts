export interface UndoHistory<T> {
    /** Keep `state` as the newest step (dropping any undone ones). False when it equals the current one. */
    record(state: T): boolean;
    /** Step back: the state to restore, or undefined when there is none. */
    undo(): T | undefined;
    /** Step forward again after an undo. */
    redo(): T | undefined;
    /** The state at the current step. */
    current(): T | undefined;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    /** Forget everything; with `state`, start again from it. */
    clear(state?: T): void;
}
export declare function undoHistory<T>(options?: {
    limit?: number;
    same?: (a: T, b: T) => boolean;
}): UndoHistory<T>;
//# sourceMappingURL=undo-history.d.ts.map