# rigged-body-glb

**Any rigged body out as a skinned GLB that plays UAL's clips by name.** A
body the rig tool made (an AI mesh, an artist's mesh, a scan), a file's own
skin, or MakeHuman's: `riggedBodyGlb(body)` writes it in the same profile as
Dramatis's character export, so three.js, Unity, Godot and Blender open it
and a UAL clip binds to its bones with no retargeting. Pure: no engine, bytes
out. `tosijs-3d/rigged-body-glb`.

```javascript
import { glbRigTriangles } from 'tosijs-3d/glb-rig'
import { bodyFromMarkers } from 'tosijs-3d/rigged-body'
import { riggedBodyGlb } from 'tosijs-3d/rigged-body-glb'

const body = bodyFromMarkers(glbRigTriangles(bytes), { markers })
const glb = riggedBodyGlb(body, { restPose: 't-pose', naming: 'ue' })
```

What the file is (Dramatis's `export-format`, version 1):

- **The skeleton**: one skin, `skeleton`, over the profile's 65 joints in its
  order (UE mannequin names as UAL spells them: `Head`, `_leaf` tips), or
  Mixamo's names with `naming: 'mixamo'` (`root` keeps its name). Every
  joint's rest ROTATION is UAL's own frame (`ual-rest`), only its position
  is the body's: that is what makes UAL's rotation keys mean the same thing
  on it. A joint the body lacks is placed along UAL's bone, scaled to the
  body; one the profile lacks (a tail) follows after the 65, in its
  parent's frame.
- **The rest pose**: a T-pose by default (arms straight out, palms down, as
  UAL stands; VRM needs one), reached by turning each limb bone onto UAL's
  and skinning the mesh there once; the feet are turned back so they stay
  flat. `restPose: 'source'` keeps the body as it was rigged, UAL's frames
  turned along its bones.
- **Root at the feet**: the soles at y = 0 and the pelvis over the origin,
  metres, Y up, facing +Z. `height` scales the body to a height in metres
  first (a mesh generator's 1.9 units, say, made a real 1.7 m).
- **Meshes**: `body`, one primitive per material, and `eyes` (both eyeballs,
  skinned wholly to `Head`, which the profile prefers to parenting a mesh
  under a joint). The file's own materials go out as glTF PBR with their
  pictures embedded, when the body's surfaces carry them as data (a body
  read by `glb-rig`); otherwise a plain grey.
- **Springs**, when given the rig `recipe`: a bone spring (a tail) swings
  from its root down, a strand is baked into joints under its anchor and a
  tube skinned to them, colliders (`auto`: head, chest, clavicles, sized to
  the body) go on their bones. They are written as `VRMC_springBone`, which
  three-vrm, UniVRM and Godot's VRM importer read with no setup, and as
  `TOSIJS_spring_chains`, our own settings exactly (see
  [spring-vrm](/spring-vrm/) for how the two models differ).
- **`asset.extras`** is passed through as given (Dramatis's licence block
  goes there), with `generator` and `copyright`.

Weights are the body's own, four per vertex, renormalised.
