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
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, isOff, sceneDelta } from './b3d-utils.js'
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
  stormDim?: number
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
    groundLight: 2.5,
    /** How much a nearby storm takes from the sun and the ambient light
     * (0.5 = half), so the flashes stand out. */
    darken: 0.5,
    /** Shadows from the strike's light: 'on' | 'off'. */
    shadows: 'on' as 'on' | 'off',
    shadowSize: 1024,
    /** How far from you (m) things cast strike shadows. */
    shadowRange: 600,
    /** 'point' (shadows radiate from the bolt; 6 shadow renders per strike)
     * or 'directional' (1 render; right looking toward the strike). */
    flashLight: 'point' as 'point' | 'directional',
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
  declare darken: number
  declare shadows: 'on' | 'off'
  declare shadowSize: number
  declare shadowRange: number
  declare flashLight: 'point' | 'directional'
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
  /** The strike's own (shadowed) light; replaces a point light so the scene
   * stays inside a material's 4-light budget. */
  private _dir: BABYLON.DirectionalLight | BABYLON.PointLight | null = null
  private _shadows: BABYLON.ShadowGenerator | null = null
  /** The strike the shadow map was last rendered for. */
  private _shadowStrike: Strike | null = null
  /*
  THE WHOLE LANDSCAPE LIGHTS UP. A point light under the strike lights the
  ground there; a real flash lights EVERYTHING, which is the drama (Tonio:
  "having the lightning be dramatically bright"). A hemispheric light from
  above, spiking with the flash and falling off with the storm's distance.
  */
  private _sky: BABYLON.HemisphericLight | null = null
  private _activity = 0
  private _glowMat: BABYLON.StandardMaterial | null = null
  private _boltMat: BABYLON.StandardMaterial | null = null
  private _spriteMat: BABYLON.StandardMaterial | null = null
  private _audio: AudioContext | null = null
  private _noise: AudioBuffer | null = null
  /** Thunder already queued on the audio clock and not yet finished. */
  private _rumbles = new Set<{ src: AudioBufferSourceNode; gain: GainNode }>()

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
    } else if (this._rumbles.size > 0) {
      this._hush()
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
      /*
      THE CHANNEL IS THERE OR IT IS NOT. Fading the core by `visibility`
      alpha-blends it, so between re-strokes a bolt was a 30% transparent
      white tube: pale, see-through, and from close up obviously a tube
      (Tonio, in a headset: "too pale, they read as transparent"). The core is
      opaque for as long as the stroke is live at all; the flicker is carried
      by the additive halo, the lit cloud and the lit ground, which is where a
      real stroke's brightness goes too.
      */
      for (const m of l.bolt) {
        if (m.name === 'lightning-halo') m.visibility = Math.min(1, level * 1.5)
        else m.visibility = level > 0.03 ? 1 : 0
      }
      if (l.sprite) l.sprite.visibility = Math.min(1, level * 2)
      if (level * weight > bestLevel) {
        bestLevel = level * weight
        best = l
      }
    }
    const deck = this._deck(owner)
    const drama = Math.max(0, this.brightness)
    /*
    THE STORM DARKENS THE DAY around you, so its flashes pop: the sun and
    the ambient fill go down by `darken` (half) at full storm, easing with
    the storm's distance from you (gone 3 km past its edge) and its
    strength. Through the deck, which owns those lights.
    */
    if (deck != null) {
      const cam = scene.activeCamera?.globalPosition
      let activity = 0
      if (cam != null)
        for (const st of storms) {
          const out = Math.max(
            0,
            Math.hypot(st.at.x - cam.x, st.at.z - cam.z) - st.radius
          )
          activity = Math.max(
            activity,
            Math.min(1, st.storminess) * Math.max(0, 1 - out / 3000)
          )
        }
      // Eased, so a storm arriving or a toggle does not snap the light.
      this._activity +=
        (activity - this._activity) * Math.min(1, sceneDelta(scene) * 0.5)
      deck.stormDim = 1 - Math.max(0, Math.min(1, this.darken)) * this._activity
    }
    if (best != null) {
      const k = best.strike
      deck?.flash?.(
        k.x,
        k.z,
        bestLevel * 2.6 * drama,
        k.kind === 'cloud' ? 1600 : 1100
      )
      const cam = scene.activeCamera?.globalPosition
      const d = cam ? Math.hypot(k.x - cam.x, k.z - cam.z) : 0
      const fall = 1 / (1 + d / 6000)
      /*
      THE STRIKE'S OWN LIGHT, with SHADOWS: a directional light from the
      middle of the channel (halfway between the cloud base and the ground
      under the strike, Tonio) toward you. Parallel is a fair approximation at
      these distances, and it costs ONE shadow render, done once per new
      brightest ground strike (see _shadowFor), not six a frame as a point
      light's cube would.
      */
      const light = this._dir
      if (light != null) {
        light.intensity =
          k.kind === 'ground'
            ? bestLevel * Math.max(0, this.groundLight) * drama * fall
            : 0
        if (k.kind === 'ground' && best.strike !== this._shadowStrike) {
          this._aim(owner, scene, k, deck)
        }
      }
      // The whole scene, unshadowed fill, falling off with the storm's
      // distance, weaker for an in-cloud flash, nothing for a sprite. Strong
      // enough that a DARK ground (albedo ~0.3) reads as lit rather than a
      // dim olive (Tonio: "why is the cloud lighting up but the ground
      // doesn't seem to be nearly as lit up?"); the shadowed light above
      // carries the rest, so shadows read.
      if (this._sky != null) {
        const kind = k.kind === 'ground' ? 1 : k.kind === 'cloud' ? 0.55 : 0
        this._sky.intensity = bestLevel * kind * 1.6 * drama * fall
      }
    } else {
      deck?.flash?.(0, 0, 0)
      if (this._dir) this._dir.intensity = 0
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

  /*
  ONE SHADOW MAP, KEPT (Tonio: "spin up a shadow map and retain it between
  strokes and just use it for the brightest strike"). Made the first time,
  re-rendered ONCE when a new ground strike becomes the brightest, reused by
  its re-strokes and by anything flashing alongside it. Casters are what is
  near YOU (within shadowRange), because those are the shadows you can see,
  and a tight set keeps the map sharp.
  */
  private _aim(
    owner: B3d,
    scene: BABYLON.Scene,
    k: Strike,
    deck: Deck | null
  ): void {
    const light = this._dir!
    this._shadowStrike = k
    const cloudBase = deck?.altitude ?? 300
    const ground = this._groundY(owner, k.x, k.z)
    const from = new BABYLON.Vector3(k.x, (cloudBase + ground) / 2, k.z)
    const cam = scene.activeCamera?.globalPosition ?? BABYLON.Vector3.Zero()
    const to = new BABYLON.Vector3(
      cam.x,
      this._groundY(owner, cam.x, cam.z),
      cam.z
    )
    light.position.copyFrom(from)
    /*
    DEPTH FITTED TO THIS STRIKE. A point light's shadow depth spans its
    min..max Z, which defaulted to the camera's (kilometres), so the bias
    became tens of metres and every shadow vanished (found: 142 casters in
    the map, no shadow on the ground). From the channel to past the viewer,
    and no further.
    */
    if (light instanceof BABYLON.PointLight) {
      const reach =
        Math.hypot(cam.x - from.x, cam.y - from.y, cam.z - from.z) +
        Math.max(10, this.shadowRange)
      light.shadowMinZ = 1
      light.shadowMaxZ = reach
    }
    if (light instanceof BABYLON.DirectionalLight) {
      const dir = to.subtract(from)
      if (dir.lengthSquared() < 1) return
      dir.normalize()
      light.direction.copyFrom(dir)
    }
    if (isOff(this.shadows)) return
    if (this._shadows == null) {
      const size = Math.max(256, Math.floor(this.shadowSize))
      const gen = new BABYLON.ShadowGenerator(size, light)
      gen.bias = 0.0004
      gen.normalBias = 0.01
      gen.getShadowMap()!.refreshRate =
        BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE
      if (light instanceof BABYLON.DirectionalLight)
        light.autoCalcShadowZBounds = true
      this._shadows = gen
    }
    const range = Math.max(10, this.shadowRange)
    const casters = scene.meshes.filter(
      (m) =>
        m.isEnabled() &&
        m.isVisible &&
        m.getTotalVertices() > 0 &&
        !/cloud|sky|water|lightning|shaft|terrain|ground|underside/i.test(
          m.name
        ) &&
        // Thin instances (the decorator's trees) keep their mesh at the
        // origin and their copies wherever, so position says nothing.
        // Near YOU (the shadows you can see) or, for a point light, near
        // the STRIKE, where its shadows radiate in every direction.
        ((m as BABYLON.Mesh).hasThinInstances ||
          Math.hypot(
            m.getAbsolutePosition().x - cam.x,
            m.getAbsolutePosition().z - cam.z
          ) < range ||
          (light instanceof BABYLON.PointLight &&
            Math.hypot(
              m.getAbsolutePosition().x - k.x,
              m.getAbsolutePosition().z - k.z
            ) < range))
    )
    const map = this._shadows.getShadowMap()!
    map.renderList = casters
    /*
    COMPILE, THEN RENDER. A render-once pass SKIPS any caster whose shadow
    depth shader is not compiled yet, and never retries: the first version
    rendered one pass with nothing ready and the map stayed empty (read off
    its pixels: all six faces at the clear value, 142 casters listed).
    Render what is ready now, and again once everything has compiled.
    */
    map.resetRefreshCounter()
    const gen = this._shadows
    gen
      .forceCompilationAsync()
      .then(() => {
        if (this._shadows === gen && this._shadowStrike === k)
          map.resetRefreshCounter()
      })
      .catch(() => {})
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
    if (this._dir == null) {
      /*
      POINT by default: its shadows radiate from the channel in every
      direction, which is right all round the strike (Tonio thought it would
      look better, and it does). The cost is a CUBE shadow map, six renders,
      but only once per new brightest strike, never per frame. 'directional'
      is the cheap one: a single render, and right looking TOWARD the strike.
      */
      this._dir =
        this.flashLight === 'directional'
          ? new BABYLON.DirectionalLight(
              'lightning-flash',
              new BABYLON.Vector3(0, -1, 0),
              scene
            )
          : new BABYLON.PointLight(
              'lightning-flash',
              new BABYLON.Vector3(0, base, 0),
              scene
            )
      if (this._dir instanceof BABYLON.PointLight) this._dir.range = 8000
      // Diffuse only: a specular highlight on flat ground read as a
      // searchlight beam, not a flash.
      this._dir.specular = BABYLON.Color3.Black()
      this._dir.intensity = 0
    }
    this._dir.diffuse = color
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
      NEVER THINNER THAN A PIXEL OR SO. A 1.6 m channel is a small fraction
      of a pixel a few kilometres off, so under a big storm most strokes never
      rendered while their flash still lit everything (Tonio: "still not
      seeing many lightning strokes even when the cloud and land being lit
      are clearly visible"). Scaled by distance so a far bolt is a thin bright
      line and a near one is the real thing: ~1.5 px at a 1 rad view on a
      1000 px screen.
      */
      const px = distance * 0.0015
      const core = Math.max(1.6, px)
      const haloR = Math.max(9, px * 4)
      /*
      A HALO around the main channel: the bolt itself tops out at white on
      an LDR screen, so what reads as BLINDING is the air glowing around it.
      Additive, several times the channel's width.
      */
      const halo = BABYLON.MeshBuilder.CreateTube(
        'lightning-halo',
        {
          path: paths[0].map((p) => new BABYLON.Vector3(p.x, p.y, p.z)),
          radius: haloR,
          tessellation: 6,
        },
        scene
      )
      halo.material = glow
      halo.isPickable = false
      // A bolt is far brighter than anything the haze is hiding: under a
      // closed deck the scene's fog swallowed every bolt while their light
      // still reached the ground (Tonio: "I see flashes but never seem to
      // see lightning strokes").
      halo.applyFog = false
      halo.visibility = 0
      live.bolt.push(halo)
      paths.forEach((path, i) => {
        const tube = BABYLON.MeshBuilder.CreateTube(
          'lightning-bolt',
          {
            path: path.map((p) => new BABYLON.Vector3(p.x, p.y, p.z)),
            radius: i === 0 ? core : core * 0.5,
            tessellation: 4,
          },
          scene
        )
        tube.material = mat
        tube.isPickable = false
        tube.applyFog = false
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
      m.emissiveColor = this._color().scale(0.7)
      m.diffuseColor = BABYLON.Color3.Black()
      m.alphaMode = BABYLON.Constants.ALPHA_ADD
      m.alpha = 0.99
      m.disableDepthWrite = true
      m.backFaceCulling = false
      // Bright along the middle, nothing at the silhouette: a uniform additive
      // tube has a hard edge and reads as a pale ribbon, not as glowing air.
      const f = new BABYLON.FresnelParameters()
      f.leftColor = BABYLON.Color3.Black()
      f.rightColor = this._color().scale(0.9)
      f.power = 2.5
      f.bias = 0
      m.emissiveFresnelParameters = f
      this._glowMat = m
    }
    return this._glowMat
  }

  private _boltMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    if (this._boltMat == null) {
      const m = new BABYLON.StandardMaterial('lightning-bolt-mat', scene)
      m.disableLighting = true
      // Far past white on purpose: it clamps on an LDR target, and anything
      // that blooms (the glow layer, a later HDR path) gets the real ratio.
      m.emissiveColor = this._color().scale(6)
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
      const rumble = { src, gain }
      this._rumbles.add(rumble)
      src.onended = () => this._rumbles.delete(rumble)
    } catch {
      /* audio is garnish */
    }
  }

  /*
  THE STORM IS GONE, SO IS ITS THUNDER. Thunder is queued on the audio clock
  as far ahead as sound takes to arrive (23 s for a storm 8 km off), so
  switching world left the old world's thunder to play out over the new one
  (Tonio: thunder from Venus heard on Earth). With no storm left, what is
  queued is faded quickly and stopped.
  */
  private _hush(): void {
    const ac = this._audio
    for (const r of this._rumbles) {
      try {
        if (ac != null) {
          r.gain.gain.cancelScheduledValues(ac.currentTime)
          r.gain.gain.setTargetAtTime(0, ac.currentTime, 0.08)
          r.src.stop(ac.currentTime + 0.5)
        } else r.src.stop()
      } catch {
        /* already stopped */
      }
    }
    this._rumbles.clear()
  }

  sceneDispose() {
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
    for (const l of this._live) {
      for (const m of l.bolt) m.dispose()
      l.sprite?.dispose()
    }
    this._live = []
    this._shadows?.dispose()
    this._shadows = null
    this._shadowStrike = null
    this._dir?.dispose()
    this._dir = null
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
    if (deck != null) deck.stormDim = 1
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
