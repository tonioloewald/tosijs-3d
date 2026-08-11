/*#
# landform

**Authored landforms as terrain overrides** — where [[slope-profile]]s *remap*
the noise (levels curves), a landform *forces* a shape through it: a volcano
cone, an impact crater, wherever you say. Pure, deterministic, unit-tested;
[[b3d-terrain]] applies its `landform` hook after the profile pipeline in
origin-stable coordinates, so authored shapes survive floating-origin resets
and light correctly (normals difference the hooked field).

The factories return a **matched pair** — the height `landform` and the
`provinceField` that makes it glow — because a volcano isn't a shape OR a
material, it's both:

```js
const vesuvius = volcano({ x: 45, z: -25, radius: 55, height: 24, baseLevel: 5 })
terrain.landform = vesuvius.landform
terrain.provinceField = vesuvius.province
terrain.regenerate()
```

And a runtime explosion is the same move with the other factory — stamp an
`impactCrater` at the hit point, compose it in, `regenerate()`: a glowing
crater with almost no effort. `pad` is the same idea for CIVILIZATION — a
dead-flat surface with a cut-and-fill skirt, which is how cities and bases
claim ground (terrace several up a hillside with `composeLandforms`).
`composeLandforms` chains shapes; `mergeProvinces` maxes glow fields.
*/
/*{ "parent": "environment" }*/

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

/** A landform + its matching volcanism province, made together. */
export interface AuthoredLandform {
  landform: (x: number, z: number, h: number) => number
  province: (x: number, z: number) => number
}

export interface VolcanoOptions {
  /** Vent position (world coords). */
  x: number
  z: number
  /** Footprint radius (m) — outside it the terrain is untouched. */
  radius: number
  /** Edifice height (m) above `baseLevel`. */
  height: number
  /** The terrain level the cone rises from — the flanks BLEND the noise
   * toward this before adding the cone, so the edifice dominates its local
   * noise instead of riding it. Default 0 (sea level). */
  baseLevel?: number
  /** Caldera radius (m). Default `radius * 0.22`. */
  craterRadius?: number
  /** Caldera depth (m) below the rim. Default `height * 0.5`. */
  craterDepth?: number
  /** How much the flanks suppress the underlying noise (0..1). Default 0.7. */
  flatten?: number
  /** Province intensity at the vent (0..1 → the volcanism ladder). The glow
   * fades down the flanks and ends before the footprint. Default 1. */
  glow?: number
}

/**
 * A classic volcano that fades in as an override: smoothstep-blended flanks
 * (C1 at the footprint edge — no seam against the noise terrain), a steepened
 * cone, a caldera sunk below the rim, and a matching province — molten at the
 * vent, glowing seams down the upper flanks, cold voronoi lower, living biome
 * beyond.
 */
export function volcano(opts: VolcanoOptions): AuthoredLandform {
  const {
    x: cx,
    z: cz,
    radius,
    height,
    baseLevel = 0,
    craterRadius = radius * 0.22,
    craterDepth = height * 0.5,
    flatten = 0.7,
    glow = 1,
  } = opts
  const landform = (x: number, z: number, h: number) => {
    const dx = x - cx
    const dz = z - cz
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d >= radius) return h
    // The edifice profile holds its RIM value across the crater interior
    // (dc clamp), so the caldera floor is genuinely level — a basin, not a
    // funnel; the pool needs somewhere flat to sit. The crater term then
    // sinks a flat floor (full depth out to ~0.55 crater radii, wall to rim).
    const dc = Math.max(d, craterRadius)
    const dome = smooth(1 - dc / radius)
    const cone = Math.pow(dome, 1.6)
    const crater = smooth((craterRadius - d) / (craterRadius * 0.45))
    const based = h + (baseLevel - h) * dome * clamp01(flatten)
    return based + height * cone - craterDepth * crater
  }
  const province = (x: number, z: number) => {
    const dx = x - cx
    const dz = z - cz
    const d = Math.sqrt(dx * dx + dz * dz)
    // The ladder lands where a volcano keeps it: full intensity (pools)
    // ONLY on the flat caldera floor; the crater WALL and rim drop to half
    // (glowing seams — crusted, never open lava, so the rim can't read as
    // molten even where smoothed shading normals under-report steepness);
    // outside, a long low tail (cold voronoi) down the flank.
    const floorR = craterRadius * 0.55
    if (d <= floorR) return glow
    const wall = smooth(1 - (d - floorR) / (craterRadius - floorR))
    const past = Math.max(0, d - craterRadius)
    const tail = smooth(1 - past / (radius * 0.4))
    return glow * (0.5 + 0.5 * wall) * tail
  }
  return { landform, province }
}

