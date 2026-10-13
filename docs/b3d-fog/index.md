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
