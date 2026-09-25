/*#
# voxel-galaxy

**A galaxy as a grid of voxels, each with two derived seeds** — one for its
BRIGHT stars, one for its DIM stars. The bright pass is global (the stars you
can see across the galaxy); the dim pass is local, generated only for the
voxels near something that is looking — above all, the skybox baker's camera.
Design and reasoning: `GALAXY-DESIGN.md`.

Pure: no Babylon, no DOM, deterministic. Positions are in the same frame as
[galaxy-data](?galaxy-data.ts) (z-up, the disc's radius ≈ 0.9), so a consumer
applies the transform it already uses for `generateGalaxy`.

```javascript
import { voxelGalaxy } from 'tosijs-3d/voxel-galaxy'

const galaxy = voxelGalaxy({ seed: 1234 })
const bright = galaxy.brightStars()                     // ~5k, the whole galaxy
const local = galaxy.dimStarsNear({ x: 0.5, y: 0, z: 0.01 }, 0.08)
// Same query, any time, any order: the same stars, with the same addresses.
```

## What it guarantees

- **Identity is an address**, `population:voxel:n`, and a star's seed is
  derived from it — never drawn from a shared range. (`generateGalaxy` draws
  seeds from `range(1, 100000)`, so at 100k stars 63% of them share one.)
- **Determinism and locality.** A voxel's stars depend only on the galaxy seed
  and the voxel. Generating one voxel never requires another, and loading them
  in any order gives the same stars.
- **Every voxel has a non-zero budget.** Density is sampled from the current
  spiral generator, lightly smoothed, and extended to every empty voxel by a
  distance falloff with a PINNED share — so the fringe is a dial, not a side
  effect, and the arms keep their contrast.
- **The grid does not show.** Stars are placed by rejection against the density
  interpolated between voxel centres, not uniformly within their voxel.

## Options

| option | default | |
| --- | --- | --- |
| `seed` | — | Galaxy seed: shapes the density AND derives every voxel's seeds |
| `brightBudget` | `5000` | Stars in the global pass |
| `dimBudget` | `95000` | Stars across all voxels' dim passes — most are never generated |
| `samples` | `100000` | Positions drawn from the spiral model (`sampleSpiral`) to impute the density |
| `galaxyOptions` | `{}` | Passed to the sampler (`spiralArms`, `thickness`, …) |
| `nx` | `64` | Grid resolution across the disc (x) |
| `ny` | `64` | Grid resolution across the disc (y) |
| `nz` | `20` | Grid resolution through the disc (z) |
| `halfXY` | `1.05` | Grid half-extent across the disc |
| `halfZ` | `0.3` | Grid half-extent through the disc — room for a halo |
| `smoothPasses` | `1` | Blur passes over the sampled histogram (calms sparse voxels) |
| `fringeShare` | `0.02` | Share of the budget spread across EMPTY voxels |
| `fringeFalloff` | `3` | Falloff length for the fringe, in voxels |
| `brightMix` | O–G5 | The bright population's spectral mix — the bright/dim cut is here |
| `dimMix` | G6–M | The dim population's spectral mix — underweight late M freely |
*/
/*{ "parent": "Space", "order": 910 }*/

import { CheapPRNG, PRNG } from './mersenne-twister.js'
import {
  sampleSpiral,
  starDetailFor,
  starNameFor,
  spiralParams,
  generateNebulae,
  generateShell,
  generateStarSystem,
  GALAXY_DEFAULTS,
  type GalaxyOptions,
  type GalaxyData,
  type NebulaData,
  type DistantStarData,
  type StarData,
} from './galaxy-data.js'
import { SPECTRAL_CLASSES, SPECTRAL_WEIGHTS } from './spectral-classes.js'

export type Population = 'bright' | 'dim'

/** One entry of a population's spectral mix. */
export interface MixEntry {
  spectralClass: string
  /** Inclusive range of spectral index (0 hottest … 9 coolest). */
  minIndex: number
  maxIndex: number
  weight: number
}

export interface VoxelGalaxyOptions {
  seed: number
  brightBudget?: number
  dimBudget?: number
  samples?: number
  galaxyOptions?: GalaxyOptions
  nx?: number
  ny?: number
  nz?: number
  halfXY?: number
  halfZ?: number
  smoothPasses?: number
  fringeShare?: number
  fringeFalloff?: number
  brightMix?: MixEntry[]
  dimMix?: MixEntry[]
  /**
   * How many nebulae. `-1` (default) keeps the old generator's rule — 15% of
   * the bright budget, at least 50 — so a galaxy's nebulae scale with it.
   */
  nebulaBudget?: number
}

