/*
A RIG RECIPE: everything the rig tool decides about a character, as data.
Which bone plays which role where the names guessed wrong, how far the arms
spread, and the spring chains (hair, tails) hung on it. No DOM, no Babylon,
so a document is validated headlessly; `applyRigRecipe` (in
`rig-recipe-babylon`) puts one on a loaded character.

Spring chains come in two kinds:

- `bones`: a chain the model already has (a tail, a braid), named by its
  first bone; the chain runs down first children to the tip.
- `strand`: a new chain hung from a bone, with a tube skinned to it (a
  ponytail the model was not made with).

Lengths are metres, angles degrees. A strand's `offset` and direction are in
the CHARACTER's frame (its placement, not glTF's mirrored `__root__`), with
the character in its rest pose: +Y up, +Z the way the model faces.
*/
import { MARKER_NAMES } from './rig-fit.js';
export const RIG_RECIPE_VERSION = 1;
export const STRAND_DEFAULTS = {
    kind: 'strand',
    name: 'strand',
    offset: { x: 0, y: 0.13, z: -0.1 },
    yawDeg: 0,
    pitchDeg: -65,
    length: 0.45,
    segments: 6,
    radius: 0.035,
    tipRadius: 0.012,
    color: '#73401a',
    params: { stiffness: 0.1, damping: 0.6, gravity: 9.8 },
    colliders: 'auto',
};
/** A strand's direction as a unit vector, in the character's frame. */
export function strandDirection(yawDeg, pitchDeg) {
    const y = (yawDeg * Math.PI) / 180;
    const p = (pitchDeg * Math.PI) / 180;
    const c = Math.cos(p);
    return { x: -Math.sin(y) * c, y: Math.sin(p), z: -Math.cos(y) * c };
}
/**
 * A strand's joints at rest, `segments + 1` points from the anchor in the
 * character's frame: evenly spaced along its `path`, or along the straight
 * line its offset, direction and length describe.
 */
export function strandPoints(s) {
    const n = Math.max(1, Math.round(s.segments));
    const path = s.path != null && s.path.length >= 2
        ? s.path
        : (() => {
            const d = strandDirection(s.yawDeg, s.pitchDeg);
            return [
                s.offset,
                {
                    x: s.offset.x + d.x * s.length,
                    y: s.offset.y + d.y * s.length,
                    z: s.offset.z + d.z * s.length,
                },
            ];
        })();
    const legs = path.slice(1).map((p, i) => {
        const q = path[i];
        return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    });
    const total = legs.reduce((a, b) => a + b, 0);
    const out = [];
    for (let k = 0; k <= n; k++) {
        let want = (total * k) / n;
        let i = 0;
        while (i < legs.length - 1 && want > legs[i])
            want -= legs[i++];
        const a = path[i];
        const b = path[i + 1];
        const t = legs[i] > 0 ? Math.min(1, want / legs[i]) : 0;
        out.push({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
        });
    }
    return out;
}
/** A strand's path: its own, or the straight two-point one it describes. */
export function strandPath(s) {
    if (s.path != null && s.path.length >= 2)
        return s.path.map((p) => ({ ...p }));
    const d = strandDirection(s.yawDeg, s.pitchDeg);
    return [
        { ...s.offset },
        {
            x: s.offset.x + d.x * s.length,
            y: s.offset.y + d.y * s.length,
            z: s.offset.z + d.z * s.length,
        },
    ];
}
/**
 * Lay a strand along `path`, keeping `offset`, `length`, `yawDeg` and
 * `pitchDeg` true to it (its first point, total length and first leg), so a
 * reader that knows nothing of paths still gets the right start and reach.
 */
export function setStrandPath(s, path) {
    if (path.length < 2)
        return;
    const a = path[0];
    const b = path[1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const leg = Math.hypot(dx, dy, dz) || 1;
    s.path = path.map((p) => ({ ...p }));
    s.offset = { ...a };
    s.length = pathLength(path);
    s.pitchDeg = (Math.asin(Math.max(-1, Math.min(1, dy / leg))) * 180) / Math.PI;
    s.yawDeg = (Math.atan2(-dx, -dz) * 180) / Math.PI;
}
/** The length of a path (the sum of its legs). */
export function pathLength(path) {
    let total = 0;
    for (let i = 1; i < path.length; i++)
        total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y, path[i].z - path[i - 1].z);
    return total;
}
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec = (v) => v != null &&
    typeof v === 'object' &&
    isNum(v.x) &&
    isNum(v.y) &&
    isNum(v.z);
/**
 * What is wrong with `doc` as a recipe, as sentences; empty when nothing is.
 * Bone names are not checked against a model (there may not be one yet).
 */
