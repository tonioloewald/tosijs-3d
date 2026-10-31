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
    { style: 'width: 100%; height: 100%' },
    ...playground({ targets: 0 }),
    inputFocus(tank)
  )
)
```
```css
.preview { height: 100%; }
```

**W** and **S** drive forward and back, **A** and **D** steer; with nothing
else held they pivot it where it stands.

## Its body

Given no `url` or `library`, it builds a plain one: a hull, a turret, and two
tracks whose treads move with the belts. A model of your own needs its tracks
as meshes with **`track`** in their names, one each side; the tank stands them
on five points along their undersides. A turret is a
[b3d-turret](/b3d-turret/) nested in it.

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
import type { TrackSpec, VehicleSpec, VehicleState } from './ground-vehicle.js'

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
    const turret = part(BABYLON.MeshBuilder.CreateCylinder('turret', { diameter: 2, height: 0.6, tessellation: 8 }, scene))
    turret.position.set(0, 1.8, -0.2)
    const barrel = part(BABYLON.MeshBuilder.CreateCylinder('barrel', { diameter: 0.18, height: 3, tessellation: 12 }, scene))
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 1.8, 2)

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
      specs.push({
        radius,
        contacts: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ x, y: min.y + radius, z: z0 + (z1 - z0) * f })),
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
    super.sceneDispose()
  }
}

export const b3dTank = B3dTank.elementCreator()
