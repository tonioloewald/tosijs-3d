/**
 * Read a callback by its name. `onName` is the spelling removed in 0.10: it is
 * never returned, and a function found there is reported once.
 *
 * ```js
 * handlerOf(config, 'handleChange', 'onChange')?.(value)
 * ```
 */
export declare function handlerOf<T>(config: Record<string, unknown>, handleName: string, onName: string, 
/** Whose option this is (`'<tosi-b3d-trigger>'`), named in the warning. */
where?: string): T | undefined;
/**
 * Test seam — the warning is once-per-name for the life of the module, which
 * makes a second test asserting on it silently pass for the wrong reason.
 */
export declare function resetHandlerWarnings(): void;
//# sourceMappingURL=handler-of.d.ts.map