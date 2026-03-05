import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner, actualMeshes } from './b3d-utils'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './xin-b3d'

export class B3dSun extends Component {
  static initAttributes = {
    bias: 0.001,
    normalBias: 0.01,
    shadowMaxZ: 100,
    shadowMinZ: 0.01,
    shadowDarkness: 0.1,
    shadowTextureSize: 1024,
    shadowCascading: false,
    activeDistance: 10,
    frustumEdgeFalloff: 0,
    forceBackFacesOnly: true,
    x: 0,
    y: -1,
    z: -0.5,
    intensity: 1,
    updateIntervalMs: 1000,
  }

  owner: B3d | null = null
  light?: BABYLON.DirectionalLight
  shadowGenerator?: BABYLON.ShadowGenerator
  shadowCasters: BABYLON.Mesh[] = []
  activeShadowCasters: BABYLON.Mesh[] = []

  private interval = 0
  private _callback?: SceneAdditionHandler
  private _update?: () => void

  private shadowCallback(additions: SceneAdditions): void {
    const { meshes } = additions
    if (meshes == null) return
    for (const mesh of actualMeshes(meshes)) {
      if (
        !mesh.name.includes('_nocast') &&
        !mesh.name.includes('-nocast') &&
        !this.shadowCasters.includes(mesh)
      ) {
        this.shadowCasters.push(mesh)
      }
      mesh.receiveShadows =
        !mesh.name.includes('_noshadow') && !mesh.name.includes('-noshadow')
    }
  }

  private update() {
    if (this.light == null || this.owner?.camera == null) return
    const camera = this.owner.camera as BABYLON.UniversalCamera
    const target: BABYLON.Vector3 =
      (camera as any).target != null ? (camera as any).target : camera.position
    this.light.position.x = target.x
    this.light.position.y = target.y + 10
    this.light.position.z = target.z

    const activeDistance = (this as any).activeDistance as number
    for (const mesh of this.shadowCasters) {
      const distance = mesh.getAbsolutePosition().subtract(target).length()
      if (distance < activeDistance) {
        if (!this.activeShadowCasters.includes(mesh)) {
          this.activeShadowCasters.push(mesh)
          this.shadowGenerator!.addShadowCaster(mesh)
        }
      } else {
        const idx = this.activeShadowCasters.indexOf(mesh)
        if (idx > -1) {
          this.activeShadowCasters.splice(idx, 1)
          this.shadowGenerator!.removeShadowCaster(mesh)
        }
      }
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner != null) {
      const attrs = this as any
      this._update = this.update.bind(this)
      this.interval = window.setInterval(this._update!, attrs.updateIntervalMs)

      const light = new BABYLON.DirectionalLight(
        'sun',
        new BABYLON.Vector3(attrs.x, attrs.y, attrs.z),
        this.owner.scene
      )
      light.intensity = attrs.intensity
      this.light = light

      if (attrs.shadowCascading) {
        this.shadowGenerator = new BABYLON.CascadedShadowGenerator(
          attrs.shadowTextureSize,
          light
        )
      } else {
        this.shadowGenerator = new BABYLON.ShadowGenerator(
          attrs.shadowTextureSize,
          light
        )
      }

      this._callback = this.shadowCallback.bind(this)
      this.owner.onSceneAddition(this._callback)
    }
  }

  disconnectedCallback() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
    if (this.owner && this._callback) {
      this.owner.offSceneAddition(this._callback)
    }
    if (this.light != null) {
      this.light.dispose()
      this.light = undefined
      this.shadowGenerator = undefined
    }
    this.shadowCasters = []
    this.activeShadowCasters = []
    this.owner = null
    super.disconnectedCallback()
  }

  render() {
    super.render()
    const attrs = this as any
    if (this.light != null && this.shadowGenerator != null) {
      this.light.direction.x = attrs.x
      this.light.direction.y = attrs.y
      this.light.direction.z = attrs.z
      this.light.intensity = attrs.intensity

      // Soften shadows when light is dim (moonlight)
      const darkness =
        attrs.intensity < 0.5
          ? attrs.shadowDarkness + (1 - attrs.shadowDarkness) * 0.6
          : attrs.shadowDarkness
      this.shadowGenerator.setDarkness(darkness)

      if (attrs.shadowCascading) {
        ;(this.shadowGenerator as BABYLON.CascadedShadowGenerator).shadowMaxZ =
          attrs.shadowMaxZ
      } else {
        this.shadowGenerator.bias = attrs.bias
        this.shadowGenerator.normalBias = attrs.normalBias
        this.light.shadowMaxZ = attrs.shadowMaxZ
        this.light.shadowMinZ = attrs.shadowMinZ
        this.shadowGenerator.useContactHardeningShadow = true
        this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.05
        this.shadowGenerator.frustumEdgeFalloff = attrs.frustumEdgeFalloff
        this.shadowGenerator.forceBackFacesOnly = attrs.forceBackFacesOnly
        this.shadowGenerator.setDarkness(attrs.shadowDarkness)
      }
    }
  }
}

export const b3dSun = B3dSun.elementCreator({ tag: 'xin-b3d-sun' })
