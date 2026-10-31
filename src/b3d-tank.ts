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
    { style: 'width: 100%; height: 100%', gamepad: 'left_stick,right_stick,left_trigger,right_trigger' },
    ...playground({ targets: 0 }),
    inputFocus(tank)
  )
)
```
```css
.preview { height: 100%; }
```

**W** and **S** (on a gamepad the right and left triggers) drive forward and
back, **A** and **D** (the left stick) steer; with nothing else held they pivot
it where it stands. The **arrow keys** (the right stick) aim the turret: left
and right traverse it, up and down elevate the gun. The camera looks where the
gun points, and the turret holds its aim while the hull turns under it.

## Its body

Given no `url` or `library`, it builds a plain one: a hull, a turret, and two
tracks whose treads move with the belts. A model of your own needs its tracks
as meshes with **`track`** in their names, one each side; the tank stands them
on five points along their undersides, and its raised ends climb: it gets up
a step about as high as its tracks. A node named **`turret`** turns on the
hull, and one inside it named **`gun`**, **`barrel`** or **`cannon`** elevates
(from -8° to 20°); put each one's origin on its pivot.

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
import { headingOf, type TrackSpec, type VehicleSpec, type VehicleState } from './ground-vehicle.js'

const DEG = Math.PI / 180
/** Turret traverse, radians per second. */
const TRAVERSE = 60 * DEG
/** How fast the stick swings the aim, radians per second at full stick. */
const AIM_RATE = 90 * DEG
/** Gun elevation: how fast, and its limits. */
const ELEVATE = 20 * DEG
const GUN_LOW = -8 * DEG
const GUN_HIGH = 20 * DEG

interface Part {
  node: BABYLON.TransformNode
  rest: BABYLON.Quaternion
}
const partOf = (node: BABYLON.TransformNode): Part => ({
  node,
  rest: (node.rotationQuaternion ?? BABYLON.Quaternion.FromEulerVector(node.rotation)).clone(),
})
/** The outermost descendant whose name matches (a turret's own parts are not turrets). */
function outermost(root: BABYLON.Node, re: RegExp): BABYLON.TransformNode | null {
  const found = root
    .getDescendants(false)
    .filter((n): n is BABYLON.TransformNode => n instanceof BABYLON.TransformNode && re.test(n.name))
  return found.find((n) => !found.some((o) => o !== n && n.isDescendantOf(o))) ?? null
}

/** One stripe of tread, metres. */
const TREAD = 0.25

interface TrackPart {
  textures: BABYLON.Texture[]
  /** Which way the tread runs in the texture: ours along u, a model's along v. */
  along: 'u' | 'v'
  /** Texture repeats per metre of belt. */
  perMetre: number
}

/** Stripes of tread: one texture per track, so each scrolls on its own. */
function treadTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  // Stripes across u: the box is wrapped so u runs along the belt.
  const t = new BABYLON.DynamicTexture('tread', { width: 64, height: 16 }, scene, false)
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
  private turret: Part | null = null
  private gun: Part | null = null
  /** Where the gun is aimed, world yaw (radians): the stick moves it. */
  private aimYaw = 0
  /** The turret's turn on the hull, radians. */
  turretYaw = 0
  /** The gun's elevation, radians (up positive). */
  gunPitch = 0
  private aim = { x: 0, y: 0 }

  /** The right stick traverses the turret and elevates the gun. */
  protected aimInput(x: number, y: number) {
    this.aim = { x, y }
  }

  /** The camera looks where the gun is aimed. */
  protected viewYaw(): number {
    return this.aimYaw
  }

  protected viewTilt(): number {
    return 0
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
    if (this.turret == null) return
    // Nobody aboard: the turret stays as it is on the hull.
    if (this.inputProvider == null) {
      this.aimYaw = headingOf(state) + this.turretYaw
      return
    }
    this.aimYaw += this.aim.x * AIM_RATE * dt
    const want = this.aimYaw - headingOf(state)
    let d = want - this.turretYaw
    d = Math.atan2(Math.sin(d), Math.cos(d))
    this.turretYaw += Math.max(-TRAVERSE * dt, Math.min(TRAVERSE * dt, d))
    this.gunPitch = Math.max(GUN_LOW, Math.min(GUN_HIGH, this.gunPitch + this.aim.y * ELEVATE * dt))
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
    const hull = part(BABYLON.MeshBuilder.CreateBox('hull', { width: 2.4, height: 0.9, depth: 4.6 }, scene))
    hull.position.y = 1.05
    const glacis = part(BABYLON.MeshBuilder.CreateBox('glacis', { width: 2.4, height: 0.5, depth: 1 }, scene))
    glacis.position.set(0, 1.0, 2.45)
    glacis.rotation.x = 0.6
    // The turret turns on its ring, the gun elevates on its trunnion.
    const turret = new BABYLON.TransformNode('turret', scene)
    turret.parent = body
    turret.position.set(0, 1.8, -0.2)
    const ring = part(BABYLON.MeshBuilder.CreateCylinder('turret-body', { diameter: 2, height: 0.6, tessellation: 8 }, scene))
    ring.parent = turret
    const gun = new BABYLON.TransformNode('gun', scene)
    gun.parent = turret
    gun.position.set(0, 0, 0.8)
    const barrel = part(BABYLON.MeshBuilder.CreateCylinder('barrel', { diameter: 0.18, height: 3, tessellation: 12 }, scene))
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
          { width: 0.6, height: 0.8, depth: 5, wrap: true, topBaseAt: 1, bottomBaseAt: 1 },
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
    const gun = turret ? outermost(turret, /gun|barrel|cannon/i) : null
    this.turret = turret ? partOf(turret) : null
    this.gun = gun ? partOf(gun) : null
    const tracks = control.getChildMeshes(false).filter((m) => /track/i.test(m.name))
    const sides = [tracks.filter((m) => this.centreX(m) < 0), tracks.filter((m) => this.centreX(m) >= 0)]
    if (sides.some((s) => s.length === 0)) return null
    const specs: TrackSpec[] = []
    this.trackParts = []
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
        contacts: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ x, y: hub, z: z0 + (z1 - z0) * f })),
        climb,
      })
      const textures = meshes
        .map((m) => {
          const mat = m.material as (BABYLON.Material & { diffuseTexture?: BABYLON.Texture; albedoTexture?: BABYLON.Texture }) | null
          return mat?.diffuseTexture ?? mat?.albedoTexture ?? null
        })
        .filter((t): t is BABYLON.Texture => t != null)
      const length = max.z - min.z
      const along = textures.some((t) => t.name === 'tread') ? 'u' : 'v'
      if (along === 'u') for (const t of textures) t.uScale = length / TREAD
      this.trackParts.push({ textures, along, perMetre: along === 'u' ? 1 / TREAD : 1 / length })
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

  private centreX(m: BABYLON.AbstractMesh): number {
    const { min, max } = m.getHierarchyBoundingVectors(true)
    return (min.x + max.x) / 2
  }

  protected pose(state: VehicleState) {
    if (this.turret) {
      this.turret.node.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, this.turretYaw).multiply(this.turret.rest)
    }
    if (this.gun) {
      // A positive turn about +X dips +Z: elevation is the negative.
      this.gun.node.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, -this.gunPitch).multiply(this.gun.rest)
    }
    this.trackParts.forEach((part, i) => {
      const offset = state.tracks[i]?.offset ?? 0
      const shift = -((offset * part.perMetre) % 1)
      for (const t of part.textures) {
        if (part.along === 'u') t.uOffset = shift
        else t.vOffset = shift
      }
    })
  }

  sceneDispose() {
    this.trackParts = []
    this.turret = this.gun = null
    super.sceneDispose()
  }
}

export const b3dTank = B3dTank.elementCreator()
