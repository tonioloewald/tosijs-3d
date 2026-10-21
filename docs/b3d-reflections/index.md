# b3d-reflections

Auto-attaches a reflection probe to every mesh whose name contains `_mirror`
(or `-mirror`). PBR materials get the cube texture as their reflection, and
StandardMaterials get it plus a sensible Fresnel curve so they actually look
metallic instead of flat-white. Refraction-enabled PBR materials (glass) also
get the probe wired in as their refraction texture, with the glTF loader's
thin-surface overrides undone so the refraction ray actually bends.

Probe refresh is camera-aware: probes within `farDistance` refresh at
`refreshRate`; between `farDistance` and `maxDistance` the rate ramps linearly
to `farRefreshRate`; beyond `maxDistance` they freeze at render-once. Distance
re-checks run every `distanceCheckInterval` frames, staggered per-probe so the
work doesn't all pile onto one frame.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dSphere, b3dReflections } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alphaDeg: -90, betaDeg: 64.3, radius: 6,
          target: [0, 1, 0], maxElevationDeg: 70,
        })
        camera.lowerRadiusLimit = 2.5
        camera.upperRadiusLimit = 18
      },
    },
    b3dSkybox({ timeOfDay: 11, realtimeScale: 0 }),
    b3dSun(),
    b3dGround({ meshName: 'ground_nocast', width: 20, height: 20, color: '#7d9b6e' }),
    // The `mirror: true` flag adds the `_mirror` suffix to the mesh name,
    // which b3dReflections picks up and probes automatically. The non-mirror
    // sphere is what the mirror reflects.
    b3dSphere({ y: 1.2, diameter: 1.5, mirror: true, color: '#ffffff' }),
    b3dSphere({ y: 0.8, diameter: 1, x: 2.2, z: -0.5, color: '#cc4422' }),
    b3dReflections(),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `probeSize` | `auto` | Cubemap resolution per face; `auto` = device tier |
| `refreshRate` | `5` | Frames between probe refreshes inside `farDistance` |
| `farDistance` | `30` | Distance at which the rate starts ramping toward `farRefreshRate` |
| `maxDistance` | `100` | Distance beyond which probes freeze entirely |
| `farRefreshRate` | `30` | Probe refresh rate at `maxDistance` |
| `distanceCheckInterval` | `13` | Frames between camera-distance re-checks |

## Mesh suffix conventions

| Suffix | Effect |
|--------|--------|
| `_mirror` (or `-mirror`) | Mesh gets a reflection probe attached |
