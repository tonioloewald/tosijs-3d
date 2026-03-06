/*#
# b3d-loader

Loads a GLB/glTF scene file into the 3D scene. Meshes named with `-ignore` are discarded.
Imported point/spot lights have their intensity scaled by `lightIntensityScale`.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | URL of the GLB/glTF file |
| `lightIntensityScale` | `0.05` | Scale factor for imported lights |

## Usage

```javascript
const { b3d, b3dLoader } = tosijs3d

document.body.append(
  b3d({},
    b3dLoader({ url: './scene.glb' })
  )
)
```
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'

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
    this.owner = findB3dOwner(this)
    if (this.owner != null) {
      const { scene } = this.owner
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
          this.owner!.register({ lights, meshes })
        }
      )
    }
  }

  disconnectedCallback() {
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
    super.disconnectedCallback()
  }
}

export const b3dLoader = B3dLoader.elementCreator({ tag: 'tosi-b3d-loader' })
