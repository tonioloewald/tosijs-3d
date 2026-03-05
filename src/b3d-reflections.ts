import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dReflections extends Component {
  static initAttributes = {
    refreshRate: 5,
    probeSize: 512,
  }

  owner: B3d | null = null
  probes: { probe: BABYLON.ReflectionProbe; mesh: BABYLON.AbstractMesh }[] = []
  nonMirrorMeshes: BABYLON.AbstractMesh[] = []
  private _callback?: SceneAdditionHandler

  private addMeshesToProbes() {
    for (const { probe, mesh } of this.probes) {
      if (probe.renderList == null) continue
      for (const m of this.nonMirrorMeshes) {
        if (m !== mesh && !probe.renderList.includes(m)) {
          probe.renderList.push(m)
        }
      }
    }
  }

  private createProbe(mesh: BABYLON.AbstractMesh) {
    if (this.owner == null) return
    const material = mesh.material
    if (material == null) return

    const attrs = this as any
    const probe = new BABYLON.ReflectionProbe(
      mesh.name.replace(/[_-]mirror/g, '_probe'),
      attrs.probeSize,
      this.owner.scene
    )
    try {
      probe.attachToMesh(mesh)
      probe.refreshRate = attrs.refreshRate

      if (material instanceof BABYLON.PBRMaterial) {
        material.reflectionTexture = probe.cubeTexture
      } else if (material instanceof BABYLON.StandardMaterial) {
        material.backFaceCulling = true
        material.reflectionTexture = probe.cubeTexture
        material.reflectionFresnelParameters = new BABYLON.FresnelParameters()
        material.reflectionFresnelParameters.bias = 0.02
      }

      this.probes.push({ probe, mesh })
      this.addMeshesToProbes()
    } catch (e) {
      console.error(`Failed to make "${mesh.name}" reflective:`, e)
      probe.dispose()
    }
  }

  private makeReflectiveCallback(additions: SceneAdditions): void {
    if (this.owner == null) return
    const { meshes } = additions
    if (meshes == null) return

    for (const mesh of meshes) {
      if (mesh.name.includes('_mirror') || mesh.name.includes('-mirror')) {
        this.createProbe(mesh)
      } else {
        this.nonMirrorMeshes.push(mesh)
      }
    }
    // update all probes with any new non-mirror meshes
    this.addMeshesToProbes()
  }

  connectedCallback() {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner != null) {
      this._callback = this.makeReflectiveCallback.bind(this)
      this.owner.onSceneAddition(this._callback)
    }
  }

  disconnectedCallback() {
    if (this.owner != null && this._callback) {
      this.owner.offSceneAddition(this._callback)
    }
    for (const { probe } of this.probes) {
      probe.dispose()
    }
    this.probes = []
    this.nonMirrorMeshes = []
    this.owner = null
    super.disconnectedCallback()
  }
}

export const b3dReflections = B3dReflections.elementCreator({
  tag: 'tosi-b3d-reflections',
})
