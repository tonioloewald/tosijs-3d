/*#
# rigged-body

**One shape for a character's body, whoever made it.** A rigged body is a
rest mesh on UAL's skeleton with its skin weights: what the
[rig tool](/rig-tool/) makes of any mesh and its markers, and what
[human-rig](/human-rig/) makes of MakeHuman's body and its sliders. Everything
the [character builder](/character-builder/) does with a body (play clips,
stand it on the floor, cut garments, fit hair, dress it) takes a rigged body,
so it works the same on either.

```javascript
import { bodyFromMarkers, buildBody, objTriangles } from 'tosijs-3d'

const body = bodyFromMarkers(objTriangles(text))   // markers guessed
const built = buildBody(scene, 'weasel', body)     // a Babylon skeleton on it
```

THREE PRODUCERS: `bodyFromMarkers` (any mesh and its markers), `humanBodyMaker`
(MakeHuman's sliders), and `loadSkinnedBody` (in [auto-rig](/rig-build/)): a
file already skinned to UAL's skeleton, as Quaternius' characters are or as
you can bind a mesh to it in Blender, taken as it is: its joints, its weights,
no markers. The skeleton to bind to comes with Quaternius'
[Universal Animation Library](https://quaternius.itch.io/universal-animation-library)
and [Universal Base Characters](https://quaternius.itch.io/universal-base-characters)
(CC0, pay what you want; the Blender sources are in the paid tiers): get it
there rather than from the copies this site's demos load.

A rigged body is plain data, Babylon-free:

- **`positions`, `indices`**: the rest mesh, right-handed (as glTF and OBJ
  are): metres, +Y up, facing +Z, its left on +X, in its maker's own frame
  (a file's, standing on y = 0 or near; MakeHuman's is centred on the hips).
  `rig.at('root')` says where its feet are.
- **`rig`**: UAL's 65 joints (`rig.at(name)`), from `fitSkeleton` or MakeHuman's
  joint cubes.
- **`weights`**: four joints and weights per vertex, indexing `rig.joints`.
- **`regions`**: masks, one value per vertex from 0 to 1, where the maker
  knows them: `lips` and `nipples` from MakeHuman. A consumer that wants one
  and finds none does without (or works it out from the shape).
- **`made`**: how it was made, enough to make it again: the markers (and
  where the mesh came from), MakeHuman's slider values, or `skin` (the file's
  own).
- **`uvs`, `colors`, `surfaces`** (a file's, when it has them): its texture
  coordinates, vertex colours (RGBA), and its triangles in runs, one per
  material, each with the file's own material. A consumer draws each surface
  as made or puts its own material on it (the builder's skin).

`buildBody` (in [auto-rig](/rig-build/)) makes it a Babylon skeleton.
*/
/*{ "parent": "b3d-biped", "order": 70 }*/
import { fitSkeleton, guessMarkers, meshQuery, rigSilhouette, skinSegments, } from './rig-fit.js';
import { boneHeat } from './bone-heat.js';
/**
 * A mesh rigged from markers (the rig tool's way): UAL's skeleton fitted to
 * them, the skin bound by bone heat. Markers are guessed from the front
 * outline when not given. About a second for 20,000 vertices.
 */
export function bodyFromMarkers(tris, options = {}) {
    const positions = Float32Array.from(tris.positions);
    const indices = Uint32Array.from(tris.indices);
    const markers = options.markers ?? guessMarkers(rigSilhouette(positions, indices, 'front'));
    const fitted = fitSkeleton(markers, meshQuery(positions, indices), {
        tail: options.tail ?? undefined,
        tailStart: options.tail != null ? options.tailBase ?? undefined : undefined,
        tailBones: options.tailBones,
    });
    const moved = options.joints ?? {};
    const rig = Object.keys(moved).length
        ? (() => {
            const joints = fitted.joints.map((j) => moved[j.name] != null ? { ...j, position: { ...moved[j.name] } } : j);
            const byName = new Map(joints.map((j) => [j.name, j.position]));
            return { ...fitted, joints, at: (name) => byName.get(name) };
        })()
        : fitted;
    return {
        positions,
        indices,
        rig,
        weights: boneHeat(positions, indices, skinSegments(rig)),
        regions: {},
        ...surfaceOf(tris),
        made: {
            by: 'markers',
            source: options.source,
            markers,
            tail: options.tail ?? null,
            ...(options.tail != null && options.tailBase != null
                ? { tailBase: options.tailBase }
                : {}),
            ...(Object.keys(moved).length ? { joints: { ...moved } } : {}),
        },
    };
}
/** A file's uvs, colours and surfaces, carried onto the body made from it. */
export function surfaceOf(tris) {
    return {
        ...(tris.eyes?.length ? { eyes: tris.eyes } : {}),
        ...(tris.uvs ? { uvs: Float32Array.from(tris.uvs) } : {}),
        ...(tris.colors ? { colors: Float32Array.from(tris.colors) } : {}),
        ...(tris.surfaces?.length
            ? { surfaces: tris.surfaces.map((s) => ({ ...s })) }
            : {}),
    };
}
/** An object is an eye when its name says so (`eye`, `eyes`, `eyeball`; not a brow or lash). */
export function isEyeName(name) {
    return name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z]+/)
        .some((w) => /^eye(s|ball|balls)?$/i.test(w));
}
/**
 * Eye triangles (one object or several) as one eye per side: each triangle
 * goes to the side its centre is on (left is +X). Left first; a side with
 * none is left out.
 */
