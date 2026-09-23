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

```javascript
const vesuvius = volcano({ x: 45, z: -25, radius: 55, height: 24, baseLevel: 5 })
terrain.landform = vesuvius.landform
terrain.provinceField = vesuvius.province
terrain.regenerate()
```

> Shown, not run — it needs a `terrain` from the surrounding scene. The doc
> system executes ```` ```js ````, ```` ```ts ```` and ```` ```tjs ```` fences as
> LIVE examples, so an illustrative fragment in one of those renders as a broken
> demo. ```` ```javascript ```` is the fence for "read this, don't run it".
> A working landform is on the [[sdf-lattice]] page, where `volcano` builds the
> cone you can cut open.

And a runtime explosion is the same move with the other factory — stamp an
`impactCrater` at the hit point, compose it in, `regenerate()`: a glowing
crater with almost no effort. `pad` is the same idea for CIVILIZATION — a
dead-flat surface with a cut-and-fill skirt, which is how cities and bases
claim ground (terrace several up a hillside with `composeLandforms`).
`composeLandforms` chains shapes; `mergeProvinces` maxes glow fields.

## A field knows where it stops

Every factory here returns a field tagged with an **`extent`** — the world-space
AABB outside which it is inert. A province has a natural boundary; it just
spans more than one tile, so the question a tile has to ask is
rectangle-vs-rectangle:

```javascript
const vesuvius = volcano({ x: 45, z: -25, radius: 55, height: 24 })
extentOf(vesuvius.province)                     // {minX, minZ, maxX, maxZ}
touchesExtent(vesuvius.province, x0, z0, x1, z1) // does it reach this tile?
```

It exists because a bare `(x, z) => number` cannot be asked that. The footprint
was always known — `volcano({radius})` early-returns past its radius — and it
was closed over and discarded, so terrain sampled every province at every vertex
of every tile in the world. `b3d-terrain` now skips a province that cannot reach
the tile it is building, which is exactly equivalent (the alpha lane is already
`1` = none, and the field returns `0` out there) and is the same test a per-tile
decision like an ice underside needs.

**The landform and the province carry SEPARATE extents**, because they genuinely
differ: a volcano's glow tail dies at `craterRadius + radius * 0.4` — inside the
cone for a default crater and *outside* it for a wide caldera — while a crater's
glow stops at `0.85 R` and its rim runs to `1.25 R`. One box for both is wrong
in one direction or the other every time.

⚠️ **An extent is a promise, and a wrong one is invisible.** Callers may skip the
field entirely outside it, so an extent that is too SMALL clips the thing it
describes with no error; too large only costs work. A hand-written closure that
declares none is treated as unbounded and behaves exactly as it always did — and
one unbounded member makes a whole `mergeProvinces`/`composeLandforms`
unbounded, because a box around only the members that declared one is a promise
nobody made.
*/
/*{ "parent": "environment" }*/
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => {
    const c = clamp01(t);
    return c * c * (3 - 2 * c);
};
/** Tag a field with the rectangle outside which it does nothing. */
export function withExtent(fn, extent) {
    return Object.assign(fn, { extent });
}
/** The AABB of a disc — the footprint shape most of these factories have. */
export const circleExtent = (x, z, r) => ({
    minX: x - r,
    minZ: z - r,
    maxX: x + r,
    maxZ: z + r,
});
/**
 * The AABB of an ORIENTED corridor — `gulley` and `cover` work in (along,
 * lateral) about a heading, so their world footprint is a rotated rectangle and
 * its bounding box is not simply the corridor's own dimensions.
 */
