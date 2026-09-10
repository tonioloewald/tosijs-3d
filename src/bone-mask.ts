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

/** One bone, as a name and its parent's name. All this needs of a skeleton. */
export interface BoneNode {
  name: string
  parent: string | null
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
export type MaskMode = 'additive' | 'override'

export interface BoneMaskOptions {
  /** Bone the layer takes over from — usually a spine or chest bone. */
  root: string
  /**
   * Bones over which authority ramps from partial to full.
   *
   * `0` is a hard cut at `root`, which is the look this module exists to avoid.
   * Two or three distributes the twist the way a rig would.
   */
  falloff?: number
  mode?: MaskMode
}

/** Weight per bone, `0` (untouched) to `1` (fully driven by the layer). */
export type BoneMask = Map<string, number>

const childrenOf = (bones: readonly BoneNode[]): Map<string, string[]> => {
  const kids = new Map<string, string[]>()
  for (const b of bones) {
    if (b.parent == null) continue
    const list = kids.get(b.parent)
    if (list == null) kids.set(b.parent, [b.name])
    else list.push(b.name)
  }
  return kids
}

/**
 * Every bone at or below `root`, with its depth beneath it.
 *
 * Depth is what the ramp is computed from, so it is returned rather than
 * discarded — and the traversal is breadth-first for that reason: a bone's
 * depth must be its SHORTEST path from the root, and a rig with a cycle in it
 * (which happens, in exported files) would otherwise recurse forever.
 */
export function descendantDepths(
  bones: readonly BoneNode[],
  root: string
): Map<string, number> {
  const out = new Map<string, number>()
  if (!bones.some((b) => b.name === root)) return out
  const kids = childrenOf(bones)
  const queue: Array<{ name: string; depth: number }> = [
    { name: root, depth: 0 },
  ]
  while (queue.length > 0) {
    const { name, depth } = queue.shift()!
    if (out.has(name)) continue // already reached, and by a shorter path
    out.set(name, depth)
    for (const child of kids.get(name) ?? []) {
      queue.push({ name: child, depth: depth + 1 })
    }
  }
  return out
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
export function boneMask(
  bones: readonly BoneNode[],
  options: BoneMaskOptions
): BoneMask {
  const falloff = Math.max(0, Math.floor(options.falloff ?? 2))
  const depths = descendantDepths(bones, options.root)
  const mask: BoneMask = new Map()
  for (const b of bones) {
    const d = depths.get(b.name)
    mask.set(b.name, d == null ? 0 : Math.min(1, (d + 1) / (falloff + 1)))
  }
  return mask
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
export function maskIsEmpty(mask: BoneMask): boolean {
  for (const w of mask.values()) if (w > 0) return false
  return true
}

/**
 * The mask a layer leaves for everything else — `1 - w` per bone.
 *
 * Only meaningful for `override`. An ADDITIVE layer does not take authority
 * away from anything, which is the whole reason it preserves the motion
 * underneath, so complementing one is a category error and returns an all-`1`
 * mask unchanged.
 */
export function complementMask(
  mask: BoneMask,
  mode: MaskMode = 'override'
): BoneMask {
  const out: BoneMask = new Map()
  for (const [name, w] of mask) out.set(name, mode === 'additive' ? 1 : 1 - w)
  return out
}

/**
 * The first bone in `candidates` the rig actually has.
 *
 * Rigs disagree: Quaternius, Mixamo and a hand-built armature name the same
 * joint `Spine1`, `mixamorig:Spine1` and `spine_02`. A caller passes the
 * spellings it knows and gets whichever exists, or `null` — which is a fact to
 * report, not a default to substitute.
 */
export function findBone(
  bones: readonly BoneNode[],
  candidates: readonly string[]
): string | null {
  const byLower = new Map(bones.map((b) => [b.name.toLowerCase(), b.name]))
  for (const c of candidates) {
    const hit = byLower.get(c.toLowerCase())
    if (hit != null) return hit
    // Suffix match, for `mixamorig:Spine1` against `spine1`.
    for (const [lower, actual] of byLower) {
      if (lower.endsWith(`:${c.toLowerCase()}`)) return actual
    }
  }
  return null
}

/** Spellings of "the bone an upper-body layer takes over from", most specific first. */
export const UPPER_BODY_ROOTS: readonly string[] = [
  'spine_02',
  'spine2',
  'spine1',
  'chest',
  'upperchest',
  'spine',
]
