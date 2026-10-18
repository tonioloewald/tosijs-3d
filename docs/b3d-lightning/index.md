# b3d-lightning

**Lightning and thunder from the weather** (WEATHER-DESIGN stage 3, board
#1123). Put one in a scene; it watches every
[`<tosi-b3d-weather-cell>`](/b3d-weather-cell/) with `storminess` and strikes
under them, seeded, so the same seed gives the same storm.

## Demo

A storm at night. Watch the landscape jump out of the dark with each
strike, the cloud light from inside, and count the seconds to the thunder
(click the scene first; browsers only play sound after a gesture). Open the
settings panel (the owl) for the storm's size, how often it strikes, the cloud cover around it
and how dramatic the flash is.

```js
import { b3d, b3dSun, b3dSkybox, b3dCloudDeck, b3dWeatherCell, b3dLightning, b3dTerrain, b3dDecorator, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { lightningDemo: s } = tosi({
  lightningDemo: { radius: 600, rate: 1, coverage: 0.15, brightness: 1, timeOfDay: 20.2 },
})

// Hills, trees and a hamlet between you and the storm, so each strike has
// something to light and to throw shadows from.
const terrain = b3dTerrain({
  seed: 7,
  biome: 'on',
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  tileSize: 128,
  lodLevels: 3,
  splitFactor: 2,
  reach: 5000,
  grossScale: 0.01,
  detailScale: 0.09,
  horizScale: 3.31,
  grossAmplitude: 60,
  detailAmplitude: 10,
  biomeSeaLevel: 0,
  biomeLapseRate: 0.15 / 60,
  biomeTemperature: 0.3,
  biomeMoisture: 0.75,
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        // You stand at the ORIGIN (far from it the terrain would rebase the
        // world under the camera) and the storm is over the hamlet, a
        // kilometre off: close strikes light from ABOVE and throw hard
        // shadows; a distant one only rakes the slopes facing it.
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 60, 0), el.scene)
        cam.setTarget(new BABYLON.Vector3(800, 300, 650))
        cam.maxZ = 20000
        cam.attachControl(el.parts.canvas, true)
        el.setActiveCamera(cam)
        // Once the terrain can say how high the ground is: stand on it, and
        // build the hamlet on it, between you and the storm.
        const mat = new BABYLON.StandardMaterial('house', el.scene)
        mat.diffuseColor = new BABYLON.Color3(0.75, 0.72, 0.66)
        let built = false
        el.scene.onBeforeRenderObservable.add(() => {
          const h = terrain.heightSampler?.()
          if (built || !h) return
          built = true
          cam.position.y = h(cam.position.x, cam.position.z) + 25
          for (let i = 0; i < 18; i++) {
            const x = 300 + (i % 6) * 70 + (i * 37) % 23
            const z = 250 + Math.floor(i / 6) * 70 + (i * 53) % 19
            const tall = 8 + (i * 7) % 14
            const house = BABYLON.MeshBuilder.CreateBox('house', { width: 14, depth: 18, height: tall }, el.scene)
            house.position.set(x, h(x, z) + tall / 2 - 1, z)
            house.material = mat
            house.receiveShadows = true
          }
        })
      },
      panelTitle: 'Lightning',
      scenePanel: () => [
        slider3d({ label: 'storm size (m)', value: s.radius, min: 200, max: 3000, step: 50 }),
        slider3d({ label: 'how often', value: s.rate, min: 0, max: 5, step: 0.1 }),
        slider3d({ label: 'cloud cover', value: s.coverage, min: 0, max: 1.2, step: 0.05 }),
        slider3d({ label: 'brightness', value: s.brightness, min: 0, max: 3, step: 0.1 }),
        slider3d({ label: 'time of day', value: s.timeOfDay, min: 0, max: 24, step: 0.25 }),
      ],
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: s.timeOfDay, realtimeScale: 0 }),
    terrain,
    b3dDecorator({ budget: 3000, radius: 1200 }),
    b3dCloudDeck({ altitude: 380, coverage: s.coverage }),
    b3dWeatherCell({ x: 800, z: 650, radius: s.radius, coverage: 1.8, storminess: 1 }),
    b3dLightning({ seed: 4, rate: s.rate, brightness: s.brightness }),
  )
)
```
```css
.preview { height: 100%; }
tosi-b3d { width: 100%; height: 100%; }
```

## What it does

- **The flash** lights the cloud around the strike from inside: its
  underside from below, the whiteout when you are IN the cloud, its top from
  above. And it lights the whole landscape from above, falling off with the
  storm's distance, with a harder light on the ground under the strike.
- **The bolt** is a jagged, branching channel from the cloud base to the
  ground, flickering through its re-strokes.
- **Thunder** arrives at the speed of sound: a flash a kilometre away rumbles
  about three seconds later, so you can count how far away the storm is.
- **Sprites**: over strong storms, rarely, a brief red-pink crown with
  tendrils high ABOVE the storm. Real ones stand 50–90 km up; here they are
  placed within the far plane.

Every strike dispatches **`strike`** (bubbling) with `{ kind, x, z, t,
distance }`, where `kind` is `'ground'`, `'cloud'` or `'sprite'`, so gameplay can react.
The pure half (when, where, bolt shape, flicker, thunder delay) is
[[lightning]].

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `seed` | `1` | Same seed, same storm |
| `bolts` | `'on'` | Draw the bolt for cloud-to-ground strikes |
| `sprites` | `'on'` | Red-pink sprites above strong storms |
| `thunder` | `'on'` | Procedural thunder, delayed by distance |
| `volume` | `0.8` | Thunder loudness |
| `groundLight` | `2.5` | How hard a ground strike's own light hits the scene: from the middle of the channel (halfway between the cloud base and the ground under the strike), the one that casts the shadows (the whole-sky fill is separate) |
| `darken` | `0.5` | How much a storm near you takes from the sun AND the ambient light (half, at full storm, easing with distance), so the flashes stand out. Applied through the cloud deck, which owns those lights |
| `shadows` | `'on'` | Hard shadows from the strike. ONE shadow map, kept, re-rendered once per new brightest ground strike (never per frame) |
| `shadowSize` | `1024` | Its resolution |
| `flashLight` | `'point'` | The strike's shadowed light. `'point'`: shadows radiate from the bolt in every direction (a cube map: six shadow renders, once per new strike). `'directional'`: one render, correct looking toward the strike; the cheap choice for low-end devices |
| `shadowRange` | `600` | How far from you (m) things cast them: the shadows you can see, and a tight set keeps the map sharp |
| `rate` | `1` | How OFTEN, as a multiple of the natural rate (about 0.6 strikes a second over a storm at storminess 1; at most 4) |
| `brightness` | `1` | How DRAMATIC a flash is: the whole landscape lit from above (falling off with the storm's distance), the cloud lit from inside, and the bolt's glow, together |
| `color` | `'#dce4ff'` | The flash's colour |
