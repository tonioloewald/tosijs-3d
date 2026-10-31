/*#
# b3d-city

**A city to drive around**, built from a seed: roads, blocks of buildings,
street lights, parked cars. The plan is [city-layout](/city-layout/); this
dresses it with a **kit**, Kenney's city kits unless you give it another, at
8 m a cell. Street lights come on at dusk and light the road (the brightest
few near you are real lights, the rest glow), and a car you drive turns its
headlights on.

## Demo

```js
import { b3d, b3dCar, b3dCity, b3dLibrary, b3dSkybox, b3dSun, inputFocus, slider3d, assetUrl } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cityDemo } = tosi({ cityDemo: { time: 19.5, speed: 120 } })
const sky = b3dSkybox({ timeOfDay: cityDemo.time, realtimeScale: cityDemo.speed })

preview.append(
  b3d(
    {
      style: 'width: 100%; height: 100%',
      gamepad: 'left_stick,right_stick,left_trigger,right_trigger,A,X',
      panelTitle: 'City',
      scenePanel: () => [
        slider3d({ label: 'time of day', value: cityDemo.time, min: 0, max: 24, step: 0.1 }),
        slider3d({ label: 'time speed', value: cityDemo.speed, min: 0, max: 600, step: 10 }),
      ],
    },
    b3dSun({ shadowTextureSize: 2048 }),
    sky,
    b3dLibrary({ url: assetUrl('kenney/libraries/car-kit.glb'), type: 'cars' }),
    b3dCity({ width: 24, depth: 24, seed: 3 }),
    inputFocus(
      b3dCar({ library: 'cars', meshName: 'sedan-sports', scale: 1.7, player: true, x: -92, z: -60, ry: 0 })
    )
  )
)
```
```css
.preview { height: 100%; }
```

You are driving: the right trigger or **W** goes, the left trigger or **S**
brakes and reverses, the left stick or **A** and **D** steer. Time runs at 120×,
so night falls in a few minutes; the owl's panel sets the hour and the speed.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width`, `depth` | `24` | The grid, cells |
| `seed` | `1` | Same seed, same city |
| `cell` | `8` | Metres a cell |
| `blockMin`, `blockMax` | `3`, `6` | Block sizes, cells (see [city-layout](/city-layout/)) |
| `downtown` | `0.45` | How far out from the middle the tall buildings go, 0 to 1 |
| `lightEvery` | `2` | A street light every this many road cells |
| `parked` | `0.2` | The chance of a parked car on a stretch of road |

The city is centred on its `x`, `y`, `z`. `kit` (a property, not an
attribute) is the manifest: which library model is each road piece, building,
street light and car, how a model is turned and how big it is in cells. See
`KENNEY_CITY` for the shape; another kit on another grid needs only another
manifest. `layout` is the plan it built, `lamps` how many street lights it has.
*/
/*{ "parent": "terrain", "order": 61 }*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { B3dChild } from './b3d-utils.js'
import { b3dLibrary } from './b3d-library.js'
import { assetUrl } from './asset-url.js'
import { cityLayout, type CityLayout, type RoadPiece, type Side } from './city-layout.js'
import { PRNG } from './mersenne-twister.js'
import { lightPool, sceneDaylight, lampLevel, type VirtualLight } from './light-pool.js'

/** One model in a kit. */
export interface KitPiece {
  /** A library `type` named in the kit's `libraries`. */
  library: string
  mesh: string
  /** Quarter turns clockwise (north to east) from the piece's canonical orientation (road pieces). */
  turns?: number
  /** Footprint in cells, along the street and back from it (buildings). Default 1 × 1. */
  size?: [number, number]
  /** Which side of the unturned model is its front (buildings). Default `'n'`. */
  front?: Side
  /** World metres per model unit, if not the city's (cars are not built to the city's grid). */
  scale?: number
  /** How likely, against the others in its list. Default 1. */
  weight?: number
}

