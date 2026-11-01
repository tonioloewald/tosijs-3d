/*#
# b3d-tank

**A tracked vehicle**: a tank, a bulldozer, a tracked loader. Each track runs
at its own speed, so it steers by running one faster than the other and turns
on the spot with the stick to one side. It climbs what a car would slide back
down, and stops dead when you let go. The handling is
[ground-vehicle](/ground-vehicle/); the [b3d-car](/b3d-car/) page has one to
drive beside the cars.

## Demo

```js
import { b3d, b3dTank, inputFocus, playground } from 'tosijs-3d'

const tank = b3dTank({ x: -4, z: 10, player: true })
preview.append(
  b3d(
    { style: 'width: 100%; height: 100%', gamepad: 'left_stick,right_stick,left_trigger,right_trigger,right_bumper' },
    ...playground({ targets: 0 }),
    inputFocus(tank)
  )
)
```
```css
.preview { height: 100%; }
```

**W** and **S** (on a gamepad the right trigger, and the left trigger or right bumper) drive forward and
back, **A** and **D** (the left stick) steer; with nothing else held they pivot
it where it stands. The **arrow keys** (the right stick) aim the turret: left
and right traverse it, and pulling back raises the gun (pushing forward lowers
it). Clicking the right stick swaps up and down to the camera, which then
moves along its arc as a car's does (in a headset, in and out), and back. The camera follows the turret, leading it a little while it turns, and
the turret holds its aim while the hull turns under it.

## Its body

Given no `url` or `library`, it builds a plain one: a hull, a turret, and two
tracks whose treads move with the belts. A model of your own needs its tracks
as meshes with **`track`** in their names, one each side; the tank stands them
on five points along their undersides, and its raised ends climb: it gets up
a step about as high as its tracks. A node named **`turret`** turns on the
hull, and one inside it named **`mantlet`** (or else **`gun`**, **`barrel`**
or **`cannon`**) elevates (from -8° to 20°); put each one's origin on its
pivot. Meshes named **`wheel`** turn with their side's track.

Tracks can be LINKS instead (meshes named **`track_link…`**), carried round
by the model's own animation, one cycle moving each link onto the next one's
place: the tank plays it by the distance the track has run over the ground, so
the links grip at the pace of the ground, either way and turning on the spot.
Its other track meshes (a solid belt drawn over the links) are then hidden;
`guard`s stay. [Cross Country](/cross-country/) drives Tonio's tank, built
this way.

## Attributes

Those of [b3d-car](/b3d-car/) (`url`, `library`, `meshName`, `scale`,
`enterable`, `mass`, `maxSpeed`, `acceleration`, `braking`, `grip`), with a
tank's defaults: 20 t, 12 m/s, 3 m/s². And:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `turnSpeed` | `1.2` | How far apart the belts run at full steer, m/s |
*/
/*{ "parent": "characters-and-vehicles", "order": 31 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dGroundVehicle } from './b3d-ground-vehicle.js'
import { carMapping } from './virtual-gamepad.js'
import type { ControlInput } from './control-input.js'
import {
  headingOf,
  type TrackSpec,
  type VehicleSpec,
  type VehicleState,
} from './ground-vehicle.js'

const DEG = Math.PI / 180
/** Turret traverse, radians per second. */
const TRAVERSE = 60 * DEG
/** How fast the stick swings the aim, radians per second at full stick. */
const AIM_RATE = 90 * DEG
/** Gun elevation: how fast, and its limits. */
const ELEVATE = 20 * DEG
const GUN_LOW = -8 * DEG
const GUN_HIGH = 20 * DEG
/** How far the view leads the turret at full stick. */
const PEEK = 18 * DEG

interface Part {
  node: BABYLON.TransformNode
  rest: BABYLON.Quaternion
}
const partOf = (node: BABYLON.TransformNode): Part => ({
  node,
  rest: (
    node.rotationQuaternion ?? BABYLON.Quaternion.FromEulerVector(node.rotation)
  ).clone(),
})
/** The outermost descendant whose name matches (a turret's own parts are not turrets). */
function outermost(
  root: BABYLON.Node,
  re: RegExp
): BABYLON.TransformNode | null {
  const found = root
    .getDescendants(false)
    .filter(
      (n): n is BABYLON.TransformNode =>
        n instanceof BABYLON.TransformNode && re.test(n.name)
    )
  return (
    found.find((n) => !found.some((o) => o !== n && n.isDescendantOf(o))) ??
    null
  )
}

