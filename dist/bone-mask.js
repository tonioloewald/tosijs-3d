/*#
# bone-mask

**Which bones a layered animation drives, and how much.** Pure — a bone
hierarchy is names and parents, so none of this needs a skeleton, a renderer or
a GLB.

The problem it exists for: a character who walks and aims at the same time. The
legs play locomotion, the arms and head play the aim, and they have to look like
one person.

## The hard part is not the masking

Tonio, who did this in Unity years ago: *"Technically not hard, but having it not
look terrible is a whole other thing."* That is the design constraint, so it is
worth naming the specific ways it looks terrible before the API takes a shape
that guarantees them.

**A hard boundary is a mannequin sawn in half.** If `spine_02` takes its
rotation from the aim clip and `spine_01` from the walk, the torso kinks at one
joint. Real rigs distribute a twist over the whole chain, and so must this — the
mask is therefore a WEIGHT PER BONE, ramped along the chain, and never a set.
`falloff` is how many bones it takes to reach full authority.

**Counter-rotation is what makes legs look attached.** A walk cycle swings the
torso against the hips; that is most of why it reads as a body walking rather
than legs moving. Override the upper body wholesale and you delete it — the legs
swing under a dead trunk, which is the single most recognisable "layered
animation" failure.

That is why [[MaskMode]] defaults to **additive**: an aim clip applied as a
DELTA from its own reference pose preserves whatever the locomotion was doing
underneath, so the counter-rotation survives and the aim rides on top. Override
is offered because sometimes you genuinely want to replace — a reload that must
look identical whatever the legs are doing — but it is the sharper tool.

**A mask whose root cannot be found must SAY so.** Rigs disagree about bone
names, and this repo already carries that scar: `b3d-biped` finds bones with
`/^head$/i` regexes and `biped-mapping.test.ts` exists because of it. A missing
split root silently produces an all-zero mask, which animates nothing and looks
exactly like a clip that failed to load.
*/
/*{ "parent": "Vehicles", "order": 165 }*/
const childrenOf = (bones) => {
    const kids = new Map();
    for (const b of bones) {
        if (b.parent == null)
            continue;
        const list = kids.get(b.parent);
        if (list == null)
            kids.set(b.parent, [b.name]);
        else
            list.push(b.name);
    }
    return kids;
};
/**
 * Every bone at or below `root`, with its depth beneath it.
 *
 * Depth is what the ramp is computed from, so it is returned rather than
 * discarded — and the traversal is breadth-first for that reason: a bone's
 * depth must be its SHORTEST path from the root, and a rig with a cycle in it
 * (which happens, in exported files) would otherwise recurse forever.
 */
export function descendantDepths(bones, root) {
    const out = new Map();
    if (!bones.some((b) => b.name === root))
        return out;
    const kids = childrenOf(bones);
    const queue = [
        { name: root, depth: 0 },
    ];
    while (queue.length > 0) {
        const { name, depth } = queue.shift();
        if (out.has(name))
            continue; // already reached, and by a shorter path
        out.set(name, depth);
        for (const child of kids.get(name) ?? []) {
            queue.push({ name: child, depth: depth + 1 });
        }
    }
    return out;
}
/**
 * The mask: how much of each bone the layer owns.
 *
 * Bones outside the root's subtree get `0` and are left entirely to whatever is
 * underneath. Inside it, authority ramps from `1 / (falloff + 1)` at the root to
 * `1` once `falloff` bones deep — so the boundary is a gradient rather than a
 * joint that kinks.
 *
 * An unknown root returns an EMPTY mask, which callers must treat as an error
 * rather than as "nothing to do" — see `maskIsEmpty`.
 */
export function boneMask(bones, options) {
    const falloff = Math.max(0, Math.floor(options.falloff ?? 2));
    const depths = descendantDepths(bones, options.root);
    const mask = new Map();
    for (const b of bones) {
        const d = depths.get(b.name);
        mask.set(b.name, d == null ? 0 : Math.min(1, (d + 1) / (falloff + 1)));
    }
    return mask;
}
/**
 * Did the mask find anything?
 *
 * A separate predicate rather than a thrown error, because the right response
 * differs: a tool wants to warn and carry on, a test wants to fail. What must
 * NOT happen is treating an all-zero mask as a valid "drives nothing" layer —
 * that animates correctly, costs nothing, and looks exactly like a clip that
 * failed to load.
 */
export function maskIsEmpty(mask) {
    for (const w of mask.values())
        if (w > 0)
            return false;
    return true;
}
/**
 * The mask a layer leaves for everything else — `1 - w` per bone.
 *
 * Only meaningful for `override`. An ADDITIVE layer does not take authority
 * away from anything, which is the whole reason it preserves the motion
 * underneath, so complementing one is a category error and returns an all-`1`
 * mask unchanged.
 */
export function complementMask(mask, mode = 'override') {
    const out = new Map();
    for (const [name, w] of mask)
        out.set(name, mode === 'additive' ? 1 : 1 - w);
    return out;
}
/**
 * The first bone in `candidates` the rig actually has.
 *
 * Rigs disagree: Quaternius, Mixamo and a hand-built armature name the same
 * joint `Spine1`, `mixamorig:Spine1` and `spine_02`. A caller passes the
 * spellings it knows and gets whichever exists, or `null` — which is a fact to
 * report, not a default to substitute.
 */
export function findBone(bones, candidates) {
    const byLower = new Map(bones.map((b) => [b.name.toLowerCase(), b.name]));
    for (const c of candidates) {
        const hit = byLower.get(c.toLowerCase());
        if (hit != null)
            return hit;
        // Suffix match, for `mixamorig:Spine1` against `spine1`.
        for (const [lower, actual] of byLower) {
            if (lower.endsWith(`:${c.toLowerCase()}`))
                return actual;
        }
    }
    return null;
}
/**
 * SOCKETS — the joints a consumer actually wants to hang something off.
 *
 * Named for the PLACE, not for any one rig's spelling, because every rig
 * spells them differently and a consumer should not have to know which one they
 * loaded: Quaternius says `hand_r`, Kenney's character kit says `RightHand`,
 * Mixamo says `mixamorig:RightHand`, and a hand-built armature says whatever
 * the artist typed. `findBone` already resolves a candidate list against a
 * skeleton and returns `null` rather than guessing, so this is just the list.
 *
 * Ordered most-specific-first within each socket, and deliberately NOT clever:
 * a fuzzy match that finds `hand_r_IK` or a twist bone would attach a weapon to
 * something that moves almost right, which is worse than not finding it.
 */
export const BONE_SOCKETS = {
    'right-hand': [
        'hand_r',
        'RightHand',
        'Hand_R',
        'hand.R',
        'mixamorig:RightHand',
        'Bip01_R_Hand',
    ],
    'left-hand': [
        'hand_l',
        'LeftHand',
        'Hand_L',
        'hand.L',
        'mixamorig:LeftHand',
        'Bip01_L_Hand',
    ],
    head: ['head', 'Head', 'mixamorig:Head', 'Bip01_Head'],
    spine: [
        'spine_03',
        'spine_02',
        'Spine2',
        'Spine1',
        'chest',
        'mixamorig:Spine2',
    ],
    hips: ['pelvis', 'hips', 'Hips', 'mixamorig:Hips'],
};
/** Spellings of "the bone an upper-body layer takes over from", most specific first. */
export const UPPER_BODY_ROOTS = [
    'spine_02',
    'spine2',
    'spine1',
    'chest',
    'upperchest',
    'spine',
];
//# sourceMappingURL=bone-mask.js.map