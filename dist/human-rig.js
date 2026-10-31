/*#
# human-rig

UAL's 65-joint skeleton on a [human pack](/human-pack/)'s body, placed from
the body itself: every joint is the centre of one of MakeHuman's **joint
cubes**, small groups of vertices inside the mesh that the shape targets move
along with the skin. So a morphed body carries its own joint positions, and
nothing is fitted or guessed.


The [character builder](/character-builder/) shows it: the body walking while its sliders move.

## How it works

MakeHuman's own 163-bone skeleton is not used, only where its joints are. The
result is a `FittedRig`, the same thing the auto-rig produces from markers, so
the rest of that pipeline applies unchanged: `skinSegments` and `boneHeat`
bind the skin, `buildRig` makes the Babylon skeleton, and `retargetClip` plays
UAL's clips on it. The skin weights depend only on the mesh's topology, so
they are computed once per base and reused for every body.

`HM08_UAL` is the table, a row per UAL joint: its parent and the joint cube
it sits at (`bone____head` or `bone____tail`, in MakeHuman's naming), or a
rule for the two that have no cube (`root` is on the floor under the pelvis).
A base with different joint cubes brings its own table.

The pack is right-handed and a character faces +Z with its left on +X, as
`rig-fit` assumes, so MakeHuman's `.L` is UAL's `_l`.
*/
/*{ "parent": "character-builder", "order": 30 }*/
import { skinSegments } from './rig-fit.js';
import { humanJoint, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, } from './human-morph.js';
import { boneHeat } from './bone-heat.js';
const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
function hm08Table() {
    const rows = [
        // `root` is placed by rule (the floor under the pelvis); `at` is unused.
        { name: 'root', parent: null, at: 'spine05____head' },
        { name: 'pelvis', parent: 'root', at: 'spine05____head' },
        /*
        THE SPINE IS UAL'S COLUMN, not MakeHuman's curve. MakeHuman's joint cubes
        trace a real spine: the mid-back joint near the back, the neck leaning
        17° forward out of it. UAL's clips were made on a nearly straight column
        through the middle of the body (its leans, measured from UAL1's rest
        pose, are these), and played on the curve they hunch the head forward.
        */
        { name: 'spine_01', parent: 'pelvis', at: 'spine04____head', lean: 14.2 },
        { name: 'spine_02', parent: 'spine_01', at: 'spine02____head', lean: 7.4 },
        { name: 'spine_03', parent: 'spine_02', at: 'spine01____head', lean: -1.8 },
        { name: 'neck_01', parent: 'spine_03', at: 'neck01____head', lean: -1.9 },
        {
            name: 'Head',
            parent: 'neck_01',
            at: 'head____head',
            end: 'head____tail',
            lean: 10.9,
        },
    ];
    for (const [s, S] of [
        ['l', 'L'],
        ['r', 'R'],
    ]) {
        rows.push({
            name: `clavicle_${s}`,
            parent: 'spine_03',
            at: `clavicle.${S}____head`,
        }, {
            name: `upperarm_${s}`,
            parent: `clavicle_${s}`,
            at: `upperarm01.${S}____head`,
        }, {
            name: `lowerarm_${s}`,
            parent: `upperarm_${s}`,
            at: `lowerarm01.${S}____head`,
        }, { name: `hand_${s}`, parent: `lowerarm_${s}`, at: `wrist.${S}____head` });
        FINGERS.forEach((f, i) => {
            const mh = `finger${i + 1}`;
            rows.push({
                name: `${f}_01_${s}`,
                parent: `hand_${s}`,
                at: `${mh}-1.${S}____head`,
            }, {
                name: `${f}_02_${s}`,
                parent: `${f}_01_${s}`,
                at: `${mh}-2.${S}____head`,
            }, {
                name: `${f}_03_${s}`,
                parent: `${f}_02_${s}`,
                at: `${mh}-3.${S}____head`,
            }, {
                name: `${f}_04_leaf_${s}`,
                parent: `${f}_03_${s}`,
                at: `${mh}-3.${S}____tail`,
            });
        });
        rows.push({ name: `thigh_${s}`, parent: 'pelvis', at: `upperleg01.${S}____head` }, {
            name: `calf_${s}`,
            parent: `thigh_${s}`,
            at: `lowerleg01.${S}____head`,
        }, { name: `foot_${s}`, parent: `calf_${s}`, at: `foot.${S}____head` }, { name: `ball_${s}`, parent: `foot_${s}`, at: `toe3-1.${S}____head` }, { name: `ball_leaf_${s}`, parent: `ball_${s}`, at: `toe3-3.${S}____tail` });
    }
    return rows;
}
/** hm08's joint cubes → UAL's 65 joints. */
export const HM08_UAL = Object.freeze(hm08Table());
/**
 * UAL's skeleton for a body: `positions` are the morphed pack positions (all
 * vertices, the pack's frame). Joints whose cube the pack lacks are reported
 * by throwing, since a table that does not match its base is a build error.
 */
