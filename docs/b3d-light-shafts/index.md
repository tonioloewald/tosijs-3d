# b3d-light-shafts

**Light you can see**: shafts of sun breaking through a broken sky, and rays
fanning down from the surface when you are under the water. They are what
make a gap in the clouds, or the shallows of a sea, read as a PLACE with a
sun in it rather than a lit backdrop. Drop one into a scene with a
[cloud deck](/b3d-cloud-deck/) or [water](/b3d-water/); it needs no setup.

## Demo

Afternoon under a broken deck, looking toward the sun. Open the settings panel (the owl):
`cloud cover` below 0.5 has no shafts, near 1 only slits; `time of day`
moves the sun (and the shafts with it). Drag to look away from the sun and
they fade. The full weather, terrain and all, is in
[Land and Sky](/land-and-sky/): set its cloud cover to about 0.85.

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dCloudDeck, b3dLightShafts, b3dGround, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { shafts } = tosi({
  shafts: { coverage: 0.85, timeOfDay: 15.2, altitude: 450, strength: 0.35, width: 40, count: 14 },
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 60, 0), el.scene)
        cam.maxZ = 20000
        cam.fov = 1.1
        cam.attachControl(el.parts.canvas, true)
        el.setActiveCamera(cam)
        // Start looking TOWARD the sun (once), where the shafts show.
        let aimed = false
        el.scene.onBeforeRenderObservable.add(() => {
          const sun = el.scene.lights.find((l) => l.getClassName() === 'DirectionalLight')
          if (aimed || !sun || sun.direction.y > -0.05) return
          aimed = true
          const t = sun.direction.clone().normalize().scale(-1)
          t.y *= 0.8
          cam.setTarget(cam.position.add(t.scale(1000)))
        })
      },
      panelTitle: 'Light shafts',
      scenePanel: () => [
        slider3d({ label: 'cloud cover', value: shafts.coverage, min: 0.5, max: 1.2, step: 0.01 }),
        slider3d({ label: 'time of day', value: shafts.timeOfDay, min: 6, max: 19, step: 0.1 }),
        slider3d({ label: 'cloud base', value: shafts.altitude, min: 150, max: 1200, step: 10 }),
        slider3d({ label: 'strength', value: shafts.strength, min: 0, max: 1, step: 0.01 }),
        slider3d({ label: 'width', value: shafts.width, min: 5, max: 200, step: 5 }),
        slider3d({ label: 'count', value: shafts.count, min: 0, max: 30, step: 1 }),
      ],
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: shafts.timeOfDay, realtimeScale: 0 }),
    // A fill, so the ground under an overcast is not simply black.
    b3dLight({ intensity: 0.6 }),
    b3dGround({ size: 12000, color: '#5d6b4a', texture: 'noise', receiveShadows: true }),
    b3dCloudDeck({ altitude: shafts.altitude, coverage: shafts.coverage }),
    b3dLightShafts({
      strength: shafts.strength,
      width: shafts.width,
      count: shafts.count,
    }),
  )
)
```
```css
.preview { height: 100%; }
tosi-b3d { width: 100%; height: 100%; }
```

## Under the water

The same shafts from the underside of the sea. You are a few metres down,
looking up at the sky and the sun through the surface, bent and rippled by
it (the water's `undersideSky`), with the rays fanning down from the sun. Open the settings panel (the owl): raise `wind` or `wave height`
and the rays multiply, narrow and flicker; calm it and a few broad ones
drift slowly. `depth` takes you down into the murk.

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dWater, b3dLightShafts, b3dGround, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { sea } = tosi({
  sea: { depth: 6, wind: 4, waveHeight: 0.1, timeOfDay: 9 },
})

preview.append(
  b3d(
    {
      windSpeed: sea.wind,
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, -6, 0), el.scene)
        cam.minZ = 0.1
        cam.fov = 1.1
        cam.attachControl(el.parts.canvas, true)
        el.setActiveCamera(cam)
        let aimed = false
        el.scene.onBeforeRenderObservable.add(() => {
          cam.position.y = -sea.depth.valueOf()
          const sun = el.scene.lights.find((l) => l.getClassName() === 'DirectionalLight')
          if (aimed || !sun || sun.direction.y > -0.05) return
          aimed = true
          // At the sun AS SEEN FROM BELOW: light bends toward vertical
          // entering water, so it sits higher than in the sky (a little
          // below it here, so the rays fan down into view from its glare).
          const t = sun.direction.clone().normalize().scale(-1)
          const h = Math.hypot(t.x, t.z)
          const sw = h / 1.33
          t.x *= sw / h
          t.z *= sw / h
          t.y = Math.sqrt(1 - sw * sw) * 0.75
          cam.setTarget(cam.position.add(t.normalize().scale(10)))
        })
      },
      panelTitle: 'Under the water',
      scenePanel: () => [
        slider3d({ label: 'depth', value: sea.depth, min: 1, max: 30, step: 0.5 }),
        slider3d({ label: 'wind', value: sea.wind, min: 0, max: 25, step: 0.5 }),
        slider3d({ label: 'wave height', value: sea.waveHeight, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'time of day', value: sea.timeOfDay, min: 7, max: 18, step: 0.1 }),
      ],
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: sea.timeOfDay, realtimeScale: 0 }),
    b3dLight({ intensity: 0.6 }),
    b3dGround({ size: 400, y: -25, color: '#8a8060', texture: 'noise' }),
    b3dWater({ y: 0, twoSided: true, waterSize: 400, waveHeight: sea.waveHeight }),
    b3dLightShafts({}),
  )
)
```
```css
.preview { height: 100%; }
tosi-b3d { width: 100%; height: 100%; }
```

