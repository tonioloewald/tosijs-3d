# Sun and shadows (b3d-shadows)

`B3dSun` — directional light + cascaded shadow generator. Add a `<tosi-b3d-sun>`
inside `<tosi-b3d>` and every registered mesh starts casting shadows onto every
registered surface. When `b3dSkybox` is present, the sun's direction, color, and
intensity are driven by the skybox's time-of-day; otherwise the static
`x`/`y`/`z`/`intensity` attributes apply.

Cascaded shadow maps (CSM) cover the camera's view frustum out to `shadowMaxZ`,
giving high-resolution shadows near the camera and graceful falloff at distance
— the right model for both close scenes and fast, far-ranging ones (see the
aircraft demo). `activeDistance` gates which meshes participate; out-of-range
meshes are skipped to keep the shadow map tight.

> **Tip.** A huge ground that *casts* shadows expands the shadow frustum to fit
> it, shrinking everything else to sub-pixel. Suffix big ground meshes with
> `_nocast` so they only receive.

## Demo

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dGround, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sun } = tosi({ sun: { timeOfDay: 10 } })

preview.append(
  b3d(
    {
      panelTitle: 'Sun',
      scenePanel: () => [
        slider3d({ label: 'time of day', value: sun.timeOfDay, min: 5, max: 19, step: 0.25 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2.5, beta: Math.PI / 3, radius: 8,
          target: [0, 1, 0], maxElevationDeg: 70,
        })
        camera.lowerRadiusLimit = 3
        camera.upperRadiusLimit = 24
      },
    },
    b3dLight({ intensity: 0.3 }),
    b3dSkybox({ timeOfDay: sun.timeOfDay, realtimeScale: 0 }),
    b3dSun({ shadowTextureSize: 2048 }),
    b3dGround({ meshName: 'ground_nocast', width: 20, height: 20, color: '#7d9b6e' }),
    b3dSphere({ y: 1.2, diameter: 1.5, color: '#cc4422' }),
    b3dSphere({ y: 0.8, diameter: 1, x: 2, z: -1, color: '#4488cc' }),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Sun direction X (overridden by skybox when present) |
| `y` | `-1` | Sun direction Y |
| `z` | `-0.5` | Sun direction Z |
| `intensity` | `1` | Sun intensity (overridden by skybox when present) |
| `shadows` | `'on'` | `'off'`: the sun casts no shadows (the light stays). Shadows are always cascaded; there is no `shadowCascading` attribute, and passing one does nothing |
| `shadowTextureSize` | `auto` | Shadow map resolution (per cascade); `auto` = device tier |
| `shadowMaxZ` | `100` | Far plane of the cascaded shadow frustum |
| `shadowDarkness` | `0.1` | 0 = fully dark shadow, 1 = no shadow |
| `shadowNormalBias` | `0.02` | Offset along the surface normal — **the shadow-acne knob**. Lower it if shadows detach from small casters |
| `shadowBias` | `0.0005` | Depth-direction bias, in the cascade's depth range. With `shadowNormalBias` at 0.02 it is what clears the remaining acne (fine bands over every lit surface); raise `shadowNormalBias` instead and thin limbs lose their shadow |
| `numCascades` | `auto` | Number of cascade splits (1–4); `auto` = device tier |
| `stabilizeCascades` | `'on'` | Reduce shadow-edge "swimming" under motion |
| `lambda` | `0.8` | Cascade split blend (0 = uniform, 1 = logarithmic) |
| `cascadeBlendPercentage` | `0.1` | Soft blend across cascade seams |
| `activeDistance` | `30` | Max camera-to-mesh distance a caster participates from |
| `updateIntervalMs` | `1000` | How often to re-evaluate active casters |

## Mesh suffix conventions

| Suffix | Effect |
|--------|--------|
| `_nocast` (or `-nocast`) | Mesh doesn't cast shadows (e.g. huge ground planes) |
| `_noshadow` (or `-noshadow`) | Mesh doesn't receive shadows |
