/*#
# b3d-fog

Adds fog to a scene, useful for atmosphere and hiding distant tile pop-in.
When `syncSkybox` is true, the fog color automatically tracks the sibling
`b3dSkybox`'s horizon color, so fog matches the sky at any time of day.

## Demo

**A colonnade marching into the murk.** `syncSkybox` matches the fog to the horizon colour, so the
far crates dissolve into the sky rather than into a flat grey wall. Drag to orbit.

```js
import { b3d, b3dSun, b3dSkybox, b3dFog, b3dGround, b3dBox } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 2.7, radius: 9, target: [0, 1, 8] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: 8 }),
  b3dFog({ syncSkybox: true, start: 6, end: 42 }),
  b3dGround({ width: 120, height: 120, texture: 'checker', textureTiles: 60 }),
  ...Array.from({ length: 12 }, (_, i) =>
    b3dBox({ meshName: `crate-${i}`, size: 1.6, x: i % 2 ? 3 : -3, y: 0.8, z: i * 3.5, color: '#b06a3c' })
  ),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

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
/*{ "parent": "Environment" }*/

import { B3dChild } from './b3d-utils.js'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import type { B3dSkybox } from './b3d-skybox.js'

const FOG_MODES: Record<string, number> = {
  linear: BABYLON.Scene.FOGMODE_LINEAR,
  exp: BABYLON.Scene.FOGMODE_EXP,
  exp2: BABYLON.Scene.FOGMODE_EXP2,
}

export class B3dFog extends B3dChild {
  static preferredTagName = 'tosi-b3d-fog'

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
      // Release the base so a surviving layer (underwater/cloud) can re-arm the always-on fog.
      this.owner.setFogBase(null)
    }
    this.skyboxEl = null
    this.owner = null
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

    // The MODE is set here and never touched again. It's a shader define — changing it at
    // runtime recompiles every material, and that hitch is most of the "thunk" you feel
    // crossing the water's surface. Everything else (underwater, cloud, space) leans on the
    // BASE below by contributing a weighted layer; see atmosphere.ts.
    scene.fogMode = FOG_MODES[attrs.mode] ?? BABYLON.Scene.FOGMODE_LINEAR
    this.publishBase()
  }

  /** Hand the scene our fog as the BASE everything else blends from. */
  private publishBase(): void {
    if (this.owner == null) return
    const attrs = this as any
    const c = attrs.syncSkybox
      ? this.skybox()?.horizonColor ?? BABYLON.Color3.FromHexString(attrs.color)
      : BABYLON.Color3.FromHexString(attrs.color)
    this.owner.setFogBase({
      color: { r: c.r, g: c.g, b: c.b },
      density: attrs.density,
      start: attrs.start,
      end: attrs.end,
    })
  }

  private skybox(): B3dSkybox | null {
    if (this.skyboxEl == null && this.owner != null) {
      this.skyboxEl = this.owner.querySelector(
        'tosi-b3d-skybox'
      ) as unknown as B3dSkybox | null
    }
    return this.skyboxEl
  }

  private syncFromSkybox() {
    // Re-publish the base as the sky colour drifts (day/night). We do NOT write scene.fogColor
    // directly any more — the atmosphere composite owns that, so a cloud or the sea can lean
    // on top of a base that's still tracking the sky.
    this.publishBase()
  }
}

export const b3dFog = B3dFog.elementCreator()
