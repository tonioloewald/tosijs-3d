/*
PENETRATION: how much of a garment (or hair) lies inside the body.

Two measures, both per fitted vertex:

- RAW: the vertex is inside the bare skin by more than `tolerance`. This is
  the geometric fact, whatever the renderer hides.
- VISIBLE: the vertex is inside the skin deeper than the skin is tucked
  there, so the skin would show through the cloth. The character builder hides skin
  under clothes (`coverBody`): triangles whose three vertices a garment
  lists as covered are dropped, listed vertices are drawn in by 6 mm, and
  skin a wrapping garment covers by geometry by 4 to 10 mm. The depths are
  proxy-cover's own (`coverDepths`, without the fade at the edge of the
  covered patch, so it is slightly generous there); the tuck at a point is
  the shallowest of its nearest triangle's three.

Pure; positions in the pack's frame (metres).
*/
import { BODY_WRAPPING_SLOTS, coverDepths } from './proxy-cover.js';
/** coverBody's tuck for listed (deleted) skin, metres. */
export const LISTED_TUCK = 0.006;
/** Slots whose garments wrap the body, so coverBody tucks what they cover. */
export const WRAPPING_SLOTS = BODY_WRAPPING_SLOTS;
/**
 * How deep the character builder tucks each body vertex under a garment, metres (before
 * coverBody's fade; see `triangleTuck` for the triangles it drops).
 * `positions`, `normals`: every pack vertex; `drawn`: the garment as fitted.
 */
export function tuckDepths(positions, normals, garment, drawn) {
    return coverDepths(positions, normals, [{ ...garment, drawn }], {
        tuck: LISTED_TUCK,
    }).depth;
}
/**
 * Per body triangle, how deep the skin there is tucked: Infinity when all
 * three of its vertices are listed as covered (coverBody drops it), else
 * the shallowest of its vertices' tucks.
 */
export function triangleTuck(triangles, depth, deleted) {
    const nt = triangles.length / 3;
    const out = new Float32Array(nt);
    const del = new Uint8Array(depth.length);
    if (deleted)
        for (const v of deleted)
            del[v] = 1;
    for (let t = 0; t < nt; t++) {
        const a = triangles[t * 3];
        const b = triangles[t * 3 + 1];
        const c = triangles[t * 3 + 2];
        out[t] =
            del[a] && del[b] && del[c]
                ? Infinity
                : Math.min(depth[a], depth[b], depth[c]);
    }
    return out;
}
/** Per point, 1 where it is visibly inside (as `penetration` counts it). */
export function visibleMask(sdf, points, tuck, options = {}) {
    const tol = options.tolerance ?? 0.001;
    const cap = options.cap ?? 0.03;
    const n = Math.floor(points.length / 3);
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        const { distance, triangle } = sdf.nearest(points[i * 3], points[i * 3 + 1], points[i * 3 + 2], cap);
        if (distance >= -tol)
            continue;
        const t = triangle >= 0 && tuck ? tuck[triangle] : 0;
        if (-distance - t > tol)
            out[i] = 1;
    }
    return out;
}
/**
 * Penetration of `points` (xyz) into the body `sdf`. `tuck` is per body
 * triangle (from `triangleTuck`); without it, visible equals raw.
 */
export function penetration(sdf, points, tuck, options = {}) {
    const tol = options.tolerance ?? 0.001;
    const cap = options.cap ?? 0.03;
    const keep = options.keep ?? 8;
    const n = Math.floor(points.length / 3);
    let raw = 0;
    let rawDepth = 0;
    let visible = 0;
    let visibleDepth = 0;
    const visibleBeyond = [0, 0, 0];
    const worst = [];
    for (let i = 0; i < n; i++) {
        const { distance, triangle } = sdf.nearest(points[i * 3], points[i * 3 + 1], points[i * 3 + 2], cap);
        if (distance >= -tol)
            continue;
        raw++;
        rawDepth = Math.max(rawDepth, -distance);
        // Deeper than the cap: no triangle was found, and nothing tucks that deep.
        const t = triangle >= 0 && tuck ? tuck[triangle] : 0;
        const beyond = -distance - t;
        if (beyond > tol) {
            visible++;
            visibleDepth = Math.max(visibleDepth, beyond);
            if (beyond > 0.002)
                visibleBeyond[0]++;
            if (beyond > 0.005)
                visibleBeyond[1]++;
            if (beyond > 0.01)
                visibleBeyond[2]++;
            worst.push([beyond, i]);
        }
    }
    worst.sort((a, b) => b[0] - a[0]);
    return {
        vertices: n,
        raw,
        rawDepth,
        visible,
        visibleDepth,
        visibleBeyond,
        worst: worst.slice(0, keep).map(([, i]) => i),
    };
}
//# sourceMappingURL=extremes-penetration.js.map