export function corridorExtent(x, z, headingDeg, alongMin, alongMax, halfLateral) {
    const a = headingDeg * (Math.PI / 180);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const ax0 = alongMin * cos;
    const ax1 = alongMax * cos;
    const az0 = alongMin * sin;
    const az1 = alongMax * sin;
    const padX = halfLateral * Math.abs(sin);
    const padZ = halfLateral * Math.abs(cos);
    return {
        minX: x + Math.min(ax0, ax1) - padX,
        maxX: x + Math.max(ax0, ax1) + padX,
        minZ: z + Math.min(az0, az1) - padZ,
        maxZ: z + Math.max(az0, az1) + padZ,
    };
}
/**
 * The extent a field declares, or `null` for a hand-written closure that
 * declares none. `null` means UNBOUNDED — "I might do something anywhere" — so
 * an unannotated field keeps working exactly as before. Fail-open is the only
 * safe default here: guessing a boundary for a function that never promised one
 * would clip it.
 */
export function extentOf(fn) {
    const e = fn?.extent;
    return e != null &&
        typeof e.minX === 'number' &&
        typeof e.maxX === 'number' &&
        typeof e.minZ === 'number' &&
        typeof e.maxZ === 'number'
        ? e
        : null;
}
/** The smallest box containing both. */
export const unionExtent = (a, b) => ({
    minX: Math.min(a.minX, b.minX),
    minZ: Math.min(a.minZ, b.minZ),
    maxX: Math.max(a.maxX, b.maxX),
    maxZ: Math.max(a.maxZ, b.maxZ),
});
/**
 * Could this field do anything inside this rectangle? An unbounded field (no
 * extent) always answers yes, so this is safe to put in front of any sampler.
 *
 * Inclusive on the edges: a field whose footprint exactly abuts a tile still
 * counts, because the shared boundary vertices belong to both.
 */
export function touchesExtent(fn, minX, minZ, maxX, maxZ) {
    const e = extentOf(fn);
    if (e == null)
        return true;
    return e.minX <= maxX && e.maxX >= minX && e.minZ <= maxZ && e.maxZ >= minZ;
}
/**
 * A classic volcano that fades in as an override: smoothstep-blended flanks
 * (C1 at the footprint edge — no seam against the noise terrain), a steepened
 * cone, a caldera sunk below the rim, and a matching province — molten at the
 * vent, glowing seams down the upper flanks, cold voronoi lower, living biome
 * beyond.
 */
export function volcano(opts) {
    const { x: cx, z: cz, radius, height, baseLevel = 0, craterRadius = radius * 0.22, craterDepth = height * 0.35, flatten = 0.7, glow = 1, } = opts;
    const landform = (x, z, h) => {
        const dx = x - cx;
        const dz = z - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d >= radius)
            return h;
        // The edifice profile holds its RIM value across the crater interior
        // (dc clamp), so the caldera floor is genuinely level — a basin, not a
        // funnel; the pool needs somewhere flat to sit. The crater term then
        // sinks a flat floor (full depth out to ~0.55 crater radii, wall to rim).
        const dc = Math.max(d, craterRadius);
        const dome = smooth(1 - dc / radius);
        const cone = Math.pow(dome, 1.6);
        const crater = smooth((craterRadius - d) / (craterRadius * 0.45));
        const based = h + (baseLevel - h) * dome * clamp01(flatten);
        return based + height * cone - craterDepth * crater;
    };
    const province = (x, z) => {
        const dx = x - cx;
        const dz = z - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        // The ladder lands where a volcano keeps it: full intensity (pools)
        // ONLY on the flat caldera floor; the crater WALL and rim drop to half
        // (glowing seams — crusted, never open lava, so the rim can't read as
        // molten even where smoothed shading normals under-report steepness);
        // outside, a long low tail (cold voronoi) down the flank.
        const floorR = craterRadius * 0.55;
        if (d <= floorR)
            return glow;
        const wall = smooth(1 - (d - floorR) / (craterRadius - floorR));
        const past = Math.max(0, d - craterRadius);
        const tail = smooth(1 - past / (radius * 0.4));
        return glow * (0.5 + 0.5 * wall) * tail;
    };
    return {
        landform: withExtent(landform, circleExtent(cx, cz, radius)),
        // The glow tail reaches `craterRadius + radius * 0.4`, NOT `radius`. With
        // the default crater (0.22 R) that is 0.62 R — comfortably inside the cone
        // — but `craterRadius` is an option, and a wide caldera pushes the tail
        // past the edifice. Derived rather than assumed, so it stays right when
        // someone authors a crater that is most of the mountain.
        province: withExtent(province, circleExtent(cx, cz, craterRadius + radius * 0.4)),
    };
}
/**
 * An impact/explosion crater: a bowl sunk into the EXISTING terrain (no
 * flattening — the scar inherits the landscape), a raised rim, and a hot
 * floor whose glow fades by the rim. Compose one in at a detonation point
 * and `regenerate()` — the aftermath is two field functions.
 */
