/** A fog state — all UNIFORMS. The fog MODE is deliberately not here: changing it recompiles
 * every shader, so it's set once and never touched. */
export type FogState = {
    /** rgb, 0…1 each. */
    color: {
        r: number;
        g: number;
        b: number;
    };
    density: number;
    start: number;
    end: number;
};
/**
 * A contributor. `weight` 0 = absent, 1 = fully in charge. Fields left undefined are simply
 * not pulled (a layer may change colour without touching density).
 */
export type FogLayer = {
    weight: number;
    color?: {
        r: number;
        g: number;
        b: number;
    };
    density?: number;
    start?: number;
    end?: number;
};
/**
 * Composite layers over a base, in order. Each pulls the running state toward itself by its
 * weight — so a half-submerged camera is half-way to underwater, and a cloud you're just
 * brushing barely whitens.
 */
export declare function compositeFog(base: FogState, layers: FogLayer[]): FogState;
/**
 * Move `current` toward `target` with a time constant — frame-rate independent, so it feels
 * the same at 60 and at 90. This is the last line of defence against a pop: even if a layer's
 * weight jumps (a cloud recycles behind you, a camera teleports), the *fog* eases.
 *
 * `tau` is the time to close ~63% of the gap. ~0.25s reads as "instant but not jarring".
 */
export declare function approachFog(current: FogState, target: FogState, dt: number, tau?: number): FogState;
/**
 * Weight for a **band** transition: 0 outside, 1 past `full`, smoothly between. Use it for
 * anything that would otherwise flip at a boundary.
 *
 * The water surface is the canonical case: a plane test (`camY < waterY`) snaps, and you feel
 * it. A band over even a metre or two reads as *entering* the water rather than teleporting
 * into it.
 */
export declare function band(value: number, startAt: number, full: number): number;
//# sourceMappingURL=atmosphere.d.ts.map