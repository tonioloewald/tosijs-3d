/*#
# uv-unwrap

**UVs for a mesh, worked out from its shape.** A garment exported to
Blender gets a layout an artist can paint on and a pattern can run across,
without anyone marking seams: the mesh is cut along the two planes through its
middle, the one between left and right and the one between front and back, so
a ball falls into four pieces and a pair of trousers into a front and back for
each leg, the way a sewing pattern has them. Each piece is flattened by
**least-squares conformal maps** (Lévy et al. 2002), which keeps angles, so a
check stays square; scaled to its true area; turned so the mesh's up is up;
and the pieces are packed into the unit square.

The seams are straight. A vertex within a quarter of an edge of a plane is
taken as on it, and a triangle that crosses a plane is cut where its edges
meet it, so the seam runs through existing vertices where they are close and
through new points between them where they are not. `unwrapUvs` returns the
mesh as cut, with a vertex on a seam once for each piece it borders: its
`positions`, and for each vertex the input vertices it is made of (`ref`,
`weight`, four each), so normals, weights or anything else per vertex
carry over (`carryUnwrapped`). `metresPerUnit` is how many metres one UV
unit spans, for a tiling texture at its real size.

```javascript
import { unwrapUvs, carryUnwrapped } from 'tosijs-3d'

const u = unwrapUvs(positions, triangles)
// u.triangles index u.positions and u.uvs
const normals = carryUnwrapped(inputNormals, 3, u)
```

Seams are the two planes by default, through the middle of the mesh's
bounds: `seams: { x: 0, z: false }` puts the left/right seam at x = 0 and
makes no front/back seam. A piece the planes leave in several parts (two legs
in one quarter) becomes several pieces. A closed piece with no boundary of its
own (a sphere quarter has one; a whole sphere would not) is fine, because the
planes always open it.
*/
/*{ "parent": "garment-file", "order": 20 }*/
/**
 * A per-vertex array (normals, colours, weights) mixed over to the output
 * vertices. Normals come out unnormalised where a seam cut between two.
 */
export function carryUnwrapped(data, stride, u) {
    const n = u.ref.length / 4;
    const out = new Float32Array(n * stride);
    for (let i = 0; i < n; i++)
        for (let j = 0; j < 4; j++) {
            const w = u.weight[i * 4 + j];
            if (w === 0)
                continue;
            const r = u.ref[i * 4 + j];
            for (let k = 0; k < stride; k++)
                out[i * stride + k] += data[r * stride + k] * w;
        }
    return out;
}
/**
 * Cut a mesh along the plane `axis` = `at`: vertices within `eps` of it are
 * taken as on it, and triangles crossing it are split at the crossings.
 */
