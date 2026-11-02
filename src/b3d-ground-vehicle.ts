/*
THE SCENE SIDE OF A GROUND VEHICLE, shared by b3d-car and b3d-tank: the pure
model (ground-vehicle) does the driving; this loads the model, asks the scene
where the ground is, keeps the vehicle out of walls, and moves the node.

The model is stepped from its OWN observer, every frame, driven or not, so a
car you jump out of rolls to a stop and one parked on a slope settles. Input
reaches it through `applyInput`, which only records the controls.

THE CHASE CAMERA is the vehicle's own (Tonio: higher, and pointed ahead of the
car, so there is more road in front and less behind). It swings round behind
the vehicle with a little lag, pivoting round a point a little above it and
looking at it. The right stick ORBITS it (sideways, springing back behind on
release) and moves it along an arc (up and down: from close behind to almost
above, where it stays). Its pose is computed fresh from the anchor every frame, with only
ANGLES carried between frames, so a floating-origin shift needs nothing.
*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { B3dControllable } from './b3d-controllable.js'
import type { ControlInput } from './control-input.js'
import {
  collidable,
  pickWorld,
  sceneDelta,
  simHalted,
  type SimGateOwner,
} from './b3d-utils.js'
import { canonicalize, unmirrorContainer } from './model-transform.js'
import {
  lightPool,
  sceneDaylight,
  lampLevel,
  type VirtualLight,
} from './light-pool.js'
import {
  CHASE_BOOM,
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
  type Vec3,
} from './ground-vehicle.js'

import { placeListener, startVoice, type Voice } from './effect-audio.js'

const V = (p: { x: number; y: number; z: number }) =>
  new BABYLON.Vector3(p.x, p.y, p.z)
const IDLE: VehicleControls = { throttle: 0, steer: 0, handbrake: 0 }
/** The right stick's orbit of the chase camera at full tilt, radians. */
const ORBIT_MAX = 150 * (Math.PI / 180)
/** The steps the chase camera climbs to get out of a wall, radians. */
const LIFTS = [0, 10, 20, 32, 45, 60].map((d) => d * (Math.PI / 180))
/** Its boom, the whole range a second and a bit at full tilt. */
const BOOM_RATE = 0.8

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
    /** `'auto'`: on at night while someone drives it. `'on'` or `'off'` to say so. */
    headlights: 'auto' as 'auto' | 'on' | 'off',
    /** The engine's sound while someone drives it, positional. `'off'` for none. */
    sound: 'on' as 'on' | 'off',
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
  declare headlights: 'auto' | 'on' | 'off'
  declare sound: 'on' | 'off'

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
  /*
  THE CHASE CAMERA ON THE RIGHT STICK. It pivots round a point a little above
  the vehicle and looks at it (Tonio: "Think of the camera as pivoting around
  ... a point somewhat above the car"). Sideways ORBITS it, and it springs back
  behind on release; up and down move it along an ARC from close behind to
  almost above, and it holds there.
  */
  private orbit = 0
  private boom = CHASE_BOOM
  /** How far the camera has climbed its arc to see past something, radians. */
  private camLift = 0
  /** How far back the chase camera sits, against the size's own (a tank's is farther). */
  protected chaseScale = 1
  private lookWant = { x: 0, y: 0 }
  /**
   * The right stick aims something (a tank's turret and gun) rather than the
   * camera: a headset's chase view does not zoom with it.
   */
  get stickAims(): boolean {
    return false
  }
  private anchor: BABYLON.TransformNode | null = null
  /** The heights its wall rays run at, each with the body's extent there (its own frame). */
  /** The headlights' beam (a pooled light) and the lamps you see. */
  private beam: VirtualLight | null = null
  private releaseBeam: (() => void) | null = null
  private engine: Voice | null = null
  /** The engine's note relative to a car's (a tank's is lower). */
  protected engineNote = 1
  private beamFrom = new BABYLON.Vector3()
  private lamps: BABYLON.StandardMaterial | null = null
  private tailLamps: BABYLON.StandardMaterial | null = null
  private wallBands: {
    h: number
    min: BABYLON.Vector3
    max: BABYLON.Vector3
  }[] = []
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
  protected makeDefaultBody(
    _scene: BABYLON.Scene
  ): BABYLON.TransformNode | null {
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
    return followYaw + this.orbit
  }

  /** Where the camera sits on its boom, 0…1 (`CHASE_BOOM` at rest). */
  protected viewBoom(): number {
    return this.boom
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
    if (owner == null || state == null || this.spec == null || !this.focused)
      return
    if (this.chaseCamera == null) {
      const cam = new BABYLON.FreeCamera(
        `${this.tagName}-chase`,
        BABYLON.Vector3.Zero(),
        owner.scene
      )
      cam.minZ = 0.1
      this.chaseCamera = cam
    }
    this.rig = chaseRigFor(this.spec.size, this.chaseScale)
    this.camYaw = headingOf(state)
    this.orbit = 0
    this.boom = CHASE_BOOM
    this.camLift = 0
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
    /*
    OUT OF WALLS: up first, then in. The camera must see its pivot with room
    to spare (a camera right on a surface has its near plane in it). Blocked,
    it climbs its arc in steps until it can (a wall behind, a building it
    swung round into); if no lift clears it, it comes in along the line
    instead. The lift rises fast and settles back slowly, so it does not pop.
    */
    const yaw = this.viewYaw(this.camYaw)
    const boom = this.viewBoom()
    const scene = this.owner?.scene
    const CLEAR = 0.6
    // How high over the ground under it the camera must be (on a slope a
    // clear line to the pivot still left it in the hill: Tonio's tank).
    const ABOVE = 1.2
    const blocked = (eye: Vec3, target: Vec3) => {
      if (scene == null) return null
      const from = V(target)
      const to = V(eye).subtract(from)
      const far = to.length()
      if (far < 1e-3) return null
      const hit = pickWorld(
        scene,
        new BABYLON.Ray(from, to.scale(1 / far), far + CLEAR),
        this.seesPast
      )
      if (hit) return { from, to, far, distance: hit.distance }
      const ground = pickWorld(
        scene,
        new BABYLON.Ray(
          new BABYLON.Vector3(eye.x, eye.y + 30, eye.z),
          BABYLON.Axis.Y.negate(),
          30 + ABOVE
        ),
        this.seesPast
      )
      return ground ? { from, to, far, distance: far + CLEAR } : null
    }
    let need = 0
    for (const lift of LIFTS) {
      need = lift
      const p = chasePose(state.position, yaw, boom, rig, lift)
      if (blocked(p.eye, p.target) == null) break
    }
    const k = dt > 0 ? 1 - Math.exp(-dt * (need > this.camLift ? 10 : 1.5)) : 1
    this.camLift += (need - this.camLift) * k
    const { eye, target } = chasePose(state.position, yaw, boom, rig, this.camLift)
    const hit = blocked(eye, target)
    const at = hit
      ? hit.from.add(
          hit.to.scale(Math.max(0.1, hit.distance - CLEAR) / hit.far)
        )
      : V(eye)
    cam.position.copyFrom(at)
    cam.setTarget(V(target))
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    if (this.url !== '') {
      this.loadAssetContainer(scene, this.url, (container) => {
        unmirrorContainer(container)
        const entries = container.instantiateModelsToScene(undefined, false, {
          doNotInstantiate: true,
        })
        const root = entries.rootNodes[0] as BABYLON.TransformNode
        this.animations = entries.animationGroups
        this.adopt(
          canonicalize(root, scene, `${this.tagName}-body`),
          owner,
          scene
        )
      })
    } else if (this.library !== '' && this.meshName !== '') {
      this.loadFromLibrary(owner, scene)
    } else {
      const body = this.makeDefaultBody(scene)
      if (body) this.adopt(body, owner, scene)
      else
        console.warn(
          `${this.tagName.toLowerCase()}: needs a url, or a library and meshName`
        )
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
        if (node instanceof BABYLON.TransformNode) {
          this.animations =
            ((node.metadata as any)?.animationGroups as
              | BABYLON.AnimationGroup[]
              | undefined) ?? []
          this.adopt(node, owner, scene)
        }
        else
          console.error(
            `${this.tagName.toLowerCase()}: no "${this.meshName}" in library "${
              this.library
            }"`
          )
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

  /**
   * The model's own animations (a tank's track links), stopped: a subclass
   * drives them from the model in `pose` (as frames, not by playing them).
   */
  protected animations: BABYLON.AnimationGroup[] = []

  private adopt(
    control: BABYLON.TransformNode,
    owner: B3d,
    scene: BABYLON.Scene
  ) {
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
      console.warn(
        `${this.tagName.toLowerCase()}: found nothing to drive on in its model`
      )
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
    const crest = Math.max(
      lo,
      ...(spec.tracks ?? []).flatMap((t) => (t.climb ?? []).map((c) => c.y))
    )
    this.wallBands = [lo, crest + 0.05, (lo + top) / 2, top]
      .filter((h, i, a) => h <= top && a.indexOf(h) === i)
      .map((h) => {
        const at = parts.filter(
          (b) => b.minimumWorld.y <= h + 0.1 && b.maximumWorld.y >= h - 0.1
        )
        if (at.length === 0) return null
        const min = at.reduce(
          (v, b) => BABYLON.Vector3.Minimize(v, b.minimumWorld),
          at[0].minimumWorld.clone()
        )
        const max = at.reduce(
          (v, b) => BABYLON.Vector3.Maximize(v, b.maximumWorld),
          at[0].maximumWorld.clone()
        )
        return { h, min, max }
      })
      .filter(
        (b): b is { h: number; min: BABYLON.Vector3; max: BABYLON.Vector3 } =>
          b != null
      )
    this.climbPoints = (spec.tracks ?? []).flatMap((t) =>
      (t.climb ?? []).map((c) => ({ x: c.x, z: c.z }))
    )

    this.fitLights(control, scene)
    owner.addOriginListener(this.onOrigin)
    scene.registerBeforeRender(this._update)
    scene.registerBeforeRender(this._drive)
    this.place()
    // Driven before it had a body: the camera waited for one.
    this.setupFollowCamera()
  }

  private contactHubs(spec: VehicleSpec): number[] {
    const hubs = (spec.wheels ?? []).map((w) => w.at.y)
    for (const t of spec.tracks ?? [])
      for (const c of t.contacts) hubs.push(c.y)
    return hubs.length ? hubs : [0]
  }

  /*
  HEADLIGHTS. One beam per vehicle (two side by side cost two of the pool's
  few lights for a picture hardly different), from the middle of the front at
  lamp height, aimed a little down the road; and the lamps themselves, two in
  front and two red behind, which glow whether or not the pool gave the beam a
  real light.
  */
  private fitLights(control: BABYLON.TransformNode, scene: BABYLON.Scene) {
    /*
    On the HULL (or body) where the model has one: the whole model's box
    reaches past it (a tank's tracks and fenders), and lamps placed on that
    hung in the air behind the tracks.
    */
    const volume = (m: BABYLON.AbstractMesh) => {
      const b = m.getHierarchyBoundingVectors(true)
      return (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z)
    }
    const hull = control
      .getChildMeshes(false)
      .filter((m) => /(^|[^a-z])(hull|body)$/i.test(m.name))
      .sort((a, b) => volume(b) - volume(a))[0]
    const { min, max } = (hull ?? control).getHierarchyBoundingVectors(true)
    // Their HEIGHT from the whole model (a car's body includes its cabin: on
    // that the tail lamps sat on the rear window).
    const whole = control.getHierarchyBoundingVectors(true)
    const height = Math.max(
      min.y,
      whole.min.y + (whole.max.y - whole.min.y) * 0.35
    )
    const span = (max.x - min.x) * 0.36
    this.beamFrom.set((min.x + max.x) / 2, height, max.z)
    const lamp = (name: string, color: BABYLON.Color3) => {
      const m = new BABYLON.StandardMaterial(`${this.tagName}-${name}`, scene)
      m.disableLighting = true
      m.emissiveColor = color.scale(0.15)
      return m
    }
    this.lamps = lamp('headlamp', new BABYLON.Color3(1, 0.95, 0.8))
    this.tailLamps = lamp('taillamp', new BABYLON.Color3(1, 0.05, 0.03))
    const size = Math.max(0.08, (max.x - min.x) * 0.07)
    for (const [z, mat, depth] of [
      [max.z + 0.01, this.lamps, 0.02],
      [min.z - 0.01, this.tailLamps, 0.02],
    ] as const) {
      for (const side of [-1, 1]) {
        const m = BABYLON.MeshBuilder.CreateBox(
          `${this.tagName}-lamp`,
          { width: size, height: size * 0.6, depth },
          scene
        )
        m.material = mat
        m.isPickable = false
        m.parent = control
        m.position.set((min.x + max.x) / 2 + side * span, height, z)
      }
    }
    this.beam = {
      position: new BABYLON.Vector3(),
      direction: new BABYLON.Vector3(0, -0.12, 1).normalize(),
      // A wide cone with a steep falloff, so the beam has no hard edge.
      angle: 1.6,
      exponent: 10,
      color: new BABYLON.Color3(1, 0.95, 0.85),
      intensity: 6,
      range: 40,
      level: 0,
    }
    this.releaseBeam = lightPool(scene).add(this.beam)
  }

  private updateLights() {
    const beam = this.beam
    const control = this.control
    if (beam == null || control == null) return
    const mode = this.headlights
    const level =
      mode === 'on'
        ? 1
        : mode === 'off'
        ? 0
        : this.inputProvider != null
        ? lampLevel(sceneDaylight(this.owner))
        : 0
    beam.level = level
    // The one you drive keeps its light, wherever you look (in a headset you
    // look round, and the pool gave it away and back: it flickered).
    beam.weight = this.inputProvider != null ? 20 : 1
    const world = control.getWorldMatrix()
    BABYLON.Vector3.TransformCoordinatesToRef(
      this.beamFrom,
      world,
      beam.position
    )
    BABYLON.Vector3.TransformNormalToRef(
      new BABYLON.Vector3(0, -0.12, 1),
      world,
      beam.direction!
    )
    beam.direction!.normalize()
    this.lamps?.emissiveColor.set(
      0.15 + 0.85 * level,
      0.14 + 0.81 * level,
      0.12 + 0.68 * level
    )
    this.tailLamps?.emissiveColor.set(0.15 + 0.6 * level, 0.01, 0.005)
  }

  /** The vehicle's own meshes, which its rays must not hit. */
  private isMine = (m: BABYLON.AbstractMesh) =>
    this.control != null && m.isDescendantOf(this.control)
  /**
   * What its rays hit: anything collidable but itself (made once, not per
   * ray). Water included: a car that ignored it sank to the seabed, out of the
   * world as far as a driver could tell.
   */
  private collides = collidable(this.isMine)
  /**
   * What the chase camera must not be inside or behind: anything solid but
   * the vehicle itself, TRAFFIC INCLUDED. Traffic is \`b3dNoCollide\` so a
   * vehicle's wall rays do not stop dead on it, and the camera used the same
   * test and went inside other cars (Tonio).
   */
  private seesPast = (m: BABYLON.AbstractMesh) =>
    m.isPickable &&
    m.isEnabled() &&
    m.isVisible &&
    // Not the UI in front of the camera (panels, the system bar, XR parts).
    m.renderingGroupId === 0 &&
    !/^xr-|panel|controller|laser|pointer|teleport|hand|skybox/i.test(m.name) &&
    !this.isMine(m)

  /*
  GROUND, once a frame. The model steps at 1/60 s and asks for the ground under
  every contact each step: at 13 fps that is five steps, so five rays per wheel
  a frame, and more the slower the frame (a Quest in the city). Each contact's
  ray is now cast once a frame and the steps after it meet the PLANE it found:
  within a frame a wheel moves a few tens of centimetres. A contact is known by
  where its ray started.

  But only within REUSE metres of where it was cast. A slow frame is long: at
  13 fps a car at 30 m/s goes 2.3 m, and a plane carried that far into a dip
  runs under the far slope, the wheel sinks into the hill, its next ray starts
  underground and finds nothing, and the car falls out of the world (Tonio,
  twice, on a Quest). Past it the contact casts again.
  */
  private groundCache: {
    from: Vec3
    point: Vec3 | null
    normal: Vec3 | null
  }[] = []
  /** Whether any contact's ray found ground this frame. */
  private groundFound = false

  private ground: GroundRay = (from, dir, length) => {
    const scene = this.owner?.scene
    if (scene == null) return null
    const REUSE = 0.35
    for (const c of this.groundCache) {
      if ((c.from.x - from.x) ** 2 + (c.from.z - from.z) ** 2 > REUSE * REUSE)
        continue
      const { point, normal } = c
      if (point == null || normal == null) return null
      const facing = dir.x * normal.x + dir.y * normal.y + dir.z * normal.z
      if (facing > -1e-4) return null
      const t =
        ((point.x - from.x) * normal.x +
          (point.y - from.y) * normal.y +
          (point.z - from.z) * normal.z) /
        facing
      return t >= 0 && t <= length ? { distance: t, normal } : null
    }
    const hit = pickWorld(
      scene,
      new BABYLON.Ray(V(from), V(dir), length),
      this.collides
    )
    const entry = {
      from: { ...from },
      point: null as Vec3 | null,
      normal: null as Vec3 | null,
    }
    this.groundCache.push(entry)
    if (hit == null) return null
    this.groundFound = true
    const n = hit.normal
    entry.normal = { x: n.x, y: n.y, z: n.z }
    entry.point = {
      x: from.x + dir.x * hit.distance,
      y: from.y + dir.y * hit.distance,
      z: from.z + dir.z * hit.distance,
    }
    return { distance: hit.distance, normal: entry.normal }
  }

  private _drive = () => {
    const scene = this.owner?.scene
    const spec = this.spec
    const state = this.state
    if (scene == null || spec == null || state == null) return
    const dt = sceneDelta(scene)
    const chasing =
      this.chaseCamera != null && scene.activeCamera === this.chaseCamera
    if (dt <= 0 || this._halted || simHalted(this.owner as SimGateOwner | null)) {
      // Stopped, but the camera is still posed: leaving VR pauses the scene,
      // and Babylon has just put the headset's pose on this camera (it sat at
      // head height at the origin, inside the ground, until Continue).
      if (chasing) this.aimCamera(0)
      return
    }
    const before = { ...state.position }
    this.groundCache.length = 0
    this.groundFound = false
    // At most a tenth of a second of physics a frame, so a stall cannot pile up
    // steps. A thirtieth was too tight: at 10 fps the car ran at a third of
    // real time and felt gutless. Wheel rays are cheap now (pickWorld).
    stepVehicle(
      spec,
      state,
      this.inputProvider ? this.controls : IDLE,
      Math.min(dt, 0.1),
      this.ground
    )
    this.blockByWalls(before, state)
    if (!this.groundFound) this.surface(scene, state)
    this.afterStep(state, dt)
    this.place()
    this.updateLights()
    this.updateEngine(state)
    this.updateLook(dt)
    if (chasing) this.aimCamera(dt)
  }

  /*
  THE SAFETY NET. No wheel found ground this frame: the vehicle is in the air
  (off a ramp, over a drop) or it is UNDER the ground, where every ray starts
  below the surface and misses. One ray from high above tells them apart; under
  the ground, it is put back on top, falling no faster than it was.
  */
  private surface(scene: BABYLON.Scene, state: VehicleState) {
    const p = state.position
    const hit = pickWorld(
      scene,
      new BABYLON.Ray(new BABYLON.Vector3(p.x, p.y + 50, p.z), BABYLON.Axis.Y.negate(), 60),
      this.collides
    )
    if (hit == null) return
    const top = p.y + 50 - hit.distance
    if (top <= p.y + 0.1) return
    shiftVehicle(state, 0, top + 0.3 - p.y, 0)
    state.velocity = { ...state.velocity, y: Math.max(0, state.velocity.y) }
  }

  /*
  The look, every frame and whichever camera is drawing: a headset's chase
  reads it too (it used to be updated only while the flat chase camera was
  active, so the orbit never moved in VR). The orbit follows the stick and
  springs back; the boom moves at a rate while it is held, and stays.
  */
  private updateLook(dt: number) {
    const ease = dt > 0 ? 1 - Math.exp(-dt * 6) : 1
    this.orbit += (this.lookWant.x * ORBIT_MAX - this.orbit) * ease
    this.boom = Math.max(
      0,
      Math.min(1, this.boom - this.lookWant.y * BOOM_RATE * dt)
    )
  }

  /**
   * Which way a headset's chase view faces, from the heading, radians: the
   * orbit (a car), or the turret and its lead (a tank). The XR rig orbits
   * round the vehicle by it.
   */
  chaseView(): number {
    const heading = this.state ? headingOf(this.state) : 0
    const d = this.viewYaw(heading) - heading
    return Math.atan2(Math.sin(d), Math.cos(d))
  }

  /** How far back a headset's chase sits: this vehicle's own (a tank's is farther). */
  get chaseDistance(): number {
    return this.rig ? this.rig.distance * 0.6 : 5
  }

  /** The engine, while driven: its note rises with speed, and it opens up on the throttle. */
  private updateEngine(state: VehicleState) {
    const driven = this.inputProvider != null && this.sound !== 'off'
    if (!driven) {
      this.engine?.stop()
      this.engine = null
      return
    }
    const camera = this.owner?.scene.activeCamera
    if (camera) placeListener(camera)
    this.engine ??= startVoice('engine', { refDistance: 5 })
    const voice = this.engine
    if (voice == null) return
    const speed = Math.abs(forwardSpeed(state))
    const pull = Math.abs(this.controls.throttle)
    voice.place(V(state.position).addInPlaceFromFloats(0, 0.6, 0))
    voice.set(
      0.22 + 0.35 * pull,
      this.engineNote * (0.75 + speed / 10 + pull * 0.3),
      0.3 + 0.6 * pull,
      16000
    )
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
  private blockByWalls(
    before: { x: number; y: number; z: number },
    state: VehicleState
  ) {
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
    // How far the climbing points reach this way: the lowest rays stop the body
    // only once those are a little past an obstacle's face, so they get on top.
    const climbAhead = this.climbPoints.length
      ? Math.max(...this.climbPoints.map((p) => p.x * local.x + p.z * local.z))
      : null
    this.wallBands.forEach(({ h, min, max }, i) => {
      // How far the body's edge at this height is from a point inside it, this way.
      const edgeOf = (o: BABYLON.Vector3) => {
        const tx =
          local.x > 1e-6
            ? (max.x - o.x) / local.x
            : local.x < -1e-6
            ? (min.x - o.x) / local.x
            : Infinity
        const tz =
          local.z > 1e-6
            ? (max.z - o.z) / local.z
            : local.z < -1e-6
            ? (min.z - o.z) / local.z
            : Infinity
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
        const hit = pickWorld(
          scene,
          new BABYLON.Ray(from, dirWorld, edge + moved + 0.05),
          this.collides
        )
        if (hit == null) continue
        const n = new BABYLON.Vector3(hit.normal.x, 0, hit.normal.z)
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
    for (const g of this.animations) g.dispose()
    this.animations = []
    this.anchor?.dispose()
    this.chaseCamera?.dispose()
    this.chaseCamera = null
    this.releaseBeam?.()
    this.releaseBeam = null
    this.engine?.stop()
    this.engine = null
    this.beam = null
    this.lamps?.dispose()
    this.tailLamps?.dispose()
    this.lamps = this.tailLamps = null
    this.control = this.anchor = null
    this.wallBands = []
    this.mesh = undefined
    this.spec = this.state = null
    this.ownMeshes = []
    super.sceneDispose()
  }
}
