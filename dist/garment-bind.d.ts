import type { ProxyBinding } from './proxy-fit.js';
import type { RigidParts } from './proxy-rigid.js';
/** The closest point to `p` on triangle abc, as barycentric weights. */
export declare function closestOnTriangle(p: ArrayLike<number>, a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>): [number, number, number];
/**
 * Bind `points` (xyz) to the body (`positions`: every base vertex;
 * `triangles`: the body's, in threes). Returns a binding with one row per
 * point and `source` the identity (the points are the drawn vertices).
 * `rigid` (from `rigidGroups`) makes parts keep their shape.
 */
export declare function bindGarment(positions: ArrayLike<number>, triangles: ArrayLike<number>, points: ArrayLike<number>, rigid?: Omit<RigidParts, 'rest'> | null): ProxyBinding;
//# sourceMappingURL=garment-bind.d.ts.map