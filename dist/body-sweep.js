/*#
# body-sweep

Clothes, shoes and hair as SWEEPS: a profile taken from the body and carried
along a path, with curves along the way. This is the primitive under the
tailor, the barber and the cobbler (see CHARACTER-DESIGN.md, step 11).

`loftGarment` is the LOFT: rings round the body's cross-section, carried
along a chain of bones (a leg, an arm, the foot). Each ring is the convex
HULL of the body's slice there, so it bridges hollows, plus `thickness` and
an `ease` that may change along the sweep (a flared trouser leg, a puffed
sleeve, a bucket top).

- The slice at a station takes only the skin of that station's BONE (its
  skin weights), so a ring round the shin never takes in the foot, and a
  ring round the thigh never the other leg. `piece` narrows it further: the
  body between its cuts.
- Where the chain bends (the ankle, the elbow), rings square to each bone
  would cross. The join is a MITRE: the ring at the joint lies in the plane
  halfway between the bones, and the rings either side are kept behind it,
  as in a pipe elbow. `steps` rounds the bend instead: that many rings
  turning gradually along a curve through the joint. 0 is the clean mitre,
  which is the default because it round-trips to a modelling tool cleanly.
- Each end is `open` (a free edge: it may stand off the body), `sealed`
  (it meets the body or the next piece: the ease fades to nothing there),
  or `cap` (closed, a toe).
- `length` carries the last ring on past the end of the chain (a hem below
  the ankle, a toe allowance).
- UVs come free: u is round the ring, v along the sweep, in metres.

The result is an ordinary garment binding (as [garment-cut](/garment-cut/)
makes), each ring point bound to the skin it was sliced from, so it fits
every body shape and bends with every clip.

Pure: a rigged body in, a binding out.
*/
/*{ "parent": "garment-cut", "order": 30 }*/
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addS = (a, b, k) => [
    a[0] + b[0] * k,
    a[1] + b[1] * k,
    a[2] + b[2] * k,
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => {
    const l = len(a);
    return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};
const curveAt = (c, s) => c == null ? 0 : typeof c === 'number' ? c : c(s);
/** A convex hull of 2D points (Andrew's monotone chain), counter-clockwise. */
function hull2(pts) {
    const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3)
        return p;
    const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list) => {
        const out = [];
        for (const q of list) {
            while (out.length >= 2 &&
                turn(out[out.length - 2], out[out.length - 1], q) <= 0)
                out.pop();
            out.push(q);
        }
        return out;
    };
    const lower = half(p);
    const upper = half([...p].reverse());
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}
/** How far from `c` along `d` a ray leaves the convex polygon. */
function exitAlong(poly, c, d) {
    let best = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        const den = d[0] * ey - d[1] * ex;
        if (Math.abs(den) < 1e-12)
            continue;
        const t = ((a[0] - c[0]) * ey - (a[1] - c[1]) * ex) / den;
        const u = ((a[0] - c[0]) * d[1] - (a[1] - c[1]) * d[0]) / den;
        if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9)
            best = Math.max(best, t);
    }
    return best;
}
function chainPath(body, chain, steps) {
    const index = new Map(body.rig.joints.map((j, i) => [j.name, i]));
    const pts = chain.map((name) => {
        const p = body.rig.at(name);
        if (p == null)
            throw new Error(`loftGarment: no joint ${name}`);
        return [p.x, p.y, p.z];
    });
    const bone = (k) => {
        const i = index.get(chain[Math.min(k, chain.length - 2)]);
        return i == null ? [] : [i];
    };
    const dirs = pts.slice(1).map((p, k) => unit(sub(p, pts[k])));
    const out = [{ at: pts[0], normal: dirs[0], bones: bone(0) }];
    for (let k = 1; k + 1 < pts.length; k++) {
        const d1 = dirs[k - 1];
        const d2 = dirs[k];
        const both = [...bone(k - 1), ...bone(k)];
        if (steps <= 0 || dot(d1, d2) > 0.9999) {
            out.push({
                at: pts[k],
                normal: unit([...addS(d1, d2, 1)]),
                bones: both,
            });
            continue;
        }
        // A rounded bend: a curve from `a` before the joint to `a` after it.
        const a = Math.min(len(sub(pts[k], pts[k - 1])), len(sub(pts[k + 1], pts[k]))) * 0.4;
        const p0 = addS(pts[k], d1, -a);
        const p2 = addS(pts[k], d2, a);
        const n = steps + 1;
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const at = [0, 1, 2].map((c) => (1 - t) * (1 - t) * p0[c] +
                2 * (1 - t) * t * pts[k][c] +
                t * t * p2[c]);
            const tangent = unit([0, 1, 2].map((c) => 2 * (1 - t) * (pts[k][c] - p0[c]) + 2 * t * (p2[c] - pts[k][c])));
            out.push({ at, normal: tangent, bones: both });
        }
    }
    const last = pts.length - 1;
    out.push({ at: pts[last], normal: dirs[last - 1], bones: bone(last - 1) });
    return out;
}
/**
 * A loft along a chain of bones: rings round the hull of the body's slice,
 * plus thickness and ease, as a garment binding.
 */
