/*#
# City Drive

A city in a landscape. A seeded city of Kenney's kits stands on ground
flattened for it, with traffic, street lights, and lit windows at night. Round
it are hills, woods and a sea under the whole sky: sun and moon, a cloud deck,
the stars. Drive out of town and keep going.

## Demo

```js
import {
  b3d, b3dSun, b3dSkybox, b3dLight, b3dFog, b3dTerrain, b3dCloudDeck, b3dDecorator, b3dWater,
  b3dCity, b3dCar, b3dLibrary, b3dBeacon, inputFocus, cityGround, cityStart, cityLayout,
  slider3d, assetUrl, effectiveTier, headsetDevice,
} from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cityDrive } = tosi({ cityDrive: { time: 17.5, speed: 60, coverage: 0.45 } })

// A LIGHTER WORLD on a headset or a low-powered device: a smaller town, less
// traffic, a shorter view, fewer trees, no cloud deck. A headset draws
// everything twice, and its browser pays dearly for every draw.
const light = headsetDevice() || effectiveTier() === 'low'

// The city's plan, and where it stands: its ground is flattened at `level`
// under the whole grid and eased back into the hills round it.
const plan = light ? { width: 24, depth: 24, seed: 3 } : { width: 48, depth: 48, seed: 3 }
const level = 12
const ground = cityGround({ ...plan, level })
const start = cityStart(plan)

// A NAMED PLACE: where the street you start on ends, straight ahead. Anything
// named (a beacon, or a car with an id) is a place an agent can go to.
const layout = cityLayout(plan)
const along = start.ry === 0 ? [0, 1] : [1, 0]
let cx = Math.floor(start.x / 12 + plan.width / 2)
let cz = Math.floor(start.z / 12 + plan.depth / 2)
for (let i = 0; i < 8; i++) {
  const nx = cx + along[0], nz = cz + along[1]
  if (!layout.road[nz * plan.width + nx]) break
  cx = nx
  cz = nz
}
const streetEnd = { x: (cx + 0.5 - plan.width / 2) * 12, z: (cz + 0.5 - plan.depth / 2) * 12 }

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
  detailAmplitude: 10,
  // Down, so the low ground is under the sea at 0.
  baseHeight: -70,
  // Green country: moist, and cooling slowly enough with height that the
  // hills are not snow-capped.
  biomeMoisture: 0.9,
  biomeLapseRate: 0.0015,
})
terrain.landform = ground.landform
terrain.regenerate()

const woods = b3dDecorator(light ? { budget: 1200, radius: 400 } : { budget: 5000, radius: 900 })
woods.clear = ground.clear

preview.append(
  b3d(
    {
      style: 'width: 100%; height: 100%',
      gamepad: 'left_stick,right_stick,left_trigger,right_trigger,right_bumper,A,X',
      panelTitle: 'City Drive',
      scenePanel: () => [
        slider3d({ label: 'time of day', value: cityDrive.time, min: 0, max: 24, step: 0.1 }),
        slider3d({ label: 'time speed', value: cityDrive.speed, min: 1, max: 600, scale: 'log', zeroStop: true }),
        ...(light ? [] : [slider3d({ label: 'cloud cover', value: cityDrive.coverage, min: 0, max: 1.5, step: 0.05 })]),
      ],
    },
    b3dSun({ shadowTextureSize: 2048 }),
    b3dSkybox({
      timeOfDay: cityDrive.time,
      realtimeScale: cityDrive.speed,
      starfieldCube: '/sky/nebula',
      starfieldData: '/sky/stars',
      starfieldTilt: '12,25,58',
    }),
    b3dLight({ intensity: 0.5, nightIntensity: 0.06, groundColor: '#4b4d52' }),
    b3dFog({ syncSkybox: true, start: light ? 400 : 800, end: light ? 1400 : 3500 }),
    terrain,
    woods,
    ...(light ? [] : [b3dCloudDeck({ altitude: 600, coverage: cityDrive.coverage, orographic: 0.6, wind: 8 })]),
    b3dWater({ y: 0, waterSize: 8000, follow: true, twoSided: true }),
    b3dLibrary({ url: assetUrl('kenney/libraries/car-kit.glb'), type: 'cars' }),
    b3dCity({ ...plan, y: level, traffic: light ? 12 : 32 }),
    // Above the car's wall rays: a beacon's hull is pickable.
    b3dBeacon({ name: 'end of the street', x: streetEnd.x, y: level + 4, z: streetEnd.z }),
    inputFocus(
      b3dCar({ id: 'car', library: 'cars', meshName: 'sedan-sports', scale: 1.7, player: true, ...start, y: level + 0.5 })
    )
  )
)
```
```css
.preview { height: 100%; }
```

On a headset or a low-powered device the world is lighter: a town a quarter
the size, a dozen cars, a shorter view, fewer trees and no cloud deck.

You start in the middle of town. The right trigger or **W** drives, the left
trigger, the right bumper or **S** brakes and reverses, and the left stick or
**A** and **D** steer. The right stick or the arrow keys swing the camera round
the car (it springs back behind) and up an arc toward overhead (it stays
there). Time runs
at 60×, so the sun goes down soon after you arrive. The owl's panel sets the
hour, the speed and the cloud.

The beacon at the end of your street is named, so it is a place: with the
scene's [agent tools](/b3d-agent/) open, an agent can drive the car there.

## How it is put together

- [b3d-city](/b3d-city/) builds the town. `cityGround` gives the terrain a
  [landform](/landform/) pad, flat under the grid, and gives the woods a
  `clear` that keeps trees off the streets. `cityStart` is a clear spot in
  the middle to start the car.
- [b3d-terrain](/b3d-terrain/) and [b3d-decorator](/b3d-decorator/) make the
  country, [b3d-cloud-deck](/b3d-cloud-deck/) the weather, and
  [b3d-skybox](/b3d-skybox/) the day and night.
- The traffic ([city-traffic](/city-traffic/)) stays on the town's roads.
  Your car goes anywhere there is ground.
*/
/*{ "parent": "demos", "order": 55 }*/

export {}
