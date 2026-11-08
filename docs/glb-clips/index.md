# glb clips

**A GLB's animations, read and retargeted with no engine.** Any skinned GLB
carries its clips (Mixamo's, Meshy's, UAL's) as keyframes on its skeleton.
`readGlbClips` reads them, and the skeleton they were made on, from the bytes;
`bakeClip` samples one through [[retarget]] onto another skeleton as
keyframes; `riggedBodyGlb`'s `clips` writes them into an exported body, so a
character leaves with its walk cycle.

```javascript
import { readGlbClips, bakeClip } from 'tosijs-3d/glb-clips'
import { riggedBodyGlb } from 'tosijs-3d/rigged-body-glb'

const ual = readGlbClips(new Uint8Array(await (await fetch(ualUrl)).arrayBuffer()))
ual.clips.map((c) => c.name) // ['Walk_Loop', 'Jog_Fwd_Loop', …]
const glb = riggedBodyGlb(body, {
  clips: [{ from: ual, clip: 'Walk_Loop', extras: { license: 'CC0 1.0' } }],
})
```

The skeleton is read as Babylon's `readSkeleton` reads a loaded one, so a
clip retargets the same here as in the [character builder](/character-builder/):
each joint's rest is its node's own transform; a top joint's takes in every
node above it (an armature's turn, and its scale, which every joint below is
put in the model root's units by: Mixamo's centimetres under a 0.01), and so
do its keys. Rotations are sampled with `LINEAR`'s slerp, `STEP` as steps and
`CUBICSPLINE` at its keys' values.

A clip's licence travels with it in its animation's `extras`: UAL's are CC0;
Mixamo's are Adobe's, usable in a project and not to be redistributed on
their own; Meshy's are licensed only with their model.

Pure: no DOM, no Babylon.
