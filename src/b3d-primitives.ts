import * as BABYLON from '@babylonjs/core'
import { AbstractMesh } from './b3d-utils'
import type { B3d } from './tosi-b3d'

export class B3dSphere extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'sphere',
    segments: 16,
    diameter: 1,
    color: '#ff0000',
    mirror: false,
  }

  connectedCallback(): void {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName
    this.mesh = BABYLON.MeshBuilder.CreateSphere(
      meshName,
      {
        segments: attrs.segments,
        diameter: attrs.diameter,
      },
      scene
    )
    if (attrs.mirror) {
      const material = new BABYLON.PBRMaterial(meshName + '-mat', scene)
      material.albedoColor = BABYLON.Color3.FromHexString(attrs.color)
      material.metallic = 1
      material.roughness = 0.05
      this.mesh.material = material
    } else {
      const material = new BABYLON.StandardMaterial(meshName + '-mat', scene)
      material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color)
      this.mesh.material = material
    }
    owner.register({ meshes: [this.mesh] })
  }
}

export const b3dSphere = B3dSphere.elementCreator({ tag: 'tosi-b3d-sphere' })

export class B3dGround extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    width: 4,
    height: 4,
  }

  connectedCallback(): void {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    this.mesh = BABYLON.MeshBuilder.CreateGround(
      attrs.name || 'ground',
      {
        width: attrs.width,
        height: attrs.height,
      },
      scene
    )
    owner.register({ meshes: [this.mesh] })
  }
}

export const b3dGround = B3dGround.elementCreator({ tag: 'tosi-b3d-ground' })