export function validateRigRecipe(doc) {
    const out = [];
    if (doc == null || typeof doc !== 'object')
        return ['not an object'];
    const r = doc;
    if (r.version !== RIG_RECIPE_VERSION)
        out.push(`version is ${r.version}, expected ${RIG_RECIPE_VERSION}`);
    if (r.armSpaceDeg != null && !isNum(r.armSpaceDeg))
        out.push('armSpaceDeg is not a number');
    if (r.roles != null) {
        if (typeof r.roles !== 'object')
            out.push('roles is not an object');
        else
            for (const [k, v] of Object.entries(r.roles))
                if (typeof v !== 'string')
                    out.push(`roles.${k} is not a bone name`);
    }
    if (r.binding != null) {
        const b = r.binding;
        if (typeof b !== 'object' || b.markers == null)
            out.push('binding has no markers');
        else
            for (const n of MARKER_NAMES) {
                const p = b.markers[n];
                if (p == null || !isNum(p.x) || !isNum(p.y))
                    out.push(`binding.markers.${n} is not {x, y}`);
            }
        if (b?.tail != null && !isVec(b.tail))
            out.push('binding.tail is not {x, y, z}');
        if (b?.tailBase != null && !isVec(b.tailBase))
            out.push('binding.tailBase is not {x, y, z}');
        if (b?.joints != null) {
            if (typeof b.joints !== 'object' || Array.isArray(b.joints))
                out.push('binding.joints is not name → {x, y, z}');
            else
                for (const [k, v] of Object.entries(b.joints))
                    if (!isVec(v))
                        out.push(`binding.joints.${k} is not {x, y, z}`);
        }
    }
    const springs = r.springs ?? [];
    if (!Array.isArray(springs))
        return [...out, 'springs is not a list'];
    springs.forEach((s, i) => {
        const at = `springs[${i}]`;
        if (s == null || typeof s !== 'object')
            return out.push(`${at} is empty`);
        if (s.kind === 'bones') {
            if (typeof s.root !== 'string')
                out.push(`${at}.root is not a bone name`);
        }
        else if (s.kind === 'strand') {
            if (typeof s.anchor !== 'string')
                out.push(`${at}.anchor is not a bone name`);
            if (!isVec(s.offset))
                out.push(`${at}.offset is not {x, y, z}`);
            for (const k of ['yawDeg', 'pitchDeg', 'length', 'radius'])
                if (!isNum(s[k]))
                    out.push(`${at}.${k} is not a number`);
            if (!isNum(s.segments) || s.segments < 1 || s.segments > 64)
                out.push(`${at}.segments is not 1 to 64`);
            if (isNum(s.length) && s.length <= 0)
                out.push(`${at}.length is not positive`);
            if (s.path != null) {
                if (!Array.isArray(s.path) || s.path.length < 2)
                    out.push(`${at}.path is not a list of two or more points`);
                else if (!s.path.every(isVec))
                    out.push(`${at}.path has a point that is not {x, y, z}`);
                else if (pathLength(s.path) <= 0)
                    out.push(`${at}.path has no length`);
            }
        }
        else
            out.push(`${at}.kind is not 'bones' or 'strand'`);
        const c = s.colliders;
        if (c != null && c !== 'auto' && c !== 'none') {
            if (!Array.isArray(c))
                out.push(`${at}.colliders is not a list`);
            else
                c.forEach((k, j) => {
                    if (typeof k?.bone !== 'string' || !isNum(k.radius))
                        out.push(`${at}.colliders[${j}] needs a bone and a radius`);
                });
        }
    });
    return out;
}
/*
THE RECIPE AS JSON SCHEMA, for a host that generates its editors from
schemas or stores recipes in its own documents (ensemble). The same rules
`validateRigRecipe` checks, plus ranges, units (`x-unit`, as the scene
schemas spell them) and defaults; `rig-recipe.test.ts` holds the two
together. Carries no `x-widget`: the rig tool is the editor for a whole
recipe, and the parts are ordinary fields.
*/
const DEG = { 'x-unit': 'deg' };
const M = { 'x-unit': 'm' };
const vec3 = (description) => ({
    type: 'object',
    description,
    properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        z: { type: 'number' },
    },
    required: ['x', 'y', 'z'],
    additionalProperties: false,
});
export function rigRecipeSchema() {
    const params = {
        type: 'object',
        title: 'How it swings',
        properties: {
            stiffness: { type: 'number', minimum: 0, maximum: 1, default: 0.15 },
            damping: { type: 'number', minimum: 0, maximum: 1, default: 0.6 },
            gravity: { type: 'number', minimum: 0, default: 9.8, 'x-unit': 'm/s²' },
        },
        additionalProperties: false,
    };
    const colliders = {
        description: "'auto': the head, chest and shoulders, sized to the body. 'none', or a list.",
        default: 'auto',
        oneOf: [
            { type: 'string', enum: ['auto', 'none'] },
            {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        bone: { type: 'string' },
                        radius: { type: 'number', minimum: 0, ...M },
                        offset: vec3('Metres from the bone, in the character frame.'),
                    },
                    required: ['bone', 'radius'],
                    additionalProperties: false,
                },
            },
        ],
    };
    const common = {
        name: { type: 'string' },
        params,
        colliders,
    };
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Rig recipe',
        type: 'object',
        properties: {
            version: { const: RIG_RECIPE_VERSION },
            model: {
                type: 'object',
                description: 'The model it was made for (a record; nothing is fetched).',
                properties: { url: { type: 'string' }, name: { type: 'string' } },
                additionalProperties: false,
            },
            roles: {
                type: 'object',
                description: "Corrections to the guessed roles: role → bone name ('' leaves the role out).",
                additionalProperties: { type: 'string' },
            },
            armSpaceDeg: {
                type: 'number',
                minimum: -90,
                maximum: 90,
                default: 0,
                ...DEG,
            },
            binding: {
                type: 'object',
                description: 'A mesh with no skeleton: the markers its skeleton is fitted from (front view, metres, left on +X).',
                properties: {
                    markers: {
                        type: 'object',
                        properties: Object.fromEntries(MARKER_NAMES.map((n) => [
                            n,
                            {
                                type: 'object',
                                properties: { x: { type: 'number' }, y: { type: 'number' } },
                                required: ['x', 'y'],
                                additionalProperties: false,
                            },
                        ])),
                        required: [...MARKER_NAMES],
                        additionalProperties: false,
                    },
                    tail: {
                        oneOf: [
                            vec3('Where a tail’s tip is, for a tail chain.'),
                            { type: 'null' },
                        ],
                    },
                    tailBase: {
                        oneOf: [
                            vec3('Where the tail starts (its first joint), if not the back of the pelvis.'),
                            { type: 'null' },
                        ],
                    },
                    joints: {
                        type: 'object',
                        description: 'Joints moved by hand after the fit (a thumb, a toe, a shoulder), by name, in the mesh’s frame.',
                        additionalProperties: vec3('Where the joint is.'),
                    },
                },
                required: ['markers'],
                additionalProperties: false,
            },
            springs: {
                type: 'array',
                items: {
                    oneOf: [
                        {
                            type: 'object',
                            title: 'Bone chain',
                            properties: {
                                kind: { const: 'bones' },
                                root: {
                                    type: 'string',
                                    description: 'The chain’s first bone.',
                                },
                                ...common,
                            },
                            required: ['kind', 'root'],
                            additionalProperties: false,
                        },
                        {
                            type: 'object',
                            title: 'Strand',
                            properties: {
                                kind: { const: 'strand' },
                                anchor: {
                                    type: 'string',
                                    description: 'The bone it hangs from.',
                                },
                                offset: vec3('Where it starts, from the anchor, in metres.'),
                                yawDeg: {
                                    type: 'number',
                                    minimum: -180,
                                    maximum: 180,
                                    default: 0,
                                    ...DEG,
                                },
                                pitchDeg: {
                                    type: 'number',
                                    minimum: -90,
                                    maximum: 90,
                                    default: -65,
                                    ...DEG,
                                },
                                length: {
                                    type: 'number',
                                    exclusiveMinimum: 0,
                                    default: 0.45,
                                    ...M,
                                },
                                segments: {
                                    type: 'integer',
                                    minimum: 1,
                                    maximum: 64,
                                    default: 6,
                                    description: 'How many links, spaced evenly along it.',
                                },
                                path: {
                                    type: 'array',
                                    description: 'The line it follows at rest, root first, each point from the anchor in metres. When given, the chain is laid along it.',
                                    minItems: 2,
                                    items: vec3('A point, from the anchor, in metres.'),
                                },
                                radius: { type: 'number', minimum: 0, default: 0.035, ...M },
                                tipRadius: { type: 'number', minimum: 0, default: 0.012, ...M },
                                color: { type: 'string', format: 'color', default: '#73401a' },
                                ...common,
                            },
                            required: [
                                'kind',
                                'anchor',
                                'offset',
                                'yawDeg',
                                'pitchDeg',
                                'length',
                                'segments',
                                'radius',
                            ],
                            additionalProperties: false,
                        },
                    ],
                },
            },
        },
        required: ['version'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=rig-recipe.js.map