/** One stripe of tread, metres. */
const TREAD = 0.25

/** A wheel that turns with its track: its node, its rest, its radius. */
interface Wheel {
  part: Part
  radius: number
  /** 0 or 1: which track (by side) drives it. */
  side: number
}

/**
 * A track's LINKS, carried round by the model's own animation. One cycle of
 * it moves each link one place on (onto the next link's spot), so the frame
 * is the distance travelled over one link's pitch: the links keep exact pace
 * with the ground, either way.
 */
interface LinkTrack {
  group: BABYLON.AnimationGroup
  /** Metres from one link to the next. */
  pitch: number
}

interface TrackPart {
  links?: LinkTrack
  textures: BABYLON.Texture[]
  /** Which way the tread runs in the texture: ours along u, a model's along v. */
  along: 'u' | 'v'
  /** Texture repeats per metre of belt. */
  perMetre: number
}

/** Stripes of tread: one texture per track, so each scrolls on its own. */
function treadTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  // Stripes across u: the box is wrapped so u runs along the belt.
  const t = new BABYLON.DynamicTexture(
    'tread',
    { width: 64, height: 16 },
    scene,
    false
  )
  const ctx = t.getContext()
  ctx.fillStyle = '#2a2a28'
  ctx.fillRect(0, 0, 64, 16)
  ctx.fillStyle = '#4a4a44'
  ctx.fillRect(0, 0, 26, 16)
  t.update()
  t.wrapU = t.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
  return t
}

export class B3dTank extends B3dGroundVehicle {
  /** A diesel: lower than a car. */
  protected engineNote = 0.55
  static preferredTagName = 'tosi-b3d-tank'

  inputMapping = carMapping
  static initAttributes = {
    ...B3dGroundVehicle.initAttributes,
    mass: 20000,
    maxSpeed: 12,
    acceleration: 3,
    braking: 6,
    turnSpeed: 1.2,
  }
  declare turnSpeed: number

  private trackParts: TrackPart[] = []
  private wheels: Wheel[] = []
  /**
   * How far each track's belt has run against the GROUND, metres: what the
   * links and wheels show. The model's own `offset` runs at the speed asked
   * for, so from a standing start it raced ahead of a hull still gathering
   * speed (29 m of belt for 11 m of ground), as if spinning in mud.
   */
  private belts: number[] = []
  private turret: Part | null = null
  private gun: Part | null = null
  /** Where the gun is aimed, world yaw (radians): the stick moves it. */
  private aimYaw = 0
  /** The turret's turn on the hull, radians. */
  turretYaw = 0
  /** The gun's elevation, radians (up positive). */
  gunPitch = 0
  private aim = { x: 0, y: 0 }

  /** The right stick traverses the turret and elevates the gun, or moves the camera. */
  protected aimInput(x: number, y: number, dt: number) {
    const gun = this.stickMode === 'gun'
    this.aim = { x, y: gun ? y : 0 }
    super.aimInput(0, gun ? 0 : y, dt)
  }

  applyInput(input: ControlInput, dt: number) {
    const mode = input.lookMode ?? 0
    if (mode > 0.5 && this.modeWas <= 0.5) {
      this.stickMode = this.stickMode === 'gun' ? 'camera' : 'gun'
      const owner = this.owner as any
      owner?.haptic?.(0.6, 40)
      if (this.stickMode === 'camera')
        setTimeout(() => owner?.haptic?.(0.6, 40), 120)
    }
    this.modeWas = mode
    super.applyInput(input, dt)
  }

  /*
  WHAT UP AND DOWN DO: the gun, or the camera. Clicking the right stick
  (R3) swaps them (Tonio, in a headset: "I'd actually like to be able to pull
  the camera in and out as well as elevate the gun"), with a buzz in the
  right hand: one for the gun, two for the camera. Left and right always turn
  the turret.
  */
  stickMode: 'gun' | 'camera' = 'gun'
  private modeWas = 0
  /** The right stick aims the gun (not the camera) in gun mode. */
  get stickAims(): boolean {
    return this.stickMode === 'gun'
  }
  /** A tank's chase sits farther back than a car's. */
  protected chaseScale = 1.35
  /** The view's lead toward where the turret is turning, radians (eased). */
  private peek = 0

