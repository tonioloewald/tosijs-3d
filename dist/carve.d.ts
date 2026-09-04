import type { PatchField } from './patch-field.js';
/** Signed distance to a carved surface — **positive inside the air**. */
export type Carve = (x: number, y: number, z: number) => number;
export interface Vec3Like {
    x: number;
    y: number;
    z: number;
}
/** Turn a carve into a patch field: the air wins wherever it reaches. */
export declare function applyCarve(carve: Carve): PatchField;
/** A spherical chamber. */
export declare function sphere(centre: Vec3Like, radius: number): Carve;
/**
 * A CAPSULE — a segment with a radius, and the workhorse of tunnel carving:
 * exact distance, no hollow spots at the joins, and it bends by chaining.
 * `radiusB` tapers toward the far end (default: uniform).
 */
export declare function capsule(a: Vec3Like, b: Vec3Like, radius: number, radiusB?: number): Carve;
/** A polyline spine of capsules — a passage that bends. `radii` may give one
 * radius per point (tapering between them); a single number is uniform. */
export declare function tube(points: Vec3Like[], radii: number | number[]): Carve;
/** A rounded box — a hewn chamber, a hangar, anything that reads as BUILT. */
export declare function box(centre: Vec3Like, half: Vec3Like, rounding?: number): Carve;
/** Hard union (max on this convention): the air of both. */
export declare function union(...carves: Carve[]): Carve;
/**
 * SMOOTH union — the one that makes junctions look excavated instead of
 * assembled. `k` is the blend radius in metres: where two carves meet within
 * `k` of each other the surface fillets, so a passage flares into a chamber.
 * A hard `union` leaves a visible crease exactly where the eye goes.
 */
export declare function smoothUnion(k: number, ...carves: Carve[]): Carve;
/** Cut `b` OUT of `a` (a pillar in a hall, rock left standing in a bore). */
export declare function subtract(a: Carve, b: Carve): Carve;
/** Keep only where both reach — a passage clipped to a region. */
export declare function intersect(a: Carve, b: Carve): Carve;
export interface NoiseOptions {
    /** Displacement in METRES. */
    amp: number;
    /** Frequency in 1/metres — SMALL numbers make BIG features. */
    scale: number;
    octaves?: number;
    seed?: number;
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
export declare function roughen(carve: Carve, opts: NoiseOptions): Carve;
/**
 * WARP — bend the space the shape lives in, so a straight tube meanders and a
 * sphere becomes a cavern. This is what stops carves reading as primitives at
 * all; `roughen` textures a cylinder, `warp` stops it being one.
 *
 * Three noise lookups per sample (one per axis), and it MOVES the surface — a
 * warped passage's clearance and even its route must be re-checked rather than
 * assumed. Keep `amp` well under the passage radius unless you want a maze.
 */
export declare function warp(carve: Carve, opts: NoiseOptions): Carve;
/**
 * FLANGE — widen a depth-relative carve as it nears the surface, so a tunnel
 * mouth splays outward instead of arriving as a pipe end.
 *
 * This is the tunnel half of making a mouth work: the terrain's hole folds a
 * collar DOWN into the opening (b3d-terrain's `rimCollar`) while the tunnel
 * flares UP to meet it, so the two OVERLAP. A grid-cut hole and an
 * SDF-extracted tube can never agree on a boundary exactly — one is quantised
 * to quads, the other to a lattice — so the only robust answer is for each to
 * hide the other's excess.
 *
 * `over` is how many metres below the surface the flare is spent; `extra` is
 * how much wider it gets at the top.
 */
export declare function flange(carve: (x: number, y: number, z: number, d: number) => number, over?: number, extra?: number): (x: number, y: number, z: number, d: number) => number;
/**
 * A vertical shaft from the surface down. Written in DEPTH — `0` is the
 * ground, positive numbers go down — because a shaft follows the hillside it's
 * sunk into (see `b3d-patch`, whose `d` is depth below ground).
 *
 * Shafts are enormous or gently sloped, never narrow pipes: `radius` is the
 * whole point, and `lean` slides the bottom sideways so it isn't a plumb line.
 */
export declare function shaft(x0: number, z0: number, radius: number, depth: number, lean?: Vec3Like): (x: number, y: number, z: number, d: number) => number;
//# sourceMappingURL=carve.d.ts.map