/*
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
  const skeleton = new BABYLON.Skeleton(`${name}-skeleton`, `${name}-skeleton`, scene)
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
    const local = BABYLON.Matrix.Translation(n.position.x, n.position.y, n.position.z)
    const b = new BABYLON.Bone(j.name, skeleton, j.parent != null ? bones.get(j.parent)! : null, local, local.clone())
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
  mesh.setVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind, weights.indices)
  mesh.setVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind, weights.weights)
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
