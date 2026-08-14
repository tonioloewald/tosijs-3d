/**
 * A volumetric patch: given a world point and the density there so far, return
 * the new density. Negative is solid (see [[sdf-lattice]]); returning `d`
 * unchanged is the identity, which is what a patch must do everywhere outside
 * its own footprint.
 */
export type PatchField = (x: number, y: number, z: number, d: number) => number;
/** Signed distance in the XZ plane — **negative inside** the footprint. */
export type Footprint = (x: number, z: number) => number;
/**
 * The terrain's own density from its height sampler: positive in the air,
 * negative in the rock, zero at the surface. Pass the SAME `heightAt` the tiles
 * are built from (landform-composed, origin-stable) — that identity is what
 * keeps a patch's mouth on the actual ground.
 */
export declare function terrainDensity(heightAt: (x: number, z: number) => number): (x: number, y: number, z: number) => number;
/** Chain patches left → right (each sees the previous result), mirroring
 * `composeLandforms`. */
export declare function composePatches(...patches: PatchField[]): PatchField;
/** A circular footprint (the common case: a vent, a shaft, a chamber). */
export declare function circleFootprint(cx: number, cz: number, radius: number): Footprint;
/**
 * Confine a patch to a footprint and make its rim converge onto the terrain.
 *
 * - **Outside** the footprint the patch is the identity: untouched terrain, so
 *   a patch can never quietly modify ground far from itself.
 * - **Across the margin band** (the last `margin` metres inside the edge) the
 *   density blends from the terrain's own — offset down by `tuck` — to the
 *   patch's. The extracted surface therefore *arrives at* the heightfield
 *   rather than near it, and arrives just below it.
 * - **Inside** the band the patch has full authority.
 *
 * `margin` should be at least a lattice spacing or two: the blend has to be
 * resolvable by the extraction lattice, or the convergence happens between
 * samples and the guarantee evaporates.
 */
export declare function marginBlend(patch: PatchField, footprint: Footprint, margin: number, tuck?: number): PatchField;
//# sourceMappingURL=patch-field.d.ts.map