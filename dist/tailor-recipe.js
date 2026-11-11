/*#
# tailor-recipe

A tailor's garment as a RECIPE that fits any body: its outlines, its
thickness and how it is made (cut from the skin, a skirt, draped cloth), plus
where the joints of the body it was drawn on were. `recutGarment(body, cut)`
makes it again on another rigged body: MakeHuman's at any slider setting,
or a mesh rigged from markers.

Outlines are drawn in metres in the front view, so on a taller or wider body
the same numbers fall in the wrong place. A recipe therefore carries its
body's LANDMARKS (the joints, seen from the front: hips, knees, ankles,
shoulders, elbows, wrists, the spine), and each outline point is carried to
the new body by a smooth warp that takes those joints exactly onto the new
body's (a thin-plate spline). A hem drawn at the knee lands at the knee, a
cuff at the wrist; between joints the outline bends smoothly with the body,
and beyond them (a cloak's hem below the feet) it carries on the same way.

- `outlineLandmarks(rig)`: a body's landmarks.
- `warpOutline(shapes, from, to)`: outlines from one body's landmarks to another's.
- `fitCut(cut, rig)`: a cut on the body it is about to be cut from (its
  shapes warped there, `on` updated).
- `tailorBody(body)`: the body as cutting needs it (the chest smoothed so
  cloth bridges it, which skin a skirt may go round, a tail left out).
- `recutGarment(body, cut)`: the garment, made on `body` (async: a draped
  cut settles a simulation).

Pure: no engine. The tailor tool records `on` with every cut it makes, and
keeps a cut's outlines on the body when the body changes shape.
*/
/*{ "parent": "tailor-tool", "order": 10 }*/
import { cutGarment, rebindCut, skirtGarment, mirrorOutline, } from './garment-cut.js';
import { remesh } from './remesh.js';
import { drapeGarmentAsync } from './cloth-drape.js';
import { smoothUnder } from './proxy-fit.js';
/** The edge length each density aims for, metres. */
export const TAILOR_MESH_EDGE = {
    coarse: 0.03,
    medium: 0.02,
    fine: 0.012,
};
/** How far cloth relaxes across creases (garment-cut's `ease`). */
export const TAILOR_EASE = 6;
/** The joints a body's outline is measured from (UAL names). */
export const OUTLINE_JOINTS = [
    'pelvis',
    'spine_01',
    'spine_03',
    'neck_01',
    'head',
    'clavicle_l',
    'upperarm_l',
    'lowerarm_l',
    'hand_l',
    'thigh_l',
    'calf_l',
    'foot_l',
    'ball_l',
];
/** A body's landmarks: the outline joints it has, seen from the front. */
export function outlineLandmarks(rig) {
    const out = {};
    for (const name of OUTLINE_JOINTS) {
        const p = rig.at(name);
        if (p)
            out[name] = [p.x, p.y];
    }
    return out;
}
/*
THE WARP is a 2D thin-plate spline (Bookstein 1989) through the landmarks the
two bodies share: exact at each, the smoothest bend between, affine far away.
The left side's joints are mirrored to the right so the midline stays put;
joints on the midline (the spine) are taken once.
*/
function pairs(from, to) {
    const a = [];
    const b = [];
    for (const name of Object.keys(from)) {
        const p = from[name];
        const q = to[name];
        if (!q)
            continue;
        a.push(p);
        b.push(q);
        if (Math.abs(p[0]) > 0.01 && Math.abs(q[0]) > 0.01) {
            a.push([-p[0], p[1]]);
            b.push([-q[0], q[1]]);
        }
    }
    return { a, b };
}
const kernel = (r2) => (r2 < 1e-12 ? 0 : r2 * Math.log(r2));
/** Solve `A x = b` (Gaussian elimination, partial pivoting). */
function solve(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++)
            if (Math.abs(M[r][c]) > Math.abs(M[p][c]))
                p = r;
        [M[c], M[p]] = [M[p], M[c]];
        const d = M[c][c];
        if (Math.abs(d) < 1e-12)
            continue;
        for (let r = 0; r < n; r++) {
            if (r === c)
                continue;
            const f = M[r][c] / d;
            if (f === 0)
                continue;
            for (let k = c; k <= n; k++)
                M[r][k] -= f * M[c][k];
        }
    }
    return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}
/** The warp taking `from`'s landmarks onto `to`'s, as a function of a point. */
export function landmarkWarp(from, to) {
    const { a, b } = pairs(from, to);
    const n = a.length;
    if (n < 3)
        return (p) => [p[0], p[1]];
    const size = n + 3;
    const L = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++)
            L[i][j] = kernel((a[i][0] - a[j][0]) ** 2 + (a[i][1] - a[j][1]) ** 2);
        L[i][n] = L[n][i] = 1;
        L[i][n + 1] = L[n + 1][i] = a[i][0];
        L[i][n + 2] = L[n + 2][i] = a[i][1];
    }
    const wx = solve(L, [...b.map((q) => q[0]), 0, 0, 0]);
    const wy = solve(L, [...b.map((q) => q[1]), 0, 0, 0]);
    return (p) => {
        let x = wx[n] + wx[n + 1] * p[0] + wx[n + 2] * p[1];
        let y = wy[n] + wy[n + 1] * p[0] + wy[n + 2] * p[1];
        for (let i = 0; i < n; i++) {
            const u = kernel((p[0] - a[i][0]) ** 2 + (p[1] - a[i][1]) ** 2);
            x += wx[i] * u;
            y += wy[i] * u;
        }
        return [x, y];
    };
}
/** Outlines carried from one body's landmarks to another's. */
export function warpOutline(shapes, from, to) {
    const warp = landmarkWarp(from, to);
    return shapes.map((shape) => shape.map((p) => warp(p)));
}
/**
 * A cut on the body whose rig is `rig`: its shapes warped from the body they
 * were drawn on (when it says), and `on` set to this body. A copy.
 */
