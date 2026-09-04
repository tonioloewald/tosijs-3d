/**
 * Read a callback under its NEW name, falling back to the deprecated `onX`.
 *
 * ```js
 * handlerOf(config, 'handleChange', 'onChange')?.(value)
 * ```
 */
export declare function handlerOf<T>(config: Record<string, unknown>, handleName: string, onName: string): T | undefined;
/**
 * Test seam — the warning is once-per-name for the life of the module, which
 * makes a second test asserting on it silently pass for the wrong reason.
 */
export declare function resetHandlerWarnings(): void;
//# sourceMappingURL=handler-of.d.ts.map