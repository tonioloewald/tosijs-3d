# skinned-glb

**A skinned, morphing mesh out as a GLB.** `writeSkinnedGlb` writes one
skeleton, any number of meshes skinned to it (four influences a vertex), each
with morph targets named in `extras.targetNames`, and plain glTF
metallic-roughness materials with their images embedded. Pure: no Babylon,
no DOM, synchronous, bytes out. It is `writeGarmentGlb`'s sibling for rigged
bodies, which that writer does not do (no skin, no morphs).

Part of the [character core](/character-core/): import it as
`tosijs-3d/skinned-glb`. Written for Dramatis's character exporter (GLB and
VRM), and checked against the Khronos validator and Babylon's own loader.

```javascript
import { writeSkinnedGlb } from 'tosijs-3d/skinned-glb'
const bytes = writeSkinnedGlb({ asset, joints, skinName, skeletonRoot, inverseBindMatrices, meshes, materials, images })
```

What it guarantees, so the Khronos validator is clean:

- joints are nodes `0..n-1`, in the order given, each parent before its
  children; every mesh is its own top-level node with no transform;
- `POSITION` accessors (and every morph target's) carry `min` and `max`;
- normals are unit length (a zero normal becomes +Y); weights are
  renormalised in float32 so each vertex's sum is 1, and a joint never
  appears twice in one vertex's non-zero slots;
- indices are `UNSIGNED_SHORT` below 65,535 vertices, `UNSIGNED_INT` above;
- morph targets are sparse accessors over the vertices they move (a target
  that moves nothing is the caller's to leave out; one here throws);
- `KHR_materials_sheen` is listed in `extensionsUsed` only when a material
  has sheen; nothing is ever required.
