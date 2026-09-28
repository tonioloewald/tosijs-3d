/*#
# b3d-weather-cell

**A place whose weather differs** — a lee behind a ridge, a squall, a storm —
declared as a circle on the map with what it adds at its centre. Weather
consumers (clouds, water, ambient) ask the scene for the weather WHERE THEY ARE
(`b3d.weatherAt(x, z)`), so a cell is local: calm in the lee, wind past it.

`drift="wind"` makes it a **weather system**: it travels with the scene's wind,
and with a `lifetime` it grows, holds and dies rather than popping. See
[[weather]] for the composition rules and WEATHER-DESIGN.md for where this is
going (storm visuals, lightning, shafts).

## Demo

The camera flies along a row of flagpoles and straight through a LEE: a cell
(the ring on the water) whose wind cancels the scene's. Each flag shows the
wind WHERE IT STANDS, streaming downwind in the open and hanging limp inside
the ring; the leaves and waves around you go calm there too. The readout is
the weather where the camera is.

```js
import { b3d, b3dWeatherCell, b3dAmbient, b3dWater, b3dLight, b3dSkybox, sceneDelta } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const readout = div({ style: { position: 'absolute', left: '12px', bottom: '12px', color: '#fff', font: '14px monospace', textShadow: '0 1px 2px #000' } })

const LEE = { x: 0, z: 0, radius: 70 }

const scene = b3d(
  {
    windSpeed: 12,
    windBearingDeg: 90, // blowing toward +X
    sceneCreated(el, babylon) {
      const cam = new babylon.FreeCamera('fly', new babylon.Vector3(-150, 6, -25), el.scene)
      cam.setTarget(new babylon.Vector3(-110, 2, 40))
      el.setActiveCamera(cam)

      // THE FRAME OF REFERENCE: flags that each show the wind where they stand.
      const poleMat = new babylon.StandardMaterial('pole', el.scene)
      poleMat.diffuseColor = new babylon.Color3(0.85, 0.85, 0.8)
      const flagMat = new babylon.StandardMaterial('flag', el.scene)
      flagMat.diffuseColor = new babylon.Color3(1, 0.45, 0.1)
      flagMat.emissiveColor = new babylon.Color3(0.6, 0.22, 0.04) // readable backlit
      flagMat.backFaceCulling = false
      const flags = []
      for (let x = -160; x <= 160; x += 20) {
        const z = 18
        const pole = babylon.MeshBuilder.CreateCylinder('pole', { height: 7, diameter: 0.25 }, el.scene)
        pole.position.set(x, 3.5, z)
        pole.material = poleMat
        const hinge = new babylon.TransformNode('hinge', el.scene)
        hinge.position.set(x, 6.6, z)
        const flag = babylon.MeshBuilder.CreatePlane('flag', { width: 3, height: 1.4 }, el.scene)
        flag.parent = hinge
        flag.position.x = 1.5 // hangs from the pole, downwind of it
        flag.material = flagMat
        flags.push({ x, z, hinge })
      }
      // The lee's edge, drawn on the water.
      const ring = babylon.MeshBuilder.CreateTorus('lee', { diameter: LEE.radius * 2, thickness: 0.6, tessellation: 96 }, el.scene)
      ring.position.set(LEE.x, 0.3, LEE.z)
      const ringMat = new babylon.StandardMaterial('lee', el.scene)
      ringMat.emissiveColor = new babylon.Color3(0.3, 0.9, 1)
      ringMat.disableLighting = true
      ring.material = ringMat

      let dir = 1
      el.scene.onBeforeRenderObservable.add(() => {
        const dt = sceneDelta(el.scene)
        cam.position.x += dir * 14 * dt
        if (Math.abs(cam.position.x) > 150) dir = -dir
        cam.setTarget(cam.position.add(new babylon.Vector3(dir * 40, -4, 65)))
        for (const f of flags) {
          const w = el.weatherAt(f.x, f.z).wind
          const speed = Math.hypot(w.x, w.z)
          const out = Math.min(1, speed / 10)
          // Point downwind (local +X along the wind) and stand out with it:
          // limp in calm air, streaming in a breeze.
          f.hinge.rotation.y = speed > 0.01 ? Math.atan2(-w.z, w.x) : f.hinge.rotation.y
          f.hinge.rotation.z = -(1 - out) * 1.35
        }
        const w = el.weatherHere().wind
        readout.textContent = `wind here: ${Math.hypot(w.x, w.z).toFixed(1)} m/s`
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 15, realtimeScale: 0 }),
  b3dWater({ y: 0, waterSize: 600, follow: true }),
  b3dAmbient({ preset: 'leaves', radius: 14 }),
  // The lee: at its centre it adds the opposite of the scene's wind.
  b3dWeatherCell({ x: LEE.x, z: LEE.z, radius: LEE.radius, windSpeed: 12, windBearingDeg: 270 }),
)
preview.append(scene, readout)
```
```css
.preview { position: relative; }
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` `z` | `0` | Centre, world XZ |
| `radius` | `200` | Reach (m); influence eases to nothing at the rim |
| `windSpeed` / `windBearingDeg` | `0` / `0` | Wind this cell ADDS at its centre (bearing: where it goes, north-up, clockwise). A lee adds the opposite of the scene's |
| `coverage` | `0` | Cloud cover it adds (summed, clamped 0–2). A storm counts IN FULL, so a cell past 1 closes the sky over its inner part; past 1 it is also darker underneath. (A tower rising out of the deck is opt-in, the deck's `stormRise`.) `0` = no opinion |
| `precipitation` | `0` | Rain/snow 0–1 (the max of overlapping cells wins) |
| `storminess` | `0` | Lightning likelihood 0–1 (max wins) |
| `temperature` | `0` | Temperature offset in degrees (summed) |
| `drift` | `'off'` | `'wind'` = a weather system: it travels with the scene's wind |
| `lifetime` | `0` | Seconds; grows, holds and dies over it (`0` = permanent). An ended cell does nothing and fires `ended` |
| `grow` | `0` | Seconds to GATHER from nothing to full (`0` = at once). Independent of `lifetime`, so a permanent storm can still build; with both, it gathers and then ends on its lifetime |
*/
/*{ "parent": "Environment" }*/

