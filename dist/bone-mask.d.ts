/** One bone, as a name and its parent's name. All this needs of a skeleton. */
export interface BoneNode {
    name: string;
    parent: string | null;
}
/**
 * How a layer combines with what is underneath.
 *
 * `additive` applies the layer as a delta from its own reference pose, which
 * preserves the base animation's motion — the torso counter-rotation of a walk
 * survives, so the legs still look attached. `override` replaces outright.
 * Additive is the default because override is what makes layered animation look
 * like two animations.
 */
export type MaskMode = 'additive' | 'override';
export interface BoneMaskOptions {
    /** Bone the layer takes over from — usually a spine or chest bone. */
    root: string;
    /**
     * Bones over which authority ramps from partial to full.
     *
     * `0` is a hard cut at `root`, which is the look this module exists to avoid.
     * Two or three distributes the twist the way a rig would.
     */
    falloff?: number;
    mode?: MaskMode;
}
/** Weight per bone, `0` (untouched) to `1` (fully driven by the layer). */
export type BoneMask = Map<string, number>;
/**
 * Every bone at or below `root`, with its depth beneath it.
 *
 * Depth is what the ramp is computed from, so it is returned rather than
 * discarded — and the traversal is breadth-first for that reason: a bone's
 * depth must be its SHORTEST path from the root, and a rig with a cycle in it
 * (which happens, in exported files) would otherwise recurse forever.
 */
export declare function descendantDepths(bones: readonly BoneNode[], root: string): Map<string, number>;
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
export declare function boneMask(bones: readonly BoneNode[], options: BoneMaskOptions): BoneMask;
/**
 * Did the mask find anything?
 *
 * A separate predicate rather than a thrown error, because the right response
 * differs: a tool wants to warn and carry on, a test wants to fail. What must
 * NOT happen is treating an all-zero mask as a valid "drives nothing" layer —
 * that animates correctly, costs nothing, and looks exactly like a clip that
 * failed to load.
 */
export declare function maskIsEmpty(mask: BoneMask): boolean;
/**
 * The mask a layer leaves for everything else — `1 - w` per bone.
 *
 * Only meaningful for `override`. An ADDITIVE layer does not take authority
 * away from anything, which is the whole reason it preserves the motion
 * underneath, so complementing one is a category error and returns an all-`1`
 * mask unchanged.
 */
export declare function complementMask(mask: BoneMask, mode?: MaskMode): BoneMask;
/**
 * The first bone in `candidates` the rig actually has.
 *
 * Rigs disagree: Quaternius, Mixamo and a hand-built armature name the same
 * joint `Spine1`, `mixamorig:Spine1` and `spine_02`. A caller passes the
 * spellings it knows and gets whichever exists, or `null` — which is a fact to
 * report, not a default to substitute.
 */
export declare function findBone(bones: readonly BoneNode[], candidates: readonly string[]): string | null;
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
export declare const BONE_SOCKETS: Record<string, readonly string[]>;
/** Spellings of "the bone an upper-body layer takes over from", most specific first. */
export declare const UPPER_BODY_ROOTS: readonly string[];
//# sourceMappingURL=bone-mask.d.ts.map