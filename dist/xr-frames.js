/*#
# xr-frames

Reference frames for spatial XR UI. "Stable" in XR isn't one thing — there are
several distinct frames a piece of UI can be anchored to, and WebXR only hands
you the two extremes (world and head) plus the *sensed* points (hands), leaving
the comfortable middle (torso, neck) to be reconstructed. `XrFrames` maintains a
`TransformNode` for each so scene UI can just parent to the one it wants:

| Frame | Stable relative to… | Use |
|-------|---------------------|-----|
| `world` | the play space | a hologram on a table |
| `rig` | the locomotion rig (vehicle) | a piloting HUD that flies with you |
| `body` | your torso (head x/z + **damped** yaw) | waist inventory, over-shoulder backpack |
| `neck` | your neck pivot | UI you can look *past* |
| `face` | your eyes (head-locked) | a reticle, a vignette, sunglasses |

`body` and `neck` aren't measured by any sensor in a head-plus-hands rig, so they
are *inferred*: `body` low-passes the head's yaw (sustained turns move it, quick
glances don't) and sits at floor level under the head; `neck` is the head pose
pushed down-and-back to the pivot the head swings around. Hand frames come from
the controllers/`XRHand` joints (sensed) and are added separately.

The yaw-damping, gaze-reveal and angle math are pure (no Babylon) so they're unit
tested in `xr-frames.test.ts`.
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core';
/** Shortest signed angle to rotate from `a` to `b`, in (-π, π]. */
export function angleDelta(a, b) {
    let d = b - a;
    while (d > Math.PI)
        d -= 2 * Math.PI;
    while (d <= -Math.PI)
        d += 2 * Math.PI;
    return d;
}
/** Yaw (about +Y) so a frame's local +Z points horizontally from `from` toward
 * `to`. Used to face an entity-pinned frame (NPC dialogue, nameplates) at the
 * player: with the frame facing you, its local −X is your screen-right and +X
 * your screen-left, so left/right balloon layout stays put as you move. */
export function facingYaw(from, to) {
    return Math.atan2(to.x - from.x, to.z - from.z);
}
/** Exponentially damp a yaw toward `target` at `rate` per second. A `deadband`
 * (radians) holds the value still for small offsets, so quick head glances don't
 * drag the body frame — only sustained turns past the deadband move it. Returns
 * the new yaw (frame-rate independent via 1 − e^(−rate·dt)). */
export function dampYaw(current, target, dt, rate, deadband = 0) {
    const d = angleDelta(current, target);
    if (Math.abs(d) <= deadband)
        return current;
    // Pull the target in by the deadband so there's no jump when it engages.
    const goal = d > 0 ? d - deadband : d + deadband;
    const t = dt <= 0 ? 0 : 1 - Math.exp(-rate * dt);
    return current + goal * t;
}
/** Reveal factor 0..1 for gaze-anchored UI: 1 when the head looks straight at the
 * anchor, ramping to 0 as the angle widens. `cosStart`/`cosFull` are the cosines
 * of the half-angles where the reveal begins and completes (cosFull > cosStart).
 * Both vectors may be unnormalised. */
export function gazeReveal(headForward, toAnchor, cosStart, cosFull) {
    const fl = Math.hypot(headForward.x, headForward.y, headForward.z) || 1;
    const al = Math.hypot(toAnchor.x, toAnchor.y, toAnchor.z) || 1;
    const c = (headForward.x * toAnchor.x +
        headForward.y * toAnchor.y +
        headForward.z * toAnchor.z) /
        (fl * al);
    if (c <= cosStart)
        return 0;
    if (c >= cosFull)
        return 1;
    return (c - cosStart) / (cosFull - cosStart);
}
const FORWARD = new BABYLON.Vector3(0, 0, 1);
/**
 * Maintains a `TransformNode` per reference frame. Construct once an XR session
 * is live (the camera must be parented to `rig`), call `update(dt)` every XR
 * frame, and `dispose()` on exit. Parent scene UI to `frames.body` etc.
 */
