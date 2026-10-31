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
  private probe: BABYLON.Mesh | null = null
  private probeOffset = 0
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
    this.lookWant = { x: input.lookX, y: input.lookY }
  }

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
    const { eye, target } = chasePose(
      state.position,
      this.camYaw + this.look.x * Math.PI * 0.75,
      this.look.y,
      rig
    )
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

    // Walls: one probe the width of the body, between the wheels' tops and the
    // roof, swept with the body's motion (the ground is left to the springs).
    // From the hubs up: a kerb under half a wheel is climbed, a taller one stops it.
    const lo = Math.max(...this.contactHubs(spec))
    const top = this.bodyTop(control)
    const height = Math.max(0.2, top - lo)
    this.probe = new BABYLON.Mesh(`${this.tagName}-probe`, scene)
    this.probe.isPickable = false
    this.probe.ellipsoid = new BABYLON.Vector3(spec.size.x / 2, height / 2, spec.size.x / 2)
    this.probeOffset = lo + height / 2

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

  private bodyTop(control: BABYLON.TransformNode): number {
    const { max } = control.getHierarchyBoundingVectors(true)
    return max.y - control.position.y
  }

  /** The vehicle's own meshes, which its rays and its probe must not hit. */
  private isMine = (m: BABYLON.AbstractMesh) =>
    m === this.probe || (this.control != null && m.isDescendantOf(this.control))

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
    this.place()
    if (this.chaseCamera != null && scene.activeCamera === this.chaseCamera) this.aimCamera(dt)
  }

  /*
  WALLS. The springs know only the ground under each contact; a wall is found
  by sweeping a probe from where the body was to where the model moved it. A
  sideways correction (the probe was stopped or slid) is taken back from the
  body, and the motion into the wall is cancelled. The vertical part is the
  springs' business and is left alone, so a ramp is climbed, not refused.
  */
  private blockByWalls(before: { x: number; y: number; z: number }, state: VehicleState) {
    const probe = this.probe
    if (probe == null) return
    const want = V(state.position).subtract(V(before))
    probe.position.set(before.x, before.y + this.probeOffset, before.z)
    const mine = this.ownMeshes.filter((m) => m.checkCollisions)
    for (const m of mine) m.checkCollisions = false
    probe.moveWithCollisions(want)
    for (const m of mine) m.checkCollisions = true
    const got = probe.position.subtract(new BABYLON.Vector3(before.x, before.y + this.probeOffset, before.z))
    const lost = new BABYLON.Vector3(got.x - want.x, 0, got.z - want.z)
    if (lost.length() < 0.002) return
    state.position.x = before.x + got.x
    state.position.z = before.z + got.z
    const n = lost.normalize()
    const into = state.velocity.x * n.x + state.velocity.z * n.z
    if (into < 0) {
      state.velocity.x -= n.x * into * 1.2
      state.velocity.z -= n.z * into * 1.2
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
    this.probe?.dispose()
    this.chaseCamera?.dispose()
    this.chaseCamera = null
    this.control = this.anchor = this.probe = null
    this.mesh = undefined
    this.spec = this.state = null
    this.ownMeshes = []
    super.sceneDispose()
  }
}

