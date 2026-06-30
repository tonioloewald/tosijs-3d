import * as BABYLON from '@babylonjs/core';
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
/** Shortest signed angle to rotate from `a` to `b`, in (-π, π]. */
export declare function angleDelta(a: number, b: number): number;
/** Yaw (about +Y) so a frame's local +Z points horizontally from `from` toward
 * `to`. Used to face an entity-pinned frame (NPC dialogue, nameplates) at the
 * player: with the frame facing you, its local −X is your screen-right and +X
 * your screen-left, so left/right balloon layout stays put as you move. */
export declare function facingYaw(from: Vec3, to: Vec3): number;
/** Exponentially damp a yaw toward `target` at `rate` per second. A `deadband`
 * (radians) holds the value still for small offsets, so quick head glances don't
 * drag the body frame — only sustained turns past the deadband move it. Returns
 * the new yaw (frame-rate independent via 1 − e^(−rate·dt)). */
export declare function dampYaw(current: number, target: number, dt: number, rate: number, deadband?: number): number;
/** Reveal factor 0..1 for gaze-anchored UI: 1 when the head looks straight at the
 * anchor, ramping to 0 as the angle widens. `cosStart`/`cosFull` are the cosines
 * of the half-angles where the reveal begins and completes (cosFull > cosStart).
 * Both vectors may be unnormalised. */
export declare function gazeReveal(headForward: Vec3, toAnchor: Vec3, cosStart: number, cosFull: number): number;
export interface XrFramesOptions {
    /** Per-second damping rate pulling the body yaw toward the head yaw. */
    bodyYawRate?: number;
    /** Radians of head-yaw offset ignored before the body follows (glance vs turn). */
    bodyYawDeadband?: number;
    /** Eye→neck-pivot offset in head-local space (down + back). */
    neckOffset?: BABYLON.Vector3;
}
/**
 * Maintains a `TransformNode` per reference frame. Construct once an XR session
 * is live (the camera must be parented to `rig`), call `update(dt)` every XR
 * frame, and `dispose()` on exit. Parent scene UI to `frames.body` etc.
 */
export declare class XrFrames {
    readonly world: BABYLON.TransformNode;
    readonly rig: BABYLON.TransformNode;
    readonly body: BABYLON.TransformNode;
    readonly neck: BABYLON.TransformNode;
    readonly face: BABYLON.TransformNode;
    private cam;
    private bodyYaw;
    private seeded;
    private bodyYawRate;
    private bodyYawDeadband;
    private neckOffset;
    private _q;
    private _m;
    private _fwd;
    private _v;
    constructor(scene: BABYLON.Scene, rig: BABYLON.TransformNode, camera: BABYLON.TargetCamera, opts?: XrFramesOptions);
    /** Head yaw in the rig's local frame (camera rotation is local to the rig). */
    private headLocalYaw;
    /** Call once per XR frame. */
    update(dt: number): void;
    dispose(): void;
}
//# sourceMappingURL=xr-frames.d.ts.map