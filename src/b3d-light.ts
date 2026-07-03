/*#
# b3d-light

Hemispheric ambient fill light. Wraps `BABYLON.HemisphericLight`. Cheap to render
and never casts shadows — pair it with `b3dSun` for directional light that
does. Drop intensity around 0.3 when you want the sun's shadows to actually
read; keep it higher (around 0.7) when you don't have a sun and want
everything visible.

## Demo

```js
import { b3d, b3dLight, b3dSkybox, b3dGround, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { ambient } = tosi({ ambient: { intensity: 0.6 } })

preview.append(
  b3d(
    {
      scenePanel: () => [
        label3d({ text: 'Light' }),
        slider3d({ label: 'ambient', value: ambient.intensity, min: 0, max: 1.5, step: 0.05 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2.5, Math.PI / 3, 6,
          new BABYLON.Vector3(0, 1, 0), el.scene
        )
        // Keep the camera >=5deg above the horizon and out of the scene: a bare
        // ArcRotateCamera tilts under the ground and zooms through everything.
        camera.lowerBetaLimit = (20 * Math.PI) / 180
        camera.upperBetaLimit = (85 * Math.PI) / 180
        camera.lowerRadiusLimit = 2.5
        camera.upperRadiusLimit = 18
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dLight({ intensity: ambient.intensity }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ width: 10, height: 10, color: '#556644' }),
    b3dSphere({ y: 1, diameter: 1.5, color: '#4488cc' }),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Light direction X (the "up" direction) |
| `y` | `1` | Light direction Y |
| `z` | `0` | Light direction Z |
| `intensity` | `1` | Brightness multiplier |
| `diffuse` | `'#ffffff'` | Diffuse color (hex) |
| `specular` | `'#808080'` | Specular color (hex) |
*/
/*{ "parent": "Environment" }*/

import { B3dChild } from './b3d-utils'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'

export class B3dLight extends B3dChild {
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

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner
    const attrs = this as any
    this.light = new BABYLON.HemisphericLight(
      'light',
      new BABYLON.Vector3(attrs.x, attrs.y, attrs.z),
      scene
    )
    owner.register({ lights: [this.light] })
  }

  sceneDispose() {
    if (this.light != null) {
      this.light.dispose()
      this.light = undefined
    }
    this.owner = null
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
