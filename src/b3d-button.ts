import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import type { B3d } from './tosi-b3d'

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
    console.warn('<tosi-b3d-button> clicked but has no assigned action')
  }

  connectedCallback(): void {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
    if (owner.gui != null) {
      const attrs = this as any
      const button = new GUI.Button3D('button')

      const caption = new GUI.TextBlock()
      caption.text = attrs.caption
      caption.color = attrs.textColor
      caption.fontSize = attrs.fontSize
      button.content = caption

      owner.gui.addControl(button)
      this.button = button

      button.onPointerUpObservable.add((eventData, eventState) => {
        this.action(eventData, eventState)
      })
    }
  }

  sceneDispose() {
    if (this.button != null && this.owner?.gui != null) {
      this.owner.gui.removeControl(this.button)
      this.button = undefined
    }
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (!this.owner) return
    if (this.button?.position) {
      const attrs = this as any
      this.button.position.x = attrs.x
      this.button.position.y = attrs.y
      this.button.position.z = attrs.z
    }
  }
}

export const b3dButton = B3dButton.elementCreator({ tag: 'tosi-b3d-button' })
