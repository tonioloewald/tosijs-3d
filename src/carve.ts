/*#
# carve

**The shapes you cut caves out of, and the noise that stops them looking cut.**
Pure, deterministic, Babylon-free; the vocabulary [[patch-field]] composes and
[[sdf-lattice]] extracts, and the same primitives the topology→voxel compiler
will stamp (see `TUNNEL-DESIGN.md`).

A `Carve` is a signed distance to a carved surface, **positive INSIDE the air**
— the opposite sign convention to density, because you author the hole, not the
rock. `applyCarve` turns one into a `PatchField`:

```js
const cave = applyCarve(
  roughen(
    smoothUnion(30,
      sphere({ x: 0, y: -40, z: 0 }, 45),          // a hall
      capsule({ x: 0, y: -40, z: 0 }, { x: 200, y: -70, z: 40 }, 14), // an adit
    ),
    { amp: 6, scale: 0.02, octaves: 3, seed: 7 },
  )
)
```

## Why a capsule is the workhorse

A tunnel is a **segment with a radius** — that's a capsule, and its exact
distance function is three lines. Chain them along a spine and you have a
passage that bends; take their smooth union with a room and the junction is a
mouth rather than a pipe stuck into a sphere. Everything else here is a
variation on that idea.

## Perturbation: two knobs, different jobs

- **`roughen`** displaces the surface along its own normal — walls get texture,
  the silhouette stays where you put it. Cheap: one noise lookup per sample.
- **`warp`** bends the SPACE the shape lives in, so a straight tunnel meanders
  and a sphere becomes a cavern. This is what removes "regular geometry" as a
  rule rather than as a decoration — but it moves the surface, so a warped
  passage needs its clearance re-checked, not assumed.

Both take an amplitude in METRES and a scale in 1/metres (small scale = big
features), the same convention as the terrain noise, so numbers transfer.
*/
/*{ "parent": "environment" }*/

import { PerlinNoise } from './perlin-noise'
import type { PatchField } from './patch-field'

/** Signed distance to a carved surface — **positive inside the air**. */
export type Carve = (x: number, y: number, z: number) => number

export interface Vec3Like {
  x: number
  y: number
  z: number
}

/** Turn a carve into a patch field: the air wins wherever it reaches. */
export function applyCarve(carve: Carve): PatchField {
  return (x, y, z, d) => Math.max(d, carve(x, y, z))
}

/** A spherical chamber. */
export function sphere(centre: Vec3Like, radius: number): Carve {
  return (x, y, z) =>
    radius - Math.hypot(x - centre.x, y - centre.y, z - centre.z)
}

/**
 * A CAPSULE — a segment with a radius, and the workhorse of tunnel carving:
 * exact distance, no hollow spots at the joins, and it bends by chaining.
 * `radiusB` tapers toward the far end (default: uniform).
 */
export function capsule(
  a: Vec3Like,
  b: Vec3Like,
  radius: number,
  radiusB = radius
): Carve {
  const bax = b.x - a.x
  const bay = b.y - a.y
  const baz = b.z - a.z
  const len2 = bax * bax + bay * bay + baz * baz || 1e-9
  return (x, y, z) => {
    const pax = x - a.x
    const pay = y - a.y
    const paz = z - a.z
    let t = (pax * bax + pay * bay + paz * baz) / len2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const dx = pax - bax * t
    const dy = pay - bay * t
    const dz = paz - baz * t
    return radius + (radiusB - radius) * t - Math.hypot(dx, dy, dz)
  }
}

/** A polyline spine of capsules — a passage that bends. `radii` may give one
 * radius per point (tapering between them); a single number is uniform. */
export function tube(points: Vec3Like[], radii: number | number[]): Carve {
  const segs: Carve[] = []
  for (let i = 0; i + 1 < points.length; i++) {
    const ra = typeof radii === 'number' ? radii : radii[i] ?? 1
    const rb = typeof radii === 'number' ? radii : radii[i + 1] ?? ra
    segs.push(capsule(points[i], points[i + 1], ra, rb))
  }
  if (segs.length === 0) return () => -1e9
  return union(...segs)
}

/** A rounded box — a hewn chamber, a hangar, anything that reads as BUILT. */
export function box(centre: Vec3Like, half: Vec3Like, rounding = 0): Carve {
  return (x, y, z) => {
    const qx = Math.abs(x - centre.x) - (half.x - rounding)
    const qy = Math.abs(y - centre.y) - (half.y - rounding)
    const qz = Math.abs(z - centre.z) - (half.z - rounding)
    const ox = Math.max(qx, 0)
    const oy = Math.max(qy, 0)
    const oz = Math.max(qz, 0)
    const outside = Math.hypot(ox, oy, oz)
    const inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0)
    return rounding - (outside + inside)
  }
}

