/*#
# b3d-city

**A city to drive around**, built from a seed: roads, blocks of buildings,
street lights, parked cars, [traffic](/city-traffic/) and
[lit windows](/window-lights/). The plan is [city-layout](/city-layout/); this
dresses it with a **kit**, Kenney's city kits unless you give it another, at
12 m a cell. Street lights come on at dusk, each a spot pointing down from its
pole (the few that matter most to your view are real lights), a few of them
failing and flickering; a car you drive turns its headlights on.

## Demo

```js
import { b3d, b3dCar, b3dCity, cityStart, b3dLibrary, b3dLight, b3dSkybox, b3dSun, inputFocus, slider3d, assetUrl } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cityDemo } = tosi({ cityDemo: { time: 19.5, speed: 120 } })
const sky = b3dSkybox({ timeOfDay: cityDemo.time, realtimeScale: cityDemo.speed })
const plan = { width: 24, depth: 24, seed: 3 }
const start = cityStart(plan)

preview.append(
  b3d(
    {
      style: 'width: 100%; height: 100%',
      gamepad: 'left_stick,right_stick,left_trigger,right_trigger,right_bumper,A,X',
      panelTitle: 'City',
      scenePanel: () => [
        slider3d({ label: 'time of day', value: cityDemo.time, min: 0, max: 24, step: 0.1 }),
        slider3d({ label: 'time speed', value: cityDemo.speed, min: 0, max: 600, step: 10 }),
      ],
    },
    b3dSun({ shadowTextureSize: 2048 }),
    b3dLight({ intensity: 0.5, nightIntensity: 0.06, groundColor: '#4b4d52' }),
    sky,
    b3dLibrary({ url: assetUrl('kenney/libraries/car-kit.glb'), type: 'cars' }),
    b3dCity(plan),
    inputFocus(
      b3dCar({ library: 'cars', meshName: 'sedan-sports', scale: 1.7, player: true, ...start })
    )
  )
)
```
```css
.preview { height: 100%; }
```

You start in the middle of the city, driving: the right trigger or **W**
goes, the left trigger, the right bumper or **S** brakes and reverses, the left stick or **A** and **D** steer. Time runs at 120×,
so night falls in a few minutes; the owl's panel sets the hour and the speed.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width`, `depth` | `24` | The grid, cells |
| `seed` | `1` | Same seed, same city |
| `cell` | `12` | Metres a cell (Kenney's road is 0.8 of a tile: 9.6 m kerb to kerb, a lane each way and a parked car) |
| `blockMin`, `blockMax` | `3`, `6` | Block sizes, cells (see [city-layout](/city-layout/)) |
| `downtown` | `0.45` | How far out from the middle the tall buildings go, 0 to 1 |
| `lightEvery` | `2` | A street light every this many road cells |
| `lampAngle` | `80` | A street light's cone, degrees; it reaches twice its height |
| `flicker` | `0.08` | The share of street lights that are failing and flicker |
| `parked` | `0.2` | The chance of a parked car on a stretch of road |
| `traffic` | `24` | Cars driving round (they stop for yours; their headlights come on at night) |

The city is centred on its `x`, `y`, `z`. `kit` (a property, not an
attribute) is the manifest: which library model is each road piece, building,
street light and car, how a model is turned and how big it is in cells. See
`KENNEY_CITY` for the shape; another kit on another grid needs only another
manifest. `layout` is the plan it built, `lamps` how many street lights it has.
`cityStart(options)` says where to put a car in the middle of the city.
*/
/*{ "parent": "terrain", "order": 61 }*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { B3dChild, sceneDelta, sceneSeconds } from './b3d-utils.js'
import { b3dLibrary } from './b3d-library.js'
import { assetUrl } from './asset-url.js'
import { cityLayout, type CityLayout, type CityLayoutOptions, type RoadCell, type RoadPiece, type Side } from './city-layout.js'
import { PRNG } from './mersenne-twister.js'
import { lightPool, sceneDaylight, lampLevel, lampFlicker, type VirtualLight } from './light-pool.js'
import { windowLights, windowsLit, type WindowLightsPlugin } from './window-lights.js'
import { createTraffic, stepTraffic, type Traffic, type TrafficObstacle } from './city-traffic.js'

/** One model's driving cars: its parts' instance buffers, rewritten each frame. */
interface TrafficModel {
  template: Template
  scale: number
  cars: number[]
  buffers: Float32Array[]
}

