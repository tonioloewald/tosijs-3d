/*
THE CONTACT SHEET, headless: the worst cases drawn by a small software
rasteriser (z-buffered triangles, flat Lambert shading) into one PNG, so
the sweep needs no browser and no GPU.

Each case is two views of one item on the body it fails worst on, at the
rest pose: from the front (+Z) and from the character's left (+X), framed
on the item. The body is grey (as the character builder shows it under a garment:
the skin it covers dropped or drawn in), the item blue, and every vertex of the item
that is visibly inside the skin is a red dot drawn over everything (so it
shows even from behind). Each case carries its number (top left), which
the report's table follows.

Pure apart from the pack (fetched targets are already loaded).
*/
import { pngEncode } from './png.js';
import { makeBody, wear, wearables } from './extremes-sweep.js';
import { tuckDepths, visibleMask } from './extremes-penetration.js';
export const VIEW_W = 180;
export const VIEW_H = 300;
const PER_ROW = 3;
/** The cases the sheet draws: the worst body of each of the worst items. */
export function sheetCases(summary, count = 12) {
    const out = [];
    const seen = new Set();
    for (const w of summary.worstCases) {
        if (seen.has(w.item))
            continue;
        seen.add(w.item);
        out.push({ item: w.item, corner: w.corner });
        if (out.length === count)
            break;
    }
    return out;
}
// 3x5 digits, rows top to bottom, bits left to right.
const DIGITS = [
    '111101101101111',
    '010110010010111',
    '111001111100111',
    '111001111001111',
    '101101111001001',
    '111100111001111',
    '111100111101111',
    '111001001001001',
    '111101111101111',
    '111101111001111',
];
class Canvas {
    w;
    h;
    rgba;
    z;
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.rgba = new Uint8Array(w * h * 4);
        for (let i = 0; i < w * h; i++)
            this.rgba.set([250, 250, 248, 255], i * 4);
        this.z = new Float32Array(w * h).fill(-Infinity);
    }
    px(x, y, c) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h)
            return;
        this.rgba.set([c[0], c[1], c[2], 255], (y * this.w + x) * 4);
    }
    digit(n, x0, y0, scale = 3) {
        const s = String(n);
        for (let d = 0; d < s.length; d++) {
            const bits = DIGITS[Number(s[d])];
            for (let r = 0; r < 5; r++)
                for (let c = 0; c < 3; c++)
                    if (bits[r * 3 + c] === '1')
                        for (let a = 0; a < scale; a++)
                            for (let b = 0; b < scale; b++)
                                this.px(x0 + d * 4 * scale + c * scale + a, y0 + r * scale + b, [20, 20, 20]);
        }
    }
}
function frame(points, side, ox, oy) {
    let lo = [Infinity, Infinity, Infinity];
    let hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < points.length; i += 3)
        for (let k = 0; k < 3; k++) {
            lo[k] = Math.min(lo[k], points[i + k]);
            hi[k] = Math.max(hi[k], points[i + k]);
        }
    const pad = 0.08;
    lo = lo.map((v) => v - pad);
    hi = hi.map((v) => v + pad);
    // Horizontal axis: x from the front, -z from the left (+X) side.
    const hLo = side ? -hi[2] : lo[0];
    const hHi = side ? -lo[2] : hi[0];
    const s = Math.min(VIEW_W / (hHi - hLo), VIEW_H / (hi[1] - lo[1]));
    const cx = (hLo + hHi) / 2;
    const cy = (lo[1] + hi[1]) / 2;
    return {
        project: (x, y, z) => [
            ox + VIEW_W / 2 + ((side ? -z : x) - cx) * s,
            oy + VIEW_H / 2 - (y - cy) * s,
            side ? x : z,
        ],
        eye: side ? [1, 0, 0] : [0, 0, 1],
    };
}
function drawMesh(cv, view, positions, triangles, colour, clip) {
    const [cx0, cy0, cx1, cy1] = clip;
    for (let t = 0; t < triangles.length; t += 3) {
        const ia = triangles[t] * 3;
        const ib = triangles[t + 1] * 3;
        const ic = triangles[t + 2] * 3;
        const A = [positions[ia], positions[ia + 1], positions[ia + 2]];
        const B = [positions[ib], positions[ib + 1], positions[ib + 2]];
        const C = [positions[ic], positions[ic + 1], positions[ic + 2]];
        const ux = B[0] - A[0];
        const uy = B[1] - A[1];
        const uz = B[2] - A[2];
        const vx = C[0] - A[0];
        const vy = C[1] - A[1];
        const vz = C[2] - A[2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        // Two-sided: cloth and hair are seen from inside too.
        const lambert = Math.abs((nx * view.eye[0] + ny * view.eye[1] + nz * view.eye[2]) / nl);
        const shade = 0.35 + 0.65 * lambert;
        const c = colour.map((v) => Math.round(v * shade));
        const [ax, ay, az] = view.project(A[0], A[1], A[2]);
        const [bx, by, bz] = view.project(B[0], B[1], B[2]);
        const [qx, qy, qz] = view.project(C[0], C[1], C[2]);
        const x0 = Math.max(cx0, Math.floor(Math.min(ax, bx, qx)));
        const x1 = Math.min(cx1 - 1, Math.ceil(Math.max(ax, bx, qx)));
        const y0 = Math.max(cy0, Math.floor(Math.min(ay, by, qy)));
        const y1 = Math.min(cy1 - 1, Math.ceil(Math.max(ay, by, qy)));
        const area = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
        if (Math.abs(area) < 1e-9)
            continue;
        for (let y = y0; y <= y1; y++)
            for (let x = x0; x <= x1; x++) {
                const px = x + 0.5;
                const py = y + 0.5;
                const w0 = ((bx - px) * (qy - py) - (by - py) * (qx - px)) / area;
                const w1 = ((qx - px) * (ay - py) - (qy - py) * (ax - px)) / area;
                const w2 = 1 - w0 - w1;
                if (w0 < 0 || w1 < 0 || w2 < 0)
                    continue;
                const z = w0 * az + w1 * bz + w2 * qz;
                const k = y * cv.w + x;
                if (z <= cv.z[k])
                    continue;
                cv.z[k] = z;
                cv.px(x, y, c);
            }
    }
}
/** Draw the sheet. `hair` is the library the sweep wore, when it did. */
export async function contactSheet(pack, result, summary, hair, cases = sheetCases(summary)) {
    const rows = Math.max(1, Math.ceil(cases.length / PER_ROW));
    const W = PER_ROW * VIEW_W * 2 + (PER_ROW - 1) * 12;
    const cv = new Canvas(W, rows * (VIEW_H + 12));
    const [nipples, lips] = await Promise.all([
        pack.region('nipples'),
        pack.region('lips'),
    ]);
    const names = [
        ...new Set(cases
            .map((c) => c.item)
            .filter((i) => i.startsWith('makehuman:proxy/'))
            .map((i) => i.slice('makehuman:proxy/'.length))),
    ];
    const all = await wearables(pack, names, hair);
    for (let n = 0; n < cases.length; n++) {
        const kase = cases[n];
        const corner = result.corners.find((c) => c.corner.id === kase.corner)?.corner;
        const found = all.find((w) => w.item.id === kase.item);
        if (!corner || !found)
            continue;
        const body = await makeBody(pack, corner, { nipples, lips });
        const worn = wear(pack, body, found.wearable);
        const mask = visibleMask(body.sdf, worn.points, worn.tuck ? worn.tuck() : null);
        // The skin as the character builder shows it under a garment: covered triangles
        // dropped, covered skin drawn in by its tuck (without the edge fade).
        let skin = body.full;
        let skinTriangles = pack.triangles;
        if (found.wearable.kind === 'proxy') {
            const p = found.wearable.proxy;
            const normals = body.normals();
            const depth = tuckDepths(body.full, normals, p, worn.points);
            skin = Float32Array.from(body.full);
            for (let v = 0; v < depth.length; v++)
                for (let k = 0; k < 3; k++)
                    skin[v * 3 + k] = skin[v * 3 + k] - normals[v * 3 + k] * depth[v];
            if (p.delete && p.slot !== 'glasses') {
                const del = new Uint8Array(depth.length);
                for (const v of p.delete)
                    del[v] = 1;
                const keep = [];
                for (let t = 0; t < pack.triangles.length; t += 3) {
                    const a = pack.triangles[t];
                    const b = pack.triangles[t + 1];
                    const c = pack.triangles[t + 2];
                    if (!(del[a] && del[b] && del[c]))
                        keep.push(a, b, c);
                }
                skinTriangles = Uint32Array.from(keep);
            }
        }
        const ox = (n % PER_ROW) * (VIEW_W * 2 + 12);
        const oy = Math.floor(n / PER_ROW) * (VIEW_H + 12);
        for (const side of [false, true]) {
            const vx = ox + (side ? VIEW_W : 0);
            const view = frame(worn.drawn, side, vx, oy);
            const clip = [
                vx,
                oy,
                vx + VIEW_W,
                oy + VIEW_H,
            ];
            drawMesh(cv, view, skin, skinTriangles, [205, 200, 195], clip);
            drawMesh(cv, view, worn.drawn, worn.triangles, [90, 135, 205], clip);
            for (let i = 0; i < mask.length; i++) {
                if (!mask[i])
                    continue;
                const [sx, sy] = view.project(worn.points[i * 3], worn.points[i * 3 + 1], worn.points[i * 3 + 2]);
                for (let a = -1; a <= 1; a++)
                    for (let b = -1; b <= 1; b++) {
                        const x = Math.round(sx) + a;
                        const y = Math.round(sy) + b;
                        if (x >= clip[0] && x < clip[2] && y >= clip[1] && y < clip[3])
                            cv.px(x, y, [220, 30, 30]);
                    }
            }
        }
        cv.digit(n + 1, ox + 4, oy + 4);
    }
    return pngEncode(cv.rgba, cv.w, cv.h);
}
//# sourceMappingURL=extremes-sheet.js.map