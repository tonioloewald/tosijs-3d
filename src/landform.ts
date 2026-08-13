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
  /** Caldera depth (m) below the rim — the lava pool sits at rim − depth,
   * so a smaller value holds the melt higher in the bowl. Default
   * `height * 0.35`. */
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
    craterDepth = height * 0.35,
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

export interface GulleyOptions {
  /** The FACE: where the cliff stands and the tunnel mouth sits. */
  x: number
  z: number
  /** Direction the gulley runs OUT from the face (radians, world XZ). The
   * tunnel drives the opposite way, into the hill. */
  heading: number
  /** Floor width (m) — forced flat across this. */
  width: number
  /** How far the gulley runs out from the face. */
  length: number
  /** Floor height at the face (m). ABSOLUTE, not a cut: the floor is this
   * height whether the natural ground was a hill or a hollow. */
  floorY: number
  /** Height of the forced cliff behind the face (m above the floor). This is
   * what the tunnel mouth is cut into, so it's the number that decides
   * whether the mouth has room. */
  cliffHeight?: number
  /** Distance over which the cliff rises, going INTO the hill (m). Small =
   * near-vertical. */
  faceRun?: number
  /** Floor grade going outward (m per m) — 0 is flat, positive climbs out. */
  grade?: number
  /** Fraction of `length` spent fading back to natural terrain (0..1). */
  fade?: number
  /** Lateral distance over which the forced floor fades to natural (m). */
  wallFade?: number
  /** Distance PAST the cliff top over which forcing fades back to the natural
   * surface (m). Too small and the crest is a step you fall off. */
  crestFade?: number
}

/**
 * A GULLEY: a **height-field FORCING FUNCTION** ending in a predictable cliff
 * — the "friendly geometry to mate with" that makes a tunnel mouth tractable.
 *
 * The distinction that matters, and that the first version got wrong: this
 * FORCES the height rather than cutting it. `min(h, floor)` only lowers ground
 * that was already high, so on a hillside you get a channel and in a hollow
 * you get nothing — the entrance is at the mercy of whatever terrain the seed
 * produced, which is precisely the unpredictability we were trying to escape.
 * Here the floor is `floorY` and the cliff is `cliffHeight` **whatever the
 * natural ground was doing**, so a tunnel author knows the geometry their
 * mouth will meet before they place it.
 *
 * The shape, along the axis:
 *
 * ```
 *      into the hill  |  the face  |        the gulley floor        | ambient
 *   ─────────────────╮|            |                                |
 *    natural terrain  ╲  cliffHeight                                 ╱
 *                      ╲___________|________________________________╱
 *                       ↑ faceRun    floorY, grading out over length
 * ```
 *
 * Forcing fades to the natural surface at the sides (`wallFade`) and at the
 * outer end (`fade`), so the channel joins the landscape instead of ending in
 * a second cliff. Everything outside is untouched, exactly.
 */
export function gulley(
  opts: GulleyOptions
): (x: number, z: number, h: number) => number {
  const { x: fx, z: fz, heading, width, length, floorY } = opts
  const cliffHeight = opts.cliffHeight ?? 45
  const faceRun = Math.max(1e-3, opts.faceRun ?? 18)
  const grade = opts.grade ?? 0
  const fade = Math.min(0.9, Math.max(0.05, opts.fade ?? 0.35))
  const wallFade = Math.max(1e-3, opts.wallFade ?? width * 0.6)
  const crestFade = Math.max(1e-3, opts.crestFade ?? faceRun * 3)
  const cos = Math.cos(heading)
  const sin = Math.sin(heading)
  const halfW = width / 2
  const fadeStart = length * (1 - fade)
  return (x, z, h) => {
    const dx = x - fx
    const dz = z - fz
    const along = dx * cos + dz * sin // + = outward from the face
    const lateral = Math.abs(-dx * sin + dz * cos)
    // Authority fades INTO the hill as well, over `crestFade` beyond the top
    // of the face. Without it the forced cliff-top met natural ground at full
    // authority and simply snapped — a 30m step at the crest, which is a
    // cliff you fall off rather than a rim you fly over.
    if (along < -faceRun - crestFade || along > length) return h
    if (lateral > halfW + wallFade) return h

    // The FORCED profile — a function of position only, never of `h`.
    const forced =
      along >= 0
        ? floorY + grade * along
        : floorY + cliffHeight * smooth(Math.min(1, -along / faceRun))

    // Authority: full across the floor and along the run, fading laterally to
    // the natural surface and easing out at the far end.
    const lateralW =
      lateral <= halfW ? 1 : 1 - smooth((lateral - halfW) / wallFade)
    const alongW =
      along < -faceRun
        ? 1 - smooth((-along - faceRun) / crestFade) // over the crest, into the hill
        : along <= fadeStart
        ? 1
        : 1 - smooth((along - fadeStart) / (length - fadeStart))
    const w = lateralW * alongW
    return h + (forced - h) * w
  }
}

export interface CoverOptions {
  /** Start of the corridor (usually the gulley's face). */
  x: number
  z: number
  /** Direction the corridor runs (radians) — the way the tunnel drives. */
  heading: number
  /** Corridor width (m). */
  width: number
  /** How far along the heading the cover extends (m). */
  length: number
  /** The ground is forced to AT LEAST this height over the corridor (m). */
  minHeight: number
  /** Lateral distance over which the forcing fades out (m). */
  fade?: number
}

/**
 * COVER — force the ground ABOVE a tunnel to be high enough that the tunnel
 * stays buried.
 *
 * This is the other half of making an entrance predictable, and the half the
 * first gulley missed: shaping the ground in FRONT of the face does nothing
 * about the ground OVER the run. Where the natural terrain dips below the
 * tunnel's roof, the tube surfaces — a glancing blow that opens a hole
 * nobody authored, complete with its own seam and its own tile skirts hanging
 * into the tunnel. That is exactly the pathology the gulley was adopted to
 * escape, reappearing 200m further in.
 *
 * `minHeight` should be the tunnel's ceiling plus a few metres of rock, so
 * the tube meets the surface EXACTLY ONCE — at the face, where the geometry
 * is conditioned for it. Raising ground is visually safe: it reads as the
 * hill the tunnel goes through.
 */
export function cover(
  opts: CoverOptions
): (x: number, z: number, h: number) => number {
  const { x: sx, z: sz, heading, width, length, minHeight } = opts
  const fade = Math.max(1e-3, opts.fade ?? width * 0.7)
  const cos = Math.cos(heading)
  const sin = Math.sin(heading)
  const halfW = width / 2
  return (x, z, h) => {
    if (h >= minHeight) return h // already deep enough: nothing to do
    const dx = x - sx
    const dz = z - sz
    const along = dx * cos + dz * sin
    if (along < 0 || along > length) return h
    const lateral = Math.abs(-dx * sin + dz * cos)
    if (lateral > halfW + fade) return h
    // Ease at both ends of the corridor as well as the sides, so the raised
    // ground is a ridge the tunnel runs under — not a wall across the map.
    const lateralW = lateral <= halfW ? 1 : 1 - smooth((lateral - halfW) / fade)
    const endW = 1 - smooth((along - length * 0.75) / (length * 0.25))
    const w = lateralW * Math.max(0, Math.min(1, endW))
    return h + (minHeight - h) * w
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