export function impactCrater(opts) {
    const { x: cx, z: cz, radius, depth, rimHeight = depth * 0.3, glow = 0.8, } = opts;
    const landform = (x, z, h) => {
        const dx = x - cx;
        const dz = z - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d >= radius * 1.25)
            return h;
        const bowl = Math.pow(smooth(1 - d / radius), 1.4);
        // rim: a smooth bump straddling the crest, fading to nothing by 1.25R
        const rt = 1 - Math.abs(d - radius * 0.9) / (radius * 0.35);
        const rim = smooth(rt);
        return h - depth * bowl + rimHeight * rim;
    };
    const province = (x, z) => {
        const dx = x - cx;
        const dz = z - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        return glow * smooth(1 - d / (radius * 0.85));
    };
    return {
        // The rim fades to nothing by 1.25 R — the bowl is only the inner part.
        landform: withExtent(landform, circleExtent(cx, cz, radius * 1.25)),
        // The floor glow is gone by 0.85 R, well before the rim.
        province: withExtent(province, circleExtent(cx, cz, radius * 0.85)),
    };
}
/**
 * A construction pad: dead-flat at `level` across the interior, a smooth
 * cut-and-fill skirt tying into the noise terrain beyond — how cities and
 * bases claim ground. No province (pads don't glow); compose several with
 * `composeLandforms` to terrace a settlement up a hillside.
 */