export interface CityKit {
  /** Model units a cell (Kenney's city kits: 1). */
  cell: number
  /** Library type → URL (a CDN path goes through `assetUrl`). */
  libraries: Record<string, string>
  roads: Partial<Record<RoadPiece, KitPiece>>
  buildings: { downtown: KitPiece[]; suburbs: KitPiece[] }
  /** Its arm reaches toward -Z; `bulb` is where the light is, model units. */
  streetLight?: KitPiece & { bulb: [number, number, number] }
  parkedCars?: KitPiece[]
  /** The ground between the buildings. */
  ground?: string
}

const commercial = 'abcdefghijklmn'.split('').map((c) => ({ library: 'commercial', mesh: `building-${c}` }))
const towers = 'abcde'.split('').map((c) => ({
  library: 'commercial',
  mesh: `building-skyscraper-${c}`,
  size: [2, 2] as [number, number],
  weight: 2,
}))
const houses = 'abcdefghijklmnopqrstu'.split('').map((c) => ({
  library: 'suburban',
  mesh: `building-type-${c}`,
  size: [2, 1] as [number, number],
}))

/** Kenney's city kits (CC0): roads, commercial, suburban; Kenney's cars parked. */
export const KENNEY_CITY: CityKit = {
  cell: 1,
  libraries: {
    roads: 'kenney/libraries/city-kit-roads.glb',
    commercial: 'kenney/libraries/city-kit-commercial.glb',
    suburban: 'kenney/libraries/city-kit-suburban.glb',
    cars: 'kenney/libraries/car-kit.glb',
  },
  // Measured from above: Kenney's straight runs east-west, the bend joins
  // north and west, the T is closed to the south, the end opens east.
  roads: {
    straight: { library: 'roads', mesh: 'road-straight', turns: 1 },
    bend: { library: 'roads', mesh: 'road-bend', turns: 3 },
    tee: { library: 'roads', mesh: 'road-intersection', turns: 3 },
    cross: { library: 'roads', mesh: 'road-crossroad', turns: 0 },
    end: { library: 'roads', mesh: 'road-end', turns: 1 },
    single: { library: 'roads', mesh: 'road-square', turns: 0 },
  },
  buildings: { downtown: [...commercial, ...towers], suburbs: houses },
  streetLight: { library: 'roads', mesh: 'light-square', bulb: [0, 0.57, -0.19] },
  parkedCars: ['sedan', 'sedan-sports', 'hatchback-sports', 'suv', 'taxi', 'van', 'police', 'delivery'].map(
    (mesh) => ({ library: 'cars', mesh, scale: 1.7 })
  ),
  ground: '#8c8a80',
}

const SIDES: Side[] = ['n', 'e', 's', 'w']
const STEP: Record<Side, [number, number]> = { n: [0, 1], e: [1, 0], s: [0, -1], w: [-1, 0] }
const QUARTER = Math.PI / 2

interface Template {
  parts: { mesh: BABYLON.Mesh; rel: BABYLON.Matrix }[]
  matrices: BABYLON.Matrix[]
  min: BABYLON.Vector3
  max: BABYLON.Vector3
}

function pick<T extends { weight?: number }>(list: T[], rng: PRNG): T {
  const total = list.reduce((t, p) => t + (p.weight ?? 1), 0)
  let r = rng.value() * total
  for (const p of list) {
    r -= p.weight ?? 1
    if (r <= 0) return p
  }
  return list[list.length - 1]
}

export class B3dCity extends B3dChild {
  static preferredTagName = 'tosi-b3d-city'
  static initAttributes = {
    width: 24,
    depth: 24,
    seed: 1,
    cell: 8,
    blockMin: 3,
    blockMax: 6,
    downtown: 0.45,
    lightEvery: 2,
    parked: 0.2,
    x: 0,
    y: 0,
    z: 0,
  }
  declare width: number
  declare depth: number
  declare seed: number
  declare cell: number
  declare blockMin: number
  declare blockMax: number
  declare downtown: number
  declare lightEvery: number
  declare parked: number
  declare x: number
  declare y: number
  declare z: number

  /** The manifest: which model is which. Set it before the city is built. */
  kit: CityKit = KENNEY_CITY
  /** The plan it built. */
  layout: CityLayout | null = null

