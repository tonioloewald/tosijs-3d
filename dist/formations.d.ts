export type Offset = {
    x: number;
    y: number;
    z: number;
};
export type RingOptions = {
    /** Height of the ring relative to the centre. Default 0. */
    y?: number;
    /** Rotate the whole ring (radians) — so two rings don't line up. Default 0. */
    phase?: number;
};
/**
 * `count` points evenly spaced on a circle of `radius`. The classic escort screen, a ring of
 * perimeter turrets, a patrol orbit.
 */
export declare function ring(count: number, radius: number, opts?: RingOptions): Offset[];
export type VeeOptions = {
    /** Lateral gap between neighbours. Default 12. */
    spacing?: number;
    /** How far back each rank sits (the sweep of the V). Default = spacing. */
    sweep?: number;
    /** Height step per rank — a stacked (stepped-down) vee. Default 0. */
    yStep?: number;
};
/**
 * A **vee**: a leader at the origin and the rest fanned out behind, alternating left/right.
 * `count` INCLUDES the leader, so `vee(1)` is just the leader at the origin — which is what
 * you want when an encounter shrinks as you shoot it down.
 */
export declare function vee(count: number, opts?: VeeOptions): Offset[];
/**
 * `count` escorts arranged around a leader at the origin — a ring, but phase-shifted so the
 * screen never has a member sitting dead ahead of the leader (which reads as a collision
 * waiting to happen, and blocks the leader's own line of fire).
 */
export declare function escorts(count: number, radius: number, opts?: RingOptions): Offset[];
/** A straight line of `count`, centred on the origin, running along local X. */
export declare function line(count: number, spacing: number): Offset[];
/** Translate offsets to a world centre. */
export declare function at(centre: Offset, offsets: Offset[]): Offset[];
//# sourceMappingURL=formations.d.ts.map