export function pad(opts) {
    const { x: cx, z: cz, radius, level, blend = radius * 0.5 } = opts;
    const outer = radius + Math.max(blend, 0.01);
    return withExtent((x, z, h) => {
        const dx = x - cx;
        const dz = z - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d >= outer)
            return h;
        if (d <= radius)
            return level;
        return h + (level - h) * smooth((outer - d) / (outer - radius));
    }, 
    // The skirt, not the flat interior — a pad claims ground out to `outer`.
    circleExtent(cx, cz, outer));
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
export function gulley(opts) {
    const { x: fx, z: fz, heading: headingDeg, width, length, floorY } = opts;
    const heading = headingDeg * (Math.PI / 180);
    const cliffHeight = opts.cliffHeight ?? 45;
    const faceRun = Math.max(1e-3, opts.faceRun ?? 18);
    const grade = opts.grade ?? 0;
    const fade = Math.min(0.9, Math.max(0.05, opts.fade ?? 0.35));
    const wallFade = Math.max(1e-3, opts.wallFade ?? width * 0.6);
    const crestFade = Math.max(1e-3, opts.crestFade ?? faceRun * 3);
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const halfW = width / 2;
    const fadeStart = length * (1 - fade);
    /*
    The corridor's own two bail-outs ARE its footprint, read straight off the
    guards below: `along` outside [-faceRun - crestFade, length], or `lateral`
    past `halfW + wallFade`. Taking the numbers from the same expressions the
    code tests against is the point — an extent maintained separately from the
    guard it describes is an extent that goes stale the first time someone tunes
    a fade.
    */
    return withExtent((x, z, h) => {
        const dx = x - fx;
        const dz = z - fz;
        const along = dx * cos + dz * sin; // + = outward from the face
        const lateral = Math.abs(-dx * sin + dz * cos);
        // Authority fades INTO the hill as well, over `crestFade` beyond the top
        // of the face. Without it the forced cliff-top met natural ground at full
        // authority and simply snapped — a 30m step at the crest, which is a
        // cliff you fall off rather than a rim you fly over.
        if (along < -faceRun - crestFade || along > length)
            return h;
        if (lateral > halfW + wallFade)
            return h;
        // The FORCED profile — a function of position only, never of `h`.
        const forced = along >= 0
            ? floorY + grade * along
            : floorY + cliffHeight * smooth(Math.min(1, -along / faceRun));
        // Authority: full across the floor and along the run, fading laterally to
        // the natural surface and easing out at the far end.
        const lateralW = lateral <= halfW ? 1 : 1 - smooth((lateral - halfW) / wallFade);
        const alongW = along < -faceRun
            ? 1 - smooth((-along - faceRun) / crestFade) // over the crest, into the hill
            : along <= fadeStart
                ? 1
                : 1 - smooth((along - fadeStart) / (length - fadeStart));
        const w = lateralW * alongW;
        return h + (forced - h) * w;
    }, corridorExtent(fx, fz, headingDeg, -faceRun - crestFade, length, halfW + wallFade));
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
export function cover(opts) {
    const { x: sx, z: sz, heading: headingDeg, width, length, minHeight } = opts;
    const heading = headingDeg * (Math.PI / 180);
    const fade = Math.max(1e-3, opts.fade ?? width * 0.7);
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const halfW = width / 2;
    return withExtent((x, z, h) => {
        if (h >= minHeight)
            return h; // already deep enough: nothing to do
        const dx = x - sx;
        const dz = z - sz;
        const along = dx * cos + dz * sin;
        if (along < 0 || along > length)
            return h;
        const lateral = Math.abs(-dx * sin + dz * cos);
        if (lateral > halfW + fade)
            return h;
        // Ease at both ends of the corridor as well as the sides, so the raised
        // ground is a ridge the tunnel runs under — not a wall across the map.
        const lateralW = lateral <= halfW ? 1 : 1 - smooth((lateral - halfW) / fade);
        const endW = 1 - smooth((along - length * 0.75) / (length * 0.25));
        const w = lateralW * Math.max(0, Math.min(1, endW));
        return h + (minHeight - h) * w;
    }, 
    // `along` runs 0..length from the mouth; `lateral` reaches halfW + fade.
    corridorExtent(sx, sz, headingDeg, 0, length, halfW + fade));
}
/** Chain landforms left → right (each sees the previous result). */
export function composeLandforms(...fns) {
    const composed = (x, z, h) => {
        let acc = h;
        for (const f of fns)
            acc = f(x, z, acc);
        return acc;
    };
    return carryExtent(composed, fns);
}
/**
 * The union of the inputs' extents — or NO extent if any input lacks one.
 *
 * The asymmetry is the whole point and it is not conservatism for its own sake:
 * one unbounded member makes the composition unbounded, because a box drawn
 * around the members that *did* declare one would be a promise nobody made.
 * Returning nothing is honest and merely forfeits the optimisation; returning
 * the partial union would clip whatever the unannotated field was doing
 * outside it, invisibly.
 */
function carryExtent(fn, parts) {
    let acc = null;
    for (const p of parts) {
        const e = extentOf(p);
        if (e == null)
            return fn;
        acc = acc == null ? e : unionExtent(acc, e);
    }
    return acc == null ? fn : withExtent(fn, acc);
}
/** Merge province fields by max — overlapping glows don't sum past 1. */
export function mergeProvinces(...fields) {
    const merged = (x, z) => {
        let m = 0;
        for (const f of fields) {
            const v = f(x, z);
            if (v > m)
                m = v;
        }
        return m;
    };
    return carryExtent(merged, fields);
}
//# sourceMappingURL=landform.js.map