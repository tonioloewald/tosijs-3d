/*#
# hair-fit

Hair made for one head, worn on another. A hairstyle library such as
Quaternius' is modelled around ITS base head, in world space; a
[character builder](/character-builder/) body has a different skull for
every slider setting. Two steps carry a style across, both pure:

1. **`fitToScalp(reference, scalp)`** fits a scale and an offset per axis that
   lay a REFERENCE that hugs the library's scalp (a buzz cut) onto this body's
   scalp, by iterated nearest points (ICP without rotation: both heads face
   +Z, up +Y). The same fit then moves every style, eyebrows and beards too,
   because they were all modelled on that one head.
2. **`conformOutside(positions, scalp, normals, margin)`** pushes any vertex
   that ends up inside the skin (or closer than `margin` to it) back out along
   the skin's normal, so a shape the fit cannot capture exactly (a longer
   skull, a heavier brow) never shows skin through hair.

`vertexNormals(positions, triangles)` gives the skin's normals for the second
step (counter-clockwise outward, as OBJ and glTF wind).

```javascript
const fit = fitToScalp(buzzCut, scalp)
const placed = applyFit(styleVertices, fit)
conformOutside(placed, scalp, scalpNormals, 0.003)
```
*/
/*{ "parent": "character-builder", "order": 60 }*/
/** `positions` (xyz) moved by a fit, into a new array or `into`. */
export function applyFit(positions, fit, into) {
    const out = into ?? new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
        for (let k = 0; k < 3; k++) {
            out[i + k] = positions[i + k] * fit.scale[k] + fit.shift[k];
        }
    }
    return out;
}
/** The index of the point in `cloud` (xyz) nearest (x, y, z), and its squared distance. */
function nearest(cloud, x, y, z) {
    let best = Infinity;
    let at = 0;
    for (let j = 0; j < cloud.length; j += 3) {
        const dx = cloud[j] - x;
        const dy = cloud[j + 1] - y;
        const dz = cloud[j + 2] - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) {
            best = d;
            at = j / 3;
        }
    }
    return [at, best];
}
/**
 * The per-axis scale and shift that lay `reference` (xyz) onto `scalp` (xyz,
 * the skin's points above the brow). Starts with the tops and centres
 * aligned, then refines by nearest points.
 */
export function fitToScalp(reference, scalp, iterations = 12) {
    const box = (p) => {
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < p.length; i += 3) {
            for (let k = 0; k < 3; k++) {
                lo[k] = Math.min(lo[k], p[i + k]);
                hi[k] = Math.max(hi[k], p[i + k]);
            }
        }
        return { lo, hi };
    };
    const r = box(reference);
    const s = box(scalp);
    const fit = {
        scale: [1, 1, 1],
        shift: [
            (s.lo[0] + s.hi[0] - r.lo[0] - r.hi[0]) / 2,
            s.hi[1] - r.hi[1],
            (s.lo[2] + s.hi[2] - r.lo[2] - r.hi[2]) / 2,
        ],
    };
    const n = reference.length / 3;
    const target = new Float32Array(reference.length);
    for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < n; i++) {
            const [j] = nearest(scalp, reference[i * 3] * fit.scale[0] + fit.shift[0], reference[i * 3 + 1] * fit.scale[1] + fit.shift[1], reference[i * 3 + 2] * fit.scale[2] + fit.shift[2]);
            target[i * 3] = scalp[j * 3];
            target[i * 3 + 1] = scalp[j * 3 + 1];
            target[i * 3 + 2] = scalp[j * 3 + 2];
        }
        // Least squares per axis: target ≈ reference · scale + shift.
        for (let k = 0; k < 3; k++) {
            let mr = 0;
            let mt = 0;
            for (let i = 0; i < n; i++) {
                mr += reference[i * 3 + k];
                mt += target[i * 3 + k];
            }
            mr /= n;
            mt /= n;
            let num = 0;
            let den = 0;
            for (let i = 0; i < n; i++) {
                const a = reference[i * 3 + k] - mr;
                num += a * (target[i * 3 + k] - mt);
                den += a * a;
            }
            fit.scale[k] = den > 0 ? num / den : 1;
            fit.shift[k] = mt - fit.scale[k] * mr;
        }
    }
    return fit;
}
/** Area-weighted vertex normals, counter-clockwise outward. */
export function vertexNormals(positions, triangles) {
    const out = new Float32Array(positions.length);
    for (let t = 0; t < triangles.length; t += 3) {
        const a = triangles[t] * 3;
        const b = triangles[t + 1] * 3;
        const c = triangles[t + 2] * 3;
        const ux = positions[b] - positions[a];
        const uy = positions[b + 1] - positions[a + 1];
        const uz = positions[b + 2] - positions[a + 2];
        const vx = positions[c] - positions[a];
        const vy = positions[c + 1] - positions[a + 1];
        const vz = positions[c + 2] - positions[a + 2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        for (const v of [a, b, c]) {
            out[v] += nx;
            out[v + 1] += ny;
            out[v + 2] += nz;
        }
    }
    for (let i = 0; i < out.length; i += 3) {
        const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1;
        out[i] /= l;
        out[i + 1] /= l;
        out[i + 2] /= l;
    }
    return out;
}
/**
 * Push every vertex of `positions` (xyz, in place) that is inside the skin,
 * or nearer it than `margin`, out along the nearest skin point's normal.
 * Returns how many moved.
 */
export function conformOutside(positions, scalp, normals, margin = 0.003) {
    let moved = 0;
    for (let i = 0; i < positions.length; i += 3) {
        const [j] = nearest(scalp, positions[i], positions[i + 1], positions[i + 2]);
        const nx = normals[j * 3];
        const ny = normals[j * 3 + 1];
        const nz = normals[j * 3 + 2];
        const out = (positions[i] - scalp[j * 3]) * nx +
            (positions[i + 1] - scalp[j * 3 + 1]) * ny +
            (positions[i + 2] - scalp[j * 3 + 2]) * nz;
        if (out < margin) {
            const push = margin - out;
            positions[i] += nx * push;
            positions[i + 1] += ny * push;
            positions[i + 2] += nz * push;
            moved++;
        }
    }
    return moved;
}
//# sourceMappingURL=hair-fit.js.map