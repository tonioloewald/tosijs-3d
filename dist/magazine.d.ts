export interface Magazine {
    capacity: number;
    loaded: number;
    /** Seconds until a reload finishes; 0 when not reloading. */
    reloadLeft: number;
}
export declare function makeMagazine(capacity: number, loaded?: number): Magazine;
export declare const reloading: (m: Magazine) => boolean;
/** Spend a round. False when empty or reloading. */
export declare function fireRound(m: Magazine): boolean;
/**
 * Start reloading, `seconds` long. False (nothing starts) when it is full,
 * already reloading, or the reserve (`available` rounds) is empty.
 */
export declare function beginReload(m: Magazine, seconds: number, available: number): boolean;
/** Stop a reload; the magazine keeps what it had. */
export declare function cancelReload(m: Magazine): void;
/**
 * Advance `dt` seconds; when a reload finishes, fill from `take(n)` (which
 * hands over up to n) and return `'reloaded'`.
 */
export declare function tickMagazine(m: Magazine, dt: number, take: (n: number) => number): 'reloaded' | null;
/** A new capacity (a different gun in the same hand): what is loaded is kept, up to it. */
export declare function setCapacity(m: Magazine, capacity: number): void;
//# sourceMappingURL=magazine.d.ts.map