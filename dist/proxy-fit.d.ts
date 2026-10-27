import { type RigidParts } from './proxy-rigid.js';
/** A proxy's binding, decoded. */
export interface ProxyBinding {
    /** Rows: one per proxy (OBJ) vertex. */
    rows: number;
    /** Three base vertices per row. */
    ref: Uint32Array;
    /** Their weights. */
    weight: Float32Array;
    /** The offset per row (metres, scaled per axis by `scale`). */
    offset: Float32Array;
    /**
     * Per axis: two base vertices and their distance along that axis on the
     * body the proxy was made on. A body where they are further apart scales
     * the offsets up.
     */
    scale: Partial<Record<'x' | 'y' | 'z', [number, number, number]>>;
    /** The row each drawn vertex is (drawn vertices split at UV seams). */
    source: Uint32Array;
    /** Parts that keep their shape ([proxy-rigid](/proxy-rigid/)). */
    rigid?: RigidParts | null;
}
/** The proxy's rows placed on a body (`positions`: every base vertex, xyz). */
export declare function fitProxy(proxy: ProxyBinding, positions: ArrayLike<number>, into?: Float32Array): Float32Array;
/** Fitted rows expanded to the drawn vertices. */
export declare function drawnPositions(proxy: ProxyBinding, fitted: ArrayLike<number>, into?: Float32Array): Float32Array;
/** Four bone indices and four weights per vertex (Babylon's layout). */
export interface VertexWeights {
    indices: Float32Array;
    weights: Float32Array;
}
/**
 * Weights for every base vertex, from weights on some of them: `known[v]` is
 * the row in `weights` for base vertex `v`, or -1; a vertex without weights
 * takes its nearest weighted neighbour's (at `positions`). Helper vertices
 * (tights, skirt) carry no skin, but clothes bind to them.
 */
export declare function nearestWeights(positions: ArrayLike<number>, known: Int32Array, weights: VertexWeights): VertexWeights;
/**
 * Skin weights for a proxy's drawn vertices: each mixes the weights of its
 * three base vertices by their binding weights, keeping the four strongest
 * bones. `base` has weights for every base vertex (`nearestWeights`).
 */
export declare function proxyWeights(proxy: ProxyBinding, base: VertexWeights): VertexWeights;
/**
 * The body's triangles (in threes, indexing compact vertices whose base
 * vertex is `vertices[i]`) less those touching a `deleted` base vertex.
 */
export declare function coveredTriangles(triangles: ArrayLike<number>, vertices: ArrayLike<number>, deleted: Iterable<number>, 
/** `any`: drop a triangle touching a covered vertex; `all`: only one wholly covered. */
mode?: 'any' | 'all'): Uint32Array;
/**
 * What a hat leaves showing of the hair under it: `triangles` (in threes,
 * indexing `points`, xyz, the same frame as `cover`) less those wholly above
 * the hat's brim and within its reach. Around the hat's axis, in
 * `sectors` directions, the brim's height is its lowest vertex there and its
 * reach its widest, so a tilted brim (a fedora's) is followed. Hair below
 * the brim, at the sides and back and in long styles, stays.
 */
export declare function underCover(cover: ArrayLike<number>, points: ArrayLike<number>, triangles: ArrayLike<number>, sectors?: number, 
/** Positions to tuck in place (usually `points` itself, as a Float32Array). */
tuck?: Float32Array): Uint32Array;
/**
 * The body clothes are fitted over: `positions` (every base vertex, xyz) with
 * the vertices `mask` marks (0..1 each) relaxed toward their neighbours, as
 * cloth stretched over them would lie. Unmarked vertices stay put, so the
 * relaxed patch meets the body at its edge. A new array; the skin keeps the
 * shape it had. `bridge` (0..1) lets thicker cloth flatten the curve too.
 */
export declare function smoothUnder(positions: ArrayLike<number>, triangles: ArrayLike<number>, mask: ArrayLike<number>, options?: {
    passes?: number;
    bridge?: number;
}): Float32Array;
/**
 * Push `positions` (xyz, in place) out from `centre` by `by` metres: a hat
 * made for a bare head, worn over hair, sits a little larger.
 */
export declare function inflate(positions: Float32Array, centre: {
    x: number;
    y: number;
    z: number;
}, by: number): Float32Array;
/**
 * How a proxy's drawn vertices move when the body's vertices move by `delta`
 * (xyz per base vertex): the binding's weights applied to the movement (the
 * offsets' scale is left as it was; an expression barely changes it).
 */
export declare function proxyDelta(proxy: ProxyBinding, delta: ArrayLike<number>): Float32Array;
/**
 * Which of a body's vertices a garment covers, by geometry: a body vertex is
 * covered when some garment vertex lies just outside it, within `reach`
 * metres along its outward normal (and within `reach / 2` of that line). For
 * garments whose own covered list is short or missing, so the skin under them
 * can be tucked away. Returns, per body vertex, how far out the garment is
 * (Infinity where it does not cover). All positions in one frame.
 */
export declare function coveredBy(body: ArrayLike<number>, normals: ArrayLike<number>, garment: ArrayLike<number>, reach?: number): Float32Array;
//# sourceMappingURL=proxy-fit.d.ts.map