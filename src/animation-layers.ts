/*#
# animation-layers

**Play two clips on one skeleton, split by [[bone-mask]].** The Babylon half of
walk-and-aim: legs keep the locomotion, arms and head take the aim, and the
boundary is feathered rather than cut.

## How it is done, and the one thing Babylon does not give you

A Babylon `AnimationGroup` is a list of `TargetedAnimation` — an animation and
the node it drives — and its weight applies to the WHOLE group. There is no
per-bone weight.

So a graded mask becomes **one group per weight tier**. With `falloff: 2` the
mask has weights 1/3, 2/3 and 1, which is three groups played at those weights,
plus the base clip playing at the complement. Public API throughout, no
patching, and the tier count is small because the ramp is short.

⚠️ **Babylon has no native ADDITIVE layer.** Its animation weights BLEND — a
weighted average of poses — where an additive layer would apply a delta on top
of whatever is underneath. [[bone-mask]] offers `MaskMode.additive` because it
is the right model and the mask maths is the same either way; what this module
implements is the blended form, which is what the engine supports.

The practical difference is smaller than it sounds, and worth knowing rather
than discovering: with a feathered boundary the lower spine is a genuine blend
of walk and aim, so *some* of the walk's counter-rotation survives into the
torso. What you do not get is the full counter-rotation under a fully-authored
aim pose. If that turns out to matter, true additive means computing per-bone
deltas each frame — real work, and worth measuring the blended version first.

## Names are the seam, so they are checked

Targets are `TransformNode`s named after their bone (`mixamorig:Spine2` on the
stock rig), and a mask keyed on names nobody has is a mask that drives nothing —
silently, and identically to a clip that failed to load. `layerGroups` reports
what it matched so a caller can refuse rather than animate air.
*/
/*{ "parent": "Vehicles", "order": 166 }*/

import * as BABYLON from '@babylonjs/core'
import {
  boneMask,
  findBone,
  UPPER_BODY_ROOTS,
  type BoneMask,
  type BoneNode,
} from './bone-mask.js'

/** A skeleton as the pure model wants it: names and parents. */
export function boneHierarchy(skeleton: BABYLON.Skeleton): BoneNode[] {
  return skeleton.bones.map((b) => ({
    name: b.name,
    parent: b.getParent()?.name ?? null,
  }))
}

/** One weight tier: the animations at that weight, as a playable group. */
export interface AnimationTier {
  weight: number
  group: BABYLON.AnimationGroup
}

export interface LayeredAnimation {
  /** The locomotion clip, split into the tiers it still owns. */
  base: AnimationTier[]
  /** The overlaid clip, split into the tiers it takes. */
  layer: AnimationTier[]
  /** Bone names the mask named that the clips do not drive. */
  unmatched: string[]
  play(loop?: boolean): void
  stop(): void
  dispose(): void
}

/** Quantised so 1/3 and 0.3333334 are one tier rather than two. */
const tierKey = (w: number): number => Math.round(w * 100) / 100

/**
 * Split one group into per-weight tiers, given a weight per target name.
 *
 * A tier of weight `0` is dropped rather than played silently at zero: an
 * `AnimationGroup` that drives nothing still costs a play call and, more to the
 * point, reads in a debugger as though something were running.
 */
function tiersFor(
  scene: BABYLON.Scene,
  source: BABYLON.AnimationGroup,
  weightOf: (targetName: string) => number,
  label: string
): AnimationTier[] {
  const byTier = new Map<number, BABYLON.TargetedAnimation[]>()
  for (const ta of source.targetedAnimations) {
    const name = (ta.target as { name?: string } | null)?.name ?? ''
    const w = tierKey(weightOf(name))
    if (w <= 0) continue
    const list = byTier.get(w)
    if (list == null) byTier.set(w, [ta])
    else list.push(ta)
  }
  const out: AnimationTier[] = []
  for (const [weight, animations] of byTier) {
    const group = new BABYLON.AnimationGroup(
      `${source.name}-${label}-${weight}`,
      scene
    )
    for (const ta of animations)
      group.addTargetedAnimation(ta.animation, ta.target)
    out.push({ weight, group })
  }
  return out
}

/**
 * Layer `layer` over `base` on the bones the mask names.
 *
 * Both clips are split by the SAME mask, in complement: the base keeps `1 - w`
 * of every bone and the layer takes `w`. Feathering therefore happens on both
 * sides of the boundary, which is what stops the torso kinking at one joint.
 *
 * Neither source group is modified or played — the tiers are new groups over
 * the same animations, so a caller can still use the originals elsewhere.
 */
export function layerGroups(
  scene: BABYLON.Scene,
  base: BABYLON.AnimationGroup,
  layer: BABYLON.AnimationGroup,
  mask: BoneMask
): LayeredAnimation {
  const weightOf = (name: string): number => mask.get(name) ?? 0
  const baseTiers = tiersFor(scene, base, (n) => 1 - weightOf(n), 'base')
  const layerTiers = tiersFor(scene, layer, weightOf, 'layer')

  /*
  WHICH NAMED BONES NOBODY DRIVES. A mask keyed on names the clips do not target
  animates nothing, and does so exactly as quietly as a clip that failed to
  load — the failure this whole seam is prone to, because rigs disagree about
  spelling.
  */
  const driven = new Set<string>()
  for (const g of [base, layer]) {
    for (const ta of g.targetedAnimations) {
      const n = (ta.target as { name?: string } | null)?.name
      if (n != null) driven.add(n)
    }
  }
  const unmatched: string[] = []
  for (const [name, w] of mask) {
    if (w > 0 && !driven.has(name)) unmatched.push(name)
  }

  const all = () => [...baseTiers, ...layerTiers]
  return {
    base: baseTiers,
    layer: layerTiers,
    unmatched,
    play(loop = true) {
      for (const t of all()) {
        t.group.play(loop)
        // AFTER `play`: the weight lands on the animatables, and there are none
        // until it is playing.
        t.group.setWeightForAllAnimatables(t.weight)
      }
    },
    stop() {
      for (const t of all()) t.group.stop()
    },
    dispose() {
      for (const t of all()) t.group.dispose()
    },
  }
}

/**
 * The common case: play `layer` on the upper body over `base`.
 *
 * Finds the split root by trying the spellings rigs actually use, so a Mixamo
 * `mixamorig:Spine2` and a Quaternius `spine_02` both work. Returns `null` when
 * no root is found — which a caller must treat as a refusal, because the
 * alternative is a mask over nothing.
 */
export function layerOnUpperBody(
  scene: BABYLON.Scene,
  skeleton: BABYLON.Skeleton,
  base: BABYLON.AnimationGroup,
  layer: BABYLON.AnimationGroup,
  options: { falloff?: number; roots?: readonly string[] } = {}
): LayeredAnimation | null {
  const bones = boneHierarchy(skeleton)
  const root = findBone(bones, options.roots ?? UPPER_BODY_ROOTS)
  if (root == null) return null
  return layerGroups(
    scene,
    base,
    layer,
    boneMask(bones, { root, falloff: options.falloff ?? 2 })
  )
}
