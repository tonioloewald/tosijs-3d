/*#
# b3d-moon

**Extra moons, cosmetic.** Put up to four inside a
[`<tosi-b3d-skybox>`](/b3d-skybox/). Each is a colour and a size at a place on
the star sphere. Its PHASE follows from where it is: the side facing the sun
is lit, so a moon near the sun is a thin crescent and one opposite it is
full.

Cosmetic on purpose: there are no orbits, no eclipses, and no light cast on
the scene (the skybox's own moon still does the moonlight). A real orbital system is a separate piece of
work that this does not pretend to be.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dMoon, b3dGround, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { moons } = tosi({ moons: { time: 20.5 } })

preview.append(
  b3d(
    {
      scenePanelOpen: true,
      scenePanel: () => [
        label3d({ text: 'Moons' }),
        slider3d({ label: 'time of day', value: moons.time, min: 0, max: 24, step: 0.25 }),
      ],
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 2, 0), el.scene)
        cam.setTarget(new BABYLON.Vector3(0, 6, 10))
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
      },
    },
    b3dSun({}),
    b3dSkybox(
      { timeOfDay: moons.time, realtimeScale: 0, starfieldCube: '/sky/nebula', starfieldData: '/sky/stars', starfieldTilt: '12,25,58' },
      // Big and ruddy, and small and pale: phases follow the sun.
      b3dMoon({ azimuth: 150, elevation: 30, size: 3, color: '#e0b090' }),
      b3dMoon({ azimuth: 200, elevation: 18, size: 1.2, color: '#c8d8ff' }),
    ),
    b3dGround({ width: 60, height: 60, color: '#556644' }),
  )
)
```
```css
.preview { height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `azimuth` | `0` | Degrees AROUND the star sphere. Like right ascension: the moon rides with the stars, rising and setting with them |
| `elevation` | `20` | Degrees from the celestial equator (like declination) |
| `size` | `0.5` | Angular DIAMETER in degrees (the real moon is about 0.5) |
| `color` | `'#dddddd'` | Its colour where lit |
| `brightness` | `1` | Multiplies the lit side |
| `frame` | `'stars'` | `'stars'`: it rides the star sphere, rising and setting. `'ground'`: `azimuth` and `elevation` are against the HORIZON (azimuth 0 is +Z) and it stays put while the sky turns, like the planet a tide-locked moon orbits |
| `gas` | `''` | Make it a GAS GIANT: `'jupiter'`, `'saturn'`, `'uranus'` or `'neptune'`. Banded, with winds and a storm; see [gas-giant](/gas-giant/). `color` is then unused |
| `bands` | `0` | Gas giant: stripes from pole to pole. `0` = the preset's |
| `turbulence` | `-1` | Gas giant: how torn the band edges are, `0…1`. `-1` = the preset's |
| `storm` | `-1` | Gas giant: size of the great storm, `0` = none. `-1` = the preset's |
| `bandColors` | `''` | Gas giant: up to three `#rrggbb`, comma separated (zones, belts, accent). Blank = the preset's |
| `axisTilt` | `0` | Gas giant: degrees its bands lean from level. It is always seen equator-on, as a moon sees its planet |
| `spin` | `1` | Gas giant: how fast its clouds run. `0` freezes them |
| `seed` | `0` | Gas giant: a different planet with the same look. `0` = the preset's |

## A giant in a moon's sky

Seen from a close moon a giant planet is enormous: Jupiter from Io is about
19° across, forty times the width of our moon. Give it that `size` and it is
the sky.

```js
import { b3d, b3dSun, b3dSkybox, b3dMoon, b3dGround, slider3d, select3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { giant } = tosi({ giant: { time: 21, kind: 'jupiter', size: 19 } })
// frame: 'ground' — it hangs over the horizon ahead and does not set.
const planet = b3dMoon({ frame: 'ground', azimuth: 0, elevation: 32, size: giant.size, gas: giant.kind, axisTilt: 12 })

preview.append(
  b3d(
    {
      scenePanelOpen: true,
      scenePanel: () => [
        label3d({ text: 'A giant in the sky' }),
        select3d({ label: 'planet', value: giant.kind, options: ['jupiter', 'saturn', 'uranus', 'neptune'] }),
        slider3d({ label: 'size (degrees)', value: giant.size, min: 1, max: 60, step: 1 }),
        slider3d({ label: 'time of day', value: giant.time, min: 0, max: 24, step: 0.25 }),
      ],
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 2, 0), el.scene)
        cam.setTarget(new BABYLON.Vector3(0, 7, 10))
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
      },
    },
    b3dSun({}),
    b3dSkybox(
      { timeOfDay: giant.time, realtimeScale: 0, atmosphere: 0, starfieldCube: '/sky/nebula', starfieldData: '/sky/stars', starfieldTilt: '12,25,58' },
      planet,
    ),
    b3dGround({ width: 60, height: 60, color: '#6a6250' }),
  )
)
```
```css
.preview { height: 100%; }
```
*/
/*{ "parent": "b3d-skybox", "order": 10 }*/

import { Component } from 'tosijs'
import { resolveGasGiant, type GasGiantLook } from './gas-giant.js'

export class B3dMoon extends Component {
  static preferredTagName = 'tosi-b3d-moon'

  static initAttributes = {
    azimuth: 0,
    elevation: 20,
    size: 0.5,
    color: '#dddddd',
    brightness: 1,
    frame: 'stars' as 'stars' | 'ground',
    // A gas giant: a preset name, then overrides whose sentinels (0, -1, '')
    // mean "the preset's own".
    gas: '',
    bands: 0,
    turbulence: -1,
    storm: -1,
    bandColors: '',
    axisTilt: 0,
    spin: 1,
    seed: 0,
  }

  static shadowStyleSpec = {
    ':host': { display: 'none' }, // config-only; the sky draws it
  }

  declare azimuth: number
  declare elevation: number
  declare size: number
  declare color: string
  declare brightness: number
  declare frame: 'stars' | 'ground'
  declare gas: string
  declare bands: number
  declare turbulence: number
  declare storm: number
  declare bandColors: string
  declare axisTilt: number
  declare spin: number
  declare seed: number

  /** What the sky shader draws when this is a gas giant; null for a moon. */
  gasLook(): GasGiantLook | null {
    if (!this.gas) return null
    return resolveGasGiant(this.gas, {
      bands: this.bands,
      turbulence: this.turbulence,
      storm: this.storm,
      colors: this.bandColors,
      seed: this.seed,
    })
  }

  /** Its direction: on the star sphere (the sky dome's local frame), or in
   * the world when `frame` is `'ground'`. */
  direction(): { x: number; y: number; z: number } {
    const az = (this.azimuth * Math.PI) / 180
    const el = (this.elevation * Math.PI) / 180
    return {
      x: Math.cos(el) * Math.sin(az),
      y: Math.sin(el),
      z: Math.cos(el) * Math.cos(az),
    }
  }

  private _sky: { moonsChanged?: () => void } | null = null

  render() {
    super.render()
    // A changed moon is a changed sky — tell the one it sits in.
    this._sky = this.closest('tosi-b3d-skybox') as unknown as {
      moonsChanged?: () => void
    } | null
    this._sky?.moonsChanged?.()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    const sky = this._sky
    this._sky = null
    sky?.moonsChanged?.()
  }
}

export const b3dMoon = B3dMoon.elementCreator()