export function splitEyes(positions, indices) {
    const sides = [1, -1].map((sign) => {
        const remap = new Map();
        const pos = [];
        const ix = [];
        for (let t = 0; t < indices.length; t += 3) {
            const x = positions[indices[t] * 3] +
                positions[indices[t + 1] * 3] +
                positions[indices[t + 2] * 3];
            if (x * sign <= 0)
                continue;
            for (let k = 0; k < 3; k++) {
                const v = indices[t + k];
                let at = remap.get(v);
                if (at == null) {
                    at = pos.length / 3;
                    remap.set(v, at);
                    pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
                }
                ix.push(at);
            }
        }
        return { positions: Float32Array.from(pos), indices: Uint32Array.from(ix) };
    });
    return sides.filter((e) => e.indices.length > 0);
}
/** An eye's centre (the middle of its bounds) and radius. */
export function eyeCentre(eye) {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    const p = eye.positions;
    for (let i = 0; i < p.length; i += 3)
        for (let k = 0; k < 3; k++) {
            lo[k] = Math.min(lo[k], p[i + k]);
            hi[k] = Math.max(hi[k], p[i + k]);
        }
    const c = lo.map((l, k) => (l + hi[k]) / 2);
    let r = 0;
    for (let i = 0; i < p.length; i += 3)
        r = Math.max(r, Math.hypot(p[i] - c[0], p[i + 1] - c[1], p[i + 2] - c[2]));
    return { centre: { x: c[0], y: c[1], z: c[2] }, radius: r };
}
/*
A BLINK FROM THE SHAPE: a body with eyeballs but no lid targets (Blender's
base meshes) closes its eyes by turning its lids about the eye's centre, so
the skin slides over the eyeball rather than through it. The opening is read
off the skin near the eyeball: across the eye, in strips, the lowest point
of skin above the centre is the upper lid's edge and the highest below it
the lower lid's. The lids meet `close` of the way up the opening (the upper
lid does most of the work), and the skin further from the edge moves less.
No opening (skin over the eye, as on a painted face) means no blink: null.
*/
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/**
 * A blink for one eye as a morph: how far each of the body's vertices moves
 * (three numbers each, most of them zero), or null if the skin has no
 * opening round the eye.
 */
