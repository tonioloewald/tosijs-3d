/*#
# b3d-lightning

**Lightning and thunder from the weather** (WEATHER-DESIGN stage 3, board
#1123). Put one in a scene; it watches every
[`<tosi-b3d-weather-cell>`](/b3d-weather-cell/) with `storminess` and strikes
under them, seeded, so the same seed gives the same storm.

## Demo

A storm at night. Watch the landscape jump out of the dark with each
strike, the cloud light from inside, and count the seconds to the thunder
(click the scene first; browsers only play sound after a gesture). Open the
⚙ menu for the storm's size, how often it strikes, the cloud cover around it
and how dramatic the flash is.

```js
import { b3d, b3dSun, b3dSkybox, b3dCloudDeck, b3dWeatherCell, b3dLightning, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { lightningDemo: s } = tosi({
  lightningDemo: { radius: 900, rate: 1, coverage: 0.15, brightness: 1, timeOfDay: 20.2 },
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(-1800, 60, -1400), el.scene)
        cam.setTarget(new BABYLON.Vector3(0, 500, 0))
        cam.maxZ = 20000
        cam.attachControl(el.parts.canvas, true)
        el.setActiveCamera(cam)
      },
      scenePanel: () => [
        label3d({ text: 'Lightning' }),
        slider3d({ label: 'storm size (m)', value: s.radius, min: 200, max: 3000, step: 50 }),
        slider3d({ label: 'how often', value: s.rate, min: 0, max: 5, step: 0.1 }),
        slider3d({ label: 'cloud cover', value: s.coverage, min: 0, max: 1.2, step: 0.05 }),
        slider3d({ label: 'brightness', value: s.brightness, min: 0, max: 3, step: 0.1 }),
        slider3d({ label: 'time of day', value: s.timeOfDay, min: 0, max: 24, step: 0.25 }),
      ],
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: s.timeOfDay, realtimeScale: 0 }),
    b3dGround({ size: 8000, color: '#4a5a44', texture: 'noise' }),
    b3dCloudDeck({ altitude: 320, coverage: s.coverage }),
    b3dWeatherCell({ x: 0, z: 0, radius: s.radius, coverage: 1.8, storminess: 1 }),
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
| `groundLight` | `6` | How hard a ground strike lights the ground beneath (point-light intensity at peak) |
| `rate` | `1` | How OFTEN, as a multiple of the natural rate (about 0.6 strikes a second over a storm at storminess 1; at most 4) |
| `brightness` | `1` | How DRAMATIC a flash is: the whole landscape lit from above (falling off with the storm's distance), the cloud lit from inside, and the bolt's glow, together |
| `color` | `'#dce4ff'` | The flash's colour |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, isOff } from './b3d-utils.js'
import {
  boltPath,
  flashAt,
  MAX_RATE,
  strikesBetween,
  thunderDelay,
  type Strike,
  type StormSource,
} from './lightning.js'
import type { WeatherCell } from './weather.js'
import type { B3d } from './tosi-b3d.js'

type Deck = {
  flash?: (x: number, z: number, level: number, radius?: number) => void
  altitude?: number
  stormRise?: number
}
type TerrainLike = {
  heightSampler?: () => (x: number, z: number) => number
  originOffset?: { x: number; z: number }
}

interface Live {
  strike: Strike
  bolt: BABYLON.Mesh[]
  sprite: BABYLON.Mesh | null
  length: number
}

const FLASH_LENGTH = 0.45
const SPRITE_LENGTH = 0.3

export class B3dLightning extends B3dChild {
  static preferredTagName = 'tosi-b3d-lightning'

  static initAttributes = {
    seed: 1,
    bolts: 'on' as 'on' | 'off',
    sprites: 'on' as 'on' | 'off',
    thunder: 'on' as 'on' | 'off',
    volume: 0.8,
    groundLight: 6,
    color: '#dce4ff',
    /** How often, as a multiple of the natural rate (storminess sets the
     * rest). */
    rate: 1,
    /** How dramatic a flash is: the whole landscape, the cloud and the bolt
     * together. */
    brightness: 1,
  }

  declare seed: number
  declare bolts: 'on' | 'off'
  declare sprites: 'on' | 'off'
  declare thunder: 'on' | 'off'
  declare volume: number
  declare groundLight: number
  declare rate: number
  declare brightness: number
  declare color: string

  /** Strikes so far (a debug readout, and a test hook). */
  strikeCount = 0
  private _ids = new WeakMap<WeatherCell, number>()
  private _nextId = 1
  private _lastT = 0
  private _live: Live[] = []
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _light: BABYLON.PointLight | null = null
  /*
  THE WHOLE LANDSCAPE LIGHTS UP. A point light under the strike lights the
  ground there; a real flash lights EVERYTHING, which is the drama (Tonio:
  "having the lightning be dramatically bright"). A hemispheric light from
  above, spiking with the flash and falling off with the storm's distance.
  */
  private _sky: BABYLON.HemisphericLight | null = null
  private _glowMat: BABYLON.StandardMaterial | null = null
  private _boltMat: BABYLON.StandardMaterial | null = null
  private _spriteMat: BABYLON.StandardMaterial | null = null
  private _audio: AudioContext | null = null
  private _noise: AudioBuffer | null = null

  private _id(cell: WeatherCell): number {
    let id = this._ids.get(cell)
    if (id == null) {
      id = this._nextId++
      this._ids.set(cell, id)
    }
    return id
  }

  private _storms(owner: B3d): StormSource[] {
    const out: StormSource[] = []
    for (const c of owner.weatherCells) {
      const s = (c.storminess ?? 0) * (c.strength ?? 1)
      if (s > 0)
        out.push({ id: this._id(c), at: c.at, radius: c.radius, storminess: s })
    }
    return out
  }

  private _deck(owner: B3d): Deck | null {
    return owner.querySelector('tosi-b3d-cloud-deck') as unknown as Deck | null
  }

  private _groundY(owner: B3d, x: number, z: number): number {
    const t = owner.querySelector(
      'tosi-b3d-terrain'
    ) as unknown as TerrainLike | null
    const h = t?.heightSampler?.()
    if (h == null) return 0
    const o = t?.originOffset ?? { x: 0, z: 0 }
    return h(x + o.x, z + o.z)
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this._lastT = owner.frameInfo().elapsed
    this._obs = scene.onBeforeRenderObservable.add(() => {
      try {
        this._tick(owner, scene)
      } catch {
        // An observer that throws skips every observer after it (the camera
        // follow, the aircraft): lightning must never be the thing that did.
      }
    })
  }

  private _tick(owner: B3d, scene: BABYLON.Scene): void {
    const t = owner.frameInfo().elapsed
    if (t < this._lastT) this._lastT = t
    const storms = this._storms(owner)
    if (storms.length > 0) {
      for (const s of strikesBetween(
        storms,
        this._lastT,
        t,
        this.seed,
        MAX_RATE * Math.max(0, this.rate)
      )) {
        this._start(owner, scene, s)
      }
    }
    this._lastT = t

    // The brightest live flash drives the deck and the ground light.
    let best: Live | null = null
    let bestLevel = 0
    for (const l of this._live) {
      const age = t - l.strike.t
      const level = flashAt(age, l.strike.seed, l.length)
      const weight =
        l.strike.kind === 'sprite' ? 0.15 : l.strike.kind === 'cloud' ? 0.7 : 1
      for (const m of l.bolt) m.visibility = level
      if (l.sprite) l.sprite.visibility = Math.min(1, level * 2)
      if (level * weight > bestLevel) {
        bestLevel = level * weight
        best = l
      }
    }
    const deck = this._deck(owner)
    const drama = Math.max(0, this.brightness)
    if (best != null) {
      const k = best.strike
      deck?.flash?.(
        k.x,
        k.z,
        bestLevel * 2.6 * drama,
        k.kind === 'cloud' ? 1600 : 1100
      )
      const light = this._light
      if (light != null) {
        light.intensity =
          k.kind === 'ground'
            ? bestLevel * Math.max(0, this.groundLight) * drama
            : 0
        // HALFWAY between the cloud base and the ground UNDER THE STRIKE
        // (Tonio): the channel's middle, and the terrain need not be flat.
        const cloudBase = deck?.altitude ?? 300
        const ground = this._groundY(owner, k.x, k.z)
        light.position.set(k.x, (cloudBase + ground) / 2, k.z)
      }
      // The whole scene, falling off with the storm's distance (half at
      // 3 km), weaker for an in-cloud flash, nothing for a sprite.
      if (this._sky != null) {
        const cam = scene.activeCamera?.globalPosition
        const d = cam ? Math.hypot(k.x - cam.x, k.z - cam.z) : 0
        const kind = k.kind === 'ground' ? 1 : k.kind === 'cloud' ? 0.55 : 0
        // Strong enough that a DARK ground (albedo ~0.3) reads as lit, not a
        // dim olive (Tonio: "why is the cloud lighting up but the ground
        // doesn't seem to be nearly as lit up?"). The cloud's flash is added
        // light and whites out; the ground only has what it reflects.
        this._sky.intensity =
          (bestLevel * kind * 3.5 * drama) / (1 + d / 6000)
      }
    } else {
      deck?.flash?.(0, 0, 0)
      if (this._light) this._light.intensity = 0
      if (this._sky) this._sky.intensity = 0
    }
    // Retire finished strikes.
    this._live = this._live.filter((l) => {
      if (t - l.strike.t <= l.length) return true
      for (const m of l.bolt) m.dispose()
      l.sprite?.dispose()
      return false
    })
  }

  private _start(owner: B3d, scene: BABYLON.Scene, strike: Strike): void {
    this.strikeCount++
    const deck = this._deck(owner)
    const base = deck?.altitude ?? 300
    const cam = scene.activeCamera?.globalPosition
    const distance = cam
      ? Math.hypot(strike.x - cam.x, base * 0.5 - cam.y, strike.z - cam.z)
      : 0
    const color = this._color()
    if (this._light == null) {
      this._light = new BABYLON.PointLight(
        'lightning-flash',
        new BABYLON.Vector3(0, base, 0),
        scene
      )
      this._light.range = 6000
      // Diffuse only: a specular highlight on flat ground read as a searchlight
      // beam, not a flash.
      this._light.specular = BABYLON.Color3.Black()
      this._light.intensity = 0
    }
    this._light.diffuse = color
    if (this._sky == null) {
      this._sky = new BABYLON.HemisphericLight(
        'lightning-sky',
        new BABYLON.Vector3(0, 1, 0),
        scene
      )
      this._sky.specular = BABYLON.Color3.Black()
      this._sky.groundColor = new BABYLON.Color3(0.15, 0.16, 0.2)
      this._sky.intensity = 0
    }
    this._sky.diffuse = color

    const live: Live = {
      strike,
      bolt: [],
      sprite: null,
      length: strike.kind === 'sprite' ? SPRITE_LENGTH : FLASH_LENGTH,
    }
    if (strike.kind === 'ground' && !isOff(this.bolts)) {
      const ground = this._groundY(owner, strike.x, strike.z)
      const paths = boltPath(
        { x: strike.x, y: base, z: strike.z },
        { x: strike.x, y: ground, z: strike.z },
        strike.seed,
        { branches: 3 }
      )
      const mat = this._boltMaterial(scene)
      const glow = this._glowMaterial(scene)
      /*
      A HALO around the main channel: the bolt itself tops out at white on
      an LDR screen, so what reads as BLINDING is the air glowing around it.
      Additive, several times the channel's width.
      */
      const halo = BABYLON.MeshBuilder.CreateTube(
        'lightning-halo',
        {
          path: paths[0].map((p) => new BABYLON.Vector3(p.x, p.y, p.z)),
          radius: 9,
          tessellation: 6,
        },
        scene
      )
      halo.material = glow
      halo.isPickable = false
      halo.visibility = 0
      live.bolt.push(halo)
      paths.forEach((path, i) => {
        const tube = BABYLON.MeshBuilder.CreateTube(
          'lightning-bolt',
          {
            path: path.map((p) => new BABYLON.Vector3(p.x, p.y, p.z)),
            radius: i === 0 ? 1.6 : 0.8,
            tessellation: 4,
          },
          scene
        )
        tube.material = mat
        tube.isPickable = false
        tube.visibility = 0
        live.bolt.push(tube)
      })
    }
    if (strike.kind === 'sprite' && !isOff(this.sprites)) {
      live.sprite = this._sprite(scene, strike, deck)
    }
    this._live.push(live)
    if (strike.kind !== 'sprite' && !isOff(this.thunder))
      this._thunder(distance, strike.kind === 'cloud' ? 0.5 : 1)
    this.dispatchEvent(
      new CustomEvent('strike', {
        bubbles: true,
        detail: {
          kind: strike.kind,
          x: strike.x,
          z: strike.z,
          t: strike.t,
          distance,
        },
      })
    )
  }

  private _color(): BABYLON.Color3 {
    try {
      return BABYLON.Color3.FromHexString((this.color || '#dce4ff').slice(0, 7))
    } catch {
      return new BABYLON.Color3(0.86, 0.9, 1)
    }
  }

  private _glowMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    if (this._glowMat == null) {
      const m = new BABYLON.StandardMaterial('lightning-halo-mat', scene)
      m.disableLighting = true
      m.emissiveColor = this._color().scale(0.45)
      m.diffuseColor = BABYLON.Color3.Black()
      m.alphaMode = BABYLON.Constants.ALPHA_ADD
      m.alpha = 0.99
      m.disableDepthWrite = true
      m.backFaceCulling = false
      this._glowMat = m
    }
    return this._glowMat
  }

  private _boltMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    if (this._boltMat == null) {
      const m = new BABYLON.StandardMaterial('lightning-bolt-mat', scene)
      m.disableLighting = true
      m.emissiveColor = this._color().scale(1.4)
      m.diffuseColor = BABYLON.Color3.Black()
      m.backFaceCulling = false
      this._boltMat = m
    }
    return this._boltMat
  }

  /*
  A SPRITE: a red-pink crown with tendrils hanging from it, high above the
  storm. Drawn once into a texture (seeded tendrils would be nicer; one good
  shape is enough for a flash this brief) on a camera-facing plane, additive,
  so it glows against a dark sky and vanishes against a bright one, which is
  also why real ones are only seen at night.
  */
  private _sprite(
    scene: BABYLON.Scene,
    strike: Strike,
    deck: Deck | null
  ): BABYLON.Mesh {
    if (this._spriteMat == null) {
      const size = 256
      const tex = new BABYLON.DynamicTexture(
        'lightning-sprite',
        { width: size, height: size },
        scene,
        false
      )
      const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
      ctx.clearRect(0, 0, size, size)
      // THE CROWN: a soft red glow, a whole ellipse (not cut off at the top).
      ctx.save()
      ctx.translate(size / 2, size * 0.2)
      ctx.scale(1, 0.45)
      const crown = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.42)
      crown.addColorStop(0, 'rgba(255,160,175,1)')
      crown.addColorStop(0.45, 'rgba(240,80,110,0.85)')
      crown.addColorStop(1, 'rgba(200,40,80,0)')
      ctx.fillStyle = crown
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      /*
      TENDRILS: wavy, forking, fading from red into purple and a faint blue
      as they hang down, which is how sprites look (jellyfish and carrots,
      not a comb). Deterministic wiggle, so every sprite is the same shape;
      at a third of a second nobody compares two.
      */
      const tendril = (
        x: number,
        y: number,
        len: number,
        w: number,
        depth: number
      ) => {
        const steps = 12
        let px = x
        let py = y
        for (let k = 0; k < steps; k++) {
          const f = k / steps
          const nx = px + Math.sin((x + k * 37) * 0.13) * 3.2 * (1 + f)
          const ny = py + len / steps
          const r = Math.round(255 - 120 * f)
          const b = Math.round(120 + 110 * f)
          ctx.strokeStyle = `rgba(${r},70,${b},${(1 - f * 0.8).toFixed(3)})`
          ctx.lineWidth = w * (1 - f * 0.7)
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(nx, ny)
          ctx.stroke()
          if (depth > 0 && k === 4 + (Math.floor(x) % 4))
            tendril(nx, ny, len * (1 - f) * 0.7, w * 0.6, depth - 1)
          px = nx
          py = ny
        }
      }
      for (let i = 0; i < 16; i++) {
        const x = size * (0.22 + 0.56 * ((i * 0.618) % 1))
        tendril(x, size * 0.26, size * (0.4 + 0.3 * ((i * 0.41) % 1)), 3.5, 1)
      }
      tex.hasAlpha = true
      tex.update()
      const m = new BABYLON.StandardMaterial('lightning-sprite-mat', scene)
      m.disableLighting = true
      m.emissiveTexture = tex
      m.opacityTexture = tex
      m.diffuseColor = BABYLON.Color3.Black()
      m.alphaMode = BABYLON.Constants.ALPHA_ADD
      m.disableDepthWrite = true
      m.backFaceCulling = false
      this._spriteMat = m
    }
    // Well above the deck, tower or not (real ones are 50-90 km up).
    const top = (deck?.altitude ?? 300) + Math.max(1500, deck?.stormRise ?? 0)
    const plane = BABYLON.MeshBuilder.CreatePlane(
      'lightning-sprite',
      { width: 2600, height: 3400 },
      scene
    )
    plane.material = this._spriteMat
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
    plane.position.set(strike.x, top + 2600, strike.z)
    plane.isPickable = false
    plane.visibility = 0
    return plane
  }

  /*
  THUNDER, made rather than loaded: filtered noise with a sharp crack for a
  close strike and a long low roll for a far one, delayed by distance at the
  speed of sound. Browsers only play audio after a user gesture, so until the
  user has clicked, thunder is silently skipped (the flash still happens).
  */
  private _thunder(distance: number, loudness: number): void {
    const vol = Math.max(0, this.volume) * loudness
    if (vol <= 0) return
    try {
      if (this._audio == null) {
        const Ctx =
          (window as any).AudioContext ?? (window as any).webkitAudioContext
        if (Ctx == null) return
        this._audio = new Ctx() as AudioContext
      }
      const ac = this._audio
      if (ac.state === 'suspended') void ac.resume()
      if (ac.state !== 'running') return
      if (this._noise == null) {
        const len = ac.sampleRate * 4
        const buf = ac.createBuffer(1, len, ac.sampleRate)
        const data = buf.getChannelData(0)
        let brown = 0
        for (let i = 0; i < len; i++) {
          // Brown noise: the low, rolling spectrum thunder is.
          brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02
          data[i] = brown * 3.5
        }
        this._noise = buf
      }
      const when = ac.currentTime + thunderDelay(distance)
      const near = Math.max(0, 1 - distance / 3000)
      const src = ac.createBufferSource()
      src.buffer = this._noise
      const filter = ac.createBiquadFilter()
      filter.type = 'lowpass'
      // Near strikes crack (more high end); far ones only rumble.
      filter.frequency.value = 180 + 900 * near
      const gain = ac.createGain()
      const level = vol / (1 + distance / 1500)
      gain.gain.setValueAtTime(0, when)
      gain.gain.linearRampToValueAtTime(level, when + 0.02 + 0.2 * (1 - near))
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        when + 2.5 + 1.5 * (1 - near)
      )
      src.connect(filter).connect(gain).connect(ac.destination)
      src.start(when)
      src.stop(when + 4.2)
    } catch {
      /* audio is garnish */
    }
  }

  sceneDispose() {
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
    for (const l of this._live) {
      for (const m of l.bolt) m.dispose()
      l.sprite?.dispose()
    }
    this._live = []
    this._light?.dispose()
    this._light = null
    this._boltMat?.dispose()
    this._boltMat = null
    this._glowMat?.dispose()
    this._glowMat = null
    this._sky?.dispose()
    this._sky = null
    this._spriteMat?.dispose(true, true)
    this._spriteMat = null
    const deck = this.owner ? this._deck(this.owner) : null
    deck?.flash?.(0, 0, 0)
    /*
    SILENCE, AT ONCE. Thunder is scheduled ahead on the audio clock (a storm
    2 km off rumbles 6 s after its flash, for 4 s), so leaving the page left
    ten seconds of queued thunder playing (Tonio: "When I navigate to another
    page, the system keeps running and generating sounds"). Closing the
    context drops everything queued, and does not leak a context per visit
    (browsers cap how many a page may hold).
    */
    const ac = this._audio
    this._audio = null
    if (ac != null && ac.state !== 'closed') void ac.close().catch(() => {})
  }
}

export const b3dLightning = B3dLightning.elementCreator()
