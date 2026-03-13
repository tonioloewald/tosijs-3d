/*#
# b3d-loader

Loads a GLB/glTF scene file into the 3D scene. Meshes named with `-ignore` are discarded.
Imported point/spot lights have their intensity scaled by `lightIntensityScale`.

PBR material properties from Blender's Principled BSDF are preserved via glTF.
Material conventions are applied automatically based on properties (not names):
- Near-opaque alpha (> 0.95) snapped to 1.0 to avoid blend cost
- Translucent materials get depth pre-pass, double-sided rendering, and shadow exclusion

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | URL of the GLB/glTF file |
| `lightIntensityScale` | `0.05` | Scale factor for imported lights |

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
