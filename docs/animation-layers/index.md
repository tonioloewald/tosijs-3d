# animation-layers

**Play two clips on one skeleton, split by a bone mask.** The Babylon half of
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
        orbitCam(el, { alphaDeg: -108.9, betaDeg: 73.3, radius: 4.4, target: [-0.9, 1, 0] })
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
          // omnidude is 0.88m, half a person: scale it to human size.
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

## The mask

`boneMask(bones, { root, falloff })` says which bones the layer drives, and how
much. It is pure: a bone hierarchy is names and parents (`boneHierarchy(skeleton)`
reads one), so it needs no skeleton, renderer or GLB. `findBone(bones,
UPPER_BODY_ROOTS)` finds the split root across rig naming styles.

The masking is easy; making it not look terrible is the work:

- **A hard boundary is a mannequin sawn in half.** If one spine bone takes the aim
  and the next the walk, the torso kinks at one joint. Real rigs spread a twist
  over the whole chain, so the mask is a WEIGHT PER BONE, ramped along the chain.
  `falloff` is how many bones it takes to reach full authority.
- **Counter-rotation is what makes legs look attached.** A walk swings the torso
  against the hips. Override the upper body wholesale and the legs swing under a
  dead trunk. That is why `MaskMode` defaults to **additive**: an aim applied as a
  delta from its own reference pose keeps what the locomotion was doing. Override
  is there for when you really want to replace (a reload that must look the same
  whatever the legs do).
- **A mask whose root cannot be found says so.** Rigs disagree about bone names,
  and a missing root gives an all-zero mask, which animates nothing and looks like
  a clip that failed to load.

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
of whatever is underneath. The mask offers `MaskMode.additive` because it
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