  /*
  THE VIEW FOLLOWS THE TURRET (Tonio: "View should match turret heading but
  while pulling left or right perhaps have the view peek a bit ... as if you are
  anticipating where you'll point the gun"). Up and down only elevate the gun:
  the camera stays on its boom.
  */
  protected viewYaw(): number {
    const heading = this.state ? headingOf(this.state) : 0
    return heading + this.turretYaw + this.peek
  }


  protected resetView(heading: number) {
    this.aimYaw = heading + this.turretYaw
    this.aim = { x: 0, y: 0 }
  }

  handleLoseFocus() {
    super.handleLoseFocus()
    this.aim = { x: 0, y: 0 }
  }

  /*
  THE TURRET HOLDS ITS AIM IN THE WORLD. The stick moves the aim point; the
  turret traverses toward it at its own rate, so turning the hull does not
  swing the gun off target (GTA's tank works this way).
  */
  protected afterStep(state: VehicleState, dt: number) {
    this.runBelts(state, dt)
    if (this.turret == null) return
    // Nobody aboard: the turret stays as it is on the hull.
    if (this.inputProvider == null) {
      this.aimYaw = headingOf(state) + this.turretYaw
      return
    }
    this.peek += (this.aim.x * PEEK - this.peek) * (1 - Math.exp(-dt * 4))
    this.aimYaw += this.aim.x * AIM_RATE * dt
    const want = this.aimYaw - headingOf(state)
    let d = want - this.turretYaw
    d = Math.atan2(Math.sin(d), Math.cos(d))
    this.turretYaw += Math.max(-TRAVERSE * dt, Math.min(TRAVERSE * dt, d))
    this.gunPitch = Math.max(
      GUN_LOW,
      // Pull back to raise the gun (Tonio), as a flight stick pitches.
      Math.min(GUN_HIGH, this.gunPitch - this.aim.y * ELEVATE * dt)
    )
  }

  /** Each belt runs at the ground's speed under its track: the hull's, plus its turn. */
  private runBelts(state: VehicleState, dt: number) {
    const tracks = this.spec?.tracks ?? []
    const q = state.orientation
    const rot = new BABYLON.Quaternion(q.x, q.y, q.z, q.w)
    const fwd = BABYLON.Vector3.Forward().applyRotationQuaternion(rot)
    const w = state.angularVelocity
    const omega = new BABYLON.Vector3(w.x, w.y, w.z)
    const v = state.velocity
    tracks.forEach((track, i) => {
      const x =
        track.contacts.reduce((t, p) => t + p.x, 0) /
        Math.max(1, track.contacts.length)
      const r = new BABYLON.Vector3(x, 0, 0).applyRotationQuaternion(rot)
      const at = BABYLON.Vector3.Cross(omega, r).addInPlaceFromFloats(v.x, v.y, v.z)
      this.belts[i] = (this.belts[i] ?? 0) + BABYLON.Vector3.Dot(at, fwd) * dt
    })
  }