  private root: BABYLON.TransformNode | null = null
  private libraries: HTMLElement[] = []
  private templates = new Map<string, Template>()
  private lampLights: VirtualLight[] = []
  private releaseLamps: (() => void)[] = []
  private bulbs: BABYLON.Mesh | null = null
  private bulbMaterial: BABYLON.StandardMaterial | null = null
  private generation = 0

  get lamps(): number {
    return this.lampLights.length
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    const gen = ++this.generation
    const kit = this.kit
    const prefix = `city-${gen}-${Math.round(Math.random() * 1e6)}-`
    for (const [type, url] of Object.entries(kit.libraries)) {
      const lib = b3dLibrary({ url: assetUrl(url), type: prefix + type })
      this.libraries.push(lib)
      this.append(lib)
    }
    const ready = async () => {
      // A library registers itself a moment after it is appended.
      let libs = Object.keys(kit.libraries).map((t) => owner.getLibrary(prefix + t))
      for (let i = 0; i < 100 && libs.some((l) => l == null); i++) {
        await new Promise((r) => setTimeout(r, 50))
        libs = Object.keys(kit.libraries).map((t) => owner.getLibrary(prefix + t))
      }
      if (libs.some((l) => l == null)) {
        console.error('b3d-city: a kit library never loaded')
        return
      }
      await Promise.all(libs.map((l) => l!.ready))
      if (gen !== this.generation) return
      this.build(owner, scene, prefix)
    }
    void ready()
  }

  private template(owner: B3d, prefix: string, piece: KitPiece): Template | null {
    const key = `${piece.library}:${piece.mesh}`
    const known = this.templates.get(key)
    if (known) return known
    const lib = owner.getLibrary(prefix + piece.library)
    const node = lib?.instantiate(piece.mesh, { canonical: true, animations: false })
    if (!(node instanceof BABYLON.TransformNode)) return null
    node.position.setAll(0)
    node.rotationQuaternion = BABYLON.Quaternion.Identity()
    node.scaling.setAll(1)
    node.computeWorldMatrix(true)
    const meshes = node.getChildMeshes(false).filter((m): m is BABYLON.Mesh => m instanceof BABYLON.Mesh && m.getTotalVertices() > 0)
    meshes.forEach((m) => m.computeWorldMatrix(true))
    const { min, max } = node.getHierarchyBoundingVectors(true)
    // Each part keeps where it sat in the model; the parts hang from the city's root.
    const parts = meshes.map((mesh) => {
      const rel = mesh.getWorldMatrix().clone()
      mesh.parent = this.root
      mesh.position.setAll(0)
      mesh.rotationQuaternion = BABYLON.Quaternion.Identity()
      mesh.scaling.setAll(1)
      mesh.isPickable = true
      mesh.thinInstanceEnablePicking = true
      return { mesh, rel }
    })
    node.dispose(true)
    const t: Template = { parts, matrices: [], min, max }
    this.templates.set(key, t)
    return t
  }

  private build(owner: B3d, scene: BABYLON.Scene, prefix: string) {
    const kit = this.kit
    const cell = Number(this.cell) || 8
    const layout = cityLayout({
      width: Number(this.width),
      depth: Number(this.depth),
      seed: Number(this.seed),
      blockMin: Number(this.blockMin),
      blockMax: Number(this.blockMax),
    })
    this.layout = layout
    const rng = new PRNG(Number(this.seed) * 7919 + 13)
    const root = new BABYLON.TransformNode('city', scene)
    root.position.set(Number(this.x) || 0, Number(this.y) || 0, Number(this.z) || 0)
    this.root = root
    const unit = cell / kit.cell
    // Cell (x, z) → the city's frame (centred), metres.
    const at = (x: number, z: number) =>
      new BABYLON.Vector3((x - layout.width / 2) * cell, 0, (z - layout.depth / 2) * cell)
    const put = (piece: KitPiece, position: BABYLON.Vector3, yaw: number) => {
      const t = this.template(owner, prefix, piece)
      if (t == null) return
      const k = piece.scale ?? unit
      t.matrices.push(
        BABYLON.Matrix.Compose(
          new BABYLON.Vector3(k, k, k),
          BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, yaw),
          position
        )
      )
    }

