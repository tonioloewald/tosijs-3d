/** Set the base URL prepended to logical asset paths (e.g. `https://cdn.tosijs.net`). */
export declare function setAssetBase(url: string): void;
/** The current asset base (`''` = resolve locally). */
export declare function getAssetBase(): string;
/**
 * Resolve a logical asset path against the base. Absolute URLs (`http(s)://`,
 * `data:`, `blob:`) pass through unchanged.
 */
export declare function assetUrl(path: string): string;
//# sourceMappingURL=asset-url.d.ts.map