import * as BABYLON from '@babylonjs/core';
export interface LeafFieldOptions {
    /** Max leaves — the SPS buffer is sized once to this; the grant governs how many are live. */
    capacity: number;
    /** Half-size of the camera-following box (metres). */
    radius: number;
    /** Nothing spawns inside this radius of the eye — a leaf born on the lens is a smudge. */
    near: number;
    /** Quad size (metres): [min, max]. */
    size: [number, number];
}
/**
 * A field of tumbling two-sided leaf quads, boxed to the camera.
 *
 * `B3dAmbient` builds one of these for a `leaves` preset and drives it: `setEmitter` each frame to
 * follow the eye, then `update(dt, target)` where `target` is the live population the budget×gaze
 * allows. Leaves ease toward that count — turning on ⇒ spawn distributed through the box (so a
 * ramp-in fills immediately, not as a sheet dropping from the ceiling); turning off ⇒ fade out and
 * park. So the field drains and fills, and is never snatched away.
 */
export declare class LeafField {
    private _sps;
    private _mesh;
    private _radius;
    private _near;
    private _ex;
    private _ey;
    private _ez;
    private _dt;
    private _driftX;
    private _driftZ;
    private _targetOn;
    private _live;
    private _dq;
    constructor(scene: BABYLON.Scene, opts: LeafFieldOptions);
    /** How many leaves are currently visible (for the drain/fill bookkeeping upstream). */
    get liveCount(): number;
    setEmitter(x: number, y: number, z: number): void;
    /** Optional world wind (rain slants, leaves stream downwind). */
    setWind(x: number, z: number): void;
    /** `target` = population the budget/gaze allow right now. Eases toward it. */
    update(dt: number, target: number): void;
    dispose(): void;
    private _freshProps;
    /** Reposition a leaf inside the box. `fresh` = anywhere in the column (so a ramp-in looks full
     * at once); otherwise from the top (a recycled leaf re-enters from above and falls through). */
    private _place;
    private _updateParticle;
}
//# sourceMappingURL=ambient-leaves.d.ts.map