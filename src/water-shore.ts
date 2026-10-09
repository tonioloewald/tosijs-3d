/*#
# water-shore

**What the water knows about the ground under it.** A sea drawn as one flat
sheet has no idea where the land is, so it cannot foam at a beach or freeze
from the shore outward. This module gives each vertex of the water's mesh two
numbers: the **depth** of the water there, how much **ice** covers it, and the
**distance** to the waterline.
[b3d-water](/b3d-water/) fills them in from the terrain (`shore="on"`) and its
shader draws from them:

- a **shoreline**: wave fronts that rise about 16 m out and run in to the
  shore one after another, with a wet edge lapping at the waterline (drawn
  from the distance, so it is as wide under a cliff as on a flat), and paler
  water over the shallows (drawn from the depth);
- **ice**, in three states that run into each other: a solid sheet, then
  broken plates with water between them, then open water.

## Where the ice is

Ice follows the cold and the shore. `iceCover(temperature, depth)` is the whole
rule: nothing above the sea's freezing point (about -2 °C); below it the
shallows freeze first and the cover spreads outward into deeper water as it
gets colder. So one cold bay has a solid sheet along the beach, breaking into
plates further out, and open sea beyond. The temperature is the terrain's
climate at sea level INCLUDING the season, so the sea freezes in winter and
breaks up in spring.

| Cover | What is drawn |
|-------|---------------|
| `0` | Open water |
| up to about `0.9` | Plates: more of them, and wider, as the cover rises |
| `1` | A sheet, with hairline cracks where the plates met |

Colder still and the cracks close: `iceSolid` runs from that cracked sheet to
one unbroken surface, shallows first.

## Walking on it

Ice is water until it is solid. `iceBears` is true once the cracks have mostly
closed, and there the water carries an invisible collision mesh: the same
vertices, only the triangles whose ice bears. Anything that collides or picks
meets it like ground, and it is in the `ice` collision group for anything that
wants to tell it from land. Short of solid (plates, or a sheet still showing
its cracks) there is nothing there and you fall through and swim. Waves stop
under ice, so the sheet is flat where it collides.

A [biped](/b3d-biped/) swimming at the surface climbs onto solid ice; one that
dived first goes under it, with the ice as a ceiling. `water.iceBearsAt(x, z)`
asks the question for a point in the scene.

## A mesh that is fine where you are

Depth lives on vertices, so the mesh decides how sharp the shoreline is.
`shoreGrid` is a square grid whose lines are close together in the middle
(4 m by default) and spread geometrically toward the edge, so a sea 8 km
across costs under ten thousand vertices and still has a vertex every few
metres around the viewer. [b3d-water](/b3d-water/) asks for a finer one: a
vertex every 2 m out to 64 m, about 16,600 in all.

Pure: no engine. The terrain and the climate arrive as numbers.
*/
/*{ "parent": "Environment" }*/

/** Depths are clamped to this range (metres; negative = ground above water). */
export const SHORE_DEPTH_MIN = -4
export const SHORE_DEPTH_MAX = 60

/**
 * The positions of a shore grid's lines along one axis, from `-size / 2` to
 * `size / 2`. The middle `core` steps each side are `fine` apart; the rest
 * grow geometrically to reach the edge exactly. `steps` is per side, so there
 * are `2 * steps + 1` lines. When the whole span fits at `fine`, it is uniform.
 */
export function shoreGridLines(
  size: number,
  steps = 48,
  fine = 4,
  core = 16
): number[] {
  const half = size / 2
  const n = Math.max(1, Math.round(steps))
  const side: number[] = [0]
  if (half <= n * fine) {
    for (let i = 1; i <= n; i++) side.push((half * i) / n)
  } else {
    const flat = Math.min(n - 1, Math.max(0, Math.round(core)))
    const rest = n - flat
    const span = half - flat * fine
    // Solve fine * (r + r² + … + r^rest) = span for r > 1, by bisection.
    const sum = (r: number) => {
      let total = 0
      let step = fine
      for (let i = 0; i < rest; i++) {
        step *= r
        total += step
      }
      return total
    }
    let lo = 1
    let hi = 2
    while (sum(hi) < span) hi *= 2
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if (sum(mid) < span) lo = mid
      else hi = mid
    }
    for (let i = 1; i <= flat; i++) side.push(i * fine)
    let at = flat * fine
    let step = fine
    for (let i = 0; i < rest; i++) {
      step *= hi
      at += step
      side.push(at)
    }
    side[side.length - 1] = half // exact, whatever the rounding
  }
  const lines: number[] = []
  for (let i = side.length - 1; i > 0; i--) lines.push(-side[i])
  for (const v of side) lines.push(v)
  return lines
}