  protected makeDefaultBody(scene: BABYLON.Scene): BABYLON.TransformNode {
    const root = new BABYLON.TransformNode('tank', scene)
    const body = new BABYLON.TransformNode('tank-body', scene)
    body.parent = root
    const paint = new BABYLON.StandardMaterial('tank-paint', scene)
    paint.diffuseColor = BABYLON.Color3.FromHexString('#5d6b47')
    paint.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)
    const part = (mesh: BABYLON.Mesh, mat: BABYLON.Material = paint) => {
      mesh.material = mat
      mesh.parent = body
      mesh.checkCollisions = true
      return mesh
    }
    const hull = part(
      BABYLON.MeshBuilder.CreateBox(
        'hull',
        { width: 2.4, height: 0.9, depth: 4.6 },
        scene
      )
    )
    hull.position.y = 1.05
    const glacis = part(
      BABYLON.MeshBuilder.CreateBox(
        'glacis',
        { width: 2.4, height: 0.5, depth: 1 },
        scene
      )
    )
    glacis.position.set(0, 1.0, 2.45)
    glacis.rotation.x = 0.6
    // The turret turns on its ring, the gun elevates on its trunnion.
    const turret = new BABYLON.TransformNode('turret', scene)
    turret.parent = body
    turret.position.set(0, 1.8, -0.2)
    const ring = part(
      BABYLON.MeshBuilder.CreateCylinder(
        'turret-body',
        { diameter: 2, height: 0.6, tessellation: 8 },
        scene
      )
    )
    ring.parent = turret
    const gun = new BABYLON.TransformNode('gun', scene)
    gun.parent = turret
    gun.position.set(0, 0, 0.8)
    const barrel = part(
      BABYLON.MeshBuilder.CreateCylinder(
        'barrel',
        { diameter: 0.18, height: 3, tessellation: 12 },
        scene
      )
    )
    barrel.parent = gun
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0, 1.4)

    for (const side of [-1, 1]) {
      const mat = new BABYLON.StandardMaterial(`track-${side}`, scene)
      mat.diffuseTexture = treadTexture(scene)
      mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
      const track = part(
        BABYLON.MeshBuilder.CreateBox(
          `track-${side < 0 ? 'left' : 'right'}`,
          {
            width: 0.6,
            height: 0.8,
            depth: 5,
            wrap: true,
            topBaseAt: 1,
            bottomBaseAt: 1,
          },
          scene
        ),
        mat
      )
      track.position.set(side * 1.45, 0.4, 0)
    }
    return root
  }

  protected specFor(control: BABYLON.TransformNode): VehicleSpec | null {
    const turret = outermost(control, /turret/i)
    // The mantlet carries the barrel: elevate it, not the barrel on its own.
    const gun = turret
      ? outermost(turret, /mantlet/i) ?? outermost(turret, /gun|barrel|cannon/i)
      : null
    this.turret = turret ? partOf(turret) : null
    this.gun = gun ? partOf(gun) : null
    let tracks = control
      .getChildMeshes(false)
      .filter((m) => /track/i.test(m.name))
    /*
    LINKS. A model whose tracks are links (`track_link…`) has them carried
    round by its animations, and its other track meshes (a solid belt drawn
    over the links, as in Tonio's tank) would hide them moving: they are
    hidden. Guards stay. The links alone give each track's extent.
    */
    const links = tracks.filter((m) => /link/i.test(m.name))
    if (links.length > 0) {
      for (const m of tracks)
        if (!/link|guard/i.test(m.name)) m.setEnabled(false)
      tracks = links
    }
    const sides = [
      tracks.filter((m) => this.centreX(m) < 0),
      tracks.filter((m) => this.centreX(m) >= 0),
    ]
    if (sides.some((s) => s.length === 0)) return null
    const specs: TrackSpec[] = []
    this.trackParts = []
    this.wheels = []
    for (const meshes of sides) {
      let min = new BABYLON.Vector3(Infinity, Infinity, Infinity)
      let max = min.negate()
      for (const m of meshes) {
        const b = m.getHierarchyBoundingVectors(true)
        min = BABYLON.Vector3.Minimize(min, b.min)
        max = BABYLON.Vector3.Maximize(max, b.max)
      }
      const radius = Math.min(0.4, (max.y - min.y) / 2)
      const x = (min.x + max.x) / 2
      const z0 = min.z + radius
      const z1 = max.z - radius
      // The raised ends climb: three points up each end like a ramp, from the
      // hubs to just under the track's top, each catching what the one below
      // cannot reach.
      const hub = min.y + radius
      const crest = Math.max(hub + 0.1, max.y - 0.05)
      const climb = [1, 2, 3].flatMap((k) => {
        const y = hub + ((crest - hub) * k) / 3
        const out = (radius * k) / 3
        return [
          { x, y, z: z1 + out },
          { x, y, z: z0 - out },
        ]
      })
      specs.push({
        radius,
        contacts: [0, 0.25, 0.5, 0.75, 1].map((f) => ({
          x,
          y: hub,
          z: z0 + (z1 - z0) * f,
        })),
        climb,
      })
      // Links move themselves: their texture stays put.
      const textures = (links.length > 0 ? [] : meshes)
        .map((m) => {
          const mat = m.material as
            | (BABYLON.Material & {
                diffuseTexture?: BABYLON.Texture
                albedoTexture?: BABYLON.Texture
              })
            | null
          return mat?.diffuseTexture ?? mat?.albedoTexture ?? null
        })
        .filter((t): t is BABYLON.Texture => t != null)
      const length = max.z - min.z
      const along = textures.some((t) => t.name === 'tread') ? 'u' : 'v'
      if (along === 'u') for (const t of textures) t.uScale = length / TREAD
      this.trackParts.push({
        links: links.length > 0 ? this.linkTrack(meshes) : undefined,
        textures,
        along,
        perMetre: along === 'u' ? 1 / TREAD : 1 / length,
      })
    }
    // Wheels (and hubs) turn with their side's track.
    for (const m of control.getChildMeshes(false)) {
      if (!/wheel/i.test(m.name)) continue
      const box = m.getBoundingInfo().boundingBox
      const radius = Math.max(0.05, (box.maximum.y - box.minimum.y) / 2)
      this.wheels.push({ part: partOf(m), radius, side: this.centreX(m) < 0 ? 0 : 1 })
    }
    const { min, max } = control.getHierarchyBoundingVectors(true)
    const mass = Number(this.mass)
    return {
      mass,
      size: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z },
      centreOfMass: { x: 0, y: (min.y + max.y) * 0.4, z: (min.z + max.z) / 2 },
      tracks: specs,
      engineForce: mass * Number(this.acceleration),
      brakeForce: mass * Number(this.braking),
      maxSpeed: Number(this.maxSpeed),
      grip: Number(this.grip),
      turnSpeed: Number(this.turnSpeed),
    }
  }

  /**
   * The animation that carries these links, and their pitch (the loop's
   * length over its links, from where they rest). Null if none moves them.
   */
  private linkTrack(meshes: BABYLON.AbstractMesh[]): LinkTrack | undefined {
    const mine = new Set<BABYLON.Node>(meshes)
    const group = this.animations.find((g) =>
      g.targetedAnimations.some((t) => mine.has(t.target))
    )
    if (group == null) return undefined
    // In name order (link .00, .01 …), the loop's length over its links.
    const ordered = [...meshes].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    const at = ordered.map((m) => m.getAbsolutePosition().clone())
    let loop = 0
    for (let i = 0; i < at.length; i++)
      loop += BABYLON.Vector3.Distance(at[i], at[(i + 1) % at.length])
    group.start(true, 1, group.from, group.to)
    group.pause()
    return { group, pitch: loop / at.length }
  }

  private centreX(m: BABYLON.AbstractMesh): number {
    const { min, max } = m.getHierarchyBoundingVectors(true)
    return (min.x + max.x) / 2
  }

  protected pose(_state: VehicleState) {
    if (this.turret) {
      this.turret.node.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
        BABYLON.Axis.Y,
        this.turretYaw
      ).multiply(this.turret.rest)
    }
    if (this.gun) {
      // A positive turn about +X dips +Z: elevation is the negative.
      this.gun.node.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
        BABYLON.Axis.X,
        -this.gunPitch
      ).multiply(this.gun.rest)
    }
    this.trackParts.forEach((part, i) => {
      const offset = this.belts[i] ?? 0
      if (part.links) {
        const { group, pitch } = part.links
        const f = offset / pitch - Math.floor(offset / pitch)
        group.goToFrame(group.from + f * (group.to - group.from))
      }
      const shift = -((offset * part.perMetre) % 1)
      for (const t of part.textures) {
        if (part.along === 'u') t.uOffset = shift
        else t.vOffset = shift
      }
    })
    for (const w of this.wheels) {
      const offset = this.belts[w.side] ?? 0
      w.part.node.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
        BABYLON.Axis.X,
        offset / w.radius
      ).multiply(w.part.rest)
    }
  }

  sceneDispose() {
    this.trackParts = []
    this.wheels = []
    this.belts = []
    this.turret = this.gun = null
    super.sceneDispose()
  }
}

export const b3dTank = B3dTank.elementCreator()
