/*#
# b3d-water

Water plane with reflections, waves, and underwater fog effect.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `waterSize` | `128` | Size of the water plane |
| `subdivisions` | `32` | Mesh subdivisions |
| `twoSided` | `false` | Render both sides |
| `windForce` | `-5` | Wind strength |
| `waveHeight` | `0` | Wave amplitude |
| `bumpHeight` | `0.1` | Normal map bump intensity |
| `waterColor` | `'#0066cc'` | Water tint color |
| `colorBlendFactor` | `0.1` | How much color tints the water |
| `spherical` | `false` | Use a sphere instead of a plane |

## Underwater Effect

When the camera goes below the water surface, a blue fog is automatically applied.
The sun (if present via `b3dSun`) is also dimmed based on depth.

```javascript
const { b3d, b3dWater, b3dSun, b3dSkybox } = tosijs3d

document.body.append(
  b3d({},
    b3dSun({}),
    b3dSkybox({ timeOfDay: 12 }),
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024 })
  )
)
```
*/

import * as BABYLON from '@babylonjs/core'
import { WaterMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils'
import type { SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dWater extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    spherical: false,
    waterSize: 128,
    subdivisions: 32,
    textureSize: 1024,
    twoSided: false,
    normalMap: './static/waterbump.png',
    windForce: -5,
    waveHeight: 0,
    bumpHeight: 0.1,
    waveLength: 0.1,
    waterColor: '#0066cc',
    colorBlendFactor: 0.1,
    windDirectionX: 0.6,
    windDirectionY: 0.8,
  }

  waterMaterial?: WaterMaterial
  private _callback?: SceneAdditionHandler
  private _underwaterUpdate?: () => void
  private _savedFogMode = BABYLON.Scene.FOGMODE_NONE
  private _savedFogColor = new BABYLON.Color3()
  private _savedFogDensity = 0
  private _wasUnderwater = false

  private waterCallback(additions: SceneAdditions) {
    const { meshes } = additions
    if (meshes == null) return
    for (const mesh of meshes) {
      if (!mesh.name.includes('water')) {
        this.waterMaterial!.addToRenderList(mesh)
      }
    }
  }

  private updateWater() {
    if (this.waterMaterial == null || this.owner == null) return
    const attrs = this as any
    this.waterMaterial.backFaceCulling = !attrs.twoSided
    this.waterMaterial.windForce = attrs.windForce
    this.waterMaterial.windDirection = new BABYLON.Vector2(
      attrs.windDirectionX,
      attrs.windDirectionY
    )
    this.waterMaterial.waveHeight = attrs.waveHeight
    this.waterMaterial.waveLength = attrs.waveLength
    this.waterMaterial.bumpHeight = attrs.bumpHeight
    if (attrs.colorBlendFactor > 0) {
      const hex = attrs.waterColor as string
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      this.waterMaterial.waterColor = new BABYLON.Color3(r, g, b)
    }
    this.waterMaterial.colorBlendFactor = attrs.colorBlendFactor
  }

  connectedCallback(): void {
    super.connectedCallback()
    if (this.owner != null) {
      const attrs = this as any
      const { scene } = this.owner

      if (attrs.spherical) {
        this.mesh = BABYLON.MeshBuilder.CreateSphere(
          'water_nocast',
          { segments: attrs.subdivisions, diameter: attrs.waterSize },
          scene
        )
      } else {
        this.mesh = BABYLON.MeshBuilder.CreateGround(
          'water_nocast',
          {
            width: attrs.waterSize,
            height: attrs.waterSize,
            subdivisions: attrs.subdivisions,
          },
          scene
        )
      }
      this.mesh.checkCollisions = false

      this.waterMaterial = new WaterMaterial(
        'water',
        scene,
        new BABYLON.Vector2(attrs.textureSize, attrs.textureSize)
      )
      this.waterMaterial.bumpTexture = new BABYLON.Texture(
        attrs.normalMap,
        scene
      )
      this.updateWater()
      this.mesh.material = this.waterMaterial

      this._callback = this.waterCallback.bind(this)
      this.owner.onSceneAddition(this._callback)

      // Underwater fog effect
      this._savedFogMode = scene.fogMode
      this._savedFogColor = scene.fogColor.clone()
      this._savedFogDensity = scene.fogDensity
      this._underwaterUpdate = () => {
        const cam = scene.activeCamera
        if (!cam || !this.mesh) return
        const camY = cam.globalPosition.y
        const waterY = this.mesh.absolutePosition.y
        const underwater = camY < waterY
        if (underwater && !this._wasUnderwater) {
          this._wasUnderwater = true
          scene.fogMode = BABYLON.Scene.FOGMODE_EXP2
          scene.fogColor = new BABYLON.Color3(0, 0.15, 0.3)
          scene.fogDensity = 0.12
        } else if (!underwater && this._wasUnderwater) {
          this._wasUnderwater = false
          scene.fogMode = this._savedFogMode
          scene.fogColor = this._savedFogColor
          scene.fogDensity = this._savedFogDensity
        }
      }
      scene.registerBeforeRender(this._underwaterUpdate)
    }
  }

  disconnectedCallback(): void {
    if (this.owner && this._callback) {
      this.owner.offSceneAddition(this._callback)
    }
    if (this._underwaterUpdate && this.owner?.scene) {
      this.owner.scene.unregisterBeforeRender(this._underwaterUpdate)
      // Restore fog state
      if (this._wasUnderwater) {
        this.owner.scene.fogMode = this._savedFogMode
        this.owner.scene.fogColor = this._savedFogColor
        this.owner.scene.fogDensity = this._savedFogDensity
      }
      this._underwaterUpdate = undefined
    }
    this.waterMaterial = undefined
    super.disconnectedCallback()
  }

  render() {
    super.render()
    this.updateWater()
  }
}

export const b3dWater = B3dWater.elementCreator({ tag: 'tosi-b3d-water' })