export interface CraterOptions {
  /** Impact point (world coords). */
  x: number
  z: number
  /** Crater radius (m) — the rim crest sits just inside it. */
  radius: number
  /** Bowl depth (m) below the original terrain. */
  depth: number
  /** Raised-rim height (m). Default `depth * 0.3`. */
  rimHeight?: number
  /** Province intensity at the floor (0..1). ~0.5 reads as cooling ember
   * veins, 1 as a molten floor. Default 0.8. */
  glow?: number
}

/**
 * An impact/explosion crater: a bowl sunk into the EXISTING terrain (no
 * flattening — the scar inherits the landscape), a raised rim, and a hot
 * floor whose glow fades by the rim. Compose one in at a detonation point
 * and `regenerate()` — the aftermath is two field functions.
 */
export function impactCrater(opts: CraterOptions): AuthoredLandform {
  const {
    x: cx,
    z: cz,
    radius,
    depth,
    rimHeight = depth * 0.3,
    glow = 0.8,
  } = opts
  const landform = (x: number, z: number, h: number) => {
    const dx = x - cx
    const dz = z - cz
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d >= radius * 1.25) return h
    const bowl = Math.pow(smooth(1 - d / radius), 1.4)
    // rim: a smooth bump straddling the crest, fading to nothing by 1.25R
    const rt = 1 - Math.abs(d - radius * 0.9) / (radius * 0.35)
    const rim = smooth(rt)
    return h - depth * bowl + rimHeight * rim
  }
  const province = (x: number, z: number) => {
    const dx = x - cx
    const dz = z - cz
    const d = Math.sqrt(dx * dx + dz * dz)
    return glow * smooth(1 - d / (radius * 0.85))
  }
  return { landform, province }
}

export interface PadOptions {
  /** Pad centre (world coords). */
  x: number
  z: number
  /** Radius of the DEAD-FLAT interior (m). */
  radius: number
  /** Pad surface height (m, absolute). */
  level: number
  /** Width of the blended skirt outside the flat interior (m) — the cut/fill
   * slope tying the pad into the terrain. Default `radius * 0.5`. */
  blend?: number
}

/**
 * A construction pad: dead-flat at `level` across the interior, a smooth
 * cut-and-fill skirt tying into the noise terrain beyond — how cities and
 * bases claim ground. No province (pads don't glow); compose several with
 * `composeLandforms` to terrace a settlement up a hillside.
 */
export function pad(
  opts: PadOptions
): (x: number, z: number, h: number) => number {
  const { x: cx, z: cz, radius, level, blend = radius * 0.5 } = opts
  const outer = radius + Math.max(blend, 0.01)
  return (x, z, h) => {
    const dx = x - cx
    const dz = z - cz
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d >= outer) return h
    if (d <= radius) return level
    return h + (level - h) * smooth((outer - d) / (outer - radius))
  }
}

/** Chain landforms left → right (each sees the previous result). */
export function composeLandforms(
  ...fns: Array<(x: number, z: number, h: number) => number>
): (x: number, z: number, h: number) => number {
  return (x, z, h) => {
    let acc = h
    for (const f of fns) acc = f(x, z, acc)
    return acc
  }
}

/** Merge province fields by max — overlapping glows don't sum past 1. */
export function mergeProvinces(
  ...fields: Array<(x: number, z: number) => number>
): (x: number, z: number) => number {
  return (x, z) => {
    let m = 0
    for (const f of fields) {
      const v = f(x, z)
      if (v > m) m = v
    }
    return m
  }
}
