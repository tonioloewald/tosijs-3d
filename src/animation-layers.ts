/*#
# animation-layers

**Play two clips on one skeleton, split by [[bone-mask]].** The Babylon half of
walk-and-aim: legs keep the locomotion, arms and head take the aim, and the
boundary is feathered rather than cut.

## Demo — walk and wave at once

`walk` on the legs, `wave` on the arms, spine feathered between them. Drag
**falloff** to 0 to see the mannequin sawn in half, and to 5 to see the twist
spread so far the wave loses its authority. The middle is the point.

`layer` picks any of the rig's sixteen clips as the upper-body one, so you can
try `salute`, `talk` or `look` — the last is the closest thing the stock rig has
to an aim pose.

```js
import { b3d, b3dLight, b3dSkybox, b3dLoader, slider3d, select3d, label3d, toggle3d } from 'tosijs-3d'
import { boneHierarchy, layerGroups, boneMask, findBone, UPPER_BODY_ROOTS } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

// Bound, so the panel survives being rebuilt (maximise, or entering VR).
const demo = tosi({ layerDemo: { base: 'walk', layer: 'wave', falloff: 2, layered: true } })
const s = demo.layerDemo

let rig = null
let live = null

// Re-split and replay. Cheap — the tiers are new groups over the SAME
// animations, so this allocates groups, not keyframes.
const relayer = () => {
  if (rig == null) return
  live?.stop()
  live?.dispose()
  live = null
  const base = rig.groups.find((g) => g.name === s.base.valueOf())
  const layer = rig.groups.find((g) => g.name === s.layer.valueOf())
  if (base == null || layer == null) return
  for (const g of rig.groups) g.stop()
  if (!s.layered.valueOf()) {
    base.play(true)
    return
  }
  const mask = boneMask(rig.bones, { root: rig.root, falloff: Number(s.falloff) })
  live = layerGroups(rig.scene, base, layer, mask)
  live.play(true)
}

const panel = () => [
  label3d({ text: 'Layered animation' }),
  toggle3d({ label: 'layered', value: s.layered, handleChange: (v) => { s.layered = v; relayer() } }),
  select3d({
    label: 'legs', value: s.base, options: rig ? rig.names : ['walk'],
    handleChange: (v) => { s.base = v; relayer() },
  }),
  select3d({
    label: 'arms', value: s.layer, options: rig ? rig.names : ['wave'],
    handleChange: (v) => { s.layer = v; relayer() },
  }),
  slider3d({
    label: 'falloff', value: s.falloff, min: 0, max: 5, step: 1, showValue: 'always',
    handleChange: (v) => { s.falloff = Math.round(v); relayer() },
  }),
  label3d({ text: '0 = hard cut at one joint', muted: true }),
]

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      scenePanelOpen: true,
      scenePanel: panel,
      sceneCreated(el) {
        // Target offset LEFT so the figure sits right of centre — the settings panel
        // covers the left half of the viewport, and a demo hidden behind its own
        // controls is a demo nobody looks at.
        orbitCam(el, { alpha: -1.9, beta: 1.28, radius: 4.4, target: [-0.9, 1, 0] })
        // `b3dLoader` below does the loading — the proven path, with the
        // library's own material conventions. The rig simply APPEARS in the
        // scene when it is ready, so poll for it rather than racing a callback
        // the element does not offer.
        const wait = setInterval(() => {
          const skeleton = el.scene?.skeletons?.[0]
          const groups = el.scene?.animationGroups ?? []
          if (skeleton == null || groups.length === 0) return
          clearInterval(wait)
          const bones = boneHierarchy(skeleton)
          const root = findBone(bones, UPPER_BODY_ROOTS)
          // A rig whose split root cannot be found must SAY so — a mask over
          // nothing animates nothing and looks exactly like a failed load.
          if (root == null) { console.error('no upper-body root on this rig'); return }
          // omnidude is 0.88m — half a person. See CLAUDE.md on scale.
          for (const m of el.scene.meshes) if (m.skeleton != null) m.scaling.setAll(2)
          rig = {
            scene: el.scene, skeleton, bones, root, groups,
            names: groups.map((g) => g.name).sort(),
          }
          relayer()
          el.refreshScenePanel?.()
        }, 100)
      },
    },
    b3dSkybox({ timeOfDay: 10 }),
    b3dLight({ intensity: 0.9 }),
    b3dLoader({ url: '/omnidude.glb' })
  )
)
```
```css
.preview { height: 100%; }
```

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
