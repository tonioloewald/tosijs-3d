import * as BABYLON from '@babylonjs/core'
import { WaterMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils'
import type { SceneAdditions, SceneAdditionHandler } from './xin-b3d'

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
    }
  }

  disconnectedCallback(): void {
    if (this.owner && this._callback) {
      this.owner.offSceneAddition(this._callback)
    }
    this.waterMaterial = undefined
    super.disconnectedCallback()
  }

  render() {
    super.render()
    this.updateWater()
  }
}

export const b3dWater = B3dWater.elementCreator({ tag: 'xin-b3d-water' })
