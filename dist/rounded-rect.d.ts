export interface RoundedRectOptions {
    width: number;
    height: number;
    /**
     * Corner radius in the same units as width/height. Clamped to half the
     * shorter side — a radius larger than that has no meaning, and clamping
     * yields a stadium/circle rather than self-intersecting garbage.
     */
    radius?: number;
    /** Segments per corner arc. Default 6 — smooth at panel scale. */
    cornerSegments?: number;
}
export interface RoundedRectGeometry {
    positions: number[];
    indices: number[];
    uvs: number[];
    normals: number[];
}
/**
 * Vertices for a rounded rectangle in the XY plane, facing +Z, centred on the
 * origin.
 *
 * Returns plain arrays so this stays testable without an engine — the Babylon
 * bridge is `createRoundedPlane` in `make-mesh`.
 */
export declare function roundedRectGeometry(opts: RoundedRectOptions): RoundedRectGeometry;
/**
 * Total signed area of the triangulation — sign is the winding.
 *
 * Exported because winding is what silently renders a panel INVISIBLE rather
 * than wrong-looking, and because summing the triangles (rather than walking an
 * outline) keeps working whatever the decomposition is. The first version
 * assumed a fan and would have quietly measured nonsense the moment the
 * triangulation changed — which it then did.
 */
export declare function signedArea(positions: number[], indices: number[]): number;
//# sourceMappingURL=rounded-rect.d.ts.map