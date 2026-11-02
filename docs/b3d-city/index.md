# b3d-city

**A city to drive around**, built from a seed: roads, blocks of buildings,
street lights, parked cars, [traffic](/city-traffic/) and
[lit windows](/window-lights/). The plan is [city-layout](/city-layout/); this
dresses it with a **kit**, Kenney's city kits unless you give it another, at
12 m a cell. Street lights come on at dusk, each a spot pointing down from its
pole (the few that matter most to your view are real lights), a few of them
failing and flickering; a car you drive turns its headlights on.

## Demo

```js
import { b3d, b3dCar, b3dCity, cityStart, b3dLibrary, b3dLight, b3dSkybox, b3dSun, inputFocus, slider3d, assetUrl } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cityDemo } = tosi({ cityDemo: { time: 19.5, speed: 120 } })
const sky = b3dSkybox({ timeOfDay: cityDemo.time, realtimeScale: cityDemo.speed })
const plan = { width: 24, depth: 24, seed: 3 }
const start = cityStart(plan)

preview.append(
  b3d(
    {
      style: 'width: 100%; height: 100%',
      gamepad: 'left_stick,right_stick,left_trigger,right_trigger,right_bumper,A,X',
      panelTitle: 'City',
      scenePanel: () => [
        slider3d({ label: 'time of day', value: cityDemo.time, min: 0, max: 24, step: 0.1 }),
        slider3d({ label: 'time speed', value: cityDemo.speed, min: 0, max: 600, step: 10 }),
      ],
    },
    b3dSun({ shadowTextureSize: 2048 }),
    b3dLight({ intensity: 0.5, nightIntensity: 0.06, groundColor: '#4b4d52' }),
    sky,
    b3dLibrary({ url: assetUrl('kenney/libraries/car-kit.glb'), type: 'cars' }),
    b3dCity(plan),
    inputFocus(
      b3dCar({ library: 'cars', meshName: 'sedan-sports', scale: 1.7, player: true, ...start })
    )
  )
)
```
```css
.preview { height: 100%; }
```

You start in the middle of the city, driving: the right trigger or **W**
goes, the left trigger, the right bumper or **S** brakes and reverses, the left stick or **A** and **D** steer. Time runs at 120×,
so night falls in a few minutes; the owl's panel sets the hour and the speed.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width`, `depth` | `24` | The grid, cells |
| `seed` | `1` | Same seed, same city |
| `cell` | `12` | Metres a cell (Kenney's road is 0.8 of a tile: 9.6 m kerb to kerb, a lane each way and a parked car) |
| `blockMin`, `blockMax` | `3`, `6` | Block sizes, cells (see [city-layout](/city-layout/)) |
| `downtown` | `0.45` | How far out from the middle the tall buildings go, 0 to 1 |
| `lightEvery` | `2` | A street light every this many road cells |
| `lampAngle` | `80` | A street light's cone, degrees; it reaches twice its height |
| `flicker` | `0.08` | The share of street lights that are failing and flicker |
| `parked` | `0.2` | The chance of a parked car on a stretch of road |
| `chunk` | `0` | Cells a side of a chunk. Each chunk draws its own copies, so the ones out of view are skipped; smaller chunks cull more and cost more draws. `0` draws the whole city as one, the default: measured in City Drive, 16-cell chunks doubled the draws and saved 3% of the triangles (a building is cheap; the trees are not) |
| `sound` | `'on'` | Positional sound: the nearest traffic's engines and horns (a driver you block honks), the hum of the nearest street lights, a sputter from the failing ones. `'off'` for silence |
| `traffic` | `24` | The car budget: this many cars drive round near you (they stop for yours, and are knocked about by it; lamps at night). Cars far away or out of view go, and come back out of view, driving toward you |

The city is centred on its `x`, `y`, `z`. `kit` (a property, not an
attribute) is the manifest: which library model is each road piece, building,
street light and car, how a model is turned and how big it is in cells. See
`KENNEY_CITY` for the shape; another kit on another grid needs only another
manifest. `layout` is the plan it built, `lamps` how many street lights it has.
`cityStart(options)` says where to put a car in the middle of the city.