export function loftGarment(body, options) {
    const { chain } = options;
    if (chain.length < 2)
        throw new Error('loftGarment: a chain needs two joints');
    const thickness = options.thickness ?? 0.004;
    const step = options.step ?? 0.02;
    const M = options.segments ?? 32;
    const uvScale = options.uvScale ?? 1;
    const seal = options.seal ?? 0.03;
    const [startEnd, endEnd] = options.ends ?? ['open', 'open'];
    const P = body.positions;
    const T = body.indices;
    const n = P.length / 3;
    const vert = (v) => [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    // Each vertex's dominant bone, for the slices.
    const W = body.weights;
    const dominant = new Int32Array(n).fill(-1);
    for (let v = 0; v < n; v++) {
        if (options.piece && !options.piece[v])
            continue;
        let best = 0;
        for (let k = 0; k < 4; k++) {
            const w = W.weights[v * 4 + k];
            if (w > best) {
                best = w;
                dominant[v] = W.indices[v * 4 + k];
            }
        }
    }
    // The path, measured, and the stretch of it the sweep covers.
    const path = chainPath(body, chain, options.steps ?? 0);
    const along = [0];
    for (let i = 1; i < path.length; i++)
        along.push(along[i - 1] + len(sub(path[i].at, path[i - 1].at)));
    const total = along[along.length - 1];
    const s0 = (options.from ?? 0) * total;
    const s1 = (options.to ?? 1) * total;
    /*
    A sweep to the end of its chain runs on to the end of the body there (the
    toes past the toe joint, the fingertips): the piece is the body between its
    cuts, so the limb's own end closes it. `reach` is how far that skin goes
    past the last joint; slices are taken out to it, and `length` carries the
    last ring on beyond.
    */
    let reach = 0;
    if (s1 >= total - 1e-9) {
        const tip = path[path.length - 1];
        const lastBones = path[path.length - 2].bones.slice(-1);
        for (let v = 0; v < n; v++)
            if (lastBones.includes(dominant[v]))
                reach = Math.max(reach, dot(sub(vert(v), tip.at), tip.normal));
    }
    const extra = Math.max(options.length ?? 0, reach);
    const sweepLength = s1 - s0 + extra;
    const stations = [];
    const segOf = (s) => {
        let i = 0;
        while (i + 2 < path.length && along[i + 1] <= s)
            i++;
        return i;
    };
    const stationAt = (s, onPoint) => {
        if (onPoint != null) {
            const p = path[onPoint];
            return { s, at: p.at, normal: p.normal, bones: p.bones };
        }
        const i = segOf(Math.min(s, total));
        const a = path[i];
        const b = path[i + 1];
        const dir = unit(sub(b.at, a.at));
        const at = addS(a.at, dir, s - along[i]);
        return {
            s,
            at,
            normal: dir,
            bones: (s > total ? b : a).bones.slice(-1),
            behind: i > 0 ? { at: a.at, normal: a.normal, dir } : undefined,
            ahead: i + 2 < path.length && s <= total
                ? { at: b.at, normal: b.normal, dir }
                : undefined,
        };
    };
    const marks = [{ s: s0, point: null }];
    for (let i = 0; i < path.length; i++)
        if (along[i] > s0 + 1e-6 && along[i] < s1 - 1e-6)
            marks.push({ s: along[i], point: i });
    marks.push({ s: s1, point: null });
    if (extra > 0)
        marks.push({ s: s1 + extra, point: null });
    for (let m = 0; m + 1 < marks.length; m++) {
        const a = marks[m];
        const b = marks[m + 1];
        const k = Math.max(1, Math.round((b.s - a.s) / step));
        for (let i = 0; i < k; i++) {
            const s = a.s + ((b.s - a.s) * i) / k;
            stations.push(stationAt(s, i === 0 ? a.point : null));
        }
    }
    stations.push(stationAt(marks[marks.length - 1].s, null));
    /*
    THE SLICES. Every body edge the station's plane crosses, with both ends in
    the station's bones' skin, gives a point; the ring is the hull of those
    points in the plane's own frame, carried from station to station so ring
    point j means the same side of the limb all the way down.
    */
    const crossings = (st) => {
        const pts = [];
        const seen = new Set();
        const allowed = (v) => st.bones.includes(dominant[v]);
        const side = (v) => dot(sub(vert(v), st.at), st.normal);
        for (let t = 0; t < T.length; t += 3)
            for (let e = 0; e < 3; e++) {
                const a = T[t + e];
                const b = T[t + ((e + 1) % 3)];
                if (!allowed(a) || !allowed(b))
                    continue;
                const key = a < b ? a * n + b : b * n + a;
                if (seen.has(key))
                    continue;
                const da = side(a);
                const db = side(b);
                if (da > 0 === db > 0)
                    continue;
                seen.add(key);
                const t0 = da / (da - db);
                pts.push({ p: addS(vert(a), sub(vert(b), vert(a)), t0), a, b });
            }
        return pts;
    };
    let ref = Math.abs(stations[0].normal[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const rings = [];
    for (const st of stations) {
        const u = unit(addS(ref, st.normal, -dot(ref, st.normal)));
        const v = cross(st.normal, u);
        ref = u;
        const inPlane = st.s <= s1 + reach + 1e-6 ? crossings(st) : [];
        const flat = inPlane.map(({ p }) => [dot(sub(p, st.at), u), dot(sub(p, st.at), v)]);
        const hull = hull2(flat);
        const previous = rings[rings.length - 1];
        if (hull.length < 3) {
            // Nothing here (past the chain's end, or a gap): the ring before.
            if (previous == null) {
                rings.push({
                    centre: [0, 0],
                    radii: Array(M).fill(0.01),
                    u,
                    v,
                    skin: [],
                });
            }
            else
                rings.push({ ...previous, u, v });
            continue;
        }
        const centre = [0, 0];
        for (const q of hull) {
            centre[0] += q[0] / hull.length;
            centre[1] += q[1] / hull.length;
        }
        const radii = Array.from({ length: M }, (_, j) => {
            const a = (j / M) * Math.PI * 2;
            return exitAlong(hull, centre, [Math.cos(a), Math.sin(a)]);
        });
        const skin = [...new Set(inPlane.flatMap(({ a, b }) => [a, b]))];
        rings.push({ centre, radii, u, v, skin });
    }
    // The ease, faded out toward a sealed end.
    const easeAt = (s) => {
        const f = sweepLength > 0 ? (s - s0) / sweepLength : 0;
        let e = curveAt(options.ease, Math.min(1, Math.max(0, f)));
        if (startEnd === 'sealed')
            e *= Math.min(1, (s - s0) / seal);
        if (endEnd === 'sealed')
            e *= Math.min(1, (s1 + extra - s) / seal);
        return thickness + Math.max(0, e);
    };
    // Ring points in the body's space, kept behind the mitres either side.
    const keep = (q, st) => {
        let p = q;
        for (const [plane, sign] of [
            [st.ahead, 1],
            [st.behind, -1],
        ]) {
            if (plane == null)
                continue;
            const over = dot(sub(p, plane.at), plane.normal) * sign;
            if (over > 0)
                p = addS(p, plane.dir, (-sign * over) / dot(plane.dir, plane.normal));
        }
        return p;
    };
    const points = stations.map((st, i) => {
        const r = rings[i];
        const e = easeAt(st.s);
        return Array.from({ length: M }, (_, j) => {
            const a = (j / M) * Math.PI * 2;
            const radius = r.radii[j] + e;
            const x = r.centre[0] + Math.cos(a) * radius;
            const y = r.centre[1] + Math.sin(a) * radius;
            return keep(addS(addS(st.at, r.u, x), r.v, y), st);
        });
    });
    /*
    BINDING. Each ring point to the three nearest skin vertices of its slice
    (inverse distance), the offset what is left; a ring with no skin of its
    own (past the end) borrows the last that had some.
    */
    const refs = [];
    const weight = [];
    const offset = [];
    const uvs = [];
    let skin = [];
    const bind = (q) => {
        const near = skin
            .map((v) => ({ v, d: len(sub(vert(v), q)) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 3);
        while (near.length < 3)
            near.push(near[0] ?? { v: 0, d: 1 });
        const w = near.map(({ d }) => 1 / Math.max(d, 1e-4));
        const sum = w[0] + w[1] + w[2];
        const base = [0, 0, 0];
        near.forEach(({ v }, k) => {
            refs.push(v);
            weight.push(w[k] / sum);
            for (let c = 0; c < 3; c++)
                base[c] += (w[k] / sum) * P[v * 3 + c];
        });
        offset.push(q[0] - base[0], q[1] - base[1], q[2] - base[2]);
    };
    const row = M + 1;
    points.forEach((ring, i) => {
        if (rings[i].skin.length)
            skin = rings[i].skin;
        const s = stations[i].s - s0;
        for (let j = 0; j <= M; j++) {
            bind(ring[j % M]);
            uvs.push((j / M) * uvScale, s * uvScale);
        }
    });
    // The tube's triangles, turned to face out.
    const tris = [];
    for (let i = 0; i + 1 < points.length; i++)
        for (let j = 0; j < M; j++) {
            const a = i * row + j;
            const b = a + 1;
            const c = a + row;
            const d = c + 1;
            tris.push(a, b, c, b, d, c);
        }
    const rowAt = (r) => {
        const i = Math.floor(r / row);
        return points[i][(r % row) % M];
    };
    let outward = 0;
    for (let t = 0; t < tris.length; t += 3) {
        const a = rowAt(tris[t]);
        const nrm = cross(sub(rowAt(tris[t + 1]), a), sub(rowAt(tris[t + 2]), a));
        const i = Math.floor(tris[t] / row);
        outward += dot(nrm, sub(a, stations[i].at));
    }
    if (outward < 0)
        for (let t = 0; t < tris.length; t += 3) {
            const b = tris[t + 1];
            tris[t + 1] = tris[t + 2];
            tris[t + 2] = b;
        }
    const ringRows = points.map((_, i) => Array.from({ length: M }, (_, j) => i * row + j));
    // A capped end: a centre point, fanned to its ring, facing out.
    const flipped = outward < 0;
    const capAt = (i, facing) => {
        skin = rings[i].skin.length ? rings[i].skin : skin;
        const r = rings[i];
        const st = stations[i];
        const centre = addS(addS(st.at, r.u, r.centre[0]), r.v, r.centre[1]);
        const c = refs.length / 3;
        bind(centre);
        uvs.push(0.5 * uvScale, (st.s - s0) * uvScale);
        for (let j = 0; j < M; j++) {
            const a = i * row + j;
            const b = a + 1;
            // Facing along the sweep at the end, against it at the start.
            if (facing > 0 !== flipped)
                tris.push(c, a, b);
            else
                tris.push(c, b, a);
        }
    };
    if (startEnd === 'cap')
        capAt(0, -1);
    if (endEnd === 'cap')
        capAt(points.length - 1, 1);
    // The skin it covers: the piece's own, between its first and last rings.
    const covered = [];
    const chainBones = new Set(stations.flatMap((st) => st.bones));
    const first = stations[0];
    const last = stations[stations.length - 1];
    for (let v = 0; v < n; v++) {
        if (!chainBones.has(dominant[v]))
            continue;
        if (dot(sub(vert(v), first.at), first.normal) < 0)
            continue;
        if (extra <= 0 && dot(sub(vert(v), last.at), last.normal) > 0)
            continue;
        covered.push(v);
    }
    const rows = refs.length / 3;
    const hems = [];
    if (startEnd === 'open')
        hems.push(ringRows[0]);
    if (endEnd === 'open')
        hems.push(ringRows[ringRows.length - 1]);
    return {
        rows,
        ref: Uint32Array.from(refs),
        weight: Float32Array.from(weight),
        offset: Float32Array.from(offset),
        scale: {},
        source: Uint32Array.from({ length: rows }, (_, i) => i),
        triangles: Uint32Array.from(tris),
        uvs: Float32Array.from(uvs),
        delete: Uint32Array.from(covered),
        hems,
        rings: ringRows,
    };
}
//# sourceMappingURL=body-sweep.js.map