/*#
# water-shore

**What the water knows about the ground under it.** A sea drawn as one flat
sheet has no idea where the land is, so it cannot foam at a beach or freeze
from the shore outward. This module gives each vertex of the water's mesh two
numbers: the **depth** of the water there, and how much **ice** covers it.
[b3d-water](/b3d-water/) fills them in from the terrain (`shore="on"`) and its
shader draws from them:

- a **shoreline**: foam lapping where the water is a metre or so deep, and
  paler water over the shallows;
- **ice**, in three states that run into each other: a solid sheet, then
  broken plates with water between them, then open water.

## Where the ice is

Ice follows the cold and the shore. `iceCover(temperature, depth)` is the whole
rule: nothing above freezing (a chart temperature of about 0.36); below it the
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

## A mesh that is fine where you are

Depth lives on vertices, so the mesh decides how sharp the shoreline is.
`shoreGrid` is a square grid whose lines are close together in the middle
(4 m by default) and spread geometrically toward the edge, so a sea 8 km
across costs under ten thousand vertices and still has a vertex every few
metres around the viewer.

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

/** Chart temperature at and above which water never freezes. */
export const FREEZING = 0.36

/**
 * How much of the water is ice, 0 (open) … 1 (a solid sheet), from the chart
 * temperature at the surface and the depth of the water (metres; anything at
 * or above the waterline counts as the shore itself).
 *
 * Shallows freeze first: at a given cold the cover is highest at the beach and
 * falls away with depth, so the sheet, the broken plates and the open water
 * lie in that order going out from land. Colder pushes all three outward.
 */
export function iceCover(temperature: number, depth: number): number {
  if (!(temperature < FREEZING)) return 0
  // 0 at freezing, 1 fourteen hundredths colder, on up from there.
  const cold = (FREEZING - temperature) / 0.14
  const d = Math.max(0, depth)
  // 1 at the beach, 0 by 25 m: how much the bottom helps it freeze.
  const t = Math.min(1, d / 25)
  const shallow = 1 - t * t * (3 - 2 * t)
  return Math.max(0, Math.min(1, cold * (0.4 + 0.8 * shallow)))
}

/**
 * Fill a grid's shore data: for each vertex, `[depth, ice, 0, 1]` (the water
 * shader reads these from the vertex colour). `height(x, z)` is the terrain in
 * the same coordinates as `centreX/centreZ + line`; `waterY` is the surface.
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
  const data = out ?? new Float32Array(count * count * 4)
  const zs = flipZ ? -1 : 1
  for (let iz = 0; iz < count; iz++) {
    for (let ix = 0; ix < count; ix++) {
      const raw = waterY - height(centreX + lines[ix], centreZ + zs * lines[iz])
      const depth = Math.max(SHORE_DEPTH_MIN, Math.min(SHORE_DEPTH_MAX, raw))
      const v = (iz * count + ix) * 4
      data[v] = depth
      data[v + 1] = iceCover(temperature, depth)
      data[v + 2] = 0
      data[v + 3] = 1
    }
  }
  return data
}
