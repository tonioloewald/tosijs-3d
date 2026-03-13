/*#
# b3d-loader

Loads a GLB/glTF scene file into the 3D scene. Meshes named with `-ignore` are discarded.
Imported point/spot lights have their intensity scaled by `lightIntensityScale`.

[Material conventions](?b3d-utils.ts) are applied automatically to all loaded meshes.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | URL of the GLB/glTF file |
| `lightIntensityScale` | `0.05` | Scale factor for imported lights |

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLoader, b3dReflections } from 'tosijs-3d'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 4, 20,
        new BABYLON.Vector3(0, 1, 0), el.scene
      )
      camera.lowerRadiusLimit = 3
      camera.upperRadiusLimit = 40
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dSun({ shadowCascading: true }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLoader({ url: './materials.glb' }),
  b3dReflections(),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Usage

```javascript
import { b3d, b3dLoader } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dLoader({ url: './scene.glb' })
  )
)
```
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { applyMaterialConventions } from './b3d-utils'

export class B3dLoader extends Component {
  static initAttributes = {
    url: '',
    lightIntensityScale: 0.05,
  }

  owner: B3d | null = null
  meshes?: BABYLON.AbstractMesh[]
  lights?: BABYLON.Light[]

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner
    const url = (this as any).url as string
    if (!url) return
    BABYLON.SceneLoader.ImportMeshAsync('', url, undefined, scene).then(
      (result) => {
        const { meshes, lights, transformNodes } = result
        this.meshes = meshes
        this.lights = lights

        for (const mesh of meshes) {
          if (mesh.name.includes('-ignore')) {
            mesh.dispose()
          }
        }
        for (const node of transformNodes) {
          if (node.name.includes('-ignore')) {
            node.dispose()
          }
        }
        for (const light of lights) {
          if (light.name.includes('-ignore')) {
            light.dispose()
          } else if (
            light instanceof BABYLON.PointLight ||
            light instanceof BABYLON.SpotLight
          ) {
            light.intensity *= (this as any).lightIntensityScale
          }
        }
        applyMaterialConventions(meshes)
        this.owner!.register({ lights, meshes })
      }
    )
  }

  sceneDispose() {
    if (this.meshes != null) {
      for (const mesh of this.meshes) {
        mesh.dispose()
      }
      this.meshes = undefined
    }
    if (this.lights != null) {
      for (const light of this.lights) {
        light.dispose()
      }
      this.lights = undefined
    }
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }
}

export const b3dLoader = B3dLoader.elementCreator({ tag: 'tosi-b3d-loader' })