## How it works

One model for both:

- A shaft **starts at the edge the light comes through** — the underside of
  the [`<tosi-b3d-cloud-deck>`](/b3d-cloud-deck/), the underside of the
  [water](/b3d-water/) — and runs away from it along the light. They are
  **rectangular**: parallel to the sun's light, so perspective alone makes
  them radiate from the sun and widen toward you.
- It is an **additive, flat fill of the light's colour**, not a blur:
  `strength` (0.35) at the edge, falling linearly to nothing.
- It is **most prominent looking toward the sun** (light scattered forward),
  and faint looking away.
- Under cloud, only where the sky is **broken but not closed**: local
  coverage 0.5 up to 1. Clear skies and overcast have none. The cover sets
  the **width**: broad from a ragged sky, slits as it closes toward 1.
- Under water, the light is the sun's **tinted by the water's fog**, bent by
  Snell's law so the shafts lean toward vertical, and they shimmer as the
  surface moves. Only when the sun is reaching the water. **Surface
  turbulence** (the wind over the water, its `waveHeight` and `bumpHeight`)
  drives them: calm water focuses a few broad, slow rays; choppy water many
  narrow ones that flicker (`waterRoughness` reads it back).

Rain helps (it scatters the light): the strength rises with the
precipitation where you are.

`count` is the budget; `0` switches the sky shafts off, `underwater="off"`
the water ones.

The model is pure (no Babylon) and unit-tested: the coverage gate, width from
cover, the linear ramp along a shaft, the forward-scatter `sunPhase`,
`refractDown` (Snell's law at the surface) and `waterRoughness` /
`waterRayShape` (how turbulence sets the number, width and flicker of the water
rays).

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `14` | How many sky shafts at most (the budget). `0` = off |
| `radius` | `3000` | How far from you (m) to look for gaps. Shafts read best from a distance |
| `width` | `40` | The BROADEST sky shaft at the cloud (m), at the coverage threshold (0.5); narrower as the cover closes, down to 10% of this near 1. Kept SMALL on purpose: the wider a shaft, the more obvious any mismatch with the gap it comes from |
| `spread` | `0` | Extra width per metre of length. `0`: RECTANGULAR shafts, so all the apparent widening is perspective, and they radiate from the sun because they are parallel to its light |
| `strength` | `0.35` | Brightness at the edge the light comes through; it falls linearly to 0 |
| `rainBoost` | `0.5` | How much precipitation where you are multiplies the strength |
| `color` | `''` | The light's colour; empty = the sun's (whitish by day) |
| `underwater` | `'on'` | Shafts under the water surface too |
| `underwaterCount` | `12` | Their budget |