function slice(m, axis, at, eps) {
    const P = [...m.P];
    const ref = [...m.ref];
    const weight = [...m.weight];
    const d = (v) => P[v * 3 + axis] - at;
    const n0 = m.P.length / 3;
    const side = new Int8Array(n0);
    for (let v = 0; v < n0; v++)
        side[v] = d(v) > eps ? 1 : d(v) < -eps ? -1 : 0;
    const crossing = new Map();
    const between = (a, b) => {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        let v = crossing.get(key);
        if (v != null)
            return v;
        const t = d(a) / (d(a) - d(b));
        v = P.length / 3;
        for (let k = 0; k < 3; k++)
            P.push(P[a * 3 + k] * (1 - t) + P[b * 3 + k] * t);
        // Mix the two ends' inputs, at most four.
        const mix = new Map();
        for (const [x, f] of [
            [a, 1 - t],
            [b, t],
        ])
            for (let j = 0; j < 4; j++) {
                const w = m.weight[x * 4 + j] * f;
                if (w > 0)
                    mix.set(m.ref[x * 4 + j], (mix.get(m.ref[x * 4 + j]) ?? 0) + w);
            }
        const top = [...mix].sort((p, q) => q[1] - p[1]).slice(0, 4);
        const sum = top.reduce((s, [, w]) => s + w, 0) || 1;
        for (let j = 0; j < 4; j++) {
            ref.push(top[j]?.[0] ?? 0);
            weight.push((top[j]?.[1] ?? 0) / sum);
        }
        crossing.set(key, v);
        return v;
    };
    const T = [];
    for (let t = 0; t < m.T.length; t += 3) {
        const v = [m.T[t], m.T[t + 1], m.T[t + 2]];
        const s = v.map((x) => side[x]);
        if (!(s.includes(1) && s.includes(-1))) {
            T.push(...v);
            continue;
        }
        // Turned so the odd one out comes first, keeping the winding.
        const r = s.includes(0)
            ? s.indexOf(0)
            : s.findIndex((x, i) => x !== s[(i + 1) % 3] && x !== s[(i + 2) % 3]);
        const [a, b, c] = [v[r], v[(r + 1) % 3], v[(r + 2) % 3]];
        if (side[a] === 0) {
            // On the plane, the other two either side: one cut, two triangles.
            const m1 = between(b, c);
            T.push(a, b, m1, a, m1, c);
        }
        else {
            const m1 = between(a, b);
            const m2 = between(a, c);
            T.push(a, m1, m2, m1, b, c, m1, c, m2);
        }
    }
    return { P, T, ref, weight };
}
/** The seams' places: the middle of the bounds unless given, or false. */
function seamPlanes(P, options) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
        minX = Math.min(minX, P[i]);
        maxX = Math.max(maxX, P[i]);
        minZ = Math.min(minZ, P[i + 2]);
        maxZ = Math.max(maxZ, P[i + 2]);
    }
    return {
        x: options.seams?.x ?? (minX + maxX) / 2,
        z: options.seams?.z ?? (minZ + maxZ) / 2,
    };
}
/** Which side of each plane a triangle's middle is on. */
function quadrants(P, T, seams) {
    const out = new Uint8Array(T.length / 3);
    for (let t = 0; t < T.length; t += 3) {
        let x = 0;
        let z = 0;
        for (let k = 0; k < 3; k++) {
            x += P[T[t + k] * 3];
            z += P[T[t + k] * 3 + 2];
        }
        out[t / 3] =
            (seams.x !== false && x / 3 > seams.x ? 1 : 0) |
                (seams.z !== false && z / 3 > seams.z ? 2 : 0);
    }
    return out;
}
/**
 * Solve M x = b, M sparse symmetric positive definite (rows of column and
 * value lists), by conjugate gradients with a diagonal preconditioner.
 */
function solve(cols, vals, b, iterations) {
    const n = b.length;
    const x = new Float64Array(n);
    const diag = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const j = cols[i].indexOf(i);
        diag[i] = j >= 0 && vals[i][j] > 0 ? vals[i][j] : 1;
    }
    const mul = (v, out) => {
        for (let i = 0; i < n; i++) {
            let s = 0;
            const c = cols[i];
            const w = vals[i];
            for (let k = 0; k < c.length; k++)
                s += w[k] * v[c[k]];
            out[i] = s;
        }
    };
    const r = Float64Array.from(b);
    const z = new Float64Array(n);
    for (let i = 0; i < n; i++)
        z[i] = r[i] / diag[i];
    const p = Float64Array.from(z);
    const q = new Float64Array(n);
    let rz = 0;
    let bb = 0;
    for (let i = 0; i < n; i++) {
        rz += r[i] * z[i];
        bb += b[i] * b[i];
    }
    if (bb === 0)
        return x;
    for (let it = 0; it < iterations; it++) {
        mul(p, q);
        let pq = 0;
        for (let i = 0; i < n; i++)
            pq += p[i] * q[i];
        if (pq <= 0)
            break;
        const a = rz / pq;
        let rr = 0;
        for (let i = 0; i < n; i++) {
            x[i] += a * p[i];
            r[i] -= a * q[i];
            rr += r[i] * r[i];
        }
        if (rr < bb * 1e-20)
            break;
        let rz2 = 0;
        for (let i = 0; i < n; i++) {
            z[i] = r[i] / diag[i];
            rz2 += r[i] * z[i];
        }
        const beta = rz2 / rz;
        rz = rz2;
        for (let i = 0; i < n; i++)
            p[i] = z[i] + beta * p[i];
    }
    return x;
}
/**
 * Flatten one piece: its triangles over local vertices 0..n-1, positions
 * per local vertex. Returns UVs in metres (area preserved overall).
 */