export function humanRig(manifest, positions, table = HM08_UAL, options = {}) {
    const cube = (name) => {
        const verts = manifest.joints[name];
        if (verts == null)
            throw new Error(`human-rig: no joint cube ${name}`);
        const [x, y, z] = humanJoint(positions, verts);
        return { x, y, z };
    };
    // The floor: the sole, the lowest point of the skin; or, without the
    // triangles, the lowest foot joint cube (inside the foot, so too high).
    let floor = Infinity;
    if (options.triangles != null) {
        for (let i = 0; i < options.triangles.length; i++) {
            floor = Math.min(floor, positions[options.triangles[i] * 3 + 1]);
        }
    }
    else {
        for (const r of table) {
            if (r.name.startsWith('ball_leaf_') || r.name.startsWith('foot_')) {
                floor = Math.min(floor, cube(r.at).y);
            }
        }
    }
    const joints = [];
    const byName = new Map();
    for (const r of table) {
        let position = cube(r.at);
        if (r.name === 'root') {
            const pelvis = position;
            position = { x: pelvis.x, y: floor, z: pelvis.z };
        }
        const from = r.parent != null ? byName.get(r.parent) : undefined;
        if (r.lean != null && from != null) {
            const rise = position.y - from.y;
            position = {
                ...position,
                z: from.z + rise * Math.tan((r.lean * Math.PI) / 180),
            };
        }
        joints.push({
            name: r.name,
            parent: r.parent,
            position,
            end: r.end != null ? cube(r.end) : undefined,
        });
        byName.set(r.name, position);
    }
    return {
        joints,
        // Every finger is a real finger on this mesh, so each takes the skin.
        fingers: { l: [...FINGERS], r: [...FINGERS] },
        at: (name) => byName.get(name),
    };
}
export function humanSkin(pack) {
    const remap = new Int32Array(pack.manifest.vertexCount).fill(-1);
    const vertices = [];
    const triangles = new Uint32Array(pack.triangles.length);
    pack.triangles.forEach((v, i) => {
        if (remap[v] < 0) {
            remap[v] = vertices.length;
            vertices.push(v);
        }
        triangles[i] = remap[v];
    });
    const list = Uint32Array.from(vertices);
    return {
        vertices: list,
        triangles,
        positions(full, into) {
            const out = into ?? new Float32Array(list.length * 3);
            for (let i = 0; i < list.length; i++) {
                const o = list[i] * 3;
                out[i * 3] = full[o];
                out[i * 3 + 1] = full[o + 1];
                out[i * 3 + 2] = full[o + 2];
            }
            return out;
        },
    };
}
/**
 * Make the head rigid in `weights` (in place): skin above the head joint,
 * and the face in front of it down to under the chin, moves wholly with the
 * head bone, blended in so the neck has no seam. Bone heat shares the face between head and neck, so the
 * eyelids slid over the eyeballs (which ride the head) whenever a clip moved
 * the neck. `positions` are the compact skin's (xyz), `rig` the fitted rig.
 */
export function stiffenHead(weights, positions, rig, options = {}) {
    const name = options.head ?? 'Head';
    const head = rig.joints.findIndex((j) => j.name === name);
    const at = rig.at(name);
    if (head < 0 || at == null)
        return;
    const blend = options.blend ?? 0.04;
    const n = positions.length / 3;
    const smooth = (x, a, b) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };
    for (let v = 0; v < n; v++) {
        const y = positions[v * 3 + 1];
        const z = positions[v * 3 + 2];
        // Above the head joint (which is at about nose height on hm08)...
        const above = smooth(y - at.y, 0, blend);
        // ...and the FACE below it: in front of the joint, down to under the chin.
        // The jaw is part of the head; left to the neck, the face sheared
        // whenever a clip turned the neck (Idle's look-around most).
        const face = smooth(z - at.z, 0.02, 0.045) * smooth(y - at.y, -0.1, -0.085);
        const k = Math.max(above, face);
        if (k === 0)
            continue;
        // Scale the others down and give the head what they lose.
        let toHead = 0;
        let slot = -1;
        for (let i = 0; i < 4; i++) {
            if (weights.indices[v * 4 + i] === head)
                slot = i;
            else {
                toHead += weights.weights[v * 4 + i] * k;
                weights.weights[v * 4 + i] *= 1 - k;
            }
        }
        if (slot < 0) {
            // The head was not among its four: take the weakest place.
            let weakest = 0;
            for (let i = 1; i < 4; i++) {
                if (weights.weights[v * 4 + i] < weights.weights[v * 4 + weakest])
                    weakest = i;
            }
            toHead += weights.weights[v * 4 + weakest];
            weights.weights[v * 4 + weakest] = 0;
            weights.indices[v * 4 + weakest] = head;
            slot = weakest;
        }
        weights.weights[v * 4 + slot] += toHead;
    }
}
/**
 * Keep the arms off the torso in `weights` (in place): skin below the armpit
 * and inside the shoulders loses its arm and collarbone weight to the spine.
 * Bone heat lets the arm bones claim the ribcage's sides when a rest pose
 * holds the arms close to the body (MakeHuman's does), and every clip that
 * lowered the arms then pulled the lower ribs in by centimetres. The change
 * fades in over `blend` metres below the armpit, so the shoulder still moves
 * with the arm. `positions` are the compact skin's (xyz), `rig` the fitted rig.
 */
