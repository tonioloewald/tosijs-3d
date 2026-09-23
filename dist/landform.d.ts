/**
 * WHERE A FIELD STOPS — the rectangle outside which it is guaranteed inert.
 *
 * Every factory here already knows its own footprint: `volcano({radius})`
 * early-returns `h` past the radius, `gulley` bails outside its corridor. But
 * that knowledge was closed over and thrown away, so the only thing terrain
 * ever received was a bare `(x, z) => number` — and a point sampler cannot
 * answer "does this province touch this tile", which is the question any
 * per-tile decision has to ask first. Tonio: "A province has a natural
 * boundary, right? It just can affect more than one tile."
 *
 * Both halves of that are why this is an AABB in world space rather than a
 * circle: a province spans tiles, so the useful query is rectangle-vs-rectangle
 * against a tile, and an axis-aligned box is the one shape every footprint —
 * disc, oriented corridor, traced polygon — can be reduced to without knowing
 * what it was.
 *
 * ⚠️ AN EXTENT IS A PROMISE, AND A WRONG ONE IS INVISIBLE. Callers are entitled
 * to skip the field entirely outside it, so an extent that is too SMALL silently
 * clips the thing it describes — geometry that simply is not there, with no
 * error. Too large only costs work. When in doubt, round outward.
 */
export interface Extent {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
}
/** A field function that knows where it stops. */
export type Bounded<F> = F & {
    extent: Extent;
};
export type LandformFn = (x: number, z: number, h: number) => number;
export type ProvinceFn = (x: number, z: number) => number;
/** Tag a field with the rectangle outside which it does nothing. */
export declare function withExtent<F extends (...args: never[]) => number>(fn: F, extent: Extent): Bounded<F>;
/** The AABB of a disc — the footprint shape most of these factories have. */
export declare const circleExtent: (x: number, z: number, r: number) => Extent;
/**
 * The AABB of an ORIENTED corridor — `gulley` and `cover` work in (along,
 * lateral) about a heading, so their world footprint is a rotated rectangle and
 * its bounding box is not simply the corridor's own dimensions.
 */
export declare function corridorExtent(x: number, z: number, headingDeg: number, alongMin: number, alongMax: number, halfLateral: number): Extent;
/**
 * The extent a field declares, or `null` for a hand-written closure that
 * declares none. `null` means UNBOUNDED — "I might do something anywhere" — so
 * an unannotated field keeps working exactly as before. Fail-open is the only
 * safe default here: guessing a boundary for a function that never promised one
 * would clip it.
 */
export declare function extentOf(fn: unknown): Extent | null;
/** The smallest box containing both. */
export declare const unionExtent: (a: Extent, b: Extent) => Extent;
/**
 * Could this field do anything inside this rectangle? An unbounded field (no
 * extent) always answers yes, so this is safe to put in front of any sampler.
 *
 * Inclusive on the edges: a field whose footprint exactly abuts a tile still
 * counts, because the shared boundary vertices belong to both.
 */
export declare function touchesExtent(fn: unknown, minX: number, minZ: number, maxX: number, maxZ: number): boolean;
/** A landform + its matching volcanism province, made together. */
export interface AuthoredLandform {
    landform: Bounded<LandformFn>;
    /**
     * The province carries its OWN extent, deliberately not shared with the
     * landform's — the two genuinely differ. A `volcano`'s glow tail dies at
     * `craterRadius + radius * 0.4`, which is well inside the cone for a default
     * crater and OUTSIDE it for a wide one; a crater's glow stops at `0.85 R`
     * while its rim runs to `1.25 R`. One box for both would be wrong in one
     * direction or the other every time.
     */
    province: Bounded<ProvinceFn>;
}
export interface VolcanoOptions {
    /** Vent position (world coords). */
    x: number;
    z: number;
    /** Footprint radius (m) — outside it the terrain is untouched. */
    radius: number;
    /** Edifice height (m) above `baseLevel`. */
    height: number;
    /** The terrain level the cone rises from — the flanks BLEND the noise
     * toward this before adding the cone, so the edifice dominates its local
     * noise instead of riding it. Default 0 (sea level). */
    baseLevel?: number;
    /** Caldera radius (m). Default `radius * 0.22`. */
    craterRadius?: number;
    /** Caldera depth (m) below the rim — the lava pool sits at rim − depth,
     * so a smaller value holds the melt higher in the bowl. Default
     * `height * 0.35`. */
    craterDepth?: number;
    /** How much the flanks suppress the underlying noise (0..1). Default 0.7. */
    flatten?: number;
    /** Province intensity at the vent (0..1 → the volcanism ladder). The glow
     * fades down the flanks and ends before the footprint. Default 1. */
    glow?: number;
}
/**
 * A classic volcano that fades in as an override: smoothstep-blended flanks
 * (C1 at the footprint edge — no seam against the noise terrain), a steepened
 * cone, a caldera sunk below the rim, and a matching province — molten at the
 * vent, glowing seams down the upper flanks, cold voronoi lower, living biome
 * beyond.
 */
