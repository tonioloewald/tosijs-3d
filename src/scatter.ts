/*#
# scatter

**Where things grow: rocks and trees placed on terrain by budget and by
climate.** The function is `scatterPlacements` (a bare `scatter` would leak a
common noun from the barrel, and one demo already has its own). Pure, with no Babylon and no DOM; the terrain and its climate
arrive as functions. [b3d-decorator](/b3d-decorator/) draws what this
returns.

## The rules speak climate, not biome names

A rule says where its kind is SUITABLE, in the same axes the terrain's biome
shader classifies by ([biome-chart](/biome-chart/)): **temperature** and
**moisture** (0…1 chart units), **altitude above sea level** (m) and **slope**
(degrees). So the trees agree with the ground colour by construction: pines
where the shader paints cold forest, palms at a warm shoreline, cacti in hot
dry country, and bare rock on the steep and high.

Each axis is a soft band (`[lo, hi]`, eased over `soft`), and a rule's
suitability at a point is the product of its bands times its `density`.

## Budget, not density

`budget` is the number of things, which is what performance cares about.
Candidate points are laid down at `oversample` × budget, the rules score each
one, and an acceptance threshold is SOLVED so the expected count equals the
budget where the ground can hold it. Sparse country and lush country get the
same count; the lush one spends it on trees.

The budget is a ceiling, not a quota. The threshold stops rising where a place
a quarter as suitable as the best would be certain to be used, because past
that the gaps between clumps fill in and the scatter turns into an even
spread. A small radius, or a map that is mostly sea, gets fewer than the
budget and keeps its shape.

## Clumps, not a sprinkle

Left alone, a scatter spreads evenly, and an even spread reads as noise.
Copses, thickets and rock fields with open ground between them read as a
place. So every rule gathers by default: a seeded, world-anchored **clump
field** multiplies its weight, high in about a third of the ground and low
(never zero, so there are outliers) in the rest.

| Rule option | Default | Description |
|-------------|---------|-------------|
| `clump` | `0.85` | 0 = even spread, 1 = clumps only |
| `clumpScale` | `1` | This rule's clump size relative to the scatter's |
| `clumpGroup` | the rule's `kind` | Rules in one group gather in the SAME places: stones around boulders |
| `sink` | `0.02` | How much of the model's height the decorator buries. Rocks use a quarter or more |

The scatter as a whole takes `clump` (one strength for every rule) and
`clumpSize` (metres). Left alone, the size is AUTO: about two and a half times
the average spacing, so a clump is a handful of things at any budget and
radius. A fixed size does not survive a change of radius: pull the radius in
and each clump holds hundreds of things, which reads as an even spread again.

The threshold is solved after the weights are multiplied, so clumping does
not by itself cost any of the budget.

## World-anchored and deterministic

Candidates live in world cells: each cell's point is a hash of its integer
coordinates and the seed. The same place always gets the same answer, however
the region moves, so re-scattering around a moving camera changes what is at
the EDGE and nothing that stays in view. Stable is the point.
*/
/*{ "parent": "Environment" }*/

import { rockNames } from './procedural-rock.js'

export interface ScatterRule {
  /** What it is: `'tree'`, `'boulder'`… (for the caller; not interpreted). */
  kind: string
  /** Model names, picked uniformly per placement. */
  models: string[]
  /** Relative abundance where fully suitable. */
  density: number
  /** Chart temperature band, 0…1. */
  temperature?: [number, number]
  /** Chart moisture band, 0…1. */
  moisture?: [number, number]
  /** Metres above sea level. */
  altitude?: [number, number]
  /** Degrees from horizontal. */
  slope?: [number, number]
  /** Uniform scale range (the models are ~1 unit). */
  scale: [number, number]
  /** Tilt to the ground normal, 0 (upright) … 1 (flush). Rocks lie; trees don't. */
  alignToSlope?: number
  /**
   * What a nearby one collides as: `'trunk'` (a thin upright cylinder: you
   * brush past the canopy, you stop at the trunk), `'box'` (its bounds, for a
   * boulder you can stand on), or omitted for nothing (bushes, pebbles).
   */
  collider?: 'trunk' | 'box'
  /**
   * How strongly it gathers into clumps, 0 (even spread) … 1 (clumps only).
   * Default `0.85`: copses and rock fields with the occasional outlier, which
   * reads far better than an even sprinkle. See `clumpAt`.
   */
  clump?: number
  /**
   * This rule's clump size relative to the scatter's (`ScatterOptions.
   * clumpSize`). Default `1`; rocks use less, so a rock field is smaller than
   * a copse.
   */
  clumpScale?: number
  /**
   * How much of the model's height is buried, 0…1. Default `0.02`. A rock
   * wants a quarter or so: resting on its lowest point it looks set down on
   * the ground, or floating over it on a slope.
   */
  sink?: number
  /**
   * Rules sharing a group share ONE clump pattern, so they gather in the same
   * places (stones around boulders). Default: the rule's `kind`.
   */
  clumpGroup?: string
}

