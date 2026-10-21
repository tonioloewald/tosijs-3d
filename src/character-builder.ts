/*#
# character builder

**Make a person, and watch them walk.** The first steps of the character
creator (CHARACTER-DESIGN.md): MakeHuman's CC0 body
([human-pack](/human-pack/)), reshaped by sliders for gender, age, muscle,
weight, height and ancestry ([human-morph](/human-morph/)), with UAL's
skeleton placed from its own joint cubes ([human-rig](/human-rig/)) so it
plays UAL's clips at any shape.

## Demo

Open the settings (the owl): the body sliders reshape it
while it walks, since every body carries its own joints. The skin weights are
bone heat's, worked out once when the page loads (a couple of seconds).

```js
import { b3d, b3dLight, slider3d, select3d, label3d, assetUrl, loadHumanPack, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, humanRig, humanSkin, skinSegments, boneHeat, buildRig, readSkeleton, retargetClip } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div } = elements

const status = div({ class: 'status' }, 'loading the animations…')
const { walker } = tosi({ walker: { ...DEFAULT_HUMAN_BODY, clip: 'Walk_Loop' } })
const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Crouch_Fwd_Loop']
let rebuild = () => {}

const slider = (label, key) =>
  slider3d({ label, value: walker[key], min: 0, max: 1, step: 0.01, handleChange: () => rebuild() })

preview.append(
  b3d(
    {
      clearColor: '#2a3340',
      panelTitle: 'Walker',
      scenePanel: () => [
        select3d({ label: 'clip', value: walker.clip, options: clips }),
        slider('gender', 'gender'),
        slider('age', 'age'),
        slider('muscle', 'muscle'),
        slider('weight', 'weight'),
        slider('height', 'height'),
        label3d({ text: 'Ancestry' }),
        slider('african', 'african'),
        slider('asian', 'asian'),
        slider('caucasian', 'caucasian'),
      ],
      async sceneCreated(el, BABYLON) {
        const scene = el.scene
        const cam = new BABYLON.ArcRotateCamera('c', Math.PI / 2 - 0.5, 1.35, 4, new BABYLON.Vector3(0, 0.9, 0), scene)
        cam.minZ = 0.05
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        BABYLON.MeshBuilder.CreateGround('g', { width: 8, height: 8 }, scene)

        // UAL's mannequin is only the clips' source: it stays hidden.
        const ual = await BABYLON.LoadAssetContainerAsync(assetUrl('quaternius/UAL1_core.glb', 2), scene)
        status.textContent = 'loading the body…'
        ual.addAllToScene()
        for (const g of ual.animationGroups) g.stop()
        const ualRoot = ual.meshes.find((m) => m.name === '__root__')
        const source = readSkeleton(ual.skeletons[0], ualRoot)
        ualRoot.setEnabled(false)

        const pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json')).catch((e) => {
          status.textContent = `could not load the body: ${e.message}`
          throw e
        })
        status.textContent = 'binding the skin…'
        // Let the message paint before the binding takes the thread.
        await new Promise((r) => setTimeout(r, 50))
        const skin = humanSkin(pack)
        const body = () => {
          const b = {}
          for (const k of Object.keys(DEFAULT_HUMAN_BODY)) b[k] = Number(walker[k].value)
          return macroWeights(b, (n) => pack.has(n))
        }
        // The weights depend only on the topology: once, on the first body.
        const first = await morphHuman(pack, body())
        const weights = boneHeat(skin.positions(first), skin.triangles, skinSegments(humanRig(pack.manifest, first)))

        const mat = new BABYLON.StandardMaterial('skin', scene)
        mat.diffuseColor = new BABYLON.Color3(0.65, 0.63, 0.62)
        const stand = new BABYLON.TransformNode('stand', scene)
        let built = null
        let playing = null
        let read = null
        const play = () => {
          playing?.dispose()
          const clip = ual.animationGroups.find((g) => g.name === walker.clip.value)
          playing = clip ? retargetClip(clip, source, read, { scene }) : null
          playing?.start(true)
        }
        let busy = false
        let again = false
        rebuild = async () => {
          if (busy) { again = true; return }
          busy = true
          const full = await morphHuman(pack, body())
          const rig = humanRig(pack.manifest, full)
          built?.dispose()
          built = buildRig(scene, 'walker', skin.positions(full), skin.triangles, rig, weights)
          built.mesh.material = mat
          built.root.parent = stand
          stand.position.y = -rig.at('root').y
          el.register({ meshes: [built.mesh] })
          read = readSkeleton(built.skeleton, built.root)
          play()
          busy = false
          if (again) { again = false; rebuild() }
        }
        await rebuild()
        status.remove()
        walker.clip.observe(play)
      },
    },
    b3dLight({ intensity: 0.9 })
  ),
  status
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.status { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.6); color: white; padding: 6px 12px; border-radius: 6px; font: 13px sans-serif; }
```

## humanBody

`humanBody(scene, pack)` draws a pack's body as one unrigged mesh, and
`update(positions)` reshapes it in place: for a body that only needs to be
looked at.


The pack is RIGHT-HANDED (as OBJ and glTF are), so the body sits under a
container that mirrors it the way glTF's `__root__` does, and stands with its
feet at the container's origin. Move the body by moving `root`. The mesh keeps
every vertex the targets move (helpers and joint cubes too), but draws only the
body's triangles.
*/
/*{ "parent": "b3d-biped", "order": 80 }*/

