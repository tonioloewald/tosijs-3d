# b3d-trail

**A ribbon left behind by anything that moves:** contrails, missile smoke, the
wake of a fast enemy. Nest it in the thing that moves; it attaches to that
thing's mesh, offset in its local space, and draws a `TrailMesh` from there.

Lifted from manta-recon's engine contrails (tosijs-3d#4, board #186),
revived from the 2010 game: very translucent (a contrail is vapour catching
light, not a light source), hidden when slow, and tinted differently under
water.

## Demo

A drone circles with two engine trails, dipping under the water and back.
The trails change tint as they cross the surface.

```js
import { b3d, b3dBox, b3dTrail, b3dWater, b3dLight, b3dSkybox, b3dGround, sceneDelta } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const drone = b3dBox(
  { x: 12, y: 3, z: 0, width: 1.2, height: 0.3, depth: 1.6, color: '#3388dd' },
  b3dTrail({ x: 0.45, y: 0, z: -0.8, diameter: 0.12, length: 60, alpha: 0.35, minSpeed: 2, underwaterColor: '#60e0ff' }),
  b3dTrail({ x: -0.45, y: 0, z: -0.8, diameter: 0.12, length: 60, alpha: 0.35, minSpeed: 2, underwaterColor: '#60e0ff' }),
)

preview.append(
  b3d(
    {
      sceneCreated(el) {
        orbitCam(el, { alpha: -Math.PI / 2.2, beta: Math.PI / 2.6, radius: 34, target: [0, 1, 0] })
        let a = 0
        el.scene.onBeforeRenderObservable.add(() => {
          a += sceneDelta(el.scene)
          drone.x = Math.cos(a * 0.6) * 12
          drone.z = Math.sin(a * 0.6) * 12
          drone.y = 1 + Math.sin(a * 0.9) * 3 // under the water and out again
          drone.ry = (-a * 0.6 * 180) / Math.PI
        })
      },
    },
    b3dLight({ y: 1, intensity: 0.9 }),
    b3dSkybox({ timeOfDay: 16, realtimeScale: 0 }),
    b3dGround({ width: 80, height: 80, y: -6, color: '#4a5a44' }),
    b3dWater({ y: 0, waterSize: 120, twoSided: true }),
    drone,
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` `y` `z` | `0` | Where the ribbon starts, in the HOST's local space (an engine pod, a nozzle) |
| `diameter` | `0.06` | Ribbon width (m) |
| `length` | `45` | Ribbon length, in segments (one a frame, so length ≈ how many frames of history) |
| `color` | `'#ffffff'` | Its colour (emissive, unlit) |
| `underwaterColor` | `''` | The colour below a `<tosi-b3d-water>` surface; empty = same as `color` |
| `alpha` | `0.16` | Opacity. Low on purpose: you should see through a contrail |
| `minSpeed` | `8` | Below this speed (m/s, measured at the emitter) the ribbon fades out, so a hover does not smear |

## In code

`attachTrail(node, scene, options)` does the same for a node you hold,
such as a missile you spawned yourself, and returns `{ update(dt), reset(),
dispose() }`.

It never throws inside the render loop: an exception in a Babylon observer
skips every observer after it, which manta found the hard way when a trail
error silently killed the aircraft's camera follow.
