import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'

export class B3dLight extends Component {
  static initAttributes = {
    x: 0,
    y: 1,
    z: 0,
    intensity: 1,
    diffuse: '#ffffff',
    specular: '#808080',
  }

  owner: B3d | null = null
  light?: BABYLON.HemisphericLight

  connectedCallback() {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner != null) {
      const attrs = this as any
      this.light = new BABYLON.HemisphericLight(
        'light',
        new BABYLON.Vector3(attrs.x, attrs.y, attrs.z),
        this.owner.scene
      )
      this.owner.register({ lights: [this.light] })
    }
  }

  disconnectedCallback() {
    if (this.light != null) {
      this.light.dispose()
      this.light = undefined
    }
    this.owner = null
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (this.light != null) {
      const attrs = this as any
      this.light.direction = new BABYLON.Vector3(attrs.x, attrs.y, attrs.z)
      this.light.intensity = attrs.intensity
      this.light.diffuse = BABYLON.Color3.FromHexString(attrs.diffuse)
      this.light.specular = BABYLON.Color3.FromHexString(attrs.specular)
    }
  }
}

export const b3dLight = B3dLight.elementCreator({ tag: 'tosi-b3d-light' })