export function armsOffTorso(weights, positions, rig, options = {}) {
    const index = new Map(rig.joints.map((j, i) => [j.name, i]));
    const arm = new Set();
    rig.joints.forEach((j, i) => {
        if (/^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/.test(j.name))
            arm.add(i);
    });
    const l = rig.at('upperarm_l');
    const r = rig.at('upperarm_r');
    const chest = index.get('spine_03');
    const belly = index.get('spine_02');
    if (l == null || r == null || chest == null || belly == null)
        return;
    const blend = options.blend ?? 0.06;
    const armpit = Math.min(l.y, r.y) - 0.02;
    const smooth = (x, a, b) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };
    const n = positions.length / 3;
    for (let v = 0; v < n; v++) {
        const x = positions[v * 3];
        const y = positions[v * 3 + 1];
        // Inside the shoulders (the arm itself is outside them) and below the armpit.
        const inside = 1 -
            smooth(Math.abs(x), Math.abs(x > 0 ? l.x : r.x) - 0.03, Math.abs(x > 0 ? l.x : r.x));
        const below = smooth(armpit - y, 0, blend);
        const k = inside * below;
        if (k === 0)
            continue;
        let moved = 0;
        for (let i = 0; i < 4; i++) {
            if (!arm.has(weights.indices[v * 4 + i]))
                continue;
            const w = weights.weights[v * 4 + i] * k;
            weights.weights[v * 4 + i] -= w;
            moved += w;
        }
        if (moved === 0)
            continue;
        // To the spine bone already there, else the chest's.
        const to = y > armpit - 0.12 ? chest : belly;
        let slot = -1;
        for (let i = 0; i < 4; i++)
            if (weights.indices[v * 4 + i] === to)
                slot = i;
        if (slot < 0) {
            slot = 0;
            for (let i = 1; i < 4; i++)
                if (weights.weights[v * 4 + i] < weights.weights[v * 4 + slot])
                    slot = i;
            moved += weights.weights[v * 4 + slot];
            weights.weights[v * 4 + slot] = 0;
            weights.indices[v * 4 + slot] = to;
        }
        weights.weights[v * 4 + slot] += moved;
    }
}
/**
 * MAKEHUMAN AS A PRODUCER of rigged bodies. The skin weights depend only on
 * the topology, so they are bound once, on the first body, by bone heat, then
 * the head made rigid (`stiffenHead`) and the ribcage kept off the arms
 * (`armsOffTorso`); every later body reuses them. Each body is the pack
 * morphed to its sliders with UAL's joints placed from its joint cubes.
 */
export async function humanBodyMaker(pack, values = {}) {
    const skin = humanSkin(pack);
    const [lips, nipples] = await Promise.all([
        pack.region('lips'),
        pack.region('nipples'),
    ]);
    const regions = {};
    for (const [name, mask] of [
        ['lips', lips],
        ['nipples', nipples],
    ]) {
        if (mask == null)
            continue;
        const out = new Float32Array(skin.vertices.length);
        skin.vertices.forEach((v, i) => {
            out[i] = mask[v];
        });
        regions[name] = out;
    }
    const morph = async (v) => {
        const body = { ...DEFAULT_HUMAN_BODY, ...v };
        const full = await morphHuman(pack, macroWeights(body, (n) => pack.has(n)));
        const rig = humanRig(pack.manifest, full, undefined, {
            triangles: pack.triangles,
        });
        return { body, full, rig, positions: skin.positions(full) };
    };
    const m0 = await morph(values);
    const weights = boneHeat(m0.positions, skin.triangles, skinSegments(m0.rig));
    // The face moves with the head, or the lids slide over the eyes; and the
    // ribcage with the spine, not the arms.
    stiffenHead(weights, m0.positions, m0.rig);
    armsOffTorso(weights, m0.positions, m0.rig);
    const make = (m) => ({
        positions: m.positions,
        indices: skin.triangles,
        rig: m.rig,
        weights,
        regions,
        made: {
            by: 'makehuman',
            base: pack.manifest.base,
            version: pack.manifest.version,
            body: { ...m.body },
        },
        full: m.full,
        skin,
    });
    return {
        skin,
        weights,
        first: make(m0),
        body: async (v = {}) => make(await morph(v)),
    };
}
//# sourceMappingURL=human-rig.js.map