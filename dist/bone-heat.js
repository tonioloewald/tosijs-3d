/*
BINDING A MESH TO A SKELETON BY BONE HEAT (Baran & Popović, "Automatic
Rigging and Animation of 3D Characters", 2007): auto-rig step 2 (#3349).

Each bone is a heater. A vertex is warmed by the bones nearest it, and the
heat spreads over the surface, so a bone's weight falls off smoothly across
a joint and follows the skin rather than straight-line distance (an arm held
against the side does not take the hip's weight). Per bone `i`:

    (L + M·H) wᵢ = M·H·pᵢ

where L is the cotangent Laplacian of the surface, M each vertex's area, H
how strongly the nearest bone holds a vertex (1 / distance²) and pᵢ is 1
where bone i is the nearest. Solved by conjugate gradients, one bone at a
time; the result keeps each vertex's four strongest bones, as GPU skinning
reads them.

Pure and Babylon-free. Positions are welded before solving (an OBJ or glTF
splits a vertex wherever its normal or UV does, which would cut the surface
into islands that heat cannot cross). Separate pieces (a head modelled apart
from the body) each take the heat of the bones near them.

Visibility (Baran only lets a bone heat a vertex it can SEE) is left out
for now: in a T-pose the nearest bone is almost always visible.
*/
function segmentDistance2(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abz = b.z - a.z;
    const l2 = abx * abx + aby * aby + abz * abz;
    let t = l2 > 0
        ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2
        : 0;
    t = Math.max(0, Math.min(1, t));
    const dx = p.x - (a.x + abx * t);
    const dy = p.y - (a.y + aby * t);
    const dz = p.z - (a.z + abz * t);
    return dx * dx + dy * dy + dz * dz;
}
/**
 * Skin weights for a mesh (positions xyz, indices in threes) from bone
 * segments. `iterations` caps each solve.
 */