export interface ShoreGrid {
  /** xyz per vertex, y = 0. */
  positions: Float32Array
  /** One (0, 1, 0) per vertex. */
  normals: Float32Array
  /** The same mapping a plain ground of this size has: 0…1 across it. */
  uvs: Float32Array
  /** Triangles, wound for Babylon's ground (front face up). */
  indices: Uint32Array
  /** Lines per axis. */
  count: number
  /** The line positions, for sampling the terrain at each vertex. */
  lines: number[]
}

/** The mesh data for a shore grid over a square `size` across. */
export function shoreGrid(
  size: number,
  steps = 48,
  fine = 4,
  core = 16
): ShoreGrid {
  const lines = shoreGridLines(size, steps, fine, core)
  const count = lines.length
  const positions = new Float32Array(count * count * 3)
  const normals = new Float32Array(count * count * 3)
  const uvs = new Float32Array(count * count * 2)
  for (let iz = 0; iz < count; iz++) {
    for (let ix = 0; ix < count; ix++) {
      const v = iz * count + ix
      positions[v * 3] = lines[ix]
      positions[v * 3 + 2] = lines[iz]
      normals[v * 3 + 1] = 1
      uvs[v * 2] = lines[ix] / size + 0.5
      uvs[v * 2 + 1] = lines[iz] / size + 0.5
    }
  }
  const indices = new Uint32Array((count - 1) * (count - 1) * 6)
  let k = 0
  for (let iz = 0; iz < count - 1; iz++) {
    for (let ix = 0; ix < count - 1; ix++) {
      const a = iz * count + ix
      const b = a + 1
      const c = a + count
      const d = c + 1
      indices[k++] = a
      indices[k++] = c
      indices[k++] = b
      indices[k++] = b
      indices[k++] = c
      indices[k++] = d
    }
  }
  return { positions, normals, uvs, indices, count, lines }
}

/**
 * Temperature at and above which the sea never freezes: -2 °C, where 0 is
 * 0 °C and a unit is 50 °C (biome-chart's scale). Every temperature in this
 * module is on that scale.
 */
export const FREEZING = -0.04

/**
 * How much of the water is ice, 0 (open) … 1 (a solid sheet), from the
 * temperature at the surface and the depth of the water (metres; anything at
 * or above the waterline counts as the shore itself).
 *
 * Shallows freeze first: at a given cold the cover is highest at the beach and
 * falls away with depth, so the sheet, the broken plates and the open water
 * lie in that order going out from land. Colder pushes all three outward.
 */
export function iceCover(temperature: number, depth: number): number {
  return Math.max(0, Math.min(1, iceAmount(temperature, depth)))
}

/**
 * How far past a full sheet the ice is, 0…1: at 0 the sheet still shows the
 * hairline cracks where its plates met; at 1 it is one unbroken surface. Only
 * real cold gets there, and the shallows get there first.
 */
export function iceSolid(temperature: number, depth: number): number {
  return Math.max(0, Math.min(1, (iceAmount(temperature, depth) - 1.15) / 0.6))
}

/** How solid (`iceSolid`) the ice must be before it carries someone. */
export const ICE_BEARS = 0.5

/**
 * Whether the ice here carries weight. Only ice that has knitted solid does:
 * a sheet that still shows its cracks, and broken plates, are water with ice
 * floating in it, so you fall through and swim.
 */
export function iceBears(temperature: number, depth: number): boolean {
  return iceSolid(temperature, depth) >= ICE_BEARS
}

