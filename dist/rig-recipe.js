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
//# sourceMappingURL=rig-recipe.js.map