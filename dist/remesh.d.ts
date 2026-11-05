import { type MeshSdf } from './mesh-sdf.js';
export interface RemeshOptions {
    /** The edge length to aim for where the surface is flat enough, metres. */
    edge: number;
    /**
     * Where the body is thin, the edge length per metre of its radius there:
     * 0.8 puts about eight edges round a finger. 0 makes every edge `edge`.
     */
    perRadius?: number;
    /** The shortest edge a thin part may ask for. Default `edge / 5`. */
    minEdge?: number;
    /** Passes of split, collapse, flip, relax and project. Default 6. */
    iterations?: number;
}
/** Where a point is on the original surface: a triangle's three vertices and weights. */
export interface SurfacePoint {
    ref: [number, number, number];
    weight: [number, number, number];
}
export interface Remeshed {
    positions: Float32Array;
    triangles: Uint32Array;
    /** Each vertex's original triangle (three original vertex indices per vertex). */
    ref: Uint32Array;
    /** Its barycentric weights on that triangle. */
    weight: Float32Array;
    /** Any point onto the original surface. */
    project(x: number, y: number, z: number): SurfacePoint;
}
/** The nearest point to p on triangle abc, as barycentric weights (Ericson). */
export declare function closestBarycentric(px: number, py: number, pz: number, P: ArrayLike<number>, a: number, b: number, c: number): [number, number, number];
/** A projector onto a mesh: nearest triangle, then the nearest point on it. */
export declare function surfaceProjector(positions: ArrayLike<number>, triangles: ArrayLike<number>, sdf?: MeshSdf): (x: number, y: number, z: number) => SurfacePoint;
/** Isotropic remeshing of a triangle mesh onto itself. */
export declare function remesh(positions: ArrayLike<number>, triangles: ArrayLike<number>, options: RemeshOptions): Remeshed;
//# sourceMappingURL=remesh.d.ts.map