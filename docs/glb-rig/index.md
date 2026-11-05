# glb-rig

**A mesh file's triangles for rigging, read with no engine.** The same
`BodyTriangles` that `loadRigTriangles` (rig-build) gives from a Babylon
scene, read straight from a GLB's bytes: in Bun or Node, in a worker, in a
test, or in a headless export. Hand the result to `bodyFromMarkers` with a
character file's markers and you have its `RiggedBody` with no scene at all.

```javascript
import { glbRigTriangles } from 'tosijs-3d/glb-rig'
import { bodyFromMarkers } from 'tosijs-3d/rigged-body'

const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
const tris = glbRigTriangles(bytes)
const body = bodyFromMarkers(tris, { markers, source: url })
```

What it gives, and how it agrees with the Babylon path (a test loads the
same files both ways and compares them):

- **The file's own frame**, right-handed, every node's transform applied.
  A skinned mesh is taken skinned AT REST (its joints' rest transforms times
  their inverse bind matrices), its own node's transform ignored, as glTF
  says and Babylon's loader does: a file in centimetres sized by its
  armature comes out in metres.
- **`pick`** takes one node of a library file and its children, its own
  translation dropped (so the character stands at the origin), as
  `loadRigTriangles` does. A name that is not there throws.
- **Surfaces**: one run of triangles per material, named as Babylon names
  them (the material's name, `material<i>` when it has none, made unique),
  runs that follow one another with the same material joined. Each carries
  its glTF material as data (`GltfSurfaceMaterial`): the PBR factors, alpha
  mode, two-sidedness, and each texture's IMAGE BYTES and MIME type (a
  `data:` URI decoded; an external `uri` kept as it is, unread).
- **Eyes**: meshes named as eyes (`isEyeName`) are kept out of the body and
  handed back as `eyes`, one per side, as `splitEyes` does.
- **Uvs and colours** when any mesh has them (others filled with 0 and white,
  as the Babylon path fills them); colours as RGBA floats.

Only triangle lists are read (mode 4, the default); other primitives (lines,
points, strips) are skipped. Compressed geometry (Draco, meshopt) is not
read: it throws, naming the extension.

The rig from it is DETERMINISTIC: the same bytes and the same markers give
the same weights, so a saved character exports the same every time.