import type * as BABYLON from '@babylonjs/core'
import { B3dChild, sceneDelta } from './b3d-utils.js'
import { lifeEnvelope, type WeatherCell } from './weather.js'
import { windFromPolar } from './wind.js'
import type { B3d } from './tosi-b3d.js'

export class B3dWeatherCell extends B3dChild {
  static preferredTagName = 'tosi-b3d-weather-cell'

  static initAttributes = {
    x: 0,
    z: 0,
    radius: 200,
    windSpeed: 0,
    windBearingDeg: 0,
    coverage: 0,
    precipitation: 0,
    storminess: 0,
    temperature: 0,
    drift: 'off' as 'off' | 'wind',
    lifetime: 0,
    /** Seconds to build from nothing to full (0 = at once). Independent of
     * `lifetime`, so a permanent storm can still gather. */
    grow: 0,
  }

  declare x: number
  declare z: number
  declare radius: number
  declare windSpeed: number
  declare windBearingDeg: number
  declare coverage: number
  declare precipitation: number
  declare storminess: number
  declare temperature: number
  declare drift: 'off' | 'wind'
  declare lifetime: number
  declare grow: number

  /** Seconds since it entered the scene (drives `lifetime`). */
  age = 0
  /** The live cell the scene composes (read each time the weather is asked). */
  readonly cell: WeatherCell = { at: { x: 0, z: 0 }, radius: 0 }
  private _remove: (() => void) | null = null
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _ended = false
  private _onShift = (dx: number, dz: number) => {
    this.x -= dx
    this.z -= dz
  }

  /** Copy the attributes into the live cell. Only non-zero contributions
   * count: a `coverage` of 0 must mean "no opinion", or a cell that only
   * wanted a lee would flatten the clouds' own dial to zero. */
  private _sync(): void {
    const c = this.cell
    c.at.x = this.x
    c.at.z = this.z
    c.radius = this.radius
    c.wind =
      this.windSpeed !== 0
        ? windFromPolar(this.windSpeed, this.windBearingDeg)
        : undefined
    c.coverage = this.coverage !== 0 ? this.coverage : undefined
    c.precipitation = this.precipitation > 0 ? this.precipitation : undefined
    c.storminess = this.storminess > 0 ? this.storminess : undefined
    c.temperature = this.temperature !== 0 ? this.temperature : undefined
    const life = this.lifetime > 0 ? lifeEnvelope(this.age, this.lifetime) : 1
    // GATHERING: a smoothstep from nothing to full over `grow` seconds, so a
    // storm builds rather than appearing. Multiplies the life envelope, so a
    // cell can gather slowly and still end on its lifetime.
    const g = this.grow > 0 ? Math.min(1, Math.max(0, this.age / this.grow)) : 1
    c.strength = life * g * g * (3 - 2 * g)
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.age = 0
    this._ended = false
    this._sync()
    this._remove = owner.addWeatherCell(this.cell)
    owner.addOriginListener(this._onShift)
    this._obs = scene.onBeforeRenderObservable.add(() => {
      const dt = sceneDelta(scene)
      this.age += dt
      if (this.drift === 'wind') {
        // A system travels with the BASE wind (the scene's), not with the
        // weather it itself makes, or a storm would chase its own gusts.
        const w = owner.wind
        this.x += w.x * dt
        this.z += w.z * dt
      }
      this._sync()
      if (!this._ended && this.lifetime > 0 && this.age >= this.lifetime) {
        this._ended = true
        this.dispatchEvent(new CustomEvent('ended', { bubbles: true }))
      }
    })
  }

  sceneDispose() {
    this._remove?.()
    this._remove = null
    this.owner?.removeOriginListener(this._onShift)
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
  }
}

export const b3dWeatherCell = B3dWeatherCell.elementCreator()
