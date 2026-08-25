/** Minimal vector — deliberately not Babylon's, so this module stays pure. */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
/** Unit vector, or `null` for a zero-length input (which has no direction). */
export declare function normalize(v: Vec3): Vec3 | null;
/**
 * Angle in DEGREES between where the viewer looks and where the dialog is.
 *
 * Returns `0` when the dialog is exactly on the view axis and `180` when it is
 * directly behind. A dialog at the viewer's own position has no direction, and
 * is reported as `0` — on-axis — because "you are inside it" is not a reason to
 * go and fetch it.
 */
export declare function gazeOffAxisDeg(eye: Vec3, forward: Vec3, dialog: Vec3): number;
/** How long the dialog has been out of view, in seconds. */
export interface GazeState {
    offAxisSec: number;
}
export declare const newGazeState: () => GazeState;
export interface GazeOptions {
    /** Half-angle you may look away by before the clock starts. Default 55°. */
    coneDeg?: number;
    /** Seconds outside the cone before the dialog comes to you. Default 2. */
    holdSec?: number;
}
/**
 * Advance the look-away clock and say whether the dialog should re-place.
 *
 * The clock **resets** the moment the dialog is back inside the cone, so a
 * glance away costs nothing — only sustained inattention moves it. Returns the
 * next state alongside the decision rather than mutating, so the rule is
 * testable and the caller owns the state.
 */
export declare function gazeStep(state: GazeState, offAxisDeg: number, dt: number, opts?: GazeOptions): {
    state: GazeState;
    recover: boolean;
};
/**
 * Pick the best of several candidate distances — the results of casting a ray
 * along each candidate direction.
 *
 * `Infinity` means nothing was hit, i.e. fully clear. The winner is the
 * candidate with the most room, preferring EARLIER candidates on a tie so a
 * caller can order them by desirability (straight ahead first). Returns `-1`
 * when every candidate is too cramped to use.
 */
export declare function bestCandidate(clearances: number[], minClearance: number): number;
/**
 * How far along a candidate direction to actually sit.
 *
 * Short of the obstruction by `margin` so the panel is not coplanar with a wall,
 * never past the distance you asked for, and never closer than `minZ` — a panel
 * at arm's length is uncomfortable in a headset, which is why "just use the near
 * clip plane" is the wrong version of this idea.
 */
export declare function placementDistance(clearance: number, desired: number, minZ?: number, margin?: number): number;
/**
 * Ease a position toward a target — frame-rate independent.
 *
 * `smoothing` is the fraction of the remaining distance left after one second,
 * so the result does not change when the frame rate does (the naive
 * `lerp(a, b, 0.1)` per frame moves twice as fast at 120fps as at 60).
 */
export declare function easeTo(current: Vec3, target: Vec3, dt: number, smoothing?: number): Vec3;
//# sourceMappingURL=dialog-placement.d.ts.map