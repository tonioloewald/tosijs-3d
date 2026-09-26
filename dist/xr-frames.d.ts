import * as BABYLON from '@babylonjs/core';
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export type FrameName = 'world' | 'rig' | 'eye' | 'body' | 'neck' | 'face' | 'left-hand' | 'right-hand';
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
    /**
     * FLAT mode — no session: the frames are derived from the camera's WORLD
     * pose, whatever kind of camera it is. See `XrFrames.flat`.
     */
    flat?: boolean;
    /** Flat only: how far below the camera the floor (the `body` frame) sits. */
    eyeHeight?: number;
}
/**
 * Maintains a `TransformNode` per reference frame. Construct once an XR session
 * is live (the camera must be parented to `rig`), call `update(dt)` every XR
 * frame, and `dispose()` on exit. Parent scene UI to `frames.body` etc.
 *
 * **Or flat**, with `XrFrames.flat(scene, camera)` (tosijs-3d#81): most of these
 * frames depend only on a camera's position and orientation, which a flat
 * camera has. `eye`, `body`, `neck` and `face` follow the view; `world` and
 * `rig` sit at the origin; the HAND frames stay disabled, because a monitor has
 * no hands — a panel that wants one declares a flat fallback instead.
 */
export declare class XrFrames {
    /**
     * Frames for a flat camera — no session, any camera type. The frames are
     * derived from its world pose each `update`; `setCamera` follows an
     * active-camera change. The rig is created here and disposed with the rest.
     */
    static flat(scene: BABYLON.Scene, camera: BABYLON.Camera, opts?: Omit<XrFramesOptions, 'flat'>): XrFrames;
    private flatMode;
    private eyeHeight;
    private ownsRig;
    private _pos;
    readonly world: BABYLON.TransformNode;
    readonly rig: BABYLON.TransformNode;
    /** At your actual head POSITION but with RIG yaw (not head rotation). The
     * stable anchor for around-you HUD panels: they ride your eye through any
     * rig head-compensation and don't spin when you glance, only when you turn. */
    readonly eye: BABYLON.TransformNode;
    readonly body: BABYLON.TransformNode;
    readonly neck: BABYLON.TransformNode;
    readonly face: BABYLON.TransformNode;
    /** Hand/wrist frames — follow the controller grip (sensed), disabled while no
     * controller is connected for that hand. Wire with `attachInput`. */
    readonly leftHand: BABYLON.TransformNode;
    readonly rightHand: BABYLON.TransformNode;
    private inputObs;
    /** Local yaw (radians) applied to the `eye` frame on top of the rig yaw. The
     * piloting rig is yaw-RECENTERED so your head points along the entity; set this
     * to that recenter so eye-anchored panels align with where you actually look,
     * not the rig's raw yaw. */
    eyeYawOffset: number;
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
    /** Wire hand/wrist frames to the WebXR input so they track the controller grip
     * for each hand. Pass `xrHelper.input`. Safe to call once. */
    attachInput(input: any): void;
    /** Resolve a frame node by name (for config that names a frame as a string). */
    get(name: FrameName): BABYLON.TransformNode;
    /** Follow a different camera (flat: the active camera changed). */
    setCamera(camera: BABYLON.Camera): void;
    /**
     * FLAT: every frame from the camera's WORLD pose. `getDirection` and
     * `globalPosition` work for any camera — an ArcRotate has no
     * rotationQuaternion, a FreeCamera usually keeps Euler angles — which is why
     * this cannot share the XR path's local-pose reads.
     */
    private updateFlat;
    /** Head yaw in the rig's local frame (camera rotation is local to the rig). */
    private headLocalYaw;
    /** Call once per XR frame. (Hands ride their grips by parenting, not here.) */
    update(dt: number): void;
    dispose(): void;
}
/**
 * An **entity / interlocutor** frame: pinned to a target node (an NPC, a vehicle,
 * a pickup) and turned to face the player, so its local −X is your screen-right
 * and +X your screen-left. The home of dialogue balloons, nameplates, lock-on
 * brackets — anything anchored to a *thing in the world you're attending to*.
 * Dynamic (one per target), so it's standalone rather than part of `XrFrames`.
 * Call `update(camera)` each frame; `dispose()` to release.
 */
export declare class EntityFrame {
    readonly node: BABYLON.TransformNode;
    private target;
    private offset;
    constructor(scene: BABYLON.Scene, target: BABYLON.TransformNode, opts?: {
        offset?: [number, number, number];
    });
    update(cam: BABYLON.TargetCamera): void;
    dispose(): void;
}
//# sourceMappingURL=xr-frames.d.ts.map