    // The ground under it all, a little below the roads.
    const ground = BABYLON.MeshBuilder.CreateGround(
      'city-ground',
      { width: layout.width * cell, height: layout.depth * cell },
      scene
    )
    ground.parent = root
    ground.position.y = -0.02
    const groundMat = new BABYLON.StandardMaterial('city-ground', scene)
    groundMat.diffuseColor = BABYLON.Color3.FromHexString(kit.ground ?? '#8c8a80')
    groundMat.specularColor = BABYLON.Color3.Black()
    ground.material = groundMat
    ground.receiveShadows = true

    // ROADS: each cell's piece, turned from the kit's orientation to the plan's.
    for (const r of layout.roads) {
      const piece = kit.roads[r.piece]
      if (piece == null) continue
      put(piece, at(r.x + 0.5, r.z + 0.5), (r.turns - (piece.turns ?? 0)) * QUARTER)
    }

    // BUILDINGS: downtown in the middle, houses further out, facing the street.
    for (const lot of layout.lots) {
      const cx = (lot.x + lot.width / 2) / layout.width - 0.5
      const cz = (lot.z + lot.depth / 2) / layout.depth - 0.5
      const out = Math.hypot(cx, cz) * 2 + (rng.value() - 0.5) * 0.2
      const downtown = out < Number(this.downtown)
      const list = downtown ? kit.buildings.downtown : kit.buildings.suburbs
      if (list.length === 0) continue
      const front = lot.front
      const alongX = front === 'n' || front === 's'
      const along = alongX ? lot.width : lot.depth
      const deep = alongX ? lot.depth : lot.width
      // Downtown fills the lot; a house stands at the front with a garden behind.
      const rows = downtown ? deep : 1
      for (let row = 0; row < rows; ) {
        let tallest = 1
        for (let i = 0; i < along; ) {
          const fits = list.filter((p) => (p.size?.[0] ?? 1) <= along - i && (p.size?.[1] ?? 1) <= deep - row)
          if (fits.length === 0) {
            i++
            continue
          }
          const p = pick(fits, rng)
          const [sa, sd] = p.size ?? [1, 1]
          // The piece's rectangle in cells.
          const x0 = front === 'n' || front === 's' ? lot.x + i : front === 'w' ? lot.x + row : lot.x + lot.width - row - sd
          const z0 = front === 'e' || front === 'w' ? lot.z + i : front === 's' ? lot.z + row : lot.z + lot.depth - row - sd
          const w = alongX ? sa : sd
          const d = alongX ? sd : sa
          const turns = (SIDES.indexOf(front) - SIDES.indexOf(p.front ?? 'n') + 4) % 4
          put(p, at(x0 + w / 2, z0 + d / 2), turns * QUARTER)
          tallest = Math.max(tallest, sd)
          i += sa
        }
        row += tallest
      }
    }

    // STREET LIGHTS along the straight roads, the arm out over the road, and
    // PARKED CARS at the kerb.
    const light = kit.streetLight
    const every = Math.max(1, Math.round(Number(this.lightEvery) || 2))
    const lamps: { position: BABYLON.Vector3 }[] = []
    for (const r of layout.roads) {
      if (r.piece !== 'straight') continue
      const northSouth = r.mask === 5
      const sides: Side[] = northSouth ? ['e', 'w'] : ['n', 's']
      const centre = at(r.x + 0.5, r.z + 0.5)
      if (light && (northSouth ? r.z : r.x) % every === 0) {
        const side = sides[((northSouth ? r.z : r.x) / every) % 2 === 0 ? 0 : 1]
        const [nx, nz] = STEP[side]
        const pole = centre.add(new BABYLON.Vector3(nx * cell * 0.44, 0, nz * cell * 0.44))
        // The model's arm reaches to -Z: turn it to reach back over the road.
        const yaw = Math.atan2(nx, nz)
        put(light, pole, yaw)
        const k = light.scale ?? unit
        const b = new BABYLON.Vector3(light.bulb[0] * k, light.bulb[1] * k, light.bulb[2] * k)
        lamps.push({ position: pole.add(BABYLON.Vector3.TransformCoordinates(b, BABYLON.Matrix.RotationY(yaw))) })
      }
      if (kit.parkedCars?.length && rng.value() < Number(this.parked)) {
        const side = sides[rng.value() < 0.5 ? 0 : 1]
        const [nx, nz] = STEP[side]
        const spot = centre.add(new BABYLON.Vector3(nx * cell * 0.3, 0, nz * cell * 0.3))
        // Parked with the traffic on its side of the road (driving on the right).
        const heading = northSouth ? (side === 'e' ? 0 : Math.PI) : side === 'n' ? -QUARTER : QUARTER
        put(pick(kit.parkedCars, rng), spot, heading)
      }
    }