interface CityLamp extends VirtualLight {
  /** Where it is in the city's frame. */
  local: BABYLON.Vector3
  /** Non-zero: it flickers, to this seed. */
  seed: number
}

/** One model in a kit. */
export interface KitPiece {
  /** A library `type` named in the kit's `libraries`. */
  library: string
  mesh: string
  /** Quarter turns clockwise (north to east) from the piece's canonical orientation (road pieces). */
  turns?: number
  /** Footprint in cells, along the street and back from it (buildings). Default: measured from the model. */
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
  /** How much of a road tile's width is roadway, kerb to kerb (Kenney's: 0.8). Default 0.8. */
  roadway?: number
  /** Library type → URL (a CDN path goes through `assetUrl`). */
  libraries: Record<string, string>
  roads: Partial<Record<RoadPiece, KitPiece>>
  buildings: { downtown: KitPiece[]; suburbs: KitPiece[] }
  /** Its arm reaches toward -Z; `bulb` is where the light is, model units. */
  streetLight?: KitPiece & { bulb: [number, number, number] }
  /** Cars, parked and driving. */
  parkedCars?: KitPiece[]
  /** The ground between the buildings. */
  ground?: string
}

const commercial = 'abcdefghijklmn'.split('').map((c) => ({ library: 'commercial', mesh: `building-${c}` }))
const towers = 'abcde'.split('').map((c) => ({
  library: 'commercial',
  mesh: `building-skyscraper-${c}`,
  weight: 2,
}))
const houses = 'abcdefghijklmnopqrstu'.split('').map((c) => ({
  library: 'suburban',
  mesh: `building-type-${c}`,
}))

