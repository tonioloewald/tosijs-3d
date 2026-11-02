/*
THE SWEEP: every corner body, everything worn on it, measured.

For each corner (corners.ts) the body is morphed as the character builder morphs it
(macroWeights, morphHuman) and rigged (humanRig, UAL's 65 joints). Then:

- each MakeHuman proxy (clothes, hair, brows, beards) is fitted with
  proxy-fit exactly as the character builder fits it: over the body with its nipples
  smoothed (smoothUnder), hats inflated 12 mm about the head's centre,
  armour lifted 5 mm along its normals;
- each of Quaternius' adult hairstyles is placed with hair-fit
  (hair-library.ts), on the scalp or, for beards, the face;
- every fitted vertex is put to the inside test (inside.ts) against the
  bare skin, and the visible part (deeper than the character builder tucks the skin
  there) is counted (penetration.ts);
- the skeleton is checked (bones.ts).

Each item is worn alone: layering (a top over a bottom) is not swept.

Pure: the pack and the hair library come in loaded; the caller does IO.
*/
import { realNow } from './clock.js';
import { humanHeight, macroWeights, morphHuman } from './human-morph.js';
import { humanRig } from './human-rig.js';
import { drawnPositions, fitProxy, inflate, smoothUnder, } from './proxy-fit.js';
import { vertexNormals } from './hair-fit.js';
import { meshSdf } from './mesh-sdf.js';
import { penetration, triangleTuck, tuckDepths, } from './extremes-penetration.js';
import { boneReference, checkBones, } from './extremes-bones.js';
import { closestHead, FACIAL_HAIR, headScalp, placeHair, } from './hair-place.js';
/** The character builder's hat lift (character.ts's HAT_LIFT). */
export const HAT_LIFT = 0.012;
/** The character builder's armour lift along the normals. */
export const ARMOUR_LIFT = 0.005;
/** Pieces of the hair library the sweep wears: adult hair and beards. */
export function sweptHair(pieces) {
    return pieces.filter((p) => p.category === 'hair' &&
        !/_Teen$/.test(p.name) &&
        !p.name.startsWith('Reference_'));
}
export async function makeBody(pack, corner, regions) {
    const full = await morphHuman(pack, macroWeights(corner.body, (n) => pack.has(n)));
    let normals = null;
    return {
        corner,
        full,
        clothBody: regions.nipples
            ? smoothUnder(full, pack.triangles, regions.nipples)
            : full,
        sdf: meshSdf(full, pack.triangles),
        height: humanHeight(full, pack.triangles),
        head: headScalp(pack.manifest, full, pack.triangles, { lips: regions.lips }),
        rig: humanRig(pack.manifest, full, undefined, {
            triangles: pack.triangles,
        }),
        normals: () => (normals ??= vertexNormals(full, pack.triangles)),
    };
}
export function wear(pack, body, w) {
    if (w.kind === 'proxy') {
        const p = w.proxy;
        const rows = fitProxy(p, body.clothBody);
        let drawn = drawnPositions(p, rows);
        let points = rows;
        if (p.slot === 'armour') {
            const n = vertexNormals(drawn, p.triangles);
            for (let i = 0; i < drawn.length; i++)
                drawn[i] = drawn[i] + n[i] * ARMOUR_LIFT;
            points = drawn;
        }
        else if (p.slot === 'hat') {
            inflate(rows, body.head.centre, HAT_LIFT);
            drawn = drawnPositions(p, rows);
        }
        const tested = points;
        return {
            points,
            drawn,
            triangles: p.triangles,
            tuck: () => triangleTuck(pack.triangles, tuckDepths(body.full, body.normals(), p, tested), p.delete),
        };
    }
    const placed = w.piece.parts.map((part) => placeHair(body.head, part, { head: w.head, on: w.on }));
    const all = new Float32Array(placed.reduce((s, p) => s + p.length, 0));
    const tris = [];
    let o = 0;
    w.piece.parts.forEach((part, i) => {
        const p = placed[i];
        all.set(p, o);
        for (const v of part.indices)
            tris.push(v + o / 3);
        o += p.length;
    });
    return {
        points: all,
        drawn: all,
        triangles: Uint32Array.from(tris),
        tuck: null,
    };
}
/** What the sweep wears: the named pack proxies and the library's adult hair. */
export async function wearables(pack, proxies, hair, licences = {}) {
    const out = [];
    for (const name of proxies) {
        const p = await pack.proxy(name);
        if (!p)
            continue;
        const id = `makehuman:proxy/${p.name}`;
        out.push({
            item: {
                id,
                name: p.name,
                source: 'makehuman',
                category: p.category,
                slot: p.slot ?? null,
                licence: licences[p.name] ?? null,
                vertices: 0,
            },
            wearable: { kind: 'proxy', id, proxy: p },
        });
    }
    if (hair)
        for (const piece of sweptHair(hair.pieces)) {
            const facial = FACIAL_HAIR.test(piece.name);
            const id = `quaternius:hair/${piece.name}`;
            out.push({
                item: {
                    id,
                    name: piece.name,
                    source: 'quaternius',
                    category: facial ? 'beard' : 'hair',
                    slot: facial ? 'beard' : 'hair',
                    licence: {
                        licence: 'CC0-1.0',
                        author: 'Quaternius',
                        source: 'https://quaternius.com (quaternius/libraries/hairstyles.glb)',
                    },
                    vertices: 0,
                },
                wearable: {
                    kind: 'hair',
                    id,
                    piece,
                    head: closestHead(piece.parts, hair.heads),
                    on: facial ? 'face' : 'scalp',
                },
            });
        }
    return out;
}
export async function runSweep(input) {
    const { pack, corners } = input;
    const tolerance = input.tolerance ?? 0.001;
    const worn = await wearables(pack, input.proxies, input.hair, input.licences);
    const [nipples, lips] = await Promise.all([
        pack.region('nipples'),
        pack.region('lips'),
    ]);
    let reference = null;
    let boundaryEdges = 0;
    const results = [];
    // The default first: the bone checks are relative to it.
    const order = [...corners].sort((a, b) => a.group === 'default' ? -1 : b.group === 'default' ? 1 : 0);
    for (const corner of order) {
        const t0 = realNow();
        const body = await makeBody(pack, corner, { nipples, lips });
        boundaryEdges = body.sdf.boundaryEdges;
        reference ??= boneReference(body.rig, body.height, body.sdf);
        const bones = checkBones(body.rig, body.height, body.sdf, reference).issues;
        const out = {};
        for (const { item, wearable } of worn) {
            const w = wear(pack, body, wearable);
            // Raw first; the tuck (costly) only when something is inside.
            let r = penetration(body.sdf, w.points, null, { tolerance });
            if (r.raw > 0 && w.tuck)
                r = penetration(body.sdf, w.points, w.tuck(), { tolerance });
            item.vertices = r.vertices;
            // Only what is inside is kept: an absent item was clean on this body.
            if (r.raw === 0)
                continue;
            const { worst: _worst, ...rest } = r;
            out[item.id] = rest;
        }
        const result = {
            corner,
            height: body.height,
            bones,
            items: out,
            ms: Math.round(realNow() - t0),
        };
        results.push(result);
        input.handleCorner?.(results.length, order.length, result);
    }
    return {
        items: worn.map((w) => w.item),
        corners: results,
        boneBaseline: [...(reference?.outside ?? [])],
        boundaryEdges,
    };
}
/*
THE SAVED FORM: a sweep result with each item-on-body as one short row
(depths in tenths of a millimetre), so the JSON stays readable and small
once prettier has laid it out.
*/
export const SAVED_COLUMNS = [
    'raw',
    'rawDepth (0.1 mm)',
    'visible',
    'visibleDepth (0.1 mm)',
    'visible beyond 2 mm',
    'beyond 5 mm',
    'beyond 10 mm',
];
const tenths = (m) => Math.round(m * 10000);
export function saveResult(r) {
    return {
        ...r,
        columns: SAVED_COLUMNS,
        corners: r.corners.map((c) => ({
            ...c,
            height: +c.height.toFixed(4),
            items: Object.fromEntries(Object.entries(c.items).map(([id, p]) => [
                id,
                [
                    p.raw,
                    tenths(p.rawDepth),
                    p.visible,
                    tenths(p.visibleDepth),
                    ...p.visibleBeyond,
                ],
            ])),
        })),
    };
}
export function loadResult(s) {
    const vertices = new Map(s.items.map((i) => [i.id, i.vertices]));
    return {
        items: s.items,
        boneBaseline: s.boneBaseline,
        boundaryEdges: s.boundaryEdges,
        corners: s.corners.map((c) => ({
            ...c,
            items: Object.fromEntries(Object.entries(c.items).map(([id, [raw, rd, visible, vd, b2, b5, b10]]) => [
                id,
                {
                    vertices: vertices.get(id) ?? 0,
                    raw,
                    rawDepth: rd / 10000,
                    visible,
                    visibleDepth: vd / 10000,
                    visibleBeyond: [b2, b5, b10],
                },
            ])),
        })),
    };
}
//# sourceMappingURL=extremes-sweep.js.map