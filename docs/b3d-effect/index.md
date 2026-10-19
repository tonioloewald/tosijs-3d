# b3d-effect

**Volcanoes, geysers, splashes, explosions, fireballs and sparks: particles,
light and sound on one clock.** Name a preset, or hand it a recipe from the
[effect tool](/effect-tool/). It reacts to where it is: smoke drifts with the
wind there, lava bombs and sparks land on what is below them, the flash
lights the ground, and the boom arrives at the speed of sound.

## Demo

Tap the scene once so the browser lets it make sound. The volcano's activity
dial takes it from dormant to erupting; the explosion is 60 m away, so its
boom comes a moment after the flash.

```js
import { b3d, b3dEffect, b3dLight, b3dGround, b3dSkybox, slider3d, button3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { fx } = tosi({ fx: { activity: 0.5 } })
const volcano = b3dEffect({ preset: 'volcano', activity: fx.activity })
const boom = b3dEffect({ preset: 'explosion', x: 8, z: -24, autoplay: 'off' })

preview.append(
  b3d(
    {
      panelTitle: 'Effects',
      scenePanelOpen: true,
      scenePanel: () => [
        slider3d({ label: 'volcano', value: fx.activity, min: 0, max: 1, step: 0.01 }),
        button3d({ label: 'explosion', handleClick: () => boom.play() }),
      ],
      sceneCreated(el) {
        // Looking past the panel at both: the volcano, and the explosion beyond.
        orbitCam(el, { alpha: -2.1, beta: 1.3, radius: 38, target: [-7, 6, -12] })
      },
    },
    b3dSkybox({ timeOfDay: 18 }),
    b3dLight({ intensity: 0.4 }),
    b3dGround({ width: 200, height: 200 }),
    volcano,
    boom
  )
)
```

## Attributes

| attribute | default | |
| --- | --- | --- |
| `preset` | `''` | `volcano`, `geyser`, `bubbles`, `black smoker`, `splash`, `explosion`, `fireball`, `sparks` |
| `activity` | `-1` | 0 to 1; `-1` uses the recipe's own. A volcano: 0.15 dormant, 0.5 semi-active, 1 erupting |
| `autoplay` | `'on'` | `'off'` waits for `play()` (a one-shot you trigger) |
| `scale` | 1 | How big. Sizes, radii, heights, light range and sound reach multiply; speeds and particle lives grow by the square root and gravity stays (Froude scaling, as for a model ship), so an arc keeps its shape and a big effect moves slowly for its size, as big things do, and the wind still bends it. The presets are person-sized: a volcano preset is a vent, and a mountain wants 10 or more |
| `ground` | `'off'` | `'on'` sits it on the ground, `y` above that: the scene's terrain height there, or else the first mesh below. Looked for again every 1.5 s (terrain regenerates) |
| `x`, `y`, `z` | 0 | Where it is; nested in a mesh element, an offset that follows it |

`recipe` (a property) plays an effect recipe instead of a preset (see
`effect-recipe`; the effect tool saves them). A particle layer can use your
own picture (`texture`: an image URL, an SVG URL or SVG markup) and a sound
layer your own sample (`url`). Underwater effects (`bubbles`, `black
smoker`) end their bubbles at the scene's water surface. `play()` starts it again,
`stop()` lets it die out, `whenDone` is called when a one-shot has finished.

Light comes from a shared pool (`effectLights` per device tier) that effects
and the scene's lamps compete for by strength and nearness, so a flash beside
you outranks a lamp across the map. Sound starts after the first user
gesture, as browsers require; until then an effect plays silently.