export declare function volcano(opts: VolcanoOptions): AuthoredLandform;
export interface CraterOptions {
    /** Impact point (world coords). */
    x: number;
    z: number;
    /** Crater radius (m) — the rim crest sits just inside it. */
    radius: number;
    /** Bowl depth (m) below the original terrain. */
    depth: number;
    /** Raised-rim height (m). Default `depth * 0.3`. */
    rimHeight?: number;
    /** Province intensity at the floor (0..1). ~0.5 reads as cooling ember
     * veins, 1 as a molten floor. Default 0.8. */
    glow?: number;
}
/**
 * An impact/explosion crater: a bowl sunk into the EXISTING terrain (no
 * flattening — the scar inherits the landscape), a raised rim, and a hot
 * floor whose glow fades by the rim. Compose one in at a detonation point
 * and `regenerate()` — the aftermath is two field functions.
 */
export declare function impactCrater(opts: CraterOptions): AuthoredLandform;
export interface PadOptions {
    /** Pad centre (world coords). */
    x: number;
    z: number;
    /** Radius of the DEAD-FLAT interior (m). */
    radius: number;
    /** Pad surface height (m, absolute). */
    level: number;
    /** Width of the blended skirt outside the flat interior (m) — the cut/fill
     * slope tying the pad into the terrain. Default `radius * 0.5`. */
    blend?: number;
}
/**
 * A construction pad: dead-flat at `level` across the interior, a smooth
 * cut-and-fill skirt tying into the noise terrain beyond — how cities and
 * bases claim ground. No province (pads don't glow); compose several with
 * `composeLandforms` to terrace a settlement up a hillside.
 */
export declare function pad(opts: PadOptions): Bounded<LandformFn>;
export interface GulleyOptions {
    /** The FACE: where the cliff stands and the tunnel mouth sits. */
    x: number;
    z: number;
    /** Direction the gulley runs OUT from the face (radians, world XZ). The
     * tunnel drives the opposite way, into the hill. */
    /** Direction the gulley runs, in DEGREES (0 = +x, 90 = +z). */
    heading: number;
    /** Floor width (m) — forced flat across this. */
    width: number;
    /** How far the gulley runs out from the face. */
    length: number;
    /** Floor height at the face (m). ABSOLUTE, not a cut: the floor is this
     * height whether the natural ground was a hill or a hollow. */
    floorY: number;
    /** Height of the forced cliff behind the face (m above the floor). This is
     * what the tunnel mouth is cut into, so it's the number that decides
     * whether the mouth has room. */
    cliffHeight?: number;
    /** Distance over which the cliff rises, going INTO the hill (m). Small =
     * near-vertical. */
    faceRun?: number;
    /** Floor grade going outward (m per m) — 0 is flat, positive climbs out. */
    grade?: number;
    /** Fraction of `length` spent fading back to natural terrain (0..1). */
    fade?: number;
    /** Lateral distance over which the forced floor fades to natural (m). */
    wallFade?: number;
    /** Distance PAST the cliff top over which forcing fades back to the natural
     * surface (m). Too small and the crest is a step you fall off. */
    crestFade?: number;
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
export declare function gulley(opts: GulleyOptions): Bounded<LandformFn>;
export interface CoverOptions {
    /** Start of the corridor (usually the gulley's face). */
    x: number;
    z: number;
    /** Direction the corridor runs, in DEGREES (0 = +x, 90 = +z) — the way the
     * tunnel drives. Was radians until 0.7.0; see the CHANGELOG. */
    heading: number;
    /** Corridor width (m). */
    width: number;
    /** How far along the heading the cover extends (m). */
    length: number;
    /** The ground is forced to AT LEAST this height over the corridor (m). */
    minHeight: number;
    /** Lateral distance over which the forcing fades out (m). */
    fade?: number;
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
export declare function cover(opts: CoverOptions): Bounded<LandformFn>;
/** Chain landforms left → right (each sees the previous result). */
export declare function composeLandforms(...fns: LandformFn[]): LandformFn;
/** Merge province fields by max — overlapping glows don't sum past 1. */
export declare function mergeProvinces(...fields: ProvinceFn[]): ProvinceFn;
//# sourceMappingURL=landform.d.ts.map