# Ambient light (b3d-light)

Hemispheric ambient fill light. Wraps `BABYLON.HemisphericLight`. Cheap to render
and never casts shadows — pair it with `b3dSun` for directional light that
does. Drop intensity around 0.3 when you want the sun's shadows to actually
read; keep it higher (around 0.7) when you don't have a sun and want
everything visible.

## Demo

```js
import { b3d, b3dLight, b3dSkybox, b3dGround, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { ambient } = tosi({ ambient: { intensity: 0.6 } })

preview.append(
  b3d(
    {
      panelTitle: 'Light',
      scenePanel: () => [
        slider3d({ label: 'ambient', value: ambient.intensity, min: 0, max: 1.5, step: 0.05 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2.5, beta: Math.PI / 3, radius: 6,
          target: [0, 1, 0], maxElevationDeg: 70,
        })
        camera.lowerRadiusLimit = 2.5
        camera.upperRadiusLimit = 18
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
| `groundColor` | `'#000000'` | Bounce from below (hex). Babylon's default is black, which is why vertical faces look unlit however high `intensity` goes — set a dim version of your ground colour |