/** Kenney's city kits (CC0): roads, commercial, suburban; Kenney's cars parked. */
export const KENNEY_CITY: CityKit = {
  cell: 1,
  roadway: 0.8,
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

/**
 * Where to start a car in the middle of a city: the straight road nearest the
 * centre, in the right-hand lane, facing along it. Metres in the city's frame
 * (add the city's `x`, `z`); `ry` in degrees. Give it the city's options.
 */
export function cityStart(
  options: CityLayoutOptions & { cell?: number; roadway?: number }
): { x: number; z: number; ry: number } {
  const layout = cityLayout(options)
  const cell = options.cell ?? 12
  const r = startCell(layout)
  const x = (r.x + 0.5 - layout.width / 2) * cell
  const z = (r.z + 0.5 - layout.depth / 2) * cell
  const { lane } = lanes(cell, options.roadway)
  // Facing north the right-hand lane is east; facing east it is south.
  return r.mask === 5 ? { x: x + lane, z, ry: 0 } : { x, z: z - lane, ry: 90 }
}

/**
 * Where a road's lanes are, metres from its middle: a driving lane each way,
 * and parked cars against the kerb, half a car's width clear of it.
 */
function lanes(cell: number, roadway = 0.8): { lane: number; kerb: number } {
  const half = (cell * roadway) / 2
  return { lane: half * 0.28, kerb: half - 0.9 }
}

/** The straight road nearest the middle (the city parks nothing near it). */
function startCell(layout: CityLayout): RoadCell {
  const straight = layout.roads.filter((r) => r.piece === 'straight')
  const roads = straight.length > 0 ? straight : layout.roads
  const mid = (r: RoadCell) => Math.hypot(r.x + 0.5 - layout.width / 2, r.z + 0.5 - layout.depth / 2)
  return roads.reduce((best, r) => (mid(r) < mid(best) ? r : best))
}

export class B3dCity extends B3dChild {
  static preferredTagName = 'tosi-b3d-city'
  static initAttributes = {
    width: 24,
    depth: 24,
    seed: 1,
    cell: 12,
    blockMin: 3,
    blockMax: 6,
    downtown: 0.45,
    lightEvery: 2,
    lampAngle: 80,
    flicker: 0.08,
    parked: 0.2,
    traffic: 24,
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
  declare lampAngle: number
  declare flicker: number
  declare parked: number
  declare traffic: number
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
  private lampLights: CityLamp[] = []
  private releaseLamps: (() => void)[] = []
  /** The cars driving round, and how each model draws them. */
  trafficState: Traffic | null = null
  private trafficModels: TrafficModel[] = []
  private beams: VirtualLight[] = []
  private windows: WindowLightsPlugin[] = []
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

  private template(owner: B3d, prefix: string, piece: KitPiece, as = ''): Template | null {
    const key = `${as}${piece.library}:${piece.mesh}`
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
      // A copy shares its geometry with the library's, and Babylon keeps the
      // thin-instance buffer ON the geometry: parked and driving copies of one
      // car drew each other's places (a parked car you could hit and not see).
      mesh.makeGeometryUnique()
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
    const cell = Number(this.cell) || 12
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
    const put = (piece: KitPiece, position: BABYLON.Vector3, yaw: number, centred = false) => {
      const t = this.template(owner, prefix, piece)
      if (t == null) return
      const k = piece.scale ?? unit
      if (centred) {
        // The model's own middle on the spot, whatever its origin.
        const mid = new BABYLON.Vector3(((t.min.x + t.max.x) / 2) * k, 0, ((t.min.z + t.max.z) / 2) * k)
        position = position.subtract(BABYLON.Vector3.TransformCoordinates(mid, BABYLON.Matrix.RotationY(yaw)))
      }
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
    // Each takes the cells its model covers (a sliver over, inside the
    // pavement, is allowed), so none reaches into the road.
    const sizes = new Map<KitPiece, [number, number]>()
    const sizeOf = (p: KitPiece): [number, number] => {
      let size = p.size ?? sizes.get(p)
      if (size == null) {
        const t = this.template(owner, prefix, p)
        const k = (p.scale ?? unit) / cell
        const across = t ? (t.max.x - t.min.x) * k : 1
        const back = t ? (t.max.z - t.min.z) * k : 1
        const sideways = p.front === 'e' || p.front === 'w'
        const fit = (cells: number) => Math.max(1, Math.ceil(cells - 0.15))
        size = sideways ? [fit(back), fit(across)] : [fit(across), fit(back)]
        sizes.set(p, size)
      }
      return size
    }
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
          const fits = list.filter((p) => sizeOf(p)[0] <= along - i && sizeOf(p)[1] <= deep - row)
          if (fits.length === 0) {
            i++
            continue
          }
          const p = pick(fits, rng)
          const [sa, sd] = sizeOf(p)
          // The piece's rectangle in cells.
          const x0 = front === 'n' || front === 's' ? lot.x + i : front === 'w' ? lot.x + row : lot.x + lot.width - row - sd
          const z0 = front === 'e' || front === 'w' ? lot.z + i : front === 's' ? lot.z + row : lot.z + lot.depth - row - sd
          const w = alongX ? sa : sd
          const d = alongX ? sd : sa
          const turns = (SIDES.indexOf(front) - SIDES.indexOf(p.front ?? 'n') + 4) % 4
          put(p, at(x0 + w / 2, z0 + d / 2), turns * QUARTER, true)
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
    const start = layout.roads.length > 0 ? startCell(layout) : null
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
      const nearStart = start != null && Math.abs(r.x - start.x) + Math.abs(r.z - start.z) <= 1
      if (kit.parkedCars?.length && rng.value() < Number(this.parked) && !nearStart) {
        const side = sides[rng.value() < 0.5 ? 0 : 1]
        const [nx, nz] = STEP[side]
        // Against the kerb, clear of the lane.
        const { kerb } = lanes(cell, kit.roadway)
        const spot = centre.add(new BABYLON.Vector3(nx * kerb, 0, nz * kerb))
        // Parked with the traffic on its side of the road (driving on the right).
        const heading = northSouth ? (side === 'e' ? 0 : Math.PI) : side === 'n' ? -QUARTER : QUARTER
        put(pick(kit.parkedCars, rng), spot, heading)
      }
    }

    // One draw per part: every copy is a thin instance.
    const meshes: BABYLON.AbstractMesh[] = [ground]
    for (const [key, t] of this.templates) {
      if (key.startsWith('traffic:')) continue
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

    // THE LAMPS: a spot under each pole's lamp, pointing down, reaching twice
    // its height; the pool lights the best few. Some are failing and flicker.
    if (lamps.length > 0) {
      const pool = lightPool(scene)
      const flickery = Number(this.flicker) || 0
      this.lampLights = lamps.map((l, i) => {
        const v: CityLamp = {
          position: l.position.clone(),
          direction: new BABYLON.Vector3(0, -1, 0),
          angle: (Number(this.lampAngle) || 80) * (Math.PI / 180),
          exponent: 4,
          color: new BABYLON.Color3(1, 0.82, 0.55),
          intensity: 1.6,
          range: l.position.y * 2,
          level: 0,
          local: l.position.clone(),
          seed: rng.value() < flickery ? i + 1 : 0,
        }
        this.releaseLamps.push(pool.add(v))
        return v
      })
    }
    this.startTraffic(owner, prefix, layout, cell, unit, start)

    // LIT WINDOWS on every building's material.
    const buildings = new Set([...kit.buildings.downtown, ...kit.buildings.suburbs].map((p) => `${p.library}:${p.mesh}`))
    const materials = new Set<BABYLON.Material>()
    for (const [key, t] of this.templates) {
      if (!buildings.has(key) || t.matrices.length === 0) continue
      for (const part of t.parts) if (part.mesh.material) materials.add(part.mesh.material)
    }
    // Rooms half a cell across: a building is centred on its cells and its
    // windows are symmetrical, so a room's edge falls between windows.
    const room = new BABYLON.Vector3(cell / 2, 3, cell / 2)
    this.windows = [...materials].map((m) => windowLights(m, { origin: root, room, seed: Number(this.seed) * 17 }))
    scene.registerBeforeRender(this.updateLamps)
  }

  /*
  TRAFFIC: the pure model drives, the city draws. Each model's parts are thin
  instances rewritten every frame (and pickable, so the player's car stops at
  them); each car carries a pooled headlight beam at night.
  */
  private startTraffic(
    owner: B3d,
    prefix: string,
    layout: CityLayout,
    cell: number,
    unit: number,
    start: RoadCell | null
  ) {
    const models = this.kit.parkedCars ?? []
    const count = Math.max(0, Math.round(Number(this.traffic) || 0))
    if (models.length === 0 || count === 0 || layout.roads.length === 0) return
    const centre = start
      ? { x: (start.x + 0.5 - layout.width / 2) * cell, z: (start.z + 0.5 - layout.depth / 2) * cell, radius: cell }
      : undefined
    const traffic = createTraffic({
      layout,
      cell,
      lane: lanes(cell, this.kit.roadway).lane,
      count,
      seed: Number(this.seed),
      models: models.length,
      clear: centre,
    })
    this.trafficState = traffic
    this.trafficModels = models.map((piece, m) => {
      const template = this.template(owner, prefix, piece, 'traffic:')!
      const cars = traffic.cars.map((c, i) => (c.model === m ? i : -1)).filter((i) => i >= 0)
      const buffers = (template?.parts ?? []).map((part) => {
        const buf = new Float32Array(Math.max(1, cars.length) * 16)
        if (cars.length === 0) part.mesh.setEnabled(false)
        else {
          part.mesh.thinInstanceSetBuffer('matrix', buf, 16, false)
          part.mesh.receiveShadows = true
        }
        return buf
      })
      return { template, scale: piece.scale ?? unit, cars, buffers }
    })
    owner.register({
      meshes: this.trafficModels.flatMap((t) => (t.cars.length ? t.template.parts.map((p) => p.mesh) : [])),
    })
    const pool = lightPool(owner.scene)
    this.beams = traffic.cars.map(() => {
      const beam: VirtualLight = {
        position: new BABYLON.Vector3(),
        direction: new BABYLON.Vector3(0, -0.12, 1),
        angle: 1.6,
        exponent: 10,
        color: new BABYLON.Color3(1, 0.95, 0.85),
        intensity: 4,
        range: 30,
        level: 0,
      }
      this.releaseLamps.push(pool.add(beam))
      return beam
    })
    this.drawTraffic()
  }

  /** Where the player's vehicles are, in the city's frame: traffic stops for them. */
  private obstacles(): TrafficObstacle[] {
    const root = this.root
    const owner = this.owner
    if (root == null || owner == null) return []
    const out: TrafficObstacle[] = []
    owner.querySelectorAll('tosi-b3d-car, tosi-b3d-tank').forEach((el) => {
      const node = (el as unknown as { control?: BABYLON.TransformNode | null }).control
      if (node == null) return
      const p = node.getAbsolutePosition()
      out.push({ x: p.x - root.position.x, z: p.z - root.position.z, radius: 2.5 })
    })
    return out
  }

  private drawTraffic() {
    const traffic = this.trafficState
    if (traffic == null) return
    const m = new BABYLON.Matrix()
    const placement = new BABYLON.Matrix()
    const q = new BABYLON.Quaternion()
    const size = new BABYLON.Vector3()
    const at = new BABYLON.Vector3()
    for (const model of this.trafficModels) {
      if (model.cars.length === 0) continue
      size.setAll(model.scale)
      model.cars.forEach((i, n) => {
        const car = traffic.cars[i]
        BABYLON.Quaternion.RotationYawPitchRollToRef(car.yaw, 0, 0, q)
        at.set(car.x, 0, car.z)
        BABYLON.Matrix.ComposeToRef(size, q, at, placement)
        model.template.parts.forEach((part, p) => {
          part.rel.multiplyToRef(placement, m)
          m.copyToArray(model.buffers[p], n * 16)
        })
      })
      for (const part of model.template.parts) {
        part.mesh.thinInstanceBufferUpdated('matrix')
        part.mesh.thinInstanceRefreshBoundingInfo(false)
      }
    }
  }

  /** At dusk the lamps come up; their positions follow the city (floating origin). */
  private updateLamps = () => {
    const root = this.root
    const scene = this.owner?.scene
    if (root == null || scene == null) return
    const level = lampLevel(sceneDaylight(this.owner))
    const t = sceneSeconds(scene)
    for (const l of this.lampLights) {
      l.level = level
      l.flicker = l.seed ? lampFlicker(t, l.seed) : 1
      l.position.copyFrom(l.local).addInPlace(root.position)
    }
    const sky = this.owner?.querySelector('tosi-b3d-skybox') as { timeOfDay?: number } | null
    const daylight = sceneDaylight(this.owner)
    const lit = windowsLit(Number(sky?.timeOfDay ?? 12))
    const glow = Math.max(0, Math.min(1, (0.6 - daylight) / 0.4))
    for (const w of this.windows) {
      w.lit = lit
      w.glow = glow
    }
    const traffic = this.trafficState
    if (traffic) {
      stepTraffic(traffic, Math.min(0.1, sceneDelta(scene)), this.obstacles())
      this.drawTraffic()
      traffic.cars.forEach((car, i) => {
        const beam = this.beams[i]
        if (beam == null) return
        const hx = Math.sin(car.yaw)
        const hz = Math.cos(car.yaw)
        beam.level = level
        beam.position.set(car.x + hx * 2.4, 0.8, car.z + hz * 2.4).addInPlace(root.position)
        beam.direction!.set(hx, -0.12, hz).normalize()
      })
    }
  }

  sceneDispose() {
    this.generation++
    const scene = this.owner?.scene
    if (scene) scene.unregisterBeforeRender(this.updateLamps)
    for (const release of this.releaseLamps) release()
    this.releaseLamps = []
    this.lampLights = []
    this.beams = []
    for (const w of this.windows) w.isEnabled = false
    this.windows = []
    this.trafficState = null
    this.trafficModels = []
    if (this.root) this.owner?.unregisterWorldRoot(this.root)
    this.root?.dispose()
    this.root = null
    this.templates.clear()
    for (const lib of this.libraries) lib.remove()
    this.libraries = []
    this.layout = null
  }
}

export const b3dCity = B3dCity.elementCreator()