import * as BABYLON from '@babylonjs/core'
import type { HumanPack } from './human-pack.js'

export interface HumanBody {
  /** Move, turn and scale the body by this. */
  root: BABYLON.TransformNode
  mesh: BABYLON.Mesh
  /** Reshape the body from new positions (xyz per vertex, the pack's frame). */
  update(positions: Float32Array): void
  dispose(): void
}

export function humanBody(
  scene: BABYLON.Scene,
  pack: HumanPack,
  name = 'human'
): HumanBody {
  const root = new BABYLON.TransformNode(name, scene)
  // The file's mirror, as glTF's `__root__` carries it.
  const mirror = new BABYLON.TransformNode(`${name}-frame`, scene)
  mirror.rotationQuaternion = new BABYLON.Quaternion(0, 1, 0, 0)
  mirror.scaling = new BABYLON.Vector3(1, 1, -1)
  mirror.parent = root

  const mesh = new BABYLON.Mesh(`${name}-body`, scene)
  const indices = Array.from(pack.triangles)
  const normals = new Float32Array(pack.positions.length)
  const data = new BABYLON.VertexData()
  data.positions = new Float32Array(pack.positions)
  data.indices = indices
  data.normals = normals
  data.applyToMesh(mesh, true)
  // As the glTF loader does for its mirrored root: the mirror turns the
  // file's counter-clockwise faces clockwise, which is Babylon's front.
  mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation
  mesh.parent = mirror
  const material = new BABYLON.StandardMaterial(`${name}-grey`, scene)
  material.diffuseColor = new BABYLON.Color3(0.62, 0.62, 0.64)
  material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08)
  mesh.material = material

  // Feet on the floor: the pack is centred near its middle.
  const used = new Uint8Array(pack.manifest.vertexCount)
  for (const i of pack.triangles) used[i] = 1

  function update(positions: Float32Array): void {
    let foot = Infinity
    for (let i = 0; i < used.length; i++) {
      if (used[i] && positions[i * 3 + 1] < foot) foot = positions[i * 3 + 1]
    }
    mirror.position.y = -foot
    // Counter-clockwise, outward: the file's handedness, not Babylon's.
    BABYLON.VertexData.ComputeNormals(positions, indices, normals, {
      useRightHandedSystem: true,
    })
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions)
    mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals)
    mesh.refreshBoundingInfo()
  }
  update(pack.positions)

  return {
    root,
    mesh,
    update,
    dispose() {
      material.dispose()
      mesh.dispose()
      mirror.dispose()
      root.dispose()
    },
  }
}
