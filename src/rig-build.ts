/*#
# auto-rig

**A character nobody rigged, walking.** Four meshes as they came out of a
modelling program (no skeleton, no weights) are rigged in the browser and play
UAL's clips: eight markers per mesh place a 65-bone skeleton (`fitSkeleton`),
bone heat binds the skin to it (`boneHeat`), `buildRig` makes a Babylon
skeleton of the result, and `retargetClip` plays the clips on it. The weasels
have tails, which no clip animates, so their tails run on spring bones.

## Demo

Omnidude, a weasel, a skinny weasel and a space marine (shown at 42% of his
4.4 m), by Tonio Loewald, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The markers were placed by eye on a front view, as you would drag them on
Mixamo's. Pick a clip, show the bones, or stiffen the tails, in the panel (the owl).

```js
import {
  b3d, b3dLight, assetUrl, select3d, slider3d, toggle3d,
  objTriangles, fitSkeleton, meshQuery, skinSegments, boneHeat, buildRig,
  readSkeleton, retargetClip, springNodes,
} from 'tosijs-3d'
import { tosi } from 'tosijs'

const { autorig } = tosi({ autorig: { clip: 'Walk_Loop', bones: false, tail: 0.25 } })
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop']

// Mixamo's eight markers on the front view (the character's left is +X),
// given for the left side and mirrored.
const markers = (chin, groin, wrist, elbow, knee) => {
  const p = ([x, y]) => ({ x, y })
  const m = ([x, y]) => ({ x: -x, y })
  return {
    chin: p(chin), groin: p(groin),
    wristL: p(wrist), wristR: m(wrist), elbowL: p(elbow), elbowR: m(elbow), kneeL: p(knee), kneeR: m(knee),
  }
}
const cast = [
  { file: 'omnidude.obj', objects: ['Omnidude', 'Head'], color: [0.55, 0.6, 0.7],
    markers: markers([0, 1.338], [0, 0.467], [0.74, 1.075], [0.47, 1.095], [0.152, 0.258]) },
  { file: 'weasel.obj', objects: ['Weasel'], color: [0.6, 0.42, 0.25], tail: { x: 0, y: 0.5, z: -0.95 },
    markers: markers([0, 0.967], [0, 0.358], [0.51, 0.763], [0.397, 0.763], [0.142, 0.174]) },
  { file: 'weasel-skinny.obj', objects: ['Body', 'Head', 'Tail'], color: [0.8, 0.5, 0.25], tail: { x: 0, y: 0.77, z: -0.95 },
    markers: markers([0, 1.259], [0, 0.64], [0.657, 1.154], [0.404, 1.14], [0.106, 0.34]) },
  { file: 'space-marine.glb', mesh: 'EvilMarineBody', color: [0.3, 0.4, 0.3], scale: 0.42,
    markers: markers([0, 3.594], [0, 1.656], [1.966, 2.937], [1.18, 3.064], [0.388, 0.943]) },
]

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Auto-rig',
      scenePanel: () => [
        select3d({ label: 'clip', value: autorig.clip, options: clips }),
        toggle3d({ label: 'bones', value: autorig.bones }),
        slider3d({ label: 'tail stiffness', value: autorig.tail, min: 0, max: 1, step: 0.01 }),
      ],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 2, 1.35, 6.5, new BABYLON.Vector3(0, 0.8, 0), scene)
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        const ground = BABYLON.MeshBuilder.CreateGround('g', { width: 12, height: 6 }, scene)
        ground.position.y = -0.01

        // The meshes, as triangles in the file's own (right-handed) frame.
        const triangles = async (c) => {
          const url = assetUrl('tonio/rigging/' + c.file)
          if (c.file.endsWith('.obj')) return objTriangles(await (await fetch(url)).text(), c.objects)
          const glb = await BABYLON.LoadAssetContainerAsync(url, scene)
          const m = glb.meshes.find((m) => m.name === c.mesh)
          const out = { positions: Array.from(m.getVerticesData('position')), indices: Array.from(m.getIndices()) }
          glb.dispose()
          return out
        }

        // UAL's mannequin is only the clips' source: it stays hidden.
        const ual = await BABYLON.LoadAssetContainerAsync(assetUrl('quaternius/UAL1_core.glb', 2), scene)
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        ualRoot.setEnabled(false)

        const bodies = []
        for (const [i, c] of cast.entries()) {
          const { positions, indices } = await triangles(c)
          const rig = fitSkeleton(c.markers, meshQuery(positions, indices), { tail: c.tail })
          const weights = boneHeat(positions, indices, skinSegments(rig))
          const built = buildRig(scene, c.file, positions, indices, rig, weights)
          const mat = new BABYLON.StandardMaterial(c.file, scene)
          mat.diffuseColor = new BABYLON.Color3(...c.color)
          built.mesh.material = mat
          // Place and scale by a node above the rig's own (mirrored) root.
          const stand = new BABYLON.TransformNode(c.file + '-stand', scene)
          stand.position.x = 2.4 - 1.6 * i
          stand.scaling.setAll(c.scale ?? 1)
          built.root.parent = stand
          const tail = ['tail_01', 'tail_02', 'tail_03', 'tail_04', 'tail_05', 'tail_leaf'].map((n) => built.node(n))
          const spring = tail[0] ? springNodes(scene, tail, { params: { stiffness: autorig.tail.value } }) : null
          const viewer = new BABYLON.SkeletonViewer(built.skeleton, built.mesh, scene, false, 3, { displayMode: 0 })
          viewer.isEnabled = autorig.bones.value
          bodies.push({ built, spring, viewer, read: readSkeleton(built.skeleton, built.root) })
        }

        // Retarget each clip once per body, the first time it is asked for.
        const made = new Map()
        let playing = []
        const play = (name) => {
          for (const g of playing) g.stop()
          const clip = ual.animationGroups.find((g) => g.name === name)
          if (!clip) return
          playing = bodies.map((b, i) => {
            const key = name + i
            if (!made.has(key)) made.set(key, retargetClip(clip, source, b.read, { scene }))
            return made.get(key)
          })
          for (const g of playing) g.start(true)
        }
        play(autorig.clip.value)
        autorig.clip.observe(() => play(autorig.clip.value))
        autorig.bones.observe(() => { for (const b of bodies) b.viewer.isEnabled = autorig.bones.value })
        autorig.tail.observe(() => { for (const b of bodies) if (b.spring) b.spring.params.stiffness = autorig.tail.value })
      },
    },
    b3dLight({ intensity: 0.9 })
  )
)
```

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
