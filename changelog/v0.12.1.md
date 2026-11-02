# 0.12.1

<!--{ "parent": "CHANGELOG", "order": 9987999 }-->

A rigged, morphing body written out as a GLB, with no engine: the skinned GLB writer, moved here from Dramatis so other engines can use it.

Size: barrel (min, packages external) 1510.4 KB raw / 523.7 KB gz, unchanged (both modules are subpaths, not in the barrel).

## Added

- **`tosijs-3d/skinned-glb`**: `writeSkinnedGlb` writes one skeleton, meshes skinned to it (four influences each, renormalised in float32), sparse morph targets named in `extras.targetNames`, and metallic-roughness materials (plus sheen) with embedded images. The result is clean under the Khronos glTF validator and loads in Babylon.
- **`tosijs-3d/glb-chunks`**: a GLB's chunks read and written, and its accessors read back. New code reads and writes GLB through it.
- Both are in the engine-free [character core](/character-core/): no Babylon in their import graph, types included.
