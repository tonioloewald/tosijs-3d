/*#
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
*/
/*{ "parent": "effects", "order": 5 }*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, semanticParent } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import { EffectPlayer } from './effect-player.js'
import { effectPreset } from './effect-presets.js'
import { validateEffectRecipe, type EffectRecipe } from './effect-recipe.js'

export class B3dEffect extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-effect'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    preset: '',
    activity: -1,
    autoplay: 'on',
    scale: 1,
    ground: 'off',
  }

  declare preset: string
  declare activity: number
  declare autoplay: 'on' | 'off'
  declare scale: number
  declare ground: 'on' | 'off'

  /** Plays this instead of a preset. */
  recipe: EffectRecipe | null = null
  /** Called when a one-shot has finished. */
  whenDone: (() => void) | null = null

  /** The live player (null until the scene is up). */
  player: EffectPlayer | null = null
  private _playing = ''
  /** The ground under it, when `ground` is on (found by a downward pick). */
  private _groundY: number | null = null
  private _groundTimer: ReturnType<typeof setInterval> | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const node = new BABYLON.Mesh(`effect-${this.preset || 'recipe'}`, scene)
    node.isPickable = false
    this.mesh = node
    const host = semanticParent(this) as any
    if (host?.mesh instanceof BABYLON.Node) node.parent = host.mesh
    else this.followOrigin(owner)
    // render() starts the player (its key is new); starting it here as well
    // built it twice (0.11.0 gate).
    this.render()
    // On the ground: look again now and then, as terrain tiles load and
    // sharpen under it.
    this._findGround()
    this._groundTimer = setInterval(() => this._findGround(), 1500)
  }

  sceneDispose(): void {
    if (this._groundTimer != null) clearInterval(this._groundTimer)
    this._groundTimer = null
    this.player?.dispose()
    this.player = null
    this._playing = ''
    super.sceneDispose()
  }

  render(): void {
    super.render()
    if (
      this.ground === 'on' &&
      this._groundY != null &&
      this.mesh != null &&
      this.mesh.parent == null
    )
      this.mesh.position.y = this._groundY + this.y
    if (this.owner == null || this.mesh == null) return
    // A new preset (or none, or back again) starts afresh, player or not.
    if (this._key() !== this._playing) {
      this._start()
      return
    }
    if (this.player != null && this.activity >= 0)
      this.player.activity = Math.min(1, this.activity)
  }

  /** Start again from the beginning. */
  play(): void {
    this.player?.play()
  }

  /** Stop emitting; what is alive dies out, sound and light fade. */
  stop(): void {
    this.player?.stop()
  }

  private _key(): string {
    return `${this.recipe != null ? 'recipe' : this.preset}:${this.scale}`
  }

  /*
  `ground`: the TERRAIN's height when the scene has one (its own sampler, as
  water's ice does; a pick from above found the cloud deck 6 km up first),
  else the first mesh below by a pick.
  */
  private _heightFn: {
    key: string
    fn: (x: number, z: number) => number
  } | null = null
  private _findGround(): void {
    const owner = this.owner
    const node = this.mesh
    if (
      this.ground !== 'on' ||
      owner == null ||
      node == null ||
      node.parent != null
    )
      return
    const terrain = owner.querySelector('tosi-b3d-terrain') as any
    if (terrain != null && typeof terrain.heightSampler === 'function') {
      const off = terrain.originOffset ?? { x: 0, z: 0 }
      const key = `${terrain.generationKey ?? ''}|${off.x}|${off.z}`
      if (this._heightFn?.key !== key)
        this._heightFn = { key, fn: terrain.heightSampler() }
      // The sampler takes logical world coordinates, as the attributes are.
      this._groundY = this._heightFn.fn(this.x, this.z)
    } else {
      const from = new BABYLON.Vector3(
        node.position.x,
        node.position.y + 500,
        node.position.z
      )
      const hit = owner.scene.pickWithRay(
        new BABYLON.Ray(from, BABYLON.Vector3.Down(), 2000),
        (m) => m.isPickable && m.isEnabled() && m.isVisible && m !== node
      )
      if (hit?.hit && hit.pickedPoint != null) this._groundY = hit.pickedPoint.y
    }
    if (this._groundY != null) node.position.y = this._groundY + this.y
  }

  private _recipe(): EffectRecipe | null {
    if (this.recipe != null) {
      const problems = validateEffectRecipe(this.recipe)
      if (problems.length) {
        console.warn(`b3d-effect: not an effect recipe: ${problems[0]}`)
        return null
      }
      return this.recipe
    }
    if (!this.preset) return null
    const p = effectPreset(this.preset)
    if (p == null) console.warn(`b3d-effect: no preset named "${this.preset}"`)
    return p ?? null
  }

  private _start(): void {
    const owner = this.owner
    if (owner == null || this.mesh == null) return
    this.player?.dispose()
    this.player = null
    this._playing = this._key()
    const recipe = this._recipe()
    if (recipe == null) return
    this.player = new EffectPlayer(owner.scene, this.mesh, recipe, {
      windAt: (x, z) => owner.weatherAt(x, z).wind,
      whenDone: () => this.whenDone?.(),
      scale: this.scale > 0 ? this.scale : 1,
      waterLevel: () => {
        const water = owner.querySelector('tosi-b3d-water') as any
        return water?.mesh?.absolutePosition?.y ?? null
      },
    })
    if (this.activity >= 0) this.player.activity = Math.min(1, this.activity)
    if (this.autoplay !== 'off') this.player.play()
  }
}

export const b3dEffect = B3dEffect.elementCreator()
