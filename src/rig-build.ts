/*#
# auto-rig

**Binding a mesh to a skeleton, with no rig to start from.** Eight markers on
a mesh's front view (chin, groin, wrists, elbows, knees) place UAL's 65-bone
skeleton (`fitSkeleton`), bone heat binds the skin to it (`boneHeat`), and
`buildRig` makes a Babylon skeleton of the result, so `retargetClip` plays
UAL's clips on it and `springNodes` swings a tail.

To do this by hand, use the [rig tool](/rig-tool/): load a GLB or OBJ with
no skeleton (or turn on `bind from markers` to ignore the one it has), drag
the markers onto its joints, and it is bound again each time you let go. The
markers are saved in its recipe. This page is the code underneath, for doing
the same in your own page or pipeline.

## Usage

```
import {
  objTriangles, guessMarkers, rigSilhouette, fitSkeleton, meshQuery,
  skinSegments, boneHeat, buildRig, readSkeleton, retargetClip,
} from 'tosijs-3d'

// The mesh as triangles, in its file's own (right-handed) frame,
// facing +Z with its left on +X.
const { positions, indices } = objTriangles(await (await fetch(url)).text())

// Markers: guessed from the outline, or from a rig tool recipe's `binding`.
const markers = recipe?.binding?.markers ??
  guessMarkers(rigSilhouette(positions, indices, 'front'))

const rig = fitSkeleton(markers, meshQuery(positions, indices), {
  tail: recipe?.binding?.tail ?? undefined,
})
const weights = boneHeat(positions, indices, skinSegments(rig))
const built = buildRig(scene, 'weasel', positions, indices, rig, weights)
built.root.parent = stand // move it by a parent of root, never root itself

// ualWalk, ualSkin and ualRoot: a clip, skeleton and __root__ from UAL's GLB.
const walk = retargetClip(ualWalk, readSkeleton(ualSkin, ualRoot),
  readSkeleton(built.skeleton, built.root), { scene })
walk.start(true)
```

A tail, when `fitSkeleton` is given its tip, is the bone chain `tail_01` …
`tail_leaf`: hand `built.node(name)` for each to `springNodes` and it swings.
Binding takes about 0.1 to 0.3 s for 1,000 to 6,000 vertices, so do it once
and keep the result.

## How it is built

AUTO-RIG, THE BABYLON SIDE: a fitted skeleton (`rig-fit`) and its skin
weights (`bone-heat`) become a real Babylon skeleton on a mesh, built the way
the glTF loader builds one, so everything that works on a loaded character
works on it: `readSkeleton` and `retargetClip` play UAL clips on it, and
`springNodes` simulates its tail.

The joints are TransformNodes under one container (`root`), each bone LINKED
to its node, with the mesh under the same container: Babylon then reads each
bone from its node, and the skin and the nodes share a frame.

THE DATA IS RIGHT-HANDED, as OBJ and glTF files are (and as `rig-fit`
assumes: a character facing +Z has its left on +X). Babylon is left-handed,
so the container carries the same mirror glTF's `__root__` does (a half turn
about Y and z scaled by -1). Pass `root` to `readSkeleton` as you would
`__root__`: both measure in the file's own frame. Move the character by a
parent of `root`, not `root` itself.

*/
/*{ "parent": "b3d-biped", "order": 71 }*/

import * as BABYLON from '@babylonjs/core'
import type { FittedRig } from './rig-fit.js'
import type { SkinWeights } from './bone-heat.js'

export interface BuiltRig {
  /** The container: move, turn and scale the character by this. */
  root: BABYLON.TransformNode
  mesh: BABYLON.Mesh
  skeleton: BABYLON.Skeleton
  /** A joint's node by name. */
  node(name: string): BABYLON.TransformNode | undefined
  dispose(): void
}

/**
 * Skin a mesh (positions xyz and indices in threes, in the fitted rig's
 * space) to a fitted rig. `weights` are bone heat's, indexed by `rig.joints`.
 */
export function buildRig(
  scene: BABYLON.Scene,
  name: string,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  rig: FittedRig,
  weights: SkinWeights,
  options: { normals?: ArrayLike<number> } = {}
): BuiltRig {
  const root = new BABYLON.TransformNode(name, scene)
  root.rotationQuaternion = new BABYLON.Quaternion(0, 1, 0, 0)
  root.scaling = new BABYLON.Vector3(1, 1, -1)
  const nodes = new Map<string, BABYLON.TransformNode>()
  const skeleton = new BABYLON.Skeleton(
    `${name}-skeleton`,
    `${name}-skeleton`,
    scene
  )
  const bones = new Map<string, BABYLON.Bone>()
  for (const j of rig.joints) {
    const parentAt = j.parent != null ? rig.at(j.parent) : undefined
    const n = new BABYLON.TransformNode(j.name, scene)
    n.parent = j.parent != null ? nodes.get(j.parent)! : root
    n.position = new BABYLON.Vector3(
      j.position.x - (parentAt?.x ?? 0),
      j.position.y - (parentAt?.y ?? 0),
      j.position.z - (parentAt?.z ?? 0)
    )
    n.rotationQuaternion = BABYLON.Quaternion.Identity()
    nodes.set(j.name, n)
    const local = BABYLON.Matrix.Translation(
      n.position.x,
      n.position.y,
      n.position.z
    )
    const b = new BABYLON.Bone(
      j.name,
      skeleton,
      j.parent != null ? bones.get(j.parent)! : null,
      local,
      local.clone()
    )
    b.linkTransformNode(n)
    bones.set(j.name, b)
  }

  const mesh = new BABYLON.Mesh(`${name}-skin`, scene)
  const data = new BABYLON.VertexData()
  data.positions = Array.from(positions)
  data.indices = Array.from(indices)
  if (options.normals != null) data.normals = Array.from(options.normals)
  else {
    // Counter-clockwise, outward: the file's handedness, not Babylon's.
    const normals: number[] = []
    BABYLON.VertexData.ComputeNormals(data.positions, data.indices, normals, {
      useRightHandedSystem: true,
    })
    data.normals = normals
  }
  data.applyToMesh(mesh)
  // As the glTF loader does for its mirrored root: the mirror turns the
  // file's counter-clockwise faces clockwise, which is Babylon's front.
  mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
  mesh.setVerticesData(
    BABYLON.VertexBuffer.MatricesIndicesKind,
    weights.indices
  )
  mesh.setVerticesData(
    BABYLON.VertexBuffer.MatricesWeightsKind,
    weights.weights
  )
  mesh.parent = root
  mesh.skeleton = skeleton

  return {
    root,
    mesh,
    skeleton,
    node: (n) => nodes.get(n),
    dispose() {
      mesh.dispose()
      skeleton.dispose()
      root.dispose()
    },
  }
}
