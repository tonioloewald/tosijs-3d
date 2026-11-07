import type { GarmentCut, ViewPoint } from './garment-cut.js';
import { type Remeshed } from './remesh.js';
export interface DrapeOptions {
    /** Closed polygons in the front view, `[x, y]` in the body's frame (left is +X). */
    front: ViewPoint[][];
    /** How far the cloth stands off the skin, metres. Default 5 mm. */
    thickness?: number;
    /** The cloth's edge length, metres. Default 2 cm. */
    edge?: number;
    /** Passes pulling the cloth taut over hollows. Default 20. */
    bridge?: number;
    /** Steps of settling under gravity. Default 40. */
    steps?: number;
    /** UV scale: texture repeats per metre in the front view. Default 1. */
    uvScale?: number;
}
/** How far an outline's edge may run from the body's rim (an arm's top, a hip's side) and still be sewn over it, metres. */
export declare const OVER_REACH = 0.025;
/**
 * Where a point on an outline's edge runs along the body's RIM in the front
 * view (the top of an arm or a shoulder, the side of a hip or a thigh),
 * within `reach` straight out from the piece: that rim point, else null. A
 * drape SEWS its front and back there and pins the seam over the body;
 * otherwise the pieces are hung on the front and the back of the limb and
 * nothing crosses it. An edge that crosses the body (a neckline across the
 * chest, a waist, a hem across the thighs) finds no rim ahead of it and stays
 * open. `covered` is the body's front view, `inside` the piece's outline.
 */
export declare function rimSeam(covered: (x: number, y: number) => boolean, inside: (x: number, y: number) => boolean, x: number, y: number, step: number, reach?: number): {
    x: number;
    y: number;
    out: [number, number];
} | null;
/** Inside a polygon (even-odd). */
export declare function insidePolygon(poly: ViewPoint[], x: number, y: number): boolean;
/** A flat pattern piece (see `flatPiece`). */
export interface FlatPiece {
    positions: Float32Array;
    triangles: Uint32Array;
    /** 1 on the piece's edge. */
    boundary: Uint8Array;
    /** 1 on the edge where it runs more up and down than across. */
    steep: Uint8Array;
}
/** A flat piece: even triangles over a polygon, z = 0, counter-clockwise seen from +Z. */
export declare function flatPiece(poly: ViewPoint[], edge: number): FlatPiece;
/** A draped garment: a cut, and how far its cloth stretched settling. */
export interface DrapedGarment extends GarmentCut {
    /** The longest edge over its length after bridging (1 = none stretched). */
    stretch: number;
}
/** Drape cloth cut to the outlines over the body under `surface` (the tailor's dummy). */
export declare function drapeGarment(surface: Remeshed, body: ArrayLike<number>, options: DrapeOptions): DrapedGarment;
/**
 * The same drape, in time slices so a page stays responsive: about `sliceMs`
 * of work, then the rest after the next task. `signal` stops it (the promise
 * rejects with an `AbortError`), which is how an editor drops a drape the
 * next edit has made stale.
 */
export declare function drapeGarmentAsync(surface: Remeshed, body: ArrayLike<number>, options: DrapeOptions, run?: SlicedRun): Promise<DrapedGarment>;
/** How a stepped job is run in slices: stopped by `signal`, about `sliceMs` of work at a time. */
export interface SlicedRun {
    signal?: AbortSignal;
    sliceMs?: number;
}
/**
 * Any stepped job (a generator that yields between pieces of work, such as
 * `drapeSteps` or remesh's `remeshSteps`) run in time slices: about `sliceMs`
 * of it, then the rest after the next task. `signal` stops it (the promise
 * rejects with an `AbortError`).
 */
export declare function runSliced<T>(steps: Generator<void, T, void>, run?: SlicedRun): Promise<T>;
/**
 * The drape as steps: it yields between passes (a fraction of a millisecond
 * to a few each), so a caller can stop or spread it. `drapeGarment` runs it
 * through; `drapeGarmentAsync` runs it in slices.
 */
export declare function drapeSteps(surface: Remeshed, body: ArrayLike<number>, options: DrapeOptions): Generator<void, DrapedGarment, void>;
//# sourceMappingURL=cloth-drape.d.ts.map