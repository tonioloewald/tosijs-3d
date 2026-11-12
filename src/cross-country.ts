/*#
# Cross Country

A small tank in open country: rolling hills, woods, lakes and the whole sky.
Its tracks are forty links a side, carried round by the model's own animation
at exactly the pace of the ground, so they grip on the spot when it turns in
place; its wheels turn with them, the turret traverses and the gun elevates.
Head for the hills.

## Demo

```js
import {
  b3d, b3dSun, b3dSkybox, b3dLight, b3dFog, b3dTerrain, b3dCloudDeck, b3dDecorator, b3dWater,
  b3dTank, inputFocus, pad, slider3d, assetUrl, effectiveTier, headsetDevice,
} from 'tosijs-3d'
import { tosi } from 'tosijs'

const { crossCountry } = tosi({ crossCountry: { time: 9, speed: 30, coverage: 0.4 } })

// A LIGHTER WORLD on a headset or a low-powered device: a shorter view, fewer
// trees, no cloud deck.
const light = headsetDevice() || effectiveTier() === 'low'

// A level patch to start on, eased into the hills round it.
const level = 30
const start = pad({ x: 0, z: 0, radius: 12, level, blend: 80 })

const terrain = b3dTerrain({
  seed: 7,
  biome: 'on',
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  tileSize: 128,
  lodLevels: light ? 2 : 3,
  splitFactor: 2,
  reach: light ? 1500 : 4000,
  grossScale: 0.015,
  detailScale: 0.09,
  horizScale: 8,
  grossAmplitude: 160,
  detailAmplitude: 8,
  // Mostly land, with lakes and sea in the low ground.
  baseHeight: -40,
  // Green country: moist, and cooling slowly enough with height that the
  // hills are not snow-capped.
  biomeMoisture: 0.9,
  biomeLapseRate: 0.0015,
})
terrain.landform = start
terrain.regenerate()

const woods = b3dDecorator(light ? { budget: 1200, radius: 400 } : { budget: 5000, radius: 900 })
// Nothing on the starting patch.
woods.clear = (x, z) => Math.max(0, Math.min(1, (Math.hypot(x, z) - 14) / 20))

preview.append(
  b3d(
    {
      style: 'width: 100%; height: 100%',
      gamepad: 'left_stick,right_stick,right_stick_click,left_trigger,right_trigger,right_bumper,A',
      panelTitle: 'Cross Country',
      scenePanel: () => [
        slider3d({ label: 'time of day', value: crossCountry.time, min: 0, max: 24, step: 0.1 }),
        slider3d({ label: 'time speed', value: crossCountry.speed, min: 1, max: 600, scale: 'log', zeroStop: true }),
        ...(light ? [] : [slider3d({ label: 'cloud cover', value: crossCountry.coverage, min: 0, max: 1.5, step: 0.05 })]),
      ],
    },
    b3dSun({ shadowTextureSize: 2048 }),
    b3dSkybox({
      timeOfDay: crossCountry.time,
      realtimeScale: crossCountry.speed,
      starfieldCube: '/sky/nebula',
      starfieldData: '/sky/stars',
      starfieldTilt: '12,25,58',
    }),
    b3dLight({ intensity: 0.5, nightIntensity: 0.06, groundColor: '#4b4d52' }),
    b3dFog({ syncSkybox: true, start: light ? 400 : 800, end: light ? 1400 : 3500 }),
    terrain,
    woods,
    ...(light ? [] : [b3dCloudDeck({ altitude: 600, coverage: crossCountry.coverage, orographic: 0.6, wind: 8 })]),
    b3dWater({ y: 0, waterSize: 8000, follow: true, twoSided: true }),
    inputFocus(
      b3dTank({ url: assetUrl('tonio/tank/tank2.glb'), player: true, x: 0, z: 0, y: level + 0.5 })
    )
  )
)
```
```css
.preview { height: 100%; }
```

On a headset or a low-powered device the world is lighter: a shorter view,
fewer trees and no cloud deck.

The right trigger or **W** drives, the left trigger, the right bumper or **S**
brakes and reverses, and the left stick or **A** and **D** steer: a tank turns
on the spot. The right stick or the arrow keys traverse the turret, and
pulling back raises the gun; clicking the right stick, **V**, or the glass
gamepad's button under the right stick swaps up and down between the gun and the
camera (in a headset a buzz: one for the gun, two for the camera); the view
follows the turret, and the turret holds
its aim while the hull turns under it. The owl's
panel sets the hour, the speed and the cloud.

## How it is put together

- [b3d-tank](/b3d-tank/) drives the model: a body on the pure
  [ground-vehicle](/ground-vehicle/) model, standing on contacts under each
  track. The model is Tonio's (CC BY 4.0), with its track links animated in
  Blender: the tank plays that animation by the distance each track has run,
  one cycle per link.
- [b3d-terrain](/b3d-terrain/) and [b3d-decorator](/b3d-decorator/) make the
  country, with a [landform](/landform/) `pad` to start on;
  [b3d-cloud-deck](/b3d-cloud-deck/) the weather, and
  [b3d-skybox](/b3d-skybox/) the day and night.
*/
/*{ "parent": "demos", "order": 56 }*/

export {}