export interface ScatterClimate {
  temperature: number
  moisture: number
  /** Metres above sea level. */
  altitude: number
}

export interface ScatterOptions {
  budget: number
  seed: number
  /** Centre of the scattered region, logical world X/Z. */
  center: { x: number; z: number }
  radius: number
  height: (x: number, z: number) => number
  climate: (x: number, z: number, y: number) => ScatterClimate
  rules: ScatterRule[]
  /**
   * What a PROVINCE says: `0` nothing of this kind grows here, `1` no opinion
   * (PROVINCE-DESIGN.md: decoration composes by MULTIPLYING — the province
   * suppresses rather than replaces, and two reasons nothing grows still
   * leave nothing growing). A lava field says 0 to trees; the decorator's own
   * province rule currently says 0 to rocks as well.
   */
  suppress?: (x: number, z: number, kind: string) => number
  /** Candidates per placement. More = closer to the budget, slower. */
  oversample?: number
  /**
   * Clump strength for EVERY rule, 0 (even spread) … 1 (clumps only),
   * overriding each rule's own. Omitted or negative: the rules decide.
   */
  clump?: number
  /**
   * Metres across a clump and the gap beside it. Omitted or 0 = AUTO: about
   * two and a half times the average spacing (`autoClumpSize`), so a clump
   * holds a handful of things whatever the budget and radius. A fixed size
   * does not survive a change of radius: pull the radius in and each clump
   * holds hundreds of things, which looks like an even spread again.
   */
  clumpSize?: number
  /**
   * Evaluated candidates, kept across calls. Candidates are world-anchored
   * per cell, so after the region moves most cells are ones already
   * evaluated, and only the newly entered ring samples the terrain. It holds
   * GROUND only (height + normal), so the caller clears it when the TERRAIN
   * changes; climate, rules and suppression are re-evaluated every call.
   * See `pruneScatterCache`.
   */
  cache?: Map<number, GroundSample>
}

/*
Cache keys are NUMBERS — the two cell indices packed into one (±2^20 cells a
side) — because string keys were most of the cache's weight. The cell size a
cache was filled at is remembered beside it, so a budget or radius change
(which changes the cell grid) clears it instead of misreading it.
*/
const CELL_OF = new WeakMap<Map<number, GroundSample>, number>()
const OFF = 1 << 20
const packCell = (ix: number, iz: number) => (ix + OFF) * 2 * OFF + (iz + OFF)

export interface Placement {
  rule: number
  model: string
  x: number
  y: number
  z: number
  /** Radians about Y. */
  yaw: number
  scale: number
  /** The ground normal at the point (for `alignToSlope`). */
  normal: { x: number; y: number; z: number }
}