export function boneHeat(positions, indices, bones, options = {}) {
    const n0 = Math.floor(positions.length / 3);
    // Weld: one solver vertex per distinct position.
    let span = 0;
    for (let i = 0; i < positions.length; i++) {
        const v = positions[i];
        if (Number.isFinite(v))
            span = Math.max(span, Math.abs(v));
    }
    const q = (span || 1) * 1e-6;
    const key = new Map();
    const weld = new Int32Array(n0);
    const pts = [];
    for (let i = 0; i < n0; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        const k = `${Math.round(x / q)},${Math.round(y / q)},${Math.round(z / q)}`;
        let w = key.get(k);
        if (w == null) {
            w = pts.length;
            key.set(k, w);
            pts.push({ x, y, z });
        }
        weld[i] = w;
    }
    const n = pts.length;
    // Cotangent Laplacian (negative cotangents clamped, so it stays positive
    // semi-definite on poor triangles) and a third of each triangle's area.
    const edges = Array.from({ length: n }, () => new Map());
    const area = new Float64Array(n);
    const addEdge = (i, j, w) => {
        edges[i].set(j, (edges[i].get(j) ?? 0) + w);
        edges[j].set(i, (edges[j].get(i) ?? 0) + w);
    };
    const tris = Math.floor(indices.length / 3);
    for (let t = 0; t < tris; t++) {
        const ia = weld[indices[t * 3]];
        const ib = weld[indices[t * 3 + 1]];
        const ic = weld[indices[t * 3 + 2]];
        if (ia === ib || ib === ic || ia === ic)
            continue;
        const A = pts[ia];
        const B = pts[ib];
        const C = pts[ic];
        if (!Number.isFinite(A.x + B.x + C.x + A.y + B.y + C.y + A.z + B.z + C.z))
            continue;
        const cross = (u, v) => {
            const x = u.y * v.z - u.z * v.y;
            const y = u.z * v.x - u.x * v.z;
            const z = u.x * v.y - u.y * v.x;
            return Math.hypot(x, y, z);
        };
        const d = (u, v) => ({
            x: u.x - v.x,
            y: u.y - v.y,
            z: u.z - v.z,
        });
        const dot = (u, v) => u.x * v.x + u.y * v.y + u.z * v.z;
        const twice = cross(d(B, A), d(C, A));
        if (twice < 1e-20)
            continue;
        for (const i of [ia, ib, ic])
            area[i] += twice / 6;
        // The cotangent at each corner weights the edge opposite it.
        const cot = (o, p, r) => {
            const u = d(p, o);
            const v = d(r, o);
            return dot(u, v) / Math.max(cross(u, v), 1e-20);
        };
        addEdge(ib, ic, Math.max(0, cot(A, B, C)) / 2);
        addEdge(ia, ic, Math.max(0, cot(B, A, C)) / 2);
        addEdge(ia, ib, Math.max(0, cot(C, A, B)) / 2);
    }
    // Which bones heat each vertex, and how hard.
    const nb = bones.length;
    const nearest = [];
    const heat = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        let best = Infinity;
        const d2 = bones.map((b) => segmentDistance2(pts[i], b.a, b.b));
        for (const v of d2)
            best = Math.min(best, v);
        const near = [];
        for (let k = 0; k < nb; k++)
            if (d2[k] <= best * 1.0001 + 1e-20)
                near.push(k);
        nearest.push(near);
        heat[i] = area[i] / Math.max(best, 1e-12);
    }
    // A = L + M·H as rows; solve A w = M·H·p for each bone.
    const rowCols = [];
    const rowVals = [];
    const diag = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const cols = [...edges[i].keys()];
        rowCols.push(Int32Array.from(cols));
        rowVals.push(Float64Array.from(cols.map((j) => -edges[i].get(j))));
        let s = 0;
        for (const w of edges[i].values())
            s += w;
        diag[i] = s + heat[i];
    }
    const mul = (x, out) => {
        for (let i = 0; i < n; i++) {
            let s = diag[i] * x[i];
            const c = rowCols[i];
            const v = rowVals[i];
            for (let k = 0; k < c.length; k++)
                s += v[k] * x[c[k]];
            out[i] = s;
        }
    };
    const maxIt = options.iterations ?? 400;
    const solved = [];
    const r = new Float64Array(n);
    const z = new Float64Array(n);
    const p = new Float64Array(n);
    const Ap = new Float64Array(n);
    for (let k = 0; k < nb; k++) {
        const rhs = new Float64Array(n);
        const x = new Float64Array(n);
        let any = false;
        for (let i = 0; i < n; i++)
            if (nearest[i].includes(k)) {
                rhs[i] = heat[i] / nearest[i].length;
                // Start from the answer at the heaters: a good first guess.
                x[i] = 1 / nearest[i].length;
                any = true;
            }
        if (any) {
            mul(x, Ap);
            let rz = 0;
            let r0 = 0;
            for (let i = 0; i < n; i++) {
                r[i] = rhs[i] - Ap[i];
                z[i] = diag[i] > 0 ? r[i] / diag[i] : 0;
                p[i] = z[i];
                rz += r[i] * z[i];
                r0 += rhs[i] * rhs[i];
            }
            for (let it = 0; it < maxIt && rz > 1e-24 * Math.max(r0, 1e-30); it++) {
                mul(p, Ap);
                let pAp = 0;
                for (let i = 0; i < n; i++)
                    pAp += p[i] * Ap[i];
                if (!(pAp > 0))
                    break;
                const alpha = rz / pAp;
                let next = 0;
                for (let i = 0; i < n; i++) {
                    x[i] += alpha * p[i];
                    r[i] -= alpha * Ap[i];
                    z[i] = diag[i] > 0 ? r[i] / diag[i] : 0;
                    next += r[i] * z[i];
                }
                const beta = next / rz;
                rz = next;
                for (let i = 0; i < n; i++)
                    p[i] = z[i] + beta * p[i];
            }
        }
        solved.push(x);
    }
    // The four strongest per vertex, normalised; a vertex no heat reached
    // (no area: a stray point) goes wholly to its nearest bone.
    const indicesOut = new Float32Array(n0 * 4);
    const weightsOut = new Float32Array(n0 * 4);
    const top = new Array();
    for (let v = 0; v < n0; v++) {
        const i = weld[v];
        top.length = 0;
        for (let k = 0; k < nb; k++) {
            const w = solved[k][i];
            if (w > 1e-4)
                top.push([k, w]);
        }
        top.sort((a, b) => b[1] - a[1]);
        top.length = Math.min(4, top.length);
        let sum = 0;
        for (const [, w] of top)
            sum += w;
        if (!(sum > 0)) {
            top.length = 0;
            top.push([nearest[i][0] ?? 0, 1]);
            sum = 1;
        }
        for (let s = 0; s < top.length; s++) {
            indicesOut[v * 4 + s] = bones[top[s][0]].index;
            weightsOut[v * 4 + s] = top[s][1] / sum;
        }
    }
    return { indices: indicesOut, weights: weightsOut };
}
//# sourceMappingURL=bone-heat.js.map