/** Which side of bearing ice a body is on; `none` where the ice does not bear. */
export type IceSide = 'none' | 'over' | 'under'

/**
 * Which side of the ice a body is on this frame, from the side it was on.
 * `rootDepth` is how far its root is below the water's surface (metres).
 *
 * The side is decided ONCE, where the body meets bearing ice, and then kept:
 * at or near the surface it climbs on top, properly under it stays under and
 * the ice is a ceiling. Deciding it from the position every frame cannot work,
 * because a swimmer held against the underside is as close to the surface as
 * one about to climb out. From under, the only way up is to stand in water
 * shallow enough to step out of (`stepUp`).
 */
export function iceSide(
  prev: IceSide,
  bears: boolean,
  rootDepth: number,
  swimming: boolean,
  stepUp = 0.5,
  reach = 0.9
): IceSide {
  if (!bears) return 'none'
  if (prev === 'over') return 'over'
  if (prev === 'under')
    return !swimming && rootDepth <= stepUp ? 'over' : 'under'
  return rootDepth > reach ? 'under' : 'over'
}

/** Unclamped: under 1 is cover, over 1 is a sheet knitting solid. */
function iceAmount(temperature: number, depth: number): number {
  if (!(temperature < FREEZING)) return 0
  // 0 at freezing, 1 about nine degrees colder, on up from there.
  const cold = (FREEZING - temperature) / 0.175
  const d = Math.max(0, depth)
  // 1 at the beach, 0 by 25 m: how much the bottom helps it freeze…
  const t = Math.min(1, d / 25)
  const shallow = 1 - t * t * (3 - 2 * t)
  // …and the last couple of metres freeze at the first touch of cold.
  const wading = 1 - Math.min(1, d / 2.5)
  // The open sea does not freeze just because it is below zero: deep water
  // stays clear until about -8 °C, then goes quickly. A full sheet near
  // -18 °C, bearing weight near -21 °C, one unbroken surface at -22.5 °C.
  const open = Math.max(0, cold - 0.686 * (1 - shallow))
  return open * (0.6 + 0.28 * open) + cold * (0.9 * shallow + 0.9 * wading)
}

/** Distances from the shore are clamped to this many metres either way. */
export const SHORE_DISTANCE_MAX = 40

let rawDepth = new Float32Array(0)
let shoreDist = new Float32Array(0)

/**
 * Fill a grid's shore data: for each vertex, `[depth, ice, solid, distance]`
 * (the water shader reads these from the vertex colour). `height(x, z)` is the
 * terrain in the same coordinates as `centreX/centreZ + line`; `waterY` is the
 * surface.
 *
 * `distance` is how far the vertex is from the waterline, in metres along the
 * surface: positive out to sea, negative inland. Surf is drawn from this and
 * not from depth, because a depth says nothing about width: half a metre deep
 * is a ten-metre band on a flat and a hand's width under a cliff, and the mesh
 * cannot draw a hand's width.
 *
 * It is a real distance, not depth over slope. Every vertex beside the
 * waterline is given how far away the line is (where the depth crosses zero
 * along the grid, or depth over slope if that is nearer), and those distances
 * are then carried outward across the grid. So it grows a metre per metre
 * everywhere, and lines drawn at even distances are evenly spaced whatever the
 * bed does under them. Depth over slope alone does not: on a flat shallow it
 * swings wildly from vertex to vertex.
 */
