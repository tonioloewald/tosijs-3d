import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './xin-b3d'

export class B3dButton extends Component {
  static initAttributes = {
    caption: 'click me',
    textColor: '#ffffff',
    fontSize: 40,
    x: 0,
    y: 0,
    z: 0,
  }

  owner: B3d | null = null
  button?: GUI.Button3D
  action: (data: any, state: BABYLON.EventState) => void = () => {
    console.warn('<xin-b3d-button> clicked but has no assigned action')
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner?.gui != null) {
      const attrs = this as any
      const button = new GUI.Button3D('button')

      const caption = new GUI.TextBlock()
      caption.text = attrs.caption
      caption.color = attrs.textColor
      caption.fontSize = attrs.fontSize
      button.content = caption

      this.owner.gui.addControl(button)
      this.button = button

      button.onPointerUpObservable.add((eventData, eventState) => {
        this.action(eventData, eventState)
      })
    }
  }

  disconnectedCallback() {
    if (this.button != null && this.owner?.gui != null) {
      this.owner.gui.removeControl(this.button)
      this.button = undefined
    }
    this.owner = null
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (this.button?.position) {
      const attrs = this as any
      this.button.position.x = attrs.x
      this.button.position.y = attrs.y
      this.button.position.z = attrs.z
    }
  }
}

export const b3dButton = B3dButton.elementCreator({ tag: 'xin-b3d-button' })
