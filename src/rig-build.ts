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

For a model file, `loadRigTriangles(scene, urlOrFile, { pick })` reads its
triangles (its own skeleton ignored), and `autoRig(scene, name, tris)` does
the rest in one call (markers guessed unless you pass them), returning the
built rig with its `rig` and `markers`:

```
const body = autoRig(scene, 'body', await loadRigTriangles(scene, url))
body.root.parent = stand
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
import {
  fitSkeleton,
  guessMarkers,
  meshQuery,
  rigSilhouette,
  skinSegments,
  type FittedRig,
  type Markers,
} from './rig-fit.js'
import { boneHeat, type SkinWeights } from './bone-heat.js'

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

/** A mesh as triangles, in its file's own (right-handed) frame. */
export interface RigTriangles {
  positions: number[]
  indices: number[]
}

/**
 * Meshes' triangles in the frame of the file's root (a glTF's `__root__`
 * carries the handedness mirror, which the binding must not see).
 */
export function gatherTriangles(
  root: BABYLON.TransformNode,
  meshes: BABYLON.AbstractMesh[]
): RigTriangles {
  root.computeWorldMatrix(true)
  const toRoot = root.getWorldMatrix().clone().invert()
  const positions: number[] = []
  const indices: number[] = []
  const v = new BABYLON.Vector3()
  for (const mesh of meshes) {
    /*
    A SKINNED MESH IS WHERE ITS SKELETON PUTS IT: its own vertices can be in
    other units (omnidude's are centimetres, sized by the armature), so take
    them skinned, at rest.
    */
    const skin = mesh.skeleton
    if (skin != null) {
      skin.returnToRest()
      for (const b of skin.bones) b.getTransformNode()?.computeWorldMatrix(true)
      skin.prepare(true)
    }
    const p =
      skin != null
        ? mesh.getPositionData(true, true)
        : mesh.getVerticesData('position')
    const ix = mesh.getIndices()
    if (p == null || ix == null) continue
    const m = mesh.computeWorldMatrix(true).multiply(toRoot)
    const base = positions.length / 3
    for (let i = 0; i < p.length; i += 3) {
      BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(
        p[i],
        p[i + 1],
        p[i + 2],
        m,
        v
      )
      positions.push(v.x, v.y, v.z)
    }
    for (const i of ix) indices.push(base + i)
  }
  return { positions, indices }
}

/**
 * A model file's triangles, its skeleton (if any) ignored: a URL or a File
 * (GLB or glTF), and optionally the one node in it to take (`pick`, with its
 * children; a library holds many characters).
 */
export async function loadRigTriangles(
  scene: BABYLON.Scene,
  source: string | File,
  options: { pick?: string } = {}
): Promise<RigTriangles> {
  const file = source instanceof File
  const container = await BABYLON.LoadAssetContainerAsync(
    source,
    scene,
    file
      ? {
          pluginExtension: source.name.toLowerCase().endsWith('.gltf')
            ? '.gltf'
            : '.glb',
        }
      : undefined
  )
  try {
    const root = (container.meshes.find((n) => n.name === '__root__') ??
      container.transformNodes[0]) as BABYLON.TransformNode
    const top =
      options.pick != null
        ? container.transformNodes.find((n) => n.name === options.pick) ??
          container.meshes.find((n) => n.name === options.pick)
        : undefined
    if (options.pick != null && top == null)
      throw new Error(`no "${options.pick}" in the file`)
    if (top != null) top.position.set(0, 0, 0)
    const meshes = container.meshes.filter(
      (n) =>
        n.getTotalVertices() > 0 &&
        (top == null || n === top || n.isDescendantOf(top))
    )
    const tris = gatherTriangles(root, meshes)
    if (tris.indices.length === 0) throw new Error('the file has no meshes')
    return tris
  } finally {
    container.dispose()
  }
}

export interface AutoRigged extends BuiltRig {
  /** The fitted skeleton (`rig.at(name)` for a joint's rest position). */
  rig: FittedRig
  /** The markers it was fitted from: guessed, unless they were given. */
  markers: Markers
}

/**
 * The whole auto-rig on a mesh's triangles: markers (guessed from its front
 * outline unless given), UAL's skeleton fitted to them, bone heat, and a
 * Babylon skeleton. The mesh faces +Z with its left on +X, standing on y = 0.
 * Bone heat takes about a second for 20,000 vertices.
 */
export function autoRig(
  scene: BABYLON.Scene,
  name: string,
  tris: RigTriangles,
  options: { markers?: Markers } = {}
): AutoRigged {
  const { positions, indices } = tris
  const markers =
    options.markers ?? guessMarkers(rigSilhouette(positions, indices, 'front'))
  const rig = fitSkeleton(markers, meshQuery(positions, indices))
  const weights = boneHeat(positions, indices, skinSegments(rig))
  const built = buildRig(scene, name, positions, indices, rig, weights)
  return { ...built, rig, markers }
}