/** Hard union (max on this convention): the air of both. */
export function union(...carves: Carve[]): Carve {
  return (x, y, z) => {
    let m = -Infinity
    for (const c of carves) {
      const v = c(x, y, z)
      if (v > m) m = v
    }
    return m
  }
}

/**
 * SMOOTH union — the one that makes junctions look excavated instead of
 * assembled. `k` is the blend radius in metres: where two carves meet within
 * `k` of each other the surface fillets, so a passage flares into a chamber.
 * A hard `union` leaves a visible crease exactly where the eye goes.
 */
export function smoothUnion(k: number, ...carves: Carve[]): Carve {
  if (k <= 0) return union(...carves)
  return (x, y, z) => {
    let acc = -Infinity
    for (const c of carves) {
      const v = c(x, y, z)
      if (acc === -Infinity) {
        acc = v
        continue
      }
      const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (v - acc)) / k))
      acc = v * h + acc * (1 - h) + k * h * (1 - h)
    }
    return acc
  }
}

/** Cut `b` OUT of `a` (a pillar in a hall, rock left standing in a bore). */
export function subtract(a: Carve, b: Carve): Carve {
  return (x, y, z) => Math.min(a(x, y, z), -b(x, y, z))
}

/** Keep only where both reach — a passage clipped to a region. */
export function intersect(a: Carve, b: Carve): Carve {
  return (x, y, z) => Math.min(a(x, y, z), b(x, y, z))
}

export interface NoiseOptions {
  /** Displacement in METRES. */
  amp: number
  /** Frequency in 1/metres — SMALL numbers make BIG features. */
  scale: number
  octaves?: number
  seed?: number
}

/**
 * ROUGHEN — displace the surface along its own normal with fBm, so walls read
 * as rock rather than as a distance function. The silhouette stays roughly
 * where you put it, which is why this is the safe knob: a passage roughened by
 * 2 m is still a passage.
 *
 * Note it eats clearance: a tunnel of radius `r` roughened by `amp` has a worst
 * case of `r − amp`, so certify clearance AFTER roughening, never before.
 */
export function roughen(carve: Carve, opts: NoiseOptions): Carve {
  const noise = new PerlinNoise(opts.seed ?? 1)
  const oct = opts.octaves ?? 3
  const { amp, scale } = opts
  return (x, y, z) =>
    carve(x, y, z) + noise.fractal(x * scale, y * scale, z * scale, oct) * amp
}

/**
 * WARP — bend the space the shape lives in, so a straight tube meanders and a
 * sphere becomes a cavern. This is what stops carves reading as primitives at
 * all; `roughen` textures a cylinder, `warp` stops it being one.
 *
 * Three noise lookups per sample (one per axis), and it MOVES the surface — a
 * warped passage's clearance and even its route must be re-checked rather than
 * assumed. Keep `amp` well under the passage radius unless you want a maze.
 */
export function warp(carve: Carve, opts: NoiseOptions): Carve {
  const noise = new PerlinNoise(opts.seed ?? 2)
  const oct = opts.octaves ?? 2
  const { amp, scale } = opts
  return (x, y, z) => {
    const sx = x * scale
    const sy = y * scale
    const sz = z * scale
    return carve(
      x + noise.fractal(sx, sy, sz, oct) * amp,
      y + noise.fractal(sx + 31.4, sy + 17.2, sz + 5.9, oct) * amp,
      z + noise.fractal(sx - 12.7, sy + 44.1, sz - 8.3, oct) * amp
    )
  }
}

/**
 * A vertical shaft from the surface down. Written in DEPTH — `0` is the
 * ground, positive numbers go down — because a shaft follows the hillside it's
 * sunk into (see `b3d-patch`, whose `d` is depth below ground).
 *
 * Shafts are enormous or gently sloped, never narrow pipes: `radius` is the
 * whole point, and `lean` slides the bottom sideways so it isn't a plumb line.
 */
export function shaft(
  x0: number,
  z0: number,
  radius: number,
  depth: number,
  lean: Vec3Like = { x: 0, y: 0, z: 0 }
): (x: number, y: number, z: number, d: number) => number {
  return (x, y, z, d) => {
    const t = Math.max(0, Math.min(1, -d / depth)) // 0 at the surface, 1 at the floor
    const cx = x0 + lean.x * t
    const cz = z0 + lean.z * t
    const inRadius = radius - Math.hypot(x - cx, z - cz)
    const aboveFloor = d + depth
    return Math.min(inRadius, aboveFloor)
  }
}