function lscm(pos, tris, n) {
    // Pin the two vertices farthest apart (two sweeps), at their distance.
    const far = (from) => {
        let best = from;
        let d = -1;
        for (let i = 0; i < n; i++) {
            const e = Math.hypot(pos[i * 3] - pos[from * 3], pos[i * 3 + 1] - pos[from * 3 + 1], pos[i * 3 + 2] - pos[from * 3 + 2]);
            if (e > d) {
                d = e;
                best = i;
            }
        }
        return { best, d };
    };
    const a = far(tris[0]).best;
    const { best: b, d } = far(a);
    const uv = new Float64Array(n * 2);
    if (n < 3 || d === 0)
        return uv;
    // Unknowns: u then v per vertex; the pins' four are known.
    const pinned = new Map([
        [a * 2, 0],
        [a * 2 + 1, 0],
        [b * 2, d],
        [b * 2 + 1, 0],
    ]);
    const free = new Int32Array(n * 2).fill(-1);
    let nf = 0;
    for (let i = 0; i < n * 2; i++)
        if (!pinned.has(i))
            free[i] = nf++;
    const rows = Array.from({ length: nf }, () => new Map());
    const rhs = new Float64Array(nf);
    const coef = new Float64Array(6);
    const idx = new Int32Array(6);
    for (let t = 0; t < tris.length; t += 3) {
        const [i0, i1, i2] = [tris[t], tris[t + 1], tris[t + 2]];
        // The triangle in its own plane: p0 at the origin, p1 on +x.
        const e1 = [0, 1, 2].map((k) => pos[i1 * 3 + k] - pos[i0 * 3 + k]);
        const e2 = [0, 1, 2].map((k) => pos[i2 * 3 + k] - pos[i0 * 3 + k]);
        const l1 = Math.hypot(e1[0], e1[1], e1[2]);
        if (l1 === 0)
            continue;
        const x1 = l1;
        const x2 = (e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2]) / l1;
        const cx = e1[1] * e2[2] - e1[2] * e2[1];
        const cy = e1[2] * e2[0] - e1[0] * e2[2];
        const cz = e1[0] * e2[1] - e1[1] * e2[0];
        const y2 = Math.hypot(cx, cy, cz) / l1;
        const area2 = x1 * y2;
        if (area2 <= 1e-14)
            continue;
        const s = 1 / Math.sqrt(area2);
        const xs = [0, x1, x2];
        const ys = [0, 0, y2];
        const vs = [i0, i1, i2];
        // Σ_j W_j (u_j + i v_j) = 0, W_j = (x_l - x_k) + i (y_l - y_k).
        const Wr = [0, 1, 2].map((j) => (xs[(j + 2) % 3] - xs[(j + 1) % 3]) * s);
        const Wi = [0, 1, 2].map((j) => (ys[(j + 2) % 3] - ys[(j + 1) % 3]) * s);
        for (const real of [true, false]) {
            for (let j = 0; j < 3; j++) {
                idx[j] = vs[j] * 2;
                idx[j + 3] = vs[j] * 2 + 1;
                coef[j] = real ? Wr[j] : Wi[j];
                coef[j + 3] = real ? -Wi[j] : Wr[j];
            }
            // This row's contribution to the normal equations.
            let known = 0;
            for (let k = 0; k < 6; k++) {
                const p = pinned.get(idx[k]);
                if (p != null)
                    known += coef[k] * p;
            }
            for (let k = 0; k < 6; k++) {
                const fk = free[idx[k]];
                if (fk < 0)
                    continue;
                rhs[fk] -= coef[k] * known;
                const row = rows[fk];
                for (let m = 0; m < 6; m++) {
                    const fm = free[idx[m]];
                    if (fm < 0)
                        continue;
                    row.set(fm, (row.get(fm) ?? 0) + coef[k] * coef[m]);
                }
            }
        }
    }
    const cols = rows.map((r) => [...r.keys()]);
    const vals = rows.map((r) => [...r.values()]);
    const x = solve(cols, vals, rhs, Math.max(200, nf * 2));
    for (let i = 0; i < n * 2; i++)
        uv[i] = free[i] >= 0 ? x[free[i]] : pinned.get(i);
    return uv;
}
/** Lay a mesh flat into UVs, cut along two planes (see the module doc). */
export function unwrapUvs(positions, triangles, options = {}) {
    const seams = seamPlanes(positions, options);
    // A quarter of the mean edge: a vertex this near a plane is on it.
    let edges = 0;
    for (let t = 0; t < triangles.length; t += 3)
        for (let k = 0; k < 3; k++) {
            const a = triangles[t + k] * 3;
            const b = triangles[t + ((k + 1) % 3)] * 3;
            edges += Math.hypot(positions[a] - positions[b], positions[a + 1] - positions[b + 1], positions[a + 2] - positions[b + 2]);
        }
    const eps = (edges / Math.max(1, triangles.length)) * 0.25;
    const n = positions.length / 3;
    let cut = {
        P: Array.from(positions),
        T: Array.from(triangles),
        ref: Array.from({ length: n * 4 }, (_, i) => (i % 4 ? 0 : i / 4)),
        weight: Array.from({ length: n * 4 }, (_, i) => (i % 4 ? 0 : 1)),
    };
    if (seams.x !== false)
        cut = slice(cut, 0, seams.x, eps);
    if (seams.z !== false)
        cut = slice(cut, 2, seams.z, eps);
    const P = cut.P;
    const T = cut.T;
    const nt = T.length / 3;
    const quad = quadrants(P, T, seams);
    // Pieces: triangles in the same quarter joined through shared vertices.
    const parent = Int32Array.from({ length: nt }, (_, i) => i);
    const find = (i) => {
        while (parent[i] !== i)
            i = parent[i] = parent[parent[i]];
        return i;
    };
    const owner = new Map();
    for (let t = 0; t < nt; t++)
        for (let k = 0; k < 3; k++) {
            const key = `${quad[t]}:${T[t * 3 + k]}`;
            const o = owner.get(key);
            if (o == null)
                owner.set(key, t);
            else
                parent[find(t)] = find(o);
        }
    const pieceOf = new Map();
    const triPiece = new Int32Array(nt);
    for (let t = 0; t < nt; t++) {
        const r = find(t);
        if (!pieceOf.has(r))
            pieceOf.set(r, pieceOf.size);
        triPiece[t] = pieceOf.get(r);
    }
    const charts = pieceOf.size;
    // Output vertices: one per input vertex per piece.
    const outIndex = new Map();
    const vertexOf = [];
    const chartOf = [];
    const outTris = new Uint32Array(T.length);
    const local = Array.from({ length: charts }, () => ({ verts: [], tris: [] }));
    for (let t = 0; t < nt; t++) {
        const c = triPiece[t];
        for (let k = 0; k < 3; k++) {
            const v = T[t * 3 + k];
            const key = `${c}:${v}`;
            let o = outIndex.get(key);
            if (o == null) {
                o = vertexOf.length;
                outIndex.set(key, o);
                vertexOf.push(v);
                chartOf.push(c);
                local[c].verts.push(o);
            }
            outTris[t * 3 + k] = o;
        }
    }
    const nv = vertexOf.length;
    const uv = new Float64Array(nv * 2);
    const boxes = [];
    for (let c = 0; c < charts; c++) {
        const { verts } = local[c];
        const at = new Map(verts.map((o, i) => [o, i]));
        const pos = new Float64Array(verts.length * 3);
        verts.forEach((o, i) => {
            for (let k = 0; k < 3; k++)
                pos[i * 3 + k] = P[vertexOf[o] * 3 + k];
        });
        const tris = [];
        for (let t = 0; t < nt; t++)
            if (triPiece[t] === c)
                for (let k = 0; k < 3; k++)
                    tris.push(at.get(outTris[t * 3 + k]));
        const flat = lscm(pos, tris, verts.length);
        // Facing out, not mirrored: the triangles wind as they do in 3D; scale
        // to the true area; and the mesh's up is +v.
        let signed = 0;
        let area3 = 0;
        let gx = 0;
        let gy = 0;
        for (let t = 0; t < tris.length; t += 3) {
            const [a, b, d] = [tris[t], tris[t + 1], tris[t + 2]];
            const ux = flat[b * 2] - flat[a * 2];
            const uy = flat[b * 2 + 1] - flat[a * 2 + 1];
            const wx = flat[d * 2] - flat[a * 2];
            const wy = flat[d * 2 + 1] - flat[a * 2 + 1];
            const det = ux * wy - uy * wx;
            signed += det / 2;
            const e1 = [0, 1, 2].map((k) => pos[b * 3 + k] - pos[a * 3 + k]);
            const e2 = [0, 1, 2].map((k) => pos[d * 3 + k] - pos[a * 3 + k]);
            const a3 = Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2;
            area3 += a3;
            // The gradient of height across the triangle, in UV, weighted by area.
            if (Math.abs(det) > 1e-18) {
                const dy1 = e1[1];
                const dy2 = e2[1];
                gx += ((dy1 * wy - dy2 * uy) / det) * a3;
                gy += ((dy2 * ux - dy1 * wx) / det) * a3;
            }
        }
        const flip = signed < 0 ? -1 : 1;
        if (flip < 0)
            gx = -gx;
        const k = Math.abs(signed) > 0 ? Math.sqrt(area3 / Math.abs(signed)) : 1;
        // Turn the height gradient onto +v (a flat, level piece is left as is).
        const turn = Math.hypot(gx, gy) > 1e-9 ? Math.PI / 2 - Math.atan2(gy, gx) : 0;
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        let minU = Infinity;
        let minV = Infinity;
        let maxU = -Infinity;
        let maxV = -Infinity;
        verts.forEach((o, i) => {
            const u = flat[i * 2] * flip * k;
            const v = flat[i * 2 + 1] * k;
            const ru = u * cos - v * sin;
            const rv = u * sin + v * cos;
            uv[o * 2] = ru;
            uv[o * 2 + 1] = rv;
            minU = Math.min(minU, ru);
            minV = Math.min(minV, rv);
            maxU = Math.max(maxU, ru);
            maxV = Math.max(maxV, rv);
        });
        for (const o of verts) {
            uv[o * 2] -= minU;
            uv[o * 2 + 1] -= minV;
        }
        boxes.push({ c, w: maxU - minU, h: maxV - minV, x: 0, y: 0 });
    }
    // Shelves, tallest first, in a row about as wide as the layout is tall.
    const margin = options.margin ?? 0.01;
    let total = 0;
    let widest = 0;
    for (const b of boxes) {
        total += (b.w + margin) * (b.h + margin);
        widest = Math.max(widest, b.w + margin);
    }
    const rowWidth = Math.max(widest, Math.sqrt(total) * 1.1);
    const order = [...boxes].sort((p, q) => q.h - p.h);
    let x = margin;
    let y = margin;
    let shelf = 0;
    let width = 0;
    for (const b of order) {
        if (x + b.w + margin > rowWidth + margin && x > margin) {
            x = margin;
            y += shelf + margin;
            shelf = 0;
        }
        b.x = x;
        b.y = y;
        x += b.w + margin;
        shelf = Math.max(shelf, b.h);
        width = Math.max(width, x);
    }
    const height = y + shelf + margin;
    const fit = options.fit !== false;
    const metresPerUnit = fit ? Math.max(width, height) : 1;
    const out = new Float32Array(nv * 2);
    for (let o = 0; o < nv; o++) {
        const b = boxes[chartOf[o]];
        out[o * 2] = (uv[o * 2] + b.x) / metresPerUnit;
        out[o * 2 + 1] = (uv[o * 2 + 1] + b.y) / metresPerUnit;
    }
    const outP = new Float32Array(nv * 3);
    const outRef = new Uint32Array(nv * 4);
    const outWeight = new Float32Array(nv * 4);
    for (let o = 0; o < nv; o++) {
        const v = vertexOf[o];
        for (let k = 0; k < 3; k++)
            outP[o * 3 + k] = P[v * 3 + k];
        for (let j = 0; j < 4; j++) {
            outRef[o * 4 + j] = cut.ref[v * 4 + j];
            outWeight[o * 4 + j] = cut.weight[v * 4 + j];
        }
    }
    return {
        positions: outP,
        uvs: out,
        triangles: outTris,
        ref: outRef,
        weight: outWeight,
        chart: Uint32Array.from(chartOf),
        charts,
        metresPerUnit,
    };
}
//# sourceMappingURL=uv-unwrap.js.map