/** What `view` returns: the `GalaxyData` shape every consumer already reads. */
export interface GalaxyViewOptions {
  /** Gather the dim stars around this point (generator frame). None if omitted. */
  near?: { x: number; y: number; z: number }
  /** How far around `near` to gather dim stars (whole voxels). */
  radius?: number
  /** Compute every star's best habitability now (slow); else on demand. */
  generatePlanets?: boolean
}

/** A generated star. `position` is in the generator frame (z-up). */
export interface VoxelStar
  extends Omit<StarData, 'name' | 'position' | 'bestHI' | 'hiComputed'> {
  /** `population:voxel:n` — permanent, independent of what else is loaded. */
  id: string
  population: Population
  voxel: number
  n: number
  position: { x: number; y: number; z: number }
}

type Vec = { x: number; y: number; z: number }

const weightOf = (cls: string) =>
  SPECTRAL_WEIGHTS[SPECTRAL_CLASSES.indexOf(cls as any)]

/**
 * The default cut: bright is O–G5, dim is G6–M, each keeping `galaxy-data`'s
 * (deliberately top-heavy) weights. G splits by index, so its weight splits
 * 6:4 with it. The cut and the late-M weighting are the dials the design leaves
 * open — "interesting over realistic" (GALAXY-DESIGN.md).
 */
export const DEFAULT_BRIGHT_MIX: MixEntry[] = [
  ...['O', 'B', 'A', 'F'].map((c) => ({
    spectralClass: c,
    minIndex: 0,
    maxIndex: 9,
    weight: weightOf(c),
  })),
  { spectralClass: 'G', minIndex: 0, maxIndex: 5, weight: weightOf('G') * 0.6 },
]
export const DEFAULT_DIM_MIX: MixEntry[] = [
  { spectralClass: 'G', minIndex: 6, maxIndex: 9, weight: weightOf('G') * 0.4 },
  { spectralClass: 'K', minIndex: 0, maxIndex: 9, weight: weightOf('K') },
  { spectralClass: 'M', minIndex: 0, maxIndex: 9, weight: weightOf('M') },
]

/** Stream tags for the per-voxel seeds. */
const STREAM: Record<Population, number> = { bright: 1, dim: 2 }
/** Galaxy-wide streams — each on its own derived seed, so none depends on another's count. */
const NEBULA_STREAM = 3
const SHELL_STREAM = 4

/**
 * A 32-bit hash of a list of integers (murmur-style mixing + fmix32). Seeds
 * come from here, so they are a function of an ADDRESS rather than a draw
 * from a shared range.
 */
