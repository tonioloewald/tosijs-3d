export interface XrVec {
    x: number;
    y: number;
    z: number;
}
/** Where the viewer is: the rig's position, its turn about +Y, its scale. */
export interface XrViewer {
    position: XrVec;
    /** Radians about +Y (Babylon's `rotation.y`). */
    yaw: number;
    /** World units per real metre. */
    scale: number;
}
/**
 * A point in the room (real metres, the rig's own frame) to the world, for a
 * viewer. Babylon's turn about +Y: x' = x cos + z sin, z' = -x sin + z cos.
 */
export declare function roomToWorld(viewer: XrViewer, room: XrVec): XrVec;
/** The inverse of `roomToWorld`. */
export declare function worldToRoom(viewer: XrViewer, world: XrVec): XrVec;
/** One hand: the viewer moved (same turn and scale) so `held` is at `hand`. */
export declare function grabOne(viewer: XrViewer, held: XrVec, hand: XrVec): XrViewer;
export interface GrabLimits {
    /** Smallest scale (world units per metre). */
    minScale?: number;
    /** Largest scale. */
    maxScale?: number;
}
/**
 * Two hands: the viewer whose hands (room points `a`, `b`) hold the world
 * points `heldA`, `heldB`. Scale from the spreads, turn from the lines seen
 * from above, position from the midpoints. Hands closer than 2 cm keep the
 * viewer's scale and turn (no spread to read).
 */
export declare function grabTwo(viewer: XrViewer, heldA: XrVec, heldB: XrVec, a: XrVec, b: XrVec, limits?: GrabLimits): XrViewer;
/**
 * The viewer that shows `centre` a step ahead of the eye, `radius` world units
 * as `across` metres (default 0.75: a thing a metre and a half wide), with
 * the eye `above` metres over it. `eye` is the head in the room (metres),
 * `facing` the head's yaw in the room (radians, Babylon's convention: 0 looks
 * along +Z). The viewer keeps its turn.
 */
export declare function frameViewer(viewer: XrViewer, centre: XrVec, radius: number, eye: XrVec, facing: number, opts?: {
    across?: number;
    distance?: number;
    above?: number;
}): XrViewer;
//# sourceMappingURL=xr-grab.d.ts.map