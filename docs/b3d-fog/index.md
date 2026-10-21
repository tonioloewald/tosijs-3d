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

## Fog layers: never switched on

The fog is always on, and the systems that change it **lean** on it. Underwater,
inside a cloud and out in space are each a *layer* that pulls the fog toward its
own colour and density by a weight from 0 to 1. The layers composite over this
element's fog, the result is smoothed over time, and nothing ever toggles.

Two things would make a transition jump, and neither happens:

1. **The fog mode never changes at runtime.** Changing `fogMode` changes every
   material's shader defines, so everything recompiles: a real frame hitch, not
   just a visual pop. The mode is set once; only the uniforms (colour, density,
   start, end) are modulated.
2. **Nothing changes at a plane.** A layer's weight ramps over a band rather
   than flipping at a boundary, and a short temporal smooth takes the rest.

| layer | weight ramps with |
|---|---|
| **underwater** | depth below the surface (over a band, not a plane) |
| **cloud** | *approach* to the cloud: white before you touch the geometry |
| **space** | altitude leaving the atmosphere: density → 0, colour → black |

The blending is pure and unit-tested without an engine: `compositeFog(base,
layers)` gives the fog state, `approachFog` smooths toward it, and
`band(value, startAt, full)` is the ramp the layers (and
[b3d-ambient](/b3d-ambient/)'s underwater effects) share.
