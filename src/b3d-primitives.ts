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

export class B3dBox extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'box',
    size: 1,
    width: 0, // 0 = use size
    height: 0,
    depth: 0,
    color: '#ff0000',
    mirror: false,
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      meshName,
      {
        size: attrs.size,
        width: attrs.width || attrs.size,
        height: attrs.height || attrs.size,
        depth: attrs.depth || attrs.size,
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

export const b3dBox = B3dBox.elementCreator({ tag: 'tosi-b3d-box' })

export class B3dGround extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'ground',
    size: 0, // square shortcut; >0 overrides width/height
    width: 4,
    height: 4,
    color: '#888888',
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const meshName = attrs.meshName || 'ground'
    this.mesh = BABYLON.MeshBuilder.CreateGround(
      meshName,
      {
        width: attrs.size || attrs.width,
        height: attrs.size || attrs.height,
      },
      scene
    )
    const material = new BABYLON.StandardMaterial(meshName + '-mat', scene)
    material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color)
    this.mesh.material = material
    // Opt into collisions so character controllers (biped/car) can stand on it —
    // their grounding probe and moveWithCollisions only see `checkCollisions` meshes.
    this.mesh.checkCollisions = true
    owner.register({ meshes: [this.mesh] })
  }
}

export const b3dGround = B3dGround.elementCreator({ tag: 'tosi-b3d-ground' })
