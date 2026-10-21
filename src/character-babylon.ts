/*#
# character-babylon

The Babylon side of the character creator (CHARACTER-DESIGN.md). For now, one
thing: `humanBody(scene, pack)` draws a [human pack](/human-pack/)'s body as
one mesh, and `update(positions)` reshapes it in place when the sliders move
([human-morph](/human-morph/) makes the positions).

## Demo

A grey body from MakeHuman's CC0 data (hm08), morphed live: open the settings
(the owl) for gender, age, muscle, weight, height, proportions and ancestry.

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, slider3d, label3d, assetUrl, loadHumanPack, humanBody, macroWeights, morphHuman, DEFAULT_HUMAN_BODY, ageYears, humanHeight } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div } = elements

const { human } = tosi({ human: { ...DEFAULT_HUMAN_BODY } })
const readout = div({ class: 'readout' }, 'loading MakeHuman hm08…')
let body = null
let pack = null
let busy = false
let again = false

async function reshape() {
  if (pack == null || body == null) return
  if (busy) { again = true; return }
  busy = true
  const b = {}
  for (const k of Object.keys(DEFAULT_HUMAN_BODY)) b[k] = Number(human[k].value)
  const p = await morphHuman(pack, macroWeights(b, (n) => pack.has(n)))
  body.update(p)
  readout.textContent = `${humanHeight(p, pack.triangles).toFixed(2)} m, ${Math.round(ageYears(b.age))} years`
  busy = false
  if (again) { again = false; reshape() }
}

const slider = (label, key, extra = {}) =>
  slider3d({ label, value: human[key], min: 0, max: 1, step: 0.01, handleChange: reshape, ...extra })

preview.append(
  b3d(
    {
      panelTitle: 'Body',
      scenePanel: () => [
        slider('gender', 'gender'),
        slider('age', 'age'),
        slider('muscle', 'muscle'),
        slider('weight', 'weight'),
        slider('height', 'height'),
        slider('proportions', 'proportions'),
        label3d({ text: 'Ancestry' }),
        slider('african', 'african'),
        slider('asian', 'asian'),
        slider('caucasian', 'caucasian'),
      ],
      async sceneCreated(el, BABYLON) {
        const cam = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, 1.4, 3.2, new BABYLON.Vector3(0, 0.9, 0), el.scene)
        cam.lowerRadiusLimit = 1
        cam.upperRadiusLimit = 8
        cam.minZ = 0.05
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
        const ground = BABYLON.MeshBuilder.CreateDisc('floor', { radius: 2 }, el.scene)
        ground.rotation.x = Math.PI / 2
        el.register({ meshes: [ground] })
        pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json'))
        body = humanBody(el.scene, pack)
        el.register({ meshes: [body.mesh] })
        reshape()
      },
    },
    b3dSun(),
    b3dLight({ intensity: 0.4 }),
    b3dSkybox({ timeOfDay: 10 })
  ),
  readout
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.readout { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); color: white; padding: 4px 10px; border-radius: 6px; font: 13px monospace; }
```

## The mesh

The pack is RIGHT-HANDED (as OBJ and glTF are), so the body sits under a
container that mirrors it the way glTF's `__root__` does, and stands with its
feet at the container's origin. Move the body by moving `root`. The mesh keeps
every vertex the targets move (helpers and joint cubes too), but draws only the
body's triangles.
*/
/*{ "parent": "human-pack", "order": 10 }*/

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