export function shoreData(
  grid: { lines: number[]; count: number },
  centreX: number,
  centreZ: number,
  waterY: number,
  height: (x: number, z: number) => number,
  temperature: number,
  out?: Float32Array,
  /** The mesh is turned over about X (the water's underside): its local +z
   * lies along world -z. */
  flipZ = false
): Float32Array {
  const { lines, count } = grid
  const total = count * count
  const data = out ?? new Float32Array(total * 4)
  const zs = flipZ ? -1 : 1
  if (rawDepth.length < total) {
    rawDepth = new Float32Array(total)
    shoreDist = new Float32Array(total)
  }
  const raw = rawDepth
  const dist = shoreDist
  for (let iz = 0; iz < count; iz++) {
    for (let ix = 0; ix < count; ix++) {
      raw[iz * count + ix] =
        waterY - height(centreX + lines[ix], centreZ + zs * lines[iz])
    }
  }
  const FAR = SHORE_DISTANCE_MAX
  const last = count - 1
  dist.fill(FAR, 0, total)
  // SEED: vertices with the waterline on an edge beside them.
  const seed = (i: number, d: number) => {
    if (d < dist[i]) dist[i] = d
  }
  const cross = (a: number, b: number, length: number) => {
    const ra = raw[a]
    const rb = raw[b]
    if (ra === rb || ra > 0 === rb > 0) return
    const t = ra / (ra - rb)
    seed(a, t * length)
    seed(b, (1 - t) * length)
  }
  for (let iz = 0; iz < count; iz++) {
    for (let ix = 0; ix < count; ix++) {
      const i = iz * count + ix
      if (ix < last) cross(i, i + 1, lines[ix + 1] - lines[ix])
      if (iz < last) cross(i, i + count, lines[iz + 1] - lines[iz])
    }
  }
  // Along a grid edge is further than straight across, on a shore that runs
  // diagonally: depth over slope is the straight-across distance, so a
  // seeded vertex takes whichever is nearer.
  for (let iz = 0; iz < count; iz++) {
    const z0 = Math.max(0, iz - 1)
    const z1 = Math.min(last, iz + 1)
    for (let ix = 0; ix < count; ix++) {
      const i = iz * count + ix
      if (dist[i] >= FAR) continue
      const x0 = Math.max(0, ix - 1)
      const x1 = Math.min(last, ix + 1)
      const gx =
        (raw[iz * count + x1] - raw[iz * count + x0]) / (lines[x1] - lines[x0])
      const gz =
        (raw[z1 * count + ix] - raw[z0 * count + ix]) / (lines[z1] - lines[z0])
      const fall = Math.hypot(gx, gz)
      if (fall > 1e-6) seed(i, Math.abs(raw[i]) / fall)
    }
  }
  // CARRY it outward: two passes each way over the eight neighbours.
  const relax = (i: number, j: number, step: number) => {
    const d = dist[j] + step
    if (d < dist[i]) dist[i] = d
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let iz = 0; iz < count; iz++) {
      const dz = iz > 0 ? lines[iz] - lines[iz - 1] : 0
      for (let ix = 0; ix < count; ix++) {
        const i = iz * count + ix
        const dx = ix > 0 ? lines[ix] - lines[ix - 1] : 0
        if (ix > 0) relax(i, i - 1, dx)
        if (iz > 0) {
          relax(i, i - count, dz)
          if (ix > 0) relax(i, i - count - 1, Math.hypot(dx, dz))
          if (ix < last)
            relax(i, i - count + 1, Math.hypot(lines[ix + 1] - lines[ix], dz))
        }
      }
    }
    for (let iz = last; iz >= 0; iz--) {
      const dz = iz < last ? lines[iz + 1] - lines[iz] : 0
      for (let ix = last; ix >= 0; ix--) {
        const i = iz * count + ix
        const dx = ix < last ? lines[ix + 1] - lines[ix] : 0
        if (ix < last) relax(i, i + 1, dx)
        if (iz < last) {
          relax(i, i + count, dz)
          if (ix < last) relax(i, i + count + 1, Math.hypot(dx, dz))
          if (ix > 0)
            relax(i, i + count - 1, Math.hypot(lines[ix] - lines[ix - 1], dz))
        }
      }
    }
  }
  for (let i = 0; i < total; i++) {
    const depth = Math.max(SHORE_DEPTH_MIN, Math.min(SHORE_DEPTH_MAX, raw[i]))
    const v = i * 4
    data[v] = depth
    data[v + 1] = iceCover(temperature, depth)
    data[v + 2] = iceSolid(temperature, depth)
    data[v + 3] = raw[i] > 0 ? Math.min(FAR, dist[i]) : -Math.min(FAR, dist[i])
  }
  return data
}
