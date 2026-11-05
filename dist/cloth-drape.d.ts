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
/** A flat piece: even triangles over a polygon, z = 0, counter-clockwise seen from +Z. */
export declare function flatPiece(poly: ViewPoint[], edge: number): {
    positions: Float32Array;
    triangles: Uint32Array;
    /** 1 on the piece's edge. */
    boundary: Uint8Array;
    /** 1 on the edge where it runs more up and down than across. */
    steep: Uint8Array;
};
/** A draped garment: a cut, and how far its cloth stretched settling. */
export interface DrapedGarment extends GarmentCut {
    /** The longest edge over its length after bridging (1 = none stretched). */
    stretch: number;
}
/** Drape cloth cut to the outlines over the body under `surface` (the tailor's dummy). */
export declare function drapeGarment(surface: Remeshed, body: ArrayLike<number>, options: DrapeOptions): DrapedGarment;
//# sourceMappingURL=cloth-drape.d.ts.map