export function fitCut(cut, rig) {
    const here = outlineLandmarks(rig);
    const shapes = cut.on
        ? warpOutline(cut.shapes, cut.on, here)
        : cut.shapes.map((s) => s.map((p) => [p[0], p[1]]));
    return { ...cut, shapes, on: here };
}
const ARM = /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/;
/** The body as the tailor cuts from it (see `TailorBody`). */
export function tailorBody(body) {
    const nipples = body.regions.nipples;
    const fitOn = nipples
        ? smoothUnder(body.positions, body.indices, nipples)
        : body.positions;
    const bones = (test) => new Set(body.rig.joints
        .map((j, i) => (test.test(j.name) ? i : -1))
        .filter((i) => i >= 0));
    const n = body.positions.length / 3;
    const w = body.weights;
    const share = (set, v) => {
        let a = 0;
        for (let k = 0; k < 4; k++)
            if (set.has(w.indices[v * 4 + k]))
                a += w.weights[v * 4 + k];
        return a;
    };
    const arm = bones(ARM);
    const notArm = new Uint8Array(n);
    for (let v = 0; v < n; v++)
        notArm[v] = share(arm, v) < 0.5 ? 1 : 0;
    // A tail is behind the body, inside any outline drawn round the hips, and
    // swung by its spring: cloth is not cut from it.
    const tail = bones(/^tail_/);
    let cutFrom = body.indices;
    if (tail.size) {
        const kept = [];
        const I = body.indices;
        const on = (v) => share(tail, v) >= 0.5;
        for (let i = 0; i < I.length; i += 3)
            if (!on(I[i]) && !on(I[i + 1]) && !on(I[i + 2]))
                kept.push(I[i], I[i + 1], I[i + 2]);
        cutFrom = Uint32Array.from(kept);
    }
    return { fitOn, cutFrom, notArm };
}
/**
 * Cut a garment from a prepared body, without draping (a draped cut is cut
 * from the skin here; `recutGarment` drapes it). `dummy` supplies the even
 * surface for a density, so a caller can keep them (the tool does).
 */
export function cutWith(body, prepared, cut, dummy) {
    const outline = mirrorOutline(cut.shapes.filter((s) => s.length >= 3));
    if (!outline.length)
        return null;
    const { fitOn, cutFrom, notArm } = prepared;
    if (cut.skirt)
        return skirtGarment(fitOn, cutFrom, {
            front: outline,
            thickness: cut.thickness,
            anchor: notArm,
        });
    const density = cut.mesh ?? 'medium';
    if (density === 'body') {
        const nipples = body.regions.nipples;
        // Thicker cloth bridges more of the chest.
        const cutOn = nipples
            ? smoothUnder(body.positions, body.indices, nipples, {
                bridge: cut.thickness / 0.02,
            })
            : fitOn;
        return cutGarment(cutOn, cutFrom, {
            front: outline,
            thickness: cut.thickness,
            ease: TAILOR_EASE,
            fitOn,
        });
    }
    // Cut from the even surface, then bound to the body itself.
    const d = dummy?.(density) ??
        remesh(fitOn, cutFrom, { edge: TAILOR_MESH_EDGE[density] });
    return rebindCut(cutGarment(d.positions, d.triangles, {
        front: outline,
        thickness: cut.thickness,
        ease: TAILOR_EASE,
    }), d, fitOn);
}
/**
 * A tailor's cut made on `body`: its outlines warped onto this body (when the
 * cut says which body it was drawn on), then cut, skirted or draped as it
 * says. Null when it has no outline.
 */
export async function recutGarment(body, cut, options = {}) {
    const fitted = fitCut(cut, body.rig);
    const prepared = tailorBody(body);
    if (!fitted.drape || fitted.skirt)
        return cutWith(body, prepared, fitted);
    const outline = mirrorOutline(fitted.shapes.filter((s) => s.length >= 3));
    if (!outline.length)
        return null;
    const density = fitted.mesh === 'body' ? 'medium' : fitted.mesh ?? 'medium';
    const edge = TAILOR_MESH_EDGE[density];
    const surface = remesh(prepared.fitOn, prepared.cutFrom, { edge });
    return drapeGarmentAsync(surface, prepared.fitOn, { front: outline, thickness: fitted.thickness, edge }, { signal: options.signal });
}
//# sourceMappingURL=tailor-recipe.js.map