/** A 32-bit hash of integers — same mixing as voxel-galaxy's hash32. */
function hash(...parts: number[]): number {
  let h = 0x9747b28c ^ parts.length
  for (const part of parts) {
    let k = Math.imul(part | 0, 0xcc9e2d51)
    k = (k << 15) | (k >>> 17)
    k = Math.imul(k, 0x1b873593)
    h ^= k
    h = (h << 13) | (h >>> 19)
    h = (Math.imul(h, 5) + 0xe6546b64) | 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
const unit = (h: number) => h / 4294967296

/** A soft band: 1 inside [lo, hi], easing to 0 over `soft` outside it. */
export function band(
  x: number,
  range: [number, number] | undefined,
  soft: number
): number {
  if (range == null) return 1
  const [lo, hi] = range
  const s = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
  const rise = soft > 0 ? s((x - (lo - soft)) / soft) : x >= lo ? 1 : 0
  const fall = soft > 0 ? 1 - s((x - hi) / soft) : x <= hi ? 1 : 0
  return rise * fall
}

/*
ALTITUDE's lower edge is a HARD FLOOR that eases INWARD. With the ordinary
outward ease, a palm with a 0.5 m minimum grew down to −3.5 m and rocks to
−4 m: trees standing in the sea (Tonio). Nothing may start below its minimum,
so the ramp runs from lo up to lo + soft instead; the upper edge still eases
outward like every other band.
*/
function floorBand(
  x: number,
  range: [number, number] | undefined,
  soft: number
): number {
  if (range == null) return 1
  const [lo, hi] = range
  if (x < lo) return 0
  return band(x, [lo + soft, hi], soft)
}

/** Smooth value noise on a lattice, 0…1, anchored to the world. */
function valueNoise(seed: number, x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  const a = unit(hash(seed, ix, iz, 21))
  const b = unit(hash(seed, ix + 1, iz, 21))
  const c = unit(hash(seed, ix, iz + 1, 21))
  const d = unit(hash(seed, ix + 1, iz + 1, 21))
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz
}

/** A string as a 32-bit number, for seeding a clump group. */
function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * THE CLUMP FIELD: where a group gathers, 0 (a gap) … 1 (the middle of a
 * clump). World-anchored and seeded, so a copse stays where it is as the
 * scatter follows the camera.
 *
 * Two octaves of value noise, then a threshold: about a third of the ground is
 * clump, with soft edges, and the smaller octave keeps the outlines from being
 * round. Tonio: "copses and little regions of detail play much better than
 * random scatter whether it's rocks or trees."
 */
export function clumpAt(
  seed: number,
  group: string,
  x: number,
  z: number,
  size = 90
): number {
  return clumpField(hash(seed, hashString(group)), x, z, size)
}

/** `clumpAt` with the group already hashed (`hash(seed, hashString(group))`). */
function clumpField(s: number, x: number, z: number, size: number): number {
  const u = x / size
  const v = z / size
  const n =
    0.7 * valueNoise(s, u, v) + 0.3 * valueNoise(s + 1, u * 2.7, v * 2.7)
  const t = (n - 0.5) / 0.14
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
}

/**
 * What a rule's weight is multiplied by at a point: `1 - clump` in a gap (the
 * outliers), rising to well over 1 inside a clump. The scatter's budget solver
 * rescales everything afterwards, so only the RATIO matters.
 */
export function clumpWeight(
  rule: ScatterRule,
  seed: number,
  x: number,
  z: number,
  size = 90,
  strength = rule.clump ?? 0.85
): number {
  const s = Math.max(0, Math.min(1, strength))
  if (s === 0) return 1
  const c = clumpAt(
    seed,
    rule.clumpGroup ?? rule.kind,
    x,
    z,
    size * (rule.clumpScale ?? 1)
  )
  return 1 - s + s * 3 * c
}

/**
 * The clump size a scatter uses when none is given: two and a half times the
 * average spacing between placements, snapped to a half-octave so it does not
 * creep (and re-deal every clump) as the budget moves a little.
 */
export function autoClumpSize(budget: number, radius: number): number {
  const spacing = Math.sqrt((Math.PI * radius * radius) / Math.max(1, budget))
  return Math.pow(2, Math.round(Math.log2(spacing * 2.5) * 2) / 2)
}

/** How suitable a point is for a rule — its density times every band. */
export function suitability(
  rule: ScatterRule,
  c: ScatterClimate,
  slopeDeg: number
): number {
  return (
    rule.density *
    band(c.temperature, rule.temperature, 0.08) *
    band(c.moisture, rule.moisture, 0.08) *
    floorBand(c.altitude, rule.altitude, 4) *
    band(slopeDeg, rule.slope, 5)
  )
}

/**
 * The EXPENSIVE part of a candidate — its ground: height and normal, three
 * terrain samples. This is all the cache keeps. Climate and suitability are
 * cheap arithmetic and are recomputed; caching them (a weight array per
 * point) cost ~50 MB at a 20k budget, this ~a fifth of that.
 */
export interface GroundSample {
  y: number
  nx: number
  ny: number
  nz: number
}

interface Candidate {
  x: number
  z: number
  y: number
  nx: number
  ny: number
  nz: number
  /** Offset of this candidate's rule weights in the shared pool. */
  w: number
  total: number
  h: number
}

export function scatterPlacements(o: ScatterOptions): Placement[] {
  const oversample = o.oversample ?? 4
  if (o.budget <= 0 || o.radius <= 0 || o.rules.length === 0) return []
  const area = Math.PI * o.radius * o.radius
  // Cell size so the circle holds AT LEAST budget × oversample candidates,
  // snapped DOWN (see below) so the cell grid is stable as the budget
  // moves a little. It used to round to the NEAREST power of two, which could
  // halve the candidates: on a map that is mostly sea the scatter then ran out
  // of places, and a budget of 18,500 placed the same 14,171 as 14,500 did.
  const raw = Math.sqrt(area / (o.budget * oversample))
  // An EIGHTH of an octave: coarse enough that a nudge to the budget keeps the
  // grid (and the cache), fine enough that the count follows the budget. At a
  // half-octave the candidates jumped by 2x at each step, and where the map
  // could not hold the budget the count sat still for a long stretch of the
  // slider and then leapt (5,543 from 6,000 to 9,000, then 10,052 at 10,000).
  const cell = Math.pow(2, Math.floor(Math.log2(raw) * 8) / 8)
  if (o.cache != null && CELL_OF.get(o.cache) !== cell) {
    o.cache.clear()
    CELL_OF.set(o.cache, cell)
  }
  const r2 = o.radius * o.radius
  const x0 = Math.floor((o.center.x - o.radius) / cell)
  const x1 = Math.floor((o.center.x + o.radius) / cell)
  const z0 = Math.floor((o.center.z - o.radius) / cell)
  const z1 = Math.floor((o.center.z + o.radius) / cell)
  const e = Math.max(0.5, cell * 0.25) // finite-difference step for slope
  const clumpSize =
    o.clumpSize != null && o.clumpSize > 0
      ? o.clumpSize
      : autoClumpSize(o.budget, o.radius)
  const clumpAll = o.clump != null && o.clump >= 0 ? o.clump : undefined

  const cands: Candidate[] = []
  const R = o.rules.length
  /*
  The clump fields, worked out ONCE per rule rather than per candidate per
  rule: the group's hash (a string hash, which was most of the cost: clumping
  made a rebuild four to five times slower until this was hoisted), and which
  rules share a field. Same numbers as `clumpWeight`, so the same placements.
  */
  const clumpStrength = new Float64Array(R)
  const fieldOf = new Int32Array(R)
  const fieldSeed: number[] = []
  const fieldSize: number[] = []
  const fieldKeys = new Map<string, number>()
  for (let ri = 0; ri < R; ri++) {
    const r = o.rules[ri]
    clumpStrength[ri] = Math.max(0, Math.min(1, clumpAll ?? r.clump ?? 0.85))
    const group = r.clumpGroup ?? r.kind
    const size = clumpSize * (r.clumpScale ?? 1)
    const key = `${group}|${size}`
    let fi = fieldKeys.get(key)
    if (fi == null) {
      fi = fieldSeed.length
      fieldKeys.set(key, fi)
      fieldSeed.push(hash(o.seed, hashString(group)))
      fieldSize.push(size)
    }
    fieldOf[ri] = fi
  }
  const fieldAt = new Float64Array(Math.max(1, fieldSeed.length))
  let pool = new Float64Array(4096 * R)
  let poolUsed = 0
  for (let iz = z0; iz <= z1; iz++) {
    for (let ix = x0; ix <= x1; ix++) {
      const hx = hash(o.seed, ix, iz, 1)
      const hz = hash(o.seed, ix, iz, 2)
      const x = (ix + unit(hx)) * cell
      const z = (iz + unit(hz)) * cell
      const dx = x - o.center.x
      const dz = z - o.center.z
      if (dx * dx + dz * dz > r2) continue
      const key = packCell(ix, iz)
      let g = o.cache?.get(key)
      if (g == null) {
        const y = o.height(x, z)
        /*
        Ground normal from FORWARD differences: three height samples per
        candidate, not five. Height sampling is the whole cost of a scatter
        (~800k samples at 20k items with central differences), and the slope
        only has to be good to a degree or two.
        */
        const gx = (o.height(x + e, z) - y) / e
        const gz = (o.height(x, z + e) - y) / e
        const len = Math.sqrt(gx * gx + 1 + gz * gz)
        g = { y, nx: -gx / len, ny: 1 / len, nz: -gz / len }
        o.cache?.set(key, g)
      }
      const slopeDeg = (Math.acos(g.ny) * 180) / Math.PI
      const c = o.climate(x, z, g.y)
      // Weights go into one shared pool, not an array per candidate.
      if (poolUsed + R > pool.length) {
        const grown = new Float64Array(pool.length * 2)
        grown.set(pool)
        pool = grown
      }
      let total = 0
      fieldAt.fill(-1)
      for (let ri = 0; ri < R; ri++) {
        const r = o.rules[ri]
        let w = suitability(r, c, slopeDeg)
        if (w > 0) {
          const strength = clumpStrength[ri]
          if (strength > 0) {
            // One field per distinct (group, size): rules that share it
            // (stones and boulders) pay for it once per candidate.
            const fi = fieldOf[ri]
            if (fieldAt[fi] < 0)
              fieldAt[fi] = clumpField(fieldSeed[fi], x, z, fieldSize[fi])
            w *= 1 - strength + strength * 3 * fieldAt[fi]
          }
          if (w > 0 && o.suppress) w *= Math.max(0, o.suppress(x, z, r.kind))
        }
        pool[poolUsed + ri] = w
        total += w
      }
      if (total <= 0) continue
      const wAt = poolUsed
      poolUsed += R
      cands.push({
        x,
        z,
        y: g.y,
        nx: g.nx,
        ny: g.ny,
        nz: g.nz,
        w: wAt,
        total,
        h: hash(o.seed, ix, iz, 3),
      })
    }
  }
  if (cands.length === 0) return []

  /*
  SOLVE THE THRESHOLD: accept a candidate with probability min(1, k·total),
  and find k so the expected count is the budget. Monotone in k, so bisect.
  If even k → ∞ cannot reach the budget, every suitable candidate is taken.
  */
  const totals = new Float64Array(cands.length)
  for (let i = 0; i < cands.length; i++) totals[i] = cands[i].total
  const expected = (k: number) => {
    let sum = 0
    for (let i = 0; i < totals.length; i++) {
      const p = k * totals[i]
      sum += p < 1 ? p : 1
    }
    return sum
  }
  /*
  …BUT NOT PAST THE POINT WHERE CONTRAST DIES. Pushed far enough, k accepts
  everything, and "everything" is an even spread: the gaps between clumps fill
  and thin habitat is packed as full as lush. That is what happened when the
  radius was pulled in under a fixed budget (Tonio: "it starts looking very
  random vs. clumped"). So k stops where a candidate a QUARTER as suitable as
  the best one would be certain: below that the budget is simply not met. The
  budget is how many things there may be, not a number to hit at any cost.
  */
  let best = 0
  for (let i = 0; i < totals.length; i++) if (totals[i] > best) best = totals[i]
  const kMax = 4 / best
  if (expected(kMax) < o.budget) return pick(kMax)
  let lo = 0
  let hi = Math.min(1, kMax)
  while (expected(hi) < o.budget && hi < kMax) hi = Math.min(kMax, hi * 2)
  // 30 halvings: k to ~1e-9 of its bracket — far past what a count can show.
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (expected(mid) < o.budget) lo = mid
    else hi = mid
  }
  return pick(hi)

  function pick(k: number): Placement[] {
    const out: Placement[] = []
    for (const c of cands) {
      if (unit(c.h) >= Math.min(1, k * c.total)) continue
      // Which rule: proportional to its weight here.
      let pick = unit(hash(c.h, 11)) * c.total
      let ri = 0
      for (; ri < R - 1; ri++) {
        pick -= pool[c.w + ri]
        if (pick < 0) break
      }
      const rule = o.rules[ri]
      const model =
        rule.models[Math.floor(unit(hash(c.h, 12)) * rule.models.length)]
      const [s0, s1] = rule.scale
      out.push({
        rule: ri,
        model,
        x: c.x,
        y: c.y,
        z: c.z,
        yaw: unit(hash(c.h, 13)) * Math.PI * 2,
        scale: s0 + (s1 - s0) * unit(hash(c.h, 14)),
        normal: { x: c.nx, y: c.ny, z: c.nz },
      })
    }
    return out
  }
}

const range = (prefix: string, letters: string) =>
  letters.split('').map((l) => `${prefix}${l}`)

/**
 * Boulders and stones, made procedurally (procedural-rock) and coloured by the
 * terrain. Shared by both rule sets below.
 */
export const ROCK_RULES: ScatterRule[] = [
  {
    kind: 'boulder',
    collider: 'box',
    // Procedural (procedural-rock): made from a seed, coloured by the terrain.
    models: [...rockNames('boulder', 6), ...rockNames('tall', 3)],
    density: 0.35,
    altitude: [0, 1e5],
    slope: [8, 90],
    scale: [3, 9],
    alignToSlope: 0.6,
    clumpGroup: 'rocks',
    clumpScale: 0.65,
    sink: 0.25,
  },
  {
    kind: 'rock',
    models: [...rockNames('stone', 8), ...rockNames('slab', 4)],
    density: 0.5,
    altitude: [0, 1e5],
    scale: [3, 7],
    alignToSlope: 0.9,
    // Stones gather where the boulders do.
    clumpGroup: 'rocks',
    clumpScale: 0.65,
    sink: 0.3,
  },
]

const numbered = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}_${i + 1}`)

/**
 * THE DEFAULT RULES: trees, bushes and undergrowth from the curated Quaternius
 * nature library (`quaternius/libraries/nature.glb`), rocks made procedurally.
 * Those models stand 2.5 to 5 units tall, so the tree scales here are about
 * 3 to 4.5 (a 9 to 15 m tree).
 */
export const NATURE_RULES: ScatterRule[] = [
  {
    kind: 'pine',
    collider: 'trunk',
    models: numbered('PineTree', 5),
    density: 1,
    temperature: [0.12, 0.5],
    moisture: [0.2, 1],
    altitude: [3, 1e5],
    slope: [0, 32],
    scale: [3.2, 5],
  },
  {
    kind: 'broadleaf',
    collider: 'trunk',
    models: [...numbered('CommonTree', 5), ...numbered('BirchTree', 5)],
    density: 1,
    temperature: [0.42, 0.78],
    moisture: [0.3, 1],
    altitude: [2, 1e5],
    slope: [0, 28],
    scale: [2.8, 4.4],
  },
  {
    // Willows keep to low wet ground: the waterside.
    kind: 'willow',
    collider: 'trunk',
    models: numbered('Willow', 5),
    density: 0.6,
    temperature: [0.42, 0.82],
    moisture: [0.45, 1],
    altitude: [0.5, 14],
    slope: [0, 18],
    scale: [3, 4.2],
    clumpScale: 0.65,
  },
  {
    kind: 'palm',
    collider: 'trunk',
    models: numbered('PalmTree', 4),
    density: 1.4,
    temperature: [0.7, 1],
    moisture: [0.15, 1],
    altitude: [0.5, 18],
    slope: [0, 20],
    scale: [2, 3.2],
  },
  {
    // Dead trees mark the margins: too dry or too cold for the living ones.
    kind: 'deadtree',
    collider: 'trunk',
    models: [
      ...numbered('CommonTree_Dead', 5),
      ...numbered('BirchTree_Dead', 5),
      ...numbered('Willow_Dead', 5),
    ],
    density: 0.25,
    temperature: [0.15, 0.85],
    moisture: [0.1, 0.28],
    altitude: [2, 1e5],
    slope: [0, 30],
    scale: [2.6, 4],
    clump: 0.5,
  },
  {
    kind: 'bush',
    models: ['Bush_1', 'Bush_2', 'BushBerries_1', 'BushBerries_2'],
    density: 1.4,
    temperature: [0.25, 0.85],
    moisture: [0.15, 1],
    altitude: [1, 1e5],
    slope: [0, 38],
    scale: [0.9, 1.7],
    // Bushes fill in around the broadleaf copses.
    clumpGroup: 'broadleaf',
  },
  {
    kind: 'undergrowth',
    models: [
      'Grass',
      'Grass_2',
      'Grass_Short',
      'Flowers',
      ...numbered('Plant', 5),
    ],
    density: 1.6,
    temperature: [0.3, 0.9],
    moisture: [0.2, 1],
    altitude: [1, 1e5],
    slope: [0, 35],
    scale: [1.2, 2.4],
    clumpScale: 0.45,
  },
  {
    kind: 'cactus',
    collider: 'trunk',
    models: [
      ...numbered('Cactus', 5),
      'CactusFlower_1',
      'CactusFlowers_2',
      'CactusFlowers_3',
      'CactusFlowers_4',
      'CactusFlowers_5',
    ],
    density: 1.2,
    temperature: [0.7, 1],
    // Dry, not DEAD: a floor above zero, so a world with no water at all
    // (Mars) grows nothing. At [0, …] it grew cacti.
    moisture: [0.1, 0.24],
    altitude: [1, 1e5],
    slope: [0, 25],
    scale: [1.8, 3.6],
  },
  {
    kind: 'deadwood',
    models: ['TreeStump', 'WoodLog'],
    density: 0.15,
    temperature: [0.3, 0.8],
    moisture: [0.3, 1],
    altitude: [2, 1e5],
    slope: [0, 25],
    scale: [1.6, 2.6],
    alignToSlope: 0.8,
    clumpGroup: 'broadleaf',
  },
  ...ROCK_RULES,
]

/** A role the biome shader can draw a decoration material in. */
export type DecorationRole = 'leaf' | 'evergreen' | 'bark'

/**
 * What each material in the nature library IS: the decorator gives these the
 * terrain's biome shading in that role, so leaves take the colour of the
 * ground they stand on (and the season) and trunks stay wood. A material not
 * listed keeps its own look (flowers, berries, coconuts).
 *
 * A key is a material name, or `ModelGlob/Material` for one model's use of it
 * (checked first): the pines share `Green` with the oaks, and must not turn
 * in autumn.
 */
export const NATURE_ROLES: Record<string, DecorationRole> = {
  Green: 'leaf',
  DarkGreen: 'leaf',
  Leaves: 'leaf',
  'PineTree*/Green': 'evergreen',
  'PalmTree*/Green': 'evergreen',
  'PalmTree*/DarkGreen': 'evergreen',
  'Cactus*/Green': 'evergreen',
  'Cactus*/DarkGreen': 'evergreen',
  // Bushes and flowers keep their leaves: bare, they would leave berries
  // and flower heads hanging in the air.
  'Bush*/Green': 'evergreen',
  'Flowers/Green': 'evergreen',
  Wood: 'bark',
  LightWood: 'bark',
  White: 'bark',
  Black: 'bark',
}

/**
 * The role of `material` as used by `model`, or null. Blender's `.001`
 * suffixes are ignored; a `ModelGlob/Material` key beats a bare name.
 */
export function roleFor(
  roles: Record<string, DecorationRole>,
  model: string,
  material: string
): DecorationRole | null {
  const name = material.replace(/\.\d+$/, '')
  for (const key in roles) {
    const slash = key.indexOf('/')
    if (slash < 0 || key.slice(slash + 1) !== name) continue
    const glob = key.slice(0, slash).replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`^${glob.replace(/\*/g, '.*')}$`).test(model))
      return roles[key]
  }
  return roles[name] ?? null
}

/**
 * The older rule set, over Kenney's Nature Kit (`kenney/libraries/nature-kit.glb`):
 * what the decorator uses when you point `url` at that library.
 * Tuned against Land and Sky's default climate; a starting point, not a
 * taxonomy.
 */
export const NATURE_KIT_RULES: ScatterRule[] = [
  {
    kind: 'pine',
    collider: 'trunk',
    models: [
      ...range('tree_pineDefault', 'AB'),
      ...range('tree_pineRound', 'ABCDEF'),
      ...range('tree_pineTall', 'ABCD'),
      ...range('tree_pineSmall', 'ABCD'),
    ],
    density: 1,
    temperature: [0.12, 0.5],
    moisture: [0.2, 1],
    altitude: [3, 1e5],
    slope: [0, 32],
    scale: [6, 11],
  },
  {
    kind: 'broadleaf',
    collider: 'trunk',
    models: [
      'tree_default',
      'tree_oak',
      'tree_detailed',
      'tree_fat',
      'tree_plateau',
      'tree_tall',
      'tree_thin',
      'tree_simple',
    ],
    density: 1,
    temperature: [0.45, 0.78],
    moisture: [0.3, 1],
    altitude: [2, 1e5],
    slope: [0, 28],
    scale: [6, 10],
  },
  {
    kind: 'palm',
    collider: 'trunk',
    models: ['tree_palm', 'tree_palmBend', 'tree_palmShort', 'tree_palmTall'],
    density: 1.4,
    temperature: [0.7, 1],
    moisture: [0.15, 1],
    altitude: [0.5, 18],
    slope: [0, 20],
    scale: [6, 10],
  },
  {
    kind: 'bush',
    models: [
      'plant_bush',
      'plant_bushDetailed',
      'plant_bushLarge',
      'plant_bushSmall',
      'plant_bushTriangle',
    ],
    density: 1.6,
    temperature: [0.25, 0.85],
    moisture: [0.15, 1],
    altitude: [1, 1e5],
    slope: [0, 38],
    scale: [4, 8],
  },
  {
    kind: 'cactus',
    collider: 'trunk',
    models: ['cactus_short', 'cactus_tall'],
    density: 1.2,
    temperature: [0.7, 1],
    // Dry, not DEAD: a floor above zero, so a world with no water at all
    // (Mars) grows nothing. At [0, …] it grew cacti.
    moisture: [0.1, 0.24],
    altitude: [1, 1e5],
    slope: [0, 25],
    scale: [5, 9],
  },
  ...ROCK_RULES,
]

/**
 * THE NEAR-SET — "the placements around this point" as one query, shared by
 * everything that exists only near the viewer: the decorator's collider pool
 * and its shadow casters today; detailed models, interaction and sound
 * emitters when they come (Tonio: "analogous to how we handle collisions").
 *
 * A uniform grid over the placements, built once per scatter. A query touches
 * only the cells within `range`, so its cost is set by the neighbourhood, not
 * by the budget.
 */
export class NearIndex<T extends { x: number; z: number }> {
  private cells = new Map<string, T[]>()

  constructor(readonly items: T[], readonly cellSize = 32) {
    for (const p of items) {
      const key = this.key(
        Math.floor(p.x / cellSize),
        Math.floor(p.z / cellSize)
      )
      const list = this.cells.get(key)
      if (list) list.push(p)
      else this.cells.set(key, [p])
    }
  }

  private key(i: number, j: number): string {
    return `${i},${j}`
  }

  /**
   * Up to `max` items within `range` of (x, z), NEAREST FIRST, optionally
   * filtered. Returns each with its distance.
   */
  near(
    x: number,
    z: number,
    range: number,
    max = Infinity,
    filter?: (item: T) => boolean
  ): Array<{ item: T; d: number }> {
    const c = this.cellSize
    const i0 = Math.floor((x - range) / c)
    const i1 = Math.floor((x + range) / c)
    const j0 = Math.floor((z - range) / c)
    const j1 = Math.floor((z + range) / c)
    const out: Array<{ item: T; d: number }> = []
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const list = this.cells.get(this.key(i, j))
        if (list == null) continue
        for (const item of list) {
          if (filter && !filter(item)) continue
          const d = Math.hypot(item.x - x, item.z - z)
          if (d <= range) out.push({ item, d })
        }
      }
    out.sort((a, b) => a.d - b.d)
    return out.length > max ? out.slice(0, Math.max(0, Math.floor(max))) : out
  }
}

/**
 * Drop cached candidates more than `keep` from `center`, so a cache that
 * follows a moving camera stays the size of a neighbourhood, not a journey.
 */
export function pruneScatterCache(
  cache: Map<number, GroundSample>,
  center: { x: number; z: number },
  keep: number
): void {
  const cell = CELL_OF.get(cache)
  if (cell == null) return
  const k2 = keep * keep
  for (const key of cache.keys()) {
    const ix = Math.floor(key / (2 * OFF)) - OFF
    const iz = (key % (2 * OFF)) - OFF
    const dx = (ix + 0.5) * cell - center.x
    const dz = (iz + 0.5) * cell - center.z
    if (dx * dx + dz * dz > k2) cache.delete(key)
  }
}

/**
 * Whether `url` names the default decoration library: unset, the resolved
 * default itself, or any host serving the same path. Asked of the URL in use,
 * so that naming the default library explicitly is still the default library.
 */
export function isDefaultLibrary(
  url: string,
  resolvedDefault: string,
  path: string
): boolean {
  if (!url) return true
  const bare = url.split(/[?#]/)[0]
  return bare === resolvedDefault || bare === path || bare.endsWith('/' + path)
}
