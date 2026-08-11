/** A landform + its matching volcanism province, made together. */
export interface AuthoredLandform {
    landform: (x: number, z: number, h: number) => number;
    province: (x: number, z: number) => number;
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
export declare function pad(opts: PadOptions): (x: number, z: number, h: number) => number;
/** Chain landforms left → right (each sees the previous result). */
export declare function composeLandforms(...fns: Array<(x: number, z: number, h: number) => number>): (x: number, z: number, h: number) => number;
/** Merge province fields by max — overlapping glows don't sum past 1. */
export declare function mergeProvinces(...fields: Array<(x: number, z: number) => number>): (x: number, z: number) => number;
//# sourceMappingURL=landform.d.ts.map