export class XrFrames {
    world;
    rig;
    body;
    neck;
    face;
    /** Hand/wrist frames — follow the controller grip (sensed), disabled while no
     * controller is connected for that hand. Wire with `attachInput`. */
    leftHand;
    rightHand;
    inputObs = [];
    cam;
    bodyYaw = 0;
    seeded = false;
    bodyYawRate;
    bodyYawDeadband;
    neckOffset;
    // Scratch — never allocate per frame.
    _q = new BABYLON.Quaternion();
    _m = new BABYLON.Matrix();
    _fwd = new BABYLON.Vector3();
    _v = new BABYLON.Vector3();
    constructor(scene, rig, camera, opts = {}) {
        this.cam = camera;
        this.rig = rig;
        this.bodyYawRate = opts.bodyYawRate ?? 6;
        this.bodyYawDeadband = opts.bodyYawDeadband ?? 0.35; // ~20°
        this.neckOffset = opts.neckOffset ?? new BABYLON.Vector3(0, -0.12, -0.1);
        // world: fixed at the play-space origin (scene root, no parent).
        this.world = new BABYLON.TransformNode('xr-frame-world', scene);
        // body / neck: ride the rig (so locomotion carries them) and are updated
        // each frame from the head pose in the rig's local space.
        this.body = new BABYLON.TransformNode('xr-frame-body', scene);
        this.neck = new BABYLON.TransformNode('xr-frame-neck', scene);
        this.body.parent = rig;
        this.neck.parent = rig;
        this.body.rotationQuaternion = new BABYLON.Quaternion();
        this.neck.rotationQuaternion = new BABYLON.Quaternion();
        // face: head-locked.
        this.face = new BABYLON.TransformNode('xr-frame-face', scene);
        this.face.parent = camera;
        // hands: world-space, posed each frame from the controller grips.
        this.leftHand = new BABYLON.TransformNode('xr-frame-left-hand', scene);
        this.rightHand = new BABYLON.TransformNode('xr-frame-right-hand', scene);
        this.leftHand.rotationQuaternion = new BABYLON.Quaternion();
        this.rightHand.rotationQuaternion = new BABYLON.Quaternion();
        this.leftHand.setEnabled(false);
        this.rightHand.setEnabled(false);
    }
    /** Wire hand/wrist frames to the WebXR input so they track the controller grip
     * for each hand. Pass `xrHelper.input`. Safe to call once. */
    attachInput(input) {
        if (input == null)
            return;
        const added = (controller) => {
            const hand = controller?.inputSource?.handedness;
            const bind = () => {
                const grip = controller.grip ?? controller.pointer;
                if (grip == null)
                    return;
                // PARENT the hand frame to the grip — rigid, so the panel doesn't jiggle
                // against the rendered controller (copying the pose each frame lagged it).
                const frame = hand === 'left' ? this.leftHand : this.rightHand;
                if (hand !== 'left' && hand !== 'right')
                    return;
                frame.parent = grip;
                frame.position.set(0, 0, 0);
                frame.rotationQuaternion.set(0, 0, 0, 1);
                frame.setEnabled(true);
            };
            bind();
            controller?.onMotionControllerInitObservable?.add(bind);
        };
        const removed = (controller) => {
            const hand = controller?.inputSource?.handedness;
            // Detach BEFORE Babylon disposes the grip (it would recurse to our child).
            const frame = hand === 'left'
                ? this.leftHand
                : hand === 'right'
                    ? this.rightHand
                    : null;
            if (frame) {
                frame.parent = null;
                frame.setEnabled(false);
            }
        };
        input.onControllerAddedObservable.add(added);
        input.onControllerRemovedObservable.add(removed);
        input.controllers?.forEach(added); // any already-connected
        this.inputObs.push({ obs: input.onControllerAddedObservable, cb: added }, { obs: input.onControllerRemovedObservable, cb: removed });
    }
    /** Resolve a frame node by name (for config that names a frame as a string). */
    get(name) {
        if (name === 'left-hand')
            return this.leftHand;
        if (name === 'right-hand')
            return this.rightHand;
        return this[name];
    }
    /** Head yaw in the rig's local frame (camera rotation is local to the rig). */
    headLocalYaw() {
        const q = this.cam.rotationQuaternion ?? BABYLON.Quaternion.Identity();
        BABYLON.Matrix.FromQuaternionToRef(q, this._m);
        BABYLON.Vector3.TransformCoordinatesToRef(FORWARD, this._m, this._fwd);
        return Math.atan2(this._fwd.x, this._fwd.z);
    }
    /** Call once per XR frame. (Hands ride their grips by parenting, not here.) */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(dt) {
        const cam = this.cam;
        const headYaw = this.headLocalYaw();
        // Body: floor under the head, but RIG yaw — identity local rotation inherits
        // the rig's facing via parenting. So body-pinned panels stay put when you
        // glance to look at them and only swing when you actually turn (locomote),
        // matching the rig/overhead panels (the damped head-yaw chased them away).
        this.body.position.set(cam.position.x, 0, cam.position.z);
        // Neck: head pose pushed down + back to the pivot; yaw-only so UI pinned here
        // turns with you but you can tip your head to look past it.
        const q = cam.rotationQuaternion ?? BABYLON.Quaternion.Identity();
        BABYLON.Matrix.FromQuaternionToRef(q, this._m);
        BABYLON.Vector3.TransformCoordinatesToRef(this.neckOffset, this._m, this._v);
        this.neck.position.set(cam.position.x + this._v.x, cam.position.y + this._v.y, cam.position.z + this._v.z);
        BABYLON.Quaternion.RotationYawPitchRollToRef(headYaw, 0, 0, this.neck.rotationQuaternion);
    }
    dispose() {
        for (const { obs, cb } of this.inputObs)
            obs?.removeCallback?.(cb);
        this.inputObs = [];
        this.world.dispose();
        this.body.dispose();
        this.neck.dispose();
        this.face.dispose();
        this.leftHand.dispose();
        this.rightHand.dispose();
    }
}
/**
 * An **entity / interlocutor** frame: pinned to a target node (an NPC, a vehicle,
 * a pickup) and turned to face the player, so its local −X is your screen-right
 * and +X your screen-left. The home of dialogue balloons, nameplates, lock-on
 * brackets — anything anchored to a *thing in the world you're attending to*.
 * Dynamic (one per target), so it's standalone rather than part of `XrFrames`.
 * Call `update(camera)` each frame; `dispose()` to release.
 */
export class EntityFrame {
    node;
    target;
    offset;
    constructor(scene, target, opts = {}) {
        this.target = target;
        const o = opts.offset ?? [0, 0, 0];
        this.offset = new BABYLON.Vector3(o[0], o[1], o[2]);
        this.node = new BABYLON.TransformNode('xr-entity-frame', scene);
        this.node.rotationQuaternion = new BABYLON.Quaternion();
    }
    update(cam) {
        const p = this.target.getAbsolutePosition();
        this.node.position.set(p.x + this.offset.x, p.y + this.offset.y, p.z + this.offset.z);
        const head = cam.globalPosition;
        const yaw = facingYaw(this.node.position, head);
        BABYLON.Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, this.node.rotationQuaternion);
    }
    dispose() {
        this.node.dispose();
    }
}
//# sourceMappingURL=xr-frames.js.map