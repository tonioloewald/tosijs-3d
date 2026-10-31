/*
THE SCENE SIDE OF A GROUND VEHICLE, shared by b3d-car and b3d-tank: the pure
model (ground-vehicle) does the driving; this loads the model, asks the scene
where the ground is, keeps the vehicle out of walls, and moves the node.

The model is stepped from its OWN observer, every frame, driven or not, so a
car you jump out of rolls to a stop and one parked on a slope settles. Input
reaches it through `applyInput`, which only records the controls.

THE CHASE CAMERA is the vehicle's own (Tonio: higher, and pointed ahead of the
car, so there is more road in front and less behind). It swings round behind
the vehicle with a little lag, the right stick looks around and springs back
when let go. Its pose is computed fresh from the anchor every frame, with only
ANGLES carried between frames, so a floating-origin shift needs nothing.
*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { B3dControllable } from './b3d-controllable.js'
import type { ControlInput } from './control-input.js'
import { collidable, sceneDelta, simHalted, type SimGateOwner } from './b3d-utils.js'
import { canonicalize } from './model-transform.js'
import {
  chasePose,
  chaseRigFor,
  createVehicle,
  forwardSpeed,
  headingOf,
  shiftVehicle,
  stepVehicle,
  type ChaseRig,
  type GroundRay,
  type VehicleControls,
  type VehicleSpec,
  type VehicleState,
} from './ground-vehicle.js'

const V = (p: { x: number; y: number; z: number }) => new BABYLON.Vector3(p.x, p.y, p.z)
const IDLE: VehicleControls = { throttle: 0, steer: 0, handbrake: 0 }

export abstract class B3dGroundVehicle extends B3dControllable {
  static initAttributes = {
    ...B3dControllable.initAttributes,
    url: '',
    library: '',
    meshName: '',
    enterable: false,
    /** Driven from the start (by the `inputFocus` it is in). */
    player: false,
    /** Uniform scale of the model (Kenney's cars are about 0.6 of life size). */
    scale: 1,
    /** kg */
    mass: 1200,
    /** m/s */
    maxSpeed: 25,
    /** m/s² from a standstill (the engine's pull is mass × this). */
    acceleration: 5,
    /** m/s² of braking. */
    braking: 9,
    /** Tyre or track grip, as a friction coefficient. */
    grip: 1,
  }
  declare url: string
  declare library: string
  declare meshName: string
  declare enterable: boolean
  declare player: boolean
  declare scale: number
  declare mass: number
  declare maxSpeed: number
  declare acceleration: number
  declare braking: number
  declare grip: number

  /** The model's spec, once the vehicle has a body. */
  spec: VehicleSpec | null = null
  /** Its state: position, motion, each contact. */
  state: VehicleState | null = null
  /** The node the model drives (the vehicle's origin, unscaled). */
  control: BABYLON.TransformNode | null = null

  private controls: VehicleControls = { ...IDLE }
  /** The chase camera, made the first time the vehicle is driven. */
  chaseCamera: BABYLON.FreeCamera | null = null
  private rig: ChaseRig | null = null
  private focused = false
  private camYaw = 0
  private look = { x: 0, y: 0 }
  private lookWant = { x: 0, y: 0 }
  private anchor: BABYLON.TransformNode | null = null
  /** The heights its wall rays run at, each with the body's extent there (its own frame). */
  private wallBands: { h: number; min: BABYLON.Vector3; max: BABYLON.Vector3 }[] = []
  /** A track's climbing points: the low wall rays let them onto an obstacle. */
  private climbPoints: { x: number; z: number }[] = []
  private ownMeshes: BABYLON.AbstractMesh[] = []
  private stopLibraryWait?: () => void
  private onOrigin = (dx: number, dz: number) => {
    if (this.state) shiftVehicle(this.state, -dx, 0, -dz)
    this.place()
  }

  /** Build the spec from the loaded model; return null if it cannot drive. */
  protected abstract specFor(control: BABYLON.TransformNode): VehicleSpec | null
  /** Pose wheels, tracks and treads from the state. */
  protected abstract pose(state: VehicleState): void
  /** A body for a vehicle given no model (the tank has one; the car has none). */
  protected makeDefaultBody(_scene: BABYLON.Scene): BABYLON.TransformNode | null {
    return null
  }

  /** Speed along the nose, m/s. */
  get speed(): number {
    return this.state ? forwardSpeed(this.state) : 0
  }

  getCameraTarget(): BABYLON.Node | null {
    return this.anchor
  }

  getChaseAnchor(): BABYLON.TransformNode | null {
    return this.anchor
  }

  getWorldVelocity(): BABYLON.Vector3 | null {
    return this.state ? V(this.state.velocity) : null
  }

  applyInput(input: ControlInput, _dt: number) {
    // The analog trigger accelerates too; the stick is the one that reverses.
    this.controls = {
      throttle: input.forward !== 0 ? input.forward : input.throttle,
      steer: input.turn,
      handbrake: input.jump,
    }
    this.aimInput(input.lookX, input.lookY, _dt)
  }

  /** The right stick. A car looks around with it; a tank aims its turret. */
  protected aimInput(x: number, y: number, _dt: number) {
    this.lookWant = { x, y }
  }

  /** Which way the chase camera faces, given its lagged follow of the heading. */
  protected viewYaw(followYaw: number): number {
    return followYaw + this.look.x * Math.PI * 0.75
  }

  /** The right stick's tilt of the view, -1..1. */
  protected viewTilt(): number {
    return this.look.y
  }

  /** Called on gaining focus with the vehicle's heading (radians). */
  protected resetView(_heading: number) {}

  /** Called after each step of the model, while it is running. */
  protected afterStep(_state: VehicleState, _dt: number) {}

  handleGainFocus() {
    super.handleGainFocus()
    this.focused = true
    this.setupFollowCamera()
  }

  handleLoseFocus() {
    super.handleLoseFocus()
    this.focused = false
    this.controls = { ...IDLE }
    this.lookWant = { x: 0, y: 0 }
  }

  /**
   * Make the chase camera if need be and make it the scene's camera, settled
   * behind the vehicle. Called on gaining focus, and again once the model has
   * loaded if focus came first.
   */
  setupFollowCamera() {
    const owner = this.owner
    const state = this.state
    if (owner == null || state == null || this.spec == null || !this.focused) return
    if (this.chaseCamera == null) {
      const cam = new BABYLON.FreeCamera(`${this.tagName}-chase`, BABYLON.Vector3.Zero(), owner.scene)
      cam.minZ = 0.1
      this.chaseCamera = cam
    }
    this.rig = chaseRigFor(this.spec.size)
    this.camYaw = headingOf(state)
    this.look = { x: 0, y: 0 }
    this.resetView(this.camYaw)
    this.aimCamera(0)
    owner.setActiveCamera(this.chaseCamera, { attach: false })
  }

  private aimCamera(dt: number) {
    const cam = this.chaseCamera
    const state = this.state
    const rig = this.rig
    if (cam == null || state == null || rig == null) return
    // Swing round behind the vehicle, and ease the look toward the stick.
    const heading = headingOf(state)
    const lag = dt > 0 ? 1 - Math.exp(-dt * 3) : 1
    let d = heading - this.camYaw
    d = Math.atan2(Math.sin(d), Math.cos(d))
    this.camYaw += d * lag
    const ease = dt > 0 ? 1 - Math.exp(-dt * 8) : 1
    this.look.x += (this.lookWant.x - this.look.x) * ease
    this.look.y += (this.lookWant.y - this.look.y) * ease
    const { eye, target } = chasePose(state.position, this.viewYaw(this.camYaw), this.viewTilt(), rig)
    // Something between the vehicle and the camera (a wall it backed up to, or
    // swung round into while looking): come in in front of it.
    const from = new BABYLON.Vector3(state.position.x, state.position.y + rig.aimHeight + 1, state.position.z)
    const to = V(eye).subtract(from)
    const far = to.length()
    const hit = this.owner?.scene.pickWithRay(
      new BABYLON.Ray(from, to.scale(1 / far), far),
      collidable(this.isMine)
    )
    const at = hit?.hit ? from.add(to.scale(Math.max(0.1, hit.distance - 0.3) / far)) : V(eye)
    cam.position.copyFrom(at)
    cam.setTarget(V(target))
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    if (this.url !== '') {
      this.loadAssetContainer(scene, this.url, (container) => {
        const entries = container.instantiateModelsToScene(undefined, false, {
          doNotInstantiate: true,
        })
        const root = entries.rootNodes[0] as BABYLON.TransformNode
        this.adopt(canonicalize(root, scene, `${this.tagName}-body`), owner, scene)
      })
    } else if (this.library !== '' && this.meshName !== '') {
      this.loadFromLibrary(owner, scene)
    } else {
      const body = this.makeDefaultBody(scene)
      if (body) this.adopt(body, owner, scene)
      else console.warn(`${this.tagName.toLowerCase()}: needs a url, or a library and meshName`)
    }
  }

  private loadFromLibrary(owner: B3d, scene: BABYLON.Scene) {
    const gen = ++this.loadGeneration
    const tryLoad = () => {
      if (gen !== this.loadGeneration) return true
      const lib = owner.getLibrary(this.library)
      if (!lib) return false
      lib.ready.then(() => {
        if (gen !== this.loadGeneration) return
        const node = lib.instantiate(this.meshName, { canonical: true })
        if (node instanceof BABYLON.TransformNode) this.adopt(node, owner, scene)
        else console.error(`${this.tagName.toLowerCase()}: no "${this.meshName}" in library "${this.library}"`)
      })
      return true
    }
    if (!tryLoad()) {
      const handler = () => {
        if (tryLoad()) this.stopLibraryWait?.()
      }
      owner.addEventListener('library-changed', handler)
      this.stopLibraryWait = () => {
        owner.removeEventListener('library-changed', handler)
        this.stopLibraryWait = undefined
      }
    }
  }

  private adopt(control: BABYLON.TransformNode, owner: B3d, scene: BABYLON.Scene) {
    const k = Number(this.scale) > 0 ? Number(this.scale) : 1
    for (const child of control.getChildren()) {
      if (child instanceof BABYLON.TransformNode) child.scaling.scaleInPlace(k)
    }
    control.position.setAll(0)
    control.rotationQuaternion = BABYLON.Quaternion.Identity()
    control.computeWorldMatrix(true)
    for (const m of control.getChildMeshes()) m.computeWorldMatrix(true)
    this.control = control
    this.mesh = control as unknown as BABYLON.Mesh
    this.ownMeshes = control.getChildMeshes()
    owner.register({ meshes: this.ownMeshes })

    const spec = this.specFor(control)
    if (spec == null) {
      console.warn(`${this.tagName.toLowerCase()}: found nothing to drive on in its model`)
      return
    }
    this.spec = spec
    this.state = createVehicle(spec, {
      position: { x: this.x ?? 0, y: this.y ?? 0, z: this.z ?? 0 },
      headingDeg: this.ry ?? 0,
    })

    // A level, yaw-only node for the camera to follow (no bouncing horizon).
    this.anchor = new BABYLON.TransformNode(`${this.tagName}-anchor`, scene)
    this.anchor.rotationQuaternion = BABYLON.Quaternion.Identity()

    // Walls: rays from the body's box, from just above the hubs (a kerb lower
    // than that is the springs' business) to the roof.
    // At each height the body is as long and wide as the parts at that height:
    // a gun barrel sticking out ahead makes the turret long, not the hull.
    const bounds = control.getHierarchyBoundingVectors(true)
    const parts = this.ownMeshes.map((m) => m.getBoundingInfo().boundingBox)
    const lo = Math.max(...this.contactHubs(spec)) + 0.05
    const top = bounds.max.y - 0.1
    const crest = Math.max(lo, ...(spec.tracks ?? []).flatMap((t) => (t.climb ?? []).map((c) => c.y)))
    this.wallBands = [lo, crest + 0.05, (lo + top) / 2, top]
      .filter((h, i, a) => h <= top && a.indexOf(h) === i)
      .map((h) => {
        const at = parts.filter((b) => b.minimumWorld.y <= h + 0.1 && b.maximumWorld.y >= h - 0.1)
        if (at.length === 0) return null
        const min = at.reduce((v, b) => BABYLON.Vector3.Minimize(v, b.minimumWorld), at[0].minimumWorld.clone())
        const max = at.reduce((v, b) => BABYLON.Vector3.Maximize(v, b.maximumWorld), at[0].maximumWorld.clone())
        return { h, min, max }
      })
      .filter((b): b is { h: number; min: BABYLON.Vector3; max: BABYLON.Vector3 } => b != null)
    this.climbPoints = (spec.tracks ?? []).flatMap((t) => (t.climb ?? []).map((c) => ({ x: c.x, z: c.z })))

    owner.addOriginListener(this.onOrigin)
    scene.registerBeforeRender(this._update)
    scene.registerBeforeRender(this._drive)
    this.place()
    // Driven before it had a body: the camera waited for one.
    this.setupFollowCamera()
  }

  private contactHubs(spec: VehicleSpec): number[] {
    const hubs = (spec.wheels ?? []).map((w) => w.at.y)
    for (const t of spec.tracks ?? []) for (const c of t.contacts) hubs.push(c.y)
    return hubs.length ? hubs : [0]
  }

  /** The vehicle's own meshes, which its rays must not hit. */
  private isMine = (m: BABYLON.AbstractMesh) =>
    this.control != null && m.isDescendantOf(this.control)

  private ground: GroundRay = (from, dir, length) => {
    const scene = this.owner?.scene
    if (scene == null) return null
    const hit = scene.pickWithRay(new BABYLON.Ray(V(from), V(dir), length), collidable(this.isMine))
    if (!hit?.hit || hit.pickedPoint == null) return null
    let n = hit.getNormal(true, true) ?? new BABYLON.Vector3(0, 1, 0)
    if (BABYLON.Vector3.Dot(n, V(dir)) > 0) n = n.negate()
    return { distance: hit.distance, normal: { x: n.x, y: n.y, z: n.z } }
  }

  private _drive = () => {
    const scene = this.owner?.scene
    const spec = this.spec
    const state = this.state
    if (scene == null || spec == null || state == null) return
    const dt = sceneDelta(scene)
    if (dt <= 0 || this._halted || simHalted(this.owner as SimGateOwner | null)) return
    const before = { ...state.position }
    stepVehicle(spec, state, this.inputProvider ? this.controls : IDLE, dt, this.ground)
    this.blockByWalls(before, state)
    this.afterStep(state, dt)
    this.place()
    if (this.chaseCamera != null && scene.activeCamera === this.chaseCamera) this.aimCamera(dt)
  }

  /*
  WALLS. The springs know only the ground under each contact; a wall is found
  by casting rays from the body's box the way it moved: three across its width
  at each of a few heights, in the body's OWN frame (so on a slope they run up
  the slope, not into it). Motion into what they hit is taken back and the
  velocity into it cancelled, so the vehicle stops at a wall and slides along
  one it meets at an angle. The vertical part is the springs' business.

  Rays, not a swept ellipsoid: Babylon slides an ellipsoid up over an edge that
  meets its rounded underside, so anything under half its height was stepped
  over and a tank drove through a crate.

  A tank's lowest rays let its track ends reach onto an obstacle (by the
  track's radius) before it is a wall, so the raised ends get on top of a step
  and climb it; anything above them is a wall at the box.
  */
  private blockByWalls(before: { x: number; y: number; z: number }, state: VehicleState) {
    const scene = this.owner?.scene
    if (scene == null || this.wallBands.length === 0) return
    const wx = state.position.x - before.x
    const wz = state.position.z - before.z
    const moved = Math.hypot(wx, wz)
    if (moved < 1e-4) return
    const q = state.orientation
    const rot = new BABYLON.Quaternion(q.x, q.y, q.z, q.w)
    const inv = BABYLON.Quaternion.Inverse(rot)
    // The motion in the body's frame, flattened onto its floor.
    const local = new BABYLON.Vector3(wx, 0, wz).applyRotationQuaternion(inv)
    local.y = 0
    if (local.length() < 1e-6) return
    local.normalize()
    const across = new BABYLON.Vector3(-local.z, 0, local.x)
    const dirWorld = local.applyRotationQuaternion(rot)
    const origin = new BABYLON.Vector3(before.x, before.y, before.z)
    let push = 0
    let normal: BABYLON.Vector3 | null = null
    const pick = collidable(this.isMine)
    // How far the climbing points reach this way: the lowest rays stop the body
    // only once those are a little past an obstacle's face, so they get on top.
    const climbAhead = this.climbPoints.length
      ? Math.max(...this.climbPoints.map((p) => p.x * local.x + p.z * local.z))
      : null
    this.wallBands.forEach(({ h, min, max }, i) => {
      // How far the body's edge at this height is from a point inside it, this way.
      const edgeOf = (o: BABYLON.Vector3) => {
        const tx = local.x > 1e-6 ? (max.x - o.x) / local.x : local.x < -1e-6 ? (min.x - o.x) / local.x : Infinity
        const tz = local.z > 1e-6 ? (max.z - o.z) / local.z : local.z < -1e-6 ? (min.z - o.z) / local.z : Infinity
        return Math.max(0, Math.min(tx, tz))
      }
      const corners = [
        [min.x, min.z],
        [min.x, max.z],
        [max.x, min.z],
        [max.x, max.z],
      ].map(([x, z]) => x * across.x + z * across.z)
      const a = Math.min(...corners) + 0.05
      const b = Math.max(...corners) - 0.05
      for (const off of [a, (a + b) / 2, b]) {
        const o = across.scale(off)
        o.y = h
        const edge =
          i === 0 && climbAhead != null
            ? Math.max(0, climbAhead - 0.15 - (o.x * local.x + o.z * local.z))
            : edgeOf(o)
        const from = origin.add(o.applyRotationQuaternion(rot))
        const hit = scene.pickWithRay(new BABYLON.Ray(from, dirWorld, edge + moved + 0.05), pick)
        if (!hit?.hit) continue
        let n = hit.getNormal(true, true) ?? dirWorld.negate()
        if (BABYLON.Vector3.Dot(n, dirWorld) > 0) n = n.negate()
        n = new BABYLON.Vector3(n.x, 0, n.z)
        if (n.length() < 0.3) continue // a floor or a ceiling, not a wall
        n.normalize()
        // How far the motion goes into it past the box's edge, along its normal.
        const into = -(wx * n.x + wz * n.z)
        const gap = (hit.distance - edge) * -BABYLON.Vector3.Dot(dirWorld, n)
        const over = into - Math.max(0, gap)
        if (over > push) {
          push = over
          normal = n
        }
      }
    })
    if (normal == null) return
    const n = normal as BABYLON.Vector3
    state.position.x += n.x * push
    state.position.z += n.z * push
    const intoV = state.velocity.x * n.x + state.velocity.z * n.z
    if (intoV < 0) {
      state.velocity.x -= n.x * intoV * 1.2
      state.velocity.z -= n.z * intoV * 1.2
    }
  }

  /** Put the node (and the camera's anchor) where the state says. */
  private place() {
    const state = this.state
    const control = this.control
    if (state == null || control == null) return
    control.position.set(state.position.x, state.position.y, state.position.z)
    const q = state.orientation
    control.rotationQuaternion!.set(q.x, q.y, q.z, q.w)
    if (this.anchor) {
      this.anchor.position.copyFrom(control.position)
      BABYLON.Quaternion.RotationYawPitchRollToRef(
        headingOf(state),
        0,
        0,
        this.anchor.rotationQuaternion!
      )
    }
    this.pose(state)
  }

  sceneDispose() {
    const scene = this.owner?.scene
    this.stopLibraryWait?.()
    if (scene) {
      scene.unregisterBeforeRender(this._update)
      scene.unregisterBeforeRender(this._drive)
    }
    this.owner?.removeOriginListener(this.onOrigin)
    this.control?.dispose()
    this.anchor?.dispose()
    this.chaseCamera?.dispose()
    this.chaseCamera = null
    this.control = this.anchor = null
    this.wallBands = []
    this.mesh = undefined
    this.spec = this.state = null
    this.ownMeshes = []
    super.sceneDispose()
  }
}