export function lidBlink(positions, eye, options = {}) {
    const close = options.close ?? 0.3;
    const reach = options.reach ?? 2;
    const { centre: c, radius: r } = eyeCentre(eye);
    const n = positions.length / 3;
    const strips = 9;
    const span = 1.3;
    const upper = new Array(strips).fill(Infinity);
    const lower = new Array(strips).fill(-Infinity);
    const stripOf = (x) => Math.round((((x - c.x) / r / span + 1) / 2) * (strips - 1));
    for (let i = 0; i < n; i++) {
        const dx = positions[i * 3] - c.x;
        const dy = positions[i * 3 + 1] - c.y;
        const dz = positions[i * 3 + 2] - c.z;
        if (dz < 0 || Math.abs(dx) > span * r)
            continue;
        if (Math.hypot(dx, dy, dz) > 1.5 * r)
            continue;
        const k = stripOf(positions[i * 3]);
        const a = Math.atan2(dy, dz);
        if (a > 0)
            upper[k] = Math.min(upper[k], a);
        else
            lower[k] = Math.max(lower[k], a);
    }
    // Strips with no edge take their nearest neighbour's.
    const fill = (edges) => {
        for (let k = 0; k < strips; k++) {
            if (Number.isFinite(edges[k]))
                continue;
            for (let step = 1; step < strips; step++) {
                const near = [edges[k - step], edges[k + step]].find((e) => e != null && Number.isFinite(e));
                if (near != null) {
                    edges[k] = near;
                    break;
                }
            }
        }
    };
    const mid = (strips - 1) / 2;
    const open = upper[mid] - lower[mid];
    // An opening a lid could close: more than a slit, less than a missing face.
    if (!(open > (8 * Math.PI) / 180 && open < (140 * Math.PI) / 180))
        return null;
    fill(upper);
    fill(lower);
    const edgeAt = (edges, x) => {
        const f = Math.max(0, Math.min(strips - 1, (((x - c.x) / r / span + 1) / 2) * (strips - 1)));
        const k = Math.min(strips - 2, Math.floor(f));
        return edges[k] + (edges[k + 1] - edges[k]) * (f - k);
    };
    const upperFold = (60 * Math.PI) / 180;
    const lowerFold = (35 * Math.PI) / 180;
    const overlap = (3 * Math.PI) / 180;
    const band = (6 * Math.PI) / 180;
    const out = new Float32Array(positions.length);
    for (let i = 0; i < n; i++) {
        const x = positions[i * 3];
        const dx = x - c.x;
        const dy = positions[i * 3 + 1] - c.y;
        const dz = positions[i * 3 + 2] - c.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > reach * r || dz < -0.2 * r)
            continue;
        const across = 1 - smooth((Math.abs(dx) / r - 1.3) / 0.5);
        const near = 1 - smooth((d / r - 1.3) / (reach - 1.3));
        const weight = across * near;
        if (weight <= 0)
            continue;
        const up = edgeAt(upper, x);
        const down = edgeAt(lower, x);
        const meet = down + close * (up - down);
        const a = Math.atan2(dy, dz);
        // Each lid goes a little past where they meet, so no seam shows. Its
        // edge (the skin within `band` of it, and any the strips read as inside
        // the opening) lands on that line exactly, or the edge is as ragged
        // closed as its vertices are uneven open; the fold above eases back.
        const top = meet - overlap;
        const bottom = meet + overlap;
        let turn;
        if (a > meet) {
            const edge = up + band;
            turn =
                a <= edge
                    ? top - a
                    : (top - edge) * (1 - smooth((a - edge) / (upperFold - band)));
        }
        else {
            const edge = down - band;
            turn =
                a >= edge
                    ? bottom - a
                    : (bottom - edge) * (1 - smooth((edge - a) / (lowerFold - band)));
        }
        turn *= weight;
        if (turn === 0)
            continue;
        const yz = Math.hypot(dy, dz);
        out[i * 3 + 1] = yz * Math.sin(a + turn) - dy;
        out[i * 3 + 2] = yz * Math.cos(a + turn) - dz;
    }
    return out;
}
/*
AN EYE'S UVS ARE MADE, NOT READ: a file's eye can be mapped any way, so it is
mapped the same way every time. Each point goes by its angle from straight
ahead (+Z, where the body faces) and its direction round that axis: the iris
(about 29° across the radius, a real iris on a real eyeball) lands on the
disc an eye texture paints, and the sclera round it, to a ring where the back
of the eye, unseen in the socket, gathers.
*/
/**
 * UVs for an eye on an eye texture's layout: the iris centred on `at` (u, v
 * from the bottom), `iris` its radius in UV.
 */
export function eyeUvs(eye, layout, options = {}) {
    const irisAngle = ((options.irisDeg ?? 29) * Math.PI) / 180;
    const back = options.back ?? layout.iris * 2.5;
    const { centre } = eyeCentre(eye);
    const p = eye.positions;
    const out = new Float32Array((p.length / 3) * 2);
    for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
        const x = p[i] - centre.x;
        const y = p[i + 1] - centre.y;
        const z = p[i + 2] - centre.z;
        const side = Math.hypot(x, y);
        const r = Math.min(back, (layout.iris * Math.atan2(side, z)) / irisAngle);
        // Left is +X: seen from the front, the eye's +X is the picture's left.
        const cos = side > 1e-9 ? -x / side : 0;
        const sin = side > 1e-9 ? y / side : 0;
        out[j] = layout.at.u + r * cos;
        out[j + 1] = layout.at.v + r * sin;
    }
    return out;
}
//# sourceMappingURL=rigged-body.js.map