export function hash32(...parts: number[]): number {
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

export interface VoxelGalaxy {
  readonly options: Required<Omit<VoxelGalaxyOptions, 'galaxyOptions'>> & {
    galaxyOptions: GalaxyOptions
  }
  /** Normalised density per voxel — every entry > 0, summing to 1. */
  readonly density: Float64Array
  /** Which voxels the sampled galaxy actually occupied (before the fringe). */
  readonly populated: Uint8Array
  readonly voxelCount: number
  /** The voxel containing `p`, or -1 outside the grid. */
  voxelOf(p: Vec): number
  voxelCenter(v: number): Vec
  /** Expected star count of a voxel's population (budget × density). */
  expectedCount(v: number, population: Population): number
  /** The stars of one voxel's population. Pure: same answer every call. */
  starsInVoxel(v: number, population: Population): VoxelStar[]
  /** Every voxel's bright stars — the global pass. Memoised. */
  brightStars(): VoxelStar[]
  /** The voxels whose box comes within `radius` of `p`. */
  voxelsNear(p: Vec, radius: number): number[]
  /**
   * The dim stars of every voxel within `radius` of `p` — WHOLE voxels, so a
   * few may lie slightly beyond `radius`; filter by distance if that matters.
   */
  dimStarsNear(p: Vec, radius: number): VoxelStar[]
  /** The galaxy's nebulae, from their own derived seed. Memoised. */
  nebulae(): NebulaData[]
  /** Other galaxies and dim far-out stars, from their own seed. Memoised. */
  shell(): { distantGalaxies: NebulaData[]; distantStars: DistantStarData[] }
  /**
   * THE view every consumer reads — `GalaxyData`, as `generateGalaxy` returned
   * it: every bright star, the dim stars near `near`, the nebulae (with the
   * distant galaxies appended, as before) and the shell. Stars carry `id` and a
   * name derived from their seed, and are sorted by name.
   */
  view(options?: GalaxyViewOptions): GalaxyData
}

export function voxelGalaxy(options: VoxelGalaxyOptions): VoxelGalaxy {
  const o = {
    brightBudget: 5000,
    dimBudget: 95000,
    samples: 100000,
    nx: 64,
    ny: 64,
    nz: 20,
    halfXY: 1.05,
    halfZ: 0.3,
    smoothPasses: 1,
    fringeShare: 0.02,
    fringeFalloff: 3,
    brightMix: DEFAULT_BRIGHT_MIX,
    dimMix: DEFAULT_DIM_MIX,
    nebulaBudget: -1,
    ...options,
    galaxyOptions: options.galaxyOptions ?? {},
  }
  const { nx, ny, nz, halfXY, halfZ } = o
  const count = nx * ny * nz
  const cx = (2 * halfXY) / nx
  const cy = (2 * halfXY) / ny
  const cz = (2 * halfZ) / nz
  const at = (x: number, y: number, z: number) => (z * ny + y) * nx + x
  const coords = (v: number) => {
    const x = v % nx
    const y = Math.floor(v / nx) % ny
    const z = Math.floor(v / (nx * ny))
    return { x, y, z }
  }

  // --- 1. SAMPLE the spiral model into a histogram ------------------------
  // Positions only — the model, not the old generator (GALAXY-DESIGN.md →
  // "Reconciliation"). Same draws as the old star loop, so the grid is too.
  const sampled = sampleSpiral(o.seed, o.samples, o.galaxyOptions)
  const hist = new Float64Array(count)
  for (const p of sampled) {
    const x = Math.floor((p.x + halfXY) / cx)
    const y = Math.floor((p.y + halfXY) / cy)
    const z = Math.floor((p.z + halfZ) / cz)
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) continue
    hist[at(x, y, z)]++
  }

  // --- 2. SMOOTH lightly: sparse voxels are noisy (5 samples is ±45%) ------
  const NEIGHBOURS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]
  let smooth = hist
  for (let pass = 0; pass < o.smoothPasses; pass++) {
    const next = new Float64Array(count)
    for (let z = 0; z < nz; z++)
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const i = at(x, y, z)
          let sum = smooth[i] * 2
          let n = 2
          for (const [dx, dy, dz] of NEIGHBOURS) {
            const X = x + dx
            const Y = y + dy
            const Z = z + dz
            if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz)
              continue
            sum += smooth[at(X, Y, Z)]
            n++
          }
          next[i] = sum / n
        }
    smooth = next
  }

  // --- 3. PROPAGATE: every voxel gets a share, by distance falloff ---------
  /*
  Not diffusion. Diffusing until every voxel was filled took 22 passes and
  moved 45.5% of the stars into the fringe, erasing the spiral (measured,
  GALAXY-DESIGN.md). A falloff from the populated voxels, scaled to a pinned
  share, leaves the arms alone and makes the fringe a dial.
  */
  const populated = new Uint8Array(count)
  const dist = new Float64Array(count).fill(Infinity)
  const queue: number[] = []
  for (let i = 0; i < count; i++) {
    if (smooth[i] > 0) {
      populated[i] = 1
      dist[i] = 0
      queue.push(i)
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]
    const { x, y, z } = coords(i)
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const X = x + dx
      const Y = y + dy
      const Z = z + dz
      if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz) continue
      const j = at(X, Y, Z)
      if (dist[j] === Infinity) {
        dist[j] = dist[i] + 1
        queue.push(j)
      }
    }
  }
  let coreSum = 0
  let fringeSum = 0
  const fringe = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    if (populated[i]) coreSum += smooth[i]
    else {
      fringe[i] = Math.exp(-dist[i] / Math.max(1e-6, o.fringeFalloff))
      fringeSum += fringe[i]
    }
  }
  const share = fringeSum > 0 ? Math.min(1, Math.max(0, o.fringeShare)) : 0
  const density = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    density[i] = populated[i]
      ? (smooth[i] / coreSum) * (1 - share)
      : (fringe[i] / fringeSum) * share
  }

  // --- placement: rejection against the interpolated density -------------
  /** Density interpolated between voxel CENTRES (trilinear, edges clamped). */
  const densityAt = (p: Vec) => {
    const fx = (p.x + halfXY) / cx - 0.5
    const fy = (p.y + halfXY) / cy - 0.5
    const fz = (p.z + halfZ) / cz - 0.5
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const z0 = Math.floor(fz)
    const tx = fx - x0
    const ty = fy - y0
    const tz = fz - z0
    const d = (x: number, y: number, z: number) =>
      density[
        at(
          Math.min(nx - 1, Math.max(0, x)),
          Math.min(ny - 1, Math.max(0, y)),
          Math.min(nz - 1, Math.max(0, z))
        )
      ]
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    return lerp(
      lerp(
        lerp(d(x0, y0, z0), d(x0 + 1, y0, z0), tx),
        lerp(d(x0, y0 + 1, z0), d(x0 + 1, y0 + 1, z0), tx),
        ty
      ),
      lerp(
        lerp(d(x0, y0, z0 + 1), d(x0 + 1, y0, z0 + 1), tx),
        lerp(d(x0, y0 + 1, z0 + 1), d(x0 + 1, y0 + 1, z0 + 1), tx),
        ty
      ),
      tz
    )
  }
  /** The largest density any point in voxel `v` can interpolate to. */
  const bound = (v: number) => {
    const { x, y, z } = coords(v)
    let m = 0
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = Math.min(nx - 1, Math.max(0, x + dx))
          const Y = Math.min(ny - 1, Math.max(0, y + dy))
          const Z = Math.min(nz - 1, Math.max(0, z + dz))
          m = Math.max(m, density[at(X, Y, Z)])
        }
    return m
  }
  const MAX_TRIES = 12

  const budget = (p: Population) =>
    p === 'bright' ? o.brightBudget : o.dimBudget
  const mixOf = (p: Population) => (p === 'bright' ? o.brightMix : o.dimMix)

  const expectedCount = (v: number, p: Population) => budget(p) * density[v]

  const starsInVoxel = (v: number, p: Population): VoxelStar[] => {
    if (v < 0 || v >= count) return []
    const voxelSeed = hash32(o.seed, v, STREAM[p])
    /*
    STOCHASTIC ROUNDING with the voxel's own seed: totals land within noise
    of the budget, and a fringe voxel expecting 0.02 stars has one in fifty
    voxels — deterministically, forever.
    */
    const rng = new CheapPRNG(voxelSeed)
    const e = expectedCount(v, p)
    const n = Math.floor(e) + (rng.value() < e - Math.floor(e) ? 1 : 0)
    if (n === 0) return []
    const { x, y, z } = coords(v)
    const x0 = -halfXY + x * cx
    const y0 = -halfXY + y * cy
    const z0 = -halfZ + z * cz
    const limit = bound(v)
    const mix = mixOf(p)
    const weights = mix.map((m) => m.weight)
    const out: VoxelStar[] = []
    for (let k = 0; k < n; k++) {
      const seed = hash32(voxelSeed, k)
      const prng = new CheapPRNG(seed)
      let pos: Vec = { x: 0, y: 0, z: 0 }
      for (let t = 0; t < MAX_TRIES; t++) {
        pos = {
          x: x0 + prng.value() * cx,
          y: y0 + prng.value() * cy,
          z: z0 + prng.value() * cz,
        }
        if (prng.value() * limit <= densityAt(pos)) break
      }
      const entry = prng.pick(mix, weights)
      const index = prng.range(entry.minIndex, entry.maxIndex)
      out.push({
        id: `${p}:${v}:${k}`,
        population: p,
        voxel: v,
        n: k,
        position: pos,
        ...starDetailFor(prng, seed, entry.spectralClass, index),
      })
    }
    return out
  }

  let brightCache: VoxelStar[] | null = null
  const brightStars = () => {
    if (brightCache == null) {
      brightCache = []
      for (let v = 0; v < count; v++) {
        for (const s of starsInVoxel(v, 'bright')) brightCache.push(s)
      }
    }
    return brightCache
  }

  const voxelOf = (p: Vec) => {
    const x = Math.floor((p.x + halfXY) / cx)
    const y = Math.floor((p.y + halfXY) / cy)
    const z = Math.floor((p.z + halfZ) / cz)
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return -1
    return at(x, y, z)
  }

  const voxelCenter = (v: number): Vec => {
    const { x, y, z } = coords(v)
    return {
      x: -halfXY + (x + 0.5) * cx,
      y: -halfXY + (y + 0.5) * cy,
      z: -halfZ + (z + 0.5) * cz,
    }
  }

  const voxelsNear = (p: Vec, radius: number): number[] => {
    const r2 = radius * radius
    const lo = (c: number, half: number, size: number) =>
      Math.max(0, Math.floor((c - radius + half) / size))
    const hi = (c: number, half: number, size: number, n: number) =>
      Math.min(n - 1, Math.floor((c + radius + half) / size))
    const out: number[] = []
    for (let z = lo(p.z, halfZ, cz); z <= hi(p.z, halfZ, cz, nz); z++)
      for (let y = lo(p.y, halfXY, cy); y <= hi(p.y, halfXY, cy, ny); y++)
        for (let x = lo(p.x, halfXY, cx); x <= hi(p.x, halfXY, cx, nx); x++) {
          // Distance from p to the voxel's BOX, not its centre.
          const bx = -halfXY + x * cx
          const by = -halfXY + y * cy
          const bz = -halfZ + z * cz
          const dx = Math.max(bx - p.x, 0, p.x - (bx + cx))
          const dy = Math.max(by - p.y, 0, p.y - (by + cy))
          const dz = Math.max(bz - p.z, 0, p.z - (bz + cz))
          if (dx * dx + dy * dy + dz * dz <= r2) out.push(at(x, y, z))
        }
    return out
  }

  const dimStarsNear = (p: Vec, radius: number) => {
    const out: VoxelStar[] = []
    for (const v of voxelsNear(p, radius)) {
      for (const s of starsInVoxel(v, 'dim')) out.push(s)
    }
    return out
  }

  const galaxyOpts = { ...GALAXY_DEFAULTS, ...o.galaxyOptions }
  const sp = spiralParams(galaxyOpts)
  let nebulaCache: { nebulae: NebulaData[]; densityScale: number } | null = null
  const nebulaPass = () => {
    if (nebulaCache == null) {
      const budget =
        o.nebulaBudget >= 0
          ? o.nebulaBudget
          : Math.max(50, Math.floor(o.brightBudget * 0.15))
      nebulaCache = generateNebulae(
        new PRNG(hash32(o.seed, NEBULA_STREAM)),
        budget,
        sp
      )
    }
    return nebulaCache
  }
  let shellCache: ReturnType<VoxelGalaxy['shell']> | null = null
  const shell = () => {
    if (shellCache == null) {
      shellCache = generateShell(
        new PRNG(hash32(o.seed, SHELL_STREAM)),
        galaxyOpts.distantGalaxies,
        galaxyOpts.distantStars,
        sp,
        nebulaPass().densityScale
      )
    }
    return shellCache
  }

  const toStarData = (s: VoxelStar, planets: boolean): StarData => {
    // The voxel fields stay on the object (population, voxel, n) — harmless
    // extras to a StarData reader, and the address is what `id` is for.
    const star: StarData = {
      ...s,
      name: starNameFor(s.seed),
      bestHI: 5,
    }
    if (planets) {
      const system = generateStarSystem(star)
      for (const p of system.planets) if (p.HI < star.bestHI) star.bestHI = p.HI
      star.hiComputed = true
    }
    return star
  }

  const view = (v: GalaxyViewOptions = {}): GalaxyData => {
    const planets = v.generatePlanets === true
    const stars: StarData[] = brightStars().map((s) => toStarData(s, planets))
    if (v.near != null && (v.radius ?? 0) > 0)
      for (const s of dimStarsNear(v.near, v.radius!))
        stars.push(toStarData(s, planets))
    stars.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
    const { distantGalaxies, distantStars } = shell()
    return {
      stars,
      nebulae: [...nebulaPass().nebulae, ...distantGalaxies],
      distantGalaxies,
      distantStars,
      seed: o.seed,
      options: { ...galaxyOpts, generatePlanets: planets },
    }
  }

  return {
    options: o,
    density,
    populated,
    voxelCount: count,
    voxelOf,
    voxelCenter,
    expectedCount,
    starsInVoxel,
    brightStars,
    voxelsNear,
    dimStarsNear,
    nebulae: () => nebulaPass().nebulae,
    shell,
    view,
  }
}
