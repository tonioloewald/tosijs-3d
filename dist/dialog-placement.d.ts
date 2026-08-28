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
 * Pick the best of several candidate directions, given how far each one is
 * clear. `Infinity` means nothing was hit. Returns `-1` when every candidate is
 * too cramped to use.
 *
 * **Enough room wins over the most room**, which is the whole point. Candidates
 * are in preference order (straight ahead first), and the rule takes the FIRST
 * one with room for the panel at roughly its intended distance. Only if none has
 * that does it fall back to the roomiest.
 *
 * It used to simply maximise clearance, and that is subtly awful in third
 * person: a follow camera looks at your character, so **your own body is the
 * thing straight ahead**, and every other direction is open sky. Measured in the
 * b3d demo — straight ahead 2.17 m (hit: `Clone of HumanBase`), all seven other
 * candidates `Infinity`. So the dialog was pushed off-axis every single time,
 * and with slightly different geometry the winner could as easily have been the
 * 180° candidate: behind you. Meanwhile 2.17 m was ample —
 * `placementDistance` would have sat the panel at 1.92 m, comfortably in front
 * of the character, exactly where you are looking.
 *
 * Reported as "I paused the b3d demo and the continue panel showed up in an
 * interesting spot."
 *
 * Omit `desired` for the old most-room behaviour.
 */
export declare function bestCandidate(clearances: number[], minClearance: number, desired?: number): number;
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
/**
 * Aim a panel's FACE at a point. Returns `{ yaw, pitch }` in **radians**, ready
 * for `Quaternion.RotationYawPitchRoll(yaw, pitch, roll)`.
 *
 * **A Babylon plane's visible front normal is local −Z, not +Z.** (Verified, not
 * assumed: `MeshBuilder.CreatePlane` normals come out `(0, 0, -1)` and our
 * `rounded-rect` geometry matches it deliberately — both pinned in
 * `babylon-orientation.test.ts`.) So the obvious `atan2(dx, dz)` aims local +Z
 * at the viewer and turns the panel's **back** to them.
 *
 * That fails in the one way nobody looks for. A `doubleSided` plane's back faces
 * reuse the front's UVs, so the panel does not vanish — it renders with the
 * texture **mirrored horizontally**, and a mirrored panel still reads as a panel
 * with its button roughly where you expect. A bug that degrades gracefully is a
 * bug that ships: this reached a release, and arrived as "the death / respawn
 * dialog was flipped horizontally" rather than as a missing dialog.
 *
 * It exists as ONE function because it had previously been answered three times,
 * differently, in three files — two compensating with `tex.uScale = -1` (and one
 * of those also flipping `1 - uv.x` on every pick) and the third not at all.
 * Knowledge that lives in a comment does not travel; a function does.
 *
 * **Roll comes back NEGATED, and that is the point of passing it in here.**
 * Turning a panel around reverses the apparent sense of a roll, so a caller
 * moving off the old back-facing convention has to flip its own roll or every
 * non-symmetric one silently mirrors. I first reasoned that the flip and the
 * dropped texture-mirror cancelled — they do not, and only a test caught it
 * (`180°` is symmetric, so the one roll actually in use agreed with the wrong
 * answer). The correction lives here rather than in each caller, because the
 * whole reason this function exists is that per-caller memory is what failed.
 */
export declare function faceViewer(panel: Vec3, viewer: Vec3, 
/** Roll in RADIANS, in the sense the caller wants the viewer to see. */
roll?: number): {
    yaw: number;
    pitch: number;
    roll: number;
};
/**
 * Yaw in DEGREES that turns a panel's face toward the viewer — `faceViewer` for
 * something that stays upright, which every dialog does.
 *
 * Degrees because it is written onto an ELEMENT (`ry`), and the authoring
 * surface is degrees.
 */
export declare function facingYawDeg(panel: Vec3, eye: Vec3): number;
//# sourceMappingURL=dialog-placement.d.ts.map