    // One draw per part: every copy is a thin instance.
    const meshes: BABYLON.AbstractMesh[] = [ground]
    for (const t of this.templates.values()) {
      for (const part of t.parts) {
        if (t.matrices.length === 0) {
          part.mesh.setEnabled(false)
          continue
        }
        const buf = new Float32Array(t.matrices.length * 16)
        const m = new BABYLON.Matrix()
        t.matrices.forEach((placement, i) => {
          part.rel.multiplyToRef(placement, m)
          m.copyToArray(buf, i * 16)
        })
        part.mesh.thinInstanceSetBuffer('matrix', buf, 16, true)
        part.mesh.thinInstanceRefreshBoundingInfo(false)
        part.mesh.receiveShadows = true
        meshes.push(part.mesh)
      }
    }
    owner.register({ meshes })
    owner.registerWorldRoot(root)

    // THE LAMPS: a virtual light each (the pool lights the nearest few), and
    // a glowing bulb each, so every one is seen lit.
    if (lamps.length > 0) {
      const bulb = BABYLON.MeshBuilder.CreateSphere('city-bulb', { diameter: 0.5, segments: 6 }, scene)
      bulb.parent = root
      const mat = new BABYLON.StandardMaterial('city-bulb', scene)
      mat.disableLighting = true
      mat.emissiveColor = new BABYLON.Color3(0.25, 0.24, 0.2)
      bulb.material = mat
      bulb.isPickable = false
      const buf = new Float32Array(lamps.length * 16)
      lamps.forEach((l, i) => BABYLON.Matrix.Translation(l.position.x, l.position.y - 0.15, l.position.z).copyToArray(buf, i * 16))
      bulb.thinInstanceSetBuffer('matrix', buf, 16, true)
      this.bulbs = bulb
      this.bulbMaterial = mat
      const pool = lightPool(scene)
      this.lampLights = lamps.map((l) => {
        const v: VirtualLight = {
          position: l.position.clone(),
          direction: new BABYLON.Vector3(0, -1, 0),
          angle: 2.2,
          color: new BABYLON.Color3(1, 0.82, 0.55),
          intensity: 2.5,
          range: cell * 2.5,
          level: 0,
        }
        ;(v as VirtualLight & { local: BABYLON.Vector3 }).local = l.position.clone()
        this.releaseLamps.push(pool.add(v))
        return v
      })
      scene.registerBeforeRender(this.updateLamps)
    }
  }

  /** At dusk the lamps come up; their positions follow the city (floating origin). */
  private updateLamps = () => {
    const root = this.root
    if (root == null) return
    const level = lampLevel(sceneDaylight(this.owner))
    for (const l of this.lampLights) {
      l.level = level
      l.position.copyFrom((l as VirtualLight & { local: BABYLON.Vector3 }).local).addInPlace(root.position)
    }
    if (this.bulbMaterial) {
      const lit = 0.25 + 0.75 * level
      this.bulbMaterial.emissiveColor.set(lit, lit * 0.86, lit * 0.6)
    }
  }

  sceneDispose() {
    this.generation++
    const scene = this.owner?.scene
    if (scene) scene.unregisterBeforeRender(this.updateLamps)
    for (const release of this.releaseLamps) release()
    this.releaseLamps = []
    this.lampLights = []
    if (this.root) this.owner?.unregisterWorldRoot(this.root)
    this.root?.dispose()
    this.root = null
    this.bulbs = null
    this.bulbMaterial = null
    this.templates.clear()
    for (const lib of this.libraries) lib.remove()
    this.libraries = []
    this.layout = null
  }
}

export const b3dCity = B3dCity.elementCreator()
