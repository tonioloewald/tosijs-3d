# dials

**A compass and a watch you can glance at, flat or in a headset.** The compass
needle points north as you turn. The watch is the time of day and how fast it
passes: drag the dot round the ring to set the hour (noon at the top, midnight
at the bottom), and drag the dot along the bar from the snail (time stands
still) to the rabbit (an hour a second).

Both are drawn by an artist, not by code: the SVGs are Tonio's, the code only
finds the parts by name and moves them. Put either on the system bar with a
`<tosi-b3d-panel icon title>`, as here, and it works flat and in a headset.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dLight, b3dPanel } from 'tosijs-3d'
// Not in the barrel (the artwork is 36 KB): import the subpath.
import { skyWatch, sceneCompass } from 'tosijs-3d/dials'

const skybox = b3dSkybox({ timeOfDay: 9, realtimeScale: 0 })
const scene = b3d(
  {},
  b3dLight({ intensity: 0.4 }),
  b3dSun({}),
  skybox,
  b3dGround({ size: 200, texture: 'checker' }),
  b3dPanel({ title: 'Time', icon: 'clock' }, skyWatch(skybox)),
)
scene.append(b3dPanel({ title: 'Compass', icon: 'compass' }, sceneCompass(scene)))
preview.append(scene)
```

## The parts the code drives

Redraw freely; keep these ids (and the 256 × 256 view box, centred on 128, 128).

| art | id | what the code does |
| --- | --- | --- |
| compass | `Magnet` | turned about the centre so it points north |
| compass | `Rose` | turned instead, with `mode: 'card'` |
| watch | `time_of_day_indicator` | turned about the centre: noon at the top |
| watch | `speed_indicator` | moved along the bar, x 80 (slow) to 176 (fast) |

`bun run dial-art` copies `static/compass.svg` and `static/vr-watch.svg` into
`src/dial-art.ts`, so the library never fetches them.

## API

| function | returns |
| --- | --- |
| `compassDial({ size, mode })` | an `<svg>` with a `heading` property (degrees, clockwise from north, which is +Z) |
| `watchDial({ time, speed, handleTime, handleSpeed, size })` | an `<svg>` with `time` (hours) and `speed` (0…1) properties and `handlePointer` |
| `sceneCompass(b3d)` | a compass that follows the scene's active camera |
| `skyWatch(skybox)` | a watch bound to a skybox's `timeOfDay` and `realtimeScale` |
| `watchSpeedToScale(t)` / `scaleToWatchSpeed(s)` | the speed bar's position to `realtimeScale` and back: 0 is still, then real time to an hour a second on a log scale |
