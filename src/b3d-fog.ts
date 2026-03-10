/*#
# b3d-fog

Adds fog to a scene, useful for atmosphere and hiding distant tile pop-in.
When `syncSkybox` is true, the fog color automatically tracks the sibling
`b3dSkybox`'s horizon color, so fog matches the sky at any time of day.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `mode` | `'linear'` | `'linear'`, `'exp'`, or `'exp2'` |
| `color` | `'#bfd9f2'` | Fog color (hex, ignored when `syncSkybox` is true) |
| `start` | `60` | Start distance (linear mode) |
| `end` | `120` | End distance (linear mode) |
| `density` | `0.01` | Density (exp/exp2 modes) |
| `syncSkybox` | `false` | Automatically match fog color to skybox horizon |

## Usage

```javascript
import { b3d, b3dFog, b3dSkybox, b3dSun } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dSun(),
    b3dSkybox({ timeOfDay: 10, realtimeScale: 100 }),
    b3dFog({ syncSkybox: true, start: 50, end: 100 }),
  )
)
```
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import type { B3dSkybox } from './b3d-skybox'

const FOG_MODES: Record<string, number> = {
  linear: BABYLON.Scene.FOGMODE_LINEAR,
  exp: BABYLON.Scene.FOGMODE_EXP,
  exp2: BABYLON.Scene.FOGMODE_EXP2,
}

export class B3dFog extends Component {
  static initAttributes = {
    mode: 'linear',
    color: '#bfd9f2',
    start: 60,
    end: 120,
    density: 0.01,
    syncSkybox: false,
  }

  owner: B3d | null = null
  private skyboxEl: B3dSkybox | null = null
  private _beforeRender: (() => void) | null = null

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
    this.applyFog()

    // When syncing skybox, update fog color each frame
    if ((this as any).syncSkybox) {
      this._beforeRender = () => this.syncFromSkybox()
      this.owner.scene.registerBeforeRender(this._beforeRender)
    }
  }

  sceneDispose() {
    if (this.owner != null) {
      if (this._beforeRender) {
        this.owner.scene.unregisterBeforeRender(this._beforeRender)
        this._beforeRender = null
      }
      this.owner.scene.fogMode = BABYLON.Scene.FOGMODE_NONE
    }
    this.skyboxEl = null
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (!this.owner) return
    this.applyFog()
  }

  private applyFog() {
    if (this.owner == null) return
    const attrs = this as any
    const scene = this.owner.scene

    scene.fogMode = FOG_MODES[attrs.mode] ?? BABYLON.Scene.FOGMODE_LINEAR
    scene.fogStart = attrs.start
    scene.fogEnd = attrs.end
    scene.fogDensity = attrs.density

    if (!attrs.syncSkybox) {
      scene.fogColor = BABYLON.Color3.FromHexString(attrs.color)
    }
  }

  private syncFromSkybox() {
    if (this.owner == null) return
    if (this.skyboxEl == null) {
      this.skyboxEl = this.owner.querySelector(
        'tosi-b3d-skybox'
      ) as unknown as B3dSkybox | null
    }
    if (this.skyboxEl != null) {
      this.owner.scene.fogColor = this.skyboxEl.horizonColor
    }
  }
}

export const b3dFog = B3dFog.elementCreator({ tag: 'tosi-b3d-fog' })
