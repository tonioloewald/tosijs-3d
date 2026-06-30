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

import * as BABYLON from '@babylonjs/core'

// ---------------------------------------------------------------------------
// Pure math (no Babylon types) — unit tested.
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number
  y: number
  z: number
}

export type FrameName =
  | 'world'
  | 'rig'
  | 'body'
  | 'neck'
  | 'face'
  | 'left-hand'
  | 'right-hand'

/** Shortest signed angle to rotate from `a` to `b`, in (-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d <= -Math.PI) d += 2 * Math.PI
  return d
}

/** Yaw (about +Y) so a frame's local +Z points horizontally from `from` toward
 * `to`. Used to face an entity-pinned frame (NPC dialogue, nameplates) at the
 * player: with the frame facing you, its local −X is your screen-right and +X
 * your screen-left, so left/right balloon layout stays put as you move. */
export function facingYaw(from: Vec3, to: Vec3): number {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

/** Exponentially damp a yaw toward `target` at `rate` per second. A `deadband`
 * (radians) holds the value still for small offsets, so quick head glances don't
 * drag the body frame — only sustained turns past the deadband move it. Returns
 * the new yaw (frame-rate independent via 1 − e^(−rate·dt)). */
export function dampYaw(
  current: number,
  target: number,
  dt: number,
  rate: number,
  deadband = 0
): number {
  const d = angleDelta(current, target)
  if (Math.abs(d) <= deadband) return current
  // Pull the target in by the deadband so there's no jump when it engages.
  const goal = d > 0 ? d - deadband : d + deadband
  const t = dt <= 0 ? 0 : 1 - Math.exp(-rate * dt)
  return current + goal * t
}

/** Reveal factor 0..1 for gaze-anchored UI: 1 when the head looks straight at the
 * anchor, ramping to 0 as the angle widens. `cosStart`/`cosFull` are the cosines
 * of the half-angles where the reveal begins and completes (cosFull > cosStart).
 * Both vectors may be unnormalised. */
export function gazeReveal(
  headForward: Vec3,
  toAnchor: Vec3,
  cosStart: number,
  cosFull: number
): number {
  const fl =
    Math.hypot(headForward.x, headForward.y, headForward.z) || 1
  const al = Math.hypot(toAnchor.x, toAnchor.y, toAnchor.z) || 1
  const c =
    (headForward.x * toAnchor.x +
      headForward.y * toAnchor.y +
      headForward.z * toAnchor.z) /
    (fl * al)
  if (c <= cosStart) return 0
  if (c >= cosFull) return 1
  return (c - cosStart) / (cosFull - cosStart)
}

// ---------------------------------------------------------------------------
// Babylon-side frame manager.
// ---------------------------------------------------------------------------

export interface XrFramesOptions {
  /** Per-second damping rate pulling the body yaw toward the head yaw. */
  bodyYawRate?: number
  /** Radians of head-yaw offset ignored before the body follows (glance vs turn). */
  bodyYawDeadband?: number
  /** Eye→neck-pivot offset in head-local space (down + back). */
  neckOffset?: BABYLON.Vector3
}

const FORWARD = new BABYLON.Vector3(0, 0, 1)

/**
 * Maintains a `TransformNode` per reference frame. Construct once an XR session
 * is live (the camera must be parented to `rig`), call `update(dt)` every XR
 * frame, and `dispose()` on exit. Parent scene UI to `frames.body` etc.
 */
export class XrFrames {
  readonly world: BABYLON.TransformNode
  readonly rig: BABYLON.TransformNode
  readonly body: BABYLON.TransformNode
  readonly neck: BABYLON.TransformNode
  readonly face: BABYLON.TransformNode
  /** Hand/wrist frames — follow the controller grip (sensed), disabled while no
   * controller is connected for that hand. Wire with `attachInput`. */
  readonly leftHand: BABYLON.TransformNode
  readonly rightHand: BABYLON.TransformNode

  private leftGrip: BABYLON.TransformNode | null = null
  private rightGrip: BABYLON.TransformNode | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inputObs: { obs: any; cb: any }[] = []
  private cam: BABYLON.TargetCamera
  private bodyYaw = 0
  private seeded = false
  private bodyYawRate: number
  private bodyYawDeadband: number
  private neckOffset: BABYLON.Vector3

  // Scratch — never allocate per frame.
  private _q = new BABYLON.Quaternion()
  private _m = new BABYLON.Matrix()
  private _fwd = new BABYLON.Vector3()
  private _v = new BABYLON.Vector3()

  constructor(
    scene: BABYLON.Scene,
    rig: BABYLON.TransformNode,
    camera: BABYLON.TargetCamera,
    opts: XrFramesOptions = {}
  ) {
    this.cam = camera
    this.rig = rig
    this.bodyYawRate = opts.bodyYawRate ?? 6
    this.bodyYawDeadband = opts.bodyYawDeadband ?? 0.35 // ~20°
    this.neckOffset = opts.neckOffset ?? new BABYLON.Vector3(0, -0.12, -0.1)

    // world: fixed at the play-space origin (scene root, no parent).
    this.world = new BABYLON.TransformNode('xr-frame-world', scene)
    // body / neck: ride the rig (so locomotion carries them) and are updated
    // each frame from the head pose in the rig's local space.
    this.body = new BABYLON.TransformNode('xr-frame-body', scene)
    this.neck = new BABYLON.TransformNode('xr-frame-neck', scene)
    this.body.parent = rig
    this.neck.parent = rig
    this.body.rotationQuaternion = new BABYLON.Quaternion()
    this.neck.rotationQuaternion = new BABYLON.Quaternion()
    // face: head-locked.
    this.face = new BABYLON.TransformNode('xr-frame-face', scene)
    this.face.parent = camera
    // hands: world-space, posed each frame from the controller grips.
    this.leftHand = new BABYLON.TransformNode('xr-frame-left-hand', scene)
    this.rightHand = new BABYLON.TransformNode('xr-frame-right-hand', scene)
    this.leftHand.rotationQuaternion = new BABYLON.Quaternion()
    this.rightHand.rotationQuaternion = new BABYLON.Quaternion()
    this.leftHand.setEnabled(false)
    this.rightHand.setEnabled(false)
  }

  /** Wire hand/wrist frames to the WebXR input so they track the controller grip
   * for each hand. Pass `xrHelper.input`. Safe to call once. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachInput(input: any): void {
    if (input == null) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const added = (controller: any) => {
      const hand = controller?.inputSource?.handedness
      const set = () => {
        if (hand === 'left') this.leftGrip = controller.grip ?? controller.pointer
        else if (hand === 'right')
          this.rightGrip = controller.grip ?? controller.pointer
      }
      // grip may arrive with the motion controller; bind now and on init.
      set()
      controller?.onMotionControllerInitObservable?.add(set)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removed = (controller: any) => {
      const hand = controller?.inputSource?.handedness
      if (hand === 'left') this.leftGrip = null
      else if (hand === 'right') this.rightGrip = null
    }
    input.onControllerAddedObservable.add(added)
    input.onControllerRemovedObservable.add(removed)
    input.controllers?.forEach(added) // any already-connected
    this.inputObs.push(
      { obs: input.onControllerAddedObservable, cb: added },
      { obs: input.onControllerRemovedObservable, cb: removed }
    )
  }

  /** Resolve a frame node by name (for config that names a frame as a string). */
  get(name: FrameName): BABYLON.TransformNode {
    if (name === 'left-hand') return this.leftHand
    if (name === 'right-hand') return this.rightHand
    return this[name]
  }

  /** Pose a hand frame from its grip, or disable it if the controller is gone. */
  private poseHand(
    frame: BABYLON.TransformNode,
    grip: BABYLON.TransformNode | null
  ): void {
    if (grip == null || grip.isDisposed()) {
      frame.setEnabled(false)
      return
    }
    frame.setEnabled(true)
    frame.position.copyFrom(grip.absolutePosition)
    const arq = grip.absoluteRotationQuaternion
    if (arq) (frame.rotationQuaternion as BABYLON.Quaternion).copyFrom(arq)
  }

  /** Head yaw in the rig's local frame (camera rotation is local to the rig). */
  private headLocalYaw(): number {
    const q = this.cam.rotationQuaternion ?? BABYLON.Quaternion.Identity()
    BABYLON.Matrix.FromQuaternionToRef(q, this._m)
    BABYLON.Vector3.TransformCoordinatesToRef(FORWARD, this._m, this._fwd)
    return Math.atan2(this._fwd.x, this._fwd.z)
  }

  /** Call once per XR frame. */
  update(dt: number): void {
    const cam = this.cam
    const headYaw = this.headLocalYaw()
    if (!this.seeded) {
      this.bodyYaw = headYaw
      this.seeded = true
    }
    this.bodyYaw = dampYaw(
      this.bodyYaw,
      headYaw,
      dt,
      this.bodyYawRate,
      this.bodyYawDeadband
    )

    // Body: floor under the head (rig-local), damped torso yaw.
    this.body.position.set(cam.position.x, 0, cam.position.z)
    BABYLON.Quaternion.RotationYawPitchRollToRef(
      this.bodyYaw,
      0,
      0,
      this.body.rotationQuaternion as BABYLON.Quaternion
    )

    // Neck: head pose pushed down + back to the pivot; yaw-only so UI pinned here
    // turns with you but you can tip your head to look past it.
    const q = cam.rotationQuaternion ?? BABYLON.Quaternion.Identity()
    BABYLON.Matrix.FromQuaternionToRef(q, this._m)
    BABYLON.Vector3.TransformCoordinatesToRef(this.neckOffset, this._m, this._v)
    this.neck.position.set(
      cam.position.x + this._v.x,
      cam.position.y + this._v.y,
      cam.position.z + this._v.z
    )
    BABYLON.Quaternion.RotationYawPitchRollToRef(
      headYaw,
      0,
      0,
      this.neck.rotationQuaternion as BABYLON.Quaternion
    )

    // Hands: follow the controller grips (world space), or disable when absent.
    this.poseHand(this.leftHand, this.leftGrip)
    this.poseHand(this.rightHand, this.rightGrip)
  }

  dispose(): void {
    for (const { obs, cb } of this.inputObs) obs?.removeCallback?.(cb)
    this.inputObs = []
    this.world.dispose()
    this.body.dispose()
    this.neck.dispose()
    this.face.dispose()
    this.leftHand.dispose()
    this.rightHand.dispose()
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
  readonly node: BABYLON.TransformNode
  private target: BABYLON.TransformNode
  private offset: BABYLON.Vector3

  constructor(
    scene: BABYLON.Scene,
    target: BABYLON.TransformNode,
    opts: { offset?: [number, number, number] } = {}
  ) {
    this.target = target
    const o = opts.offset ?? [0, 0, 0]
    this.offset = new BABYLON.Vector3(o[0], o[1], o[2])
    this.node = new BABYLON.TransformNode('xr-entity-frame', scene)
    this.node.rotationQuaternion = new BABYLON.Quaternion()
  }

  update(cam: BABYLON.TargetCamera): void {
    const p = this.target.getAbsolutePosition()
    this.node.position.set(
      p.x + this.offset.x,
      p.y + this.offset.y,
      p.z + this.offset.z
    )
    const head = cam.globalPosition
    const yaw = facingYaw(this.node.position, head)
    BABYLON.Quaternion.RotationYawPitchRollToRef(
      yaw,
      0,
      0,
      this.node.rotationQuaternion as BABYLON.Quaternion
    )
  }

  dispose(): void {
    this.node.dispose()
  }
}
