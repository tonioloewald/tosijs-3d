/*#
# Effect tool

**Make an effect: particles, light and sound on one clock.** Start from a
preset (a volcano at any activity, a geyser, a splash, an explosion, a
fireball, sparks), change any layer and see it at once, then save the recipe
for `<tosi-b3d-effect>` to play in a game.

```js
import { effectTool } from 'tosijs-3d/effect-tool'

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '600px')
preview.append(effectTool())
```

## Using it

Tap the scene once so the browser lets it make sound.

- **Effect**: the preset, `play` (a one-shot plays again), `stop`, the
  `activity` dial (a volcano: dormant, semi-active, erupting), `mute`, and
  `listen from`: how far away you are. Sound travels at 343 m/s, so at
  300 m an explosion's boom comes almost a second after its flash. `time of
  day` shows the lights at night.
- **Layers**: choose one and change it. Particles: how many, how long they
  live, how fast and big, gravity, wind, height, the first and last colour.
  A light: its colour, intensity, range and flicker. A sound: its voice,
  gain and pitch. Every layer: when it starts and how long it lasts.
- **Recipe**: `save` downloads the recipe as JSON, `load` reads one back,
  `copy` puts it on the clipboard, `start over` goes back to the preset. The
  working recipe is kept in this browser, per preset.

The element carries `.effect`: `recipe` (a copy; set one to play it) and
`player`, for a page or an editor driving the tool.
*/
/*{ "parent": "demos", "order": 36 }*/

import * as BABYLON from '@babylonjs/core'
import { b3d } from './tosi-b3d.js'
import { b3dLight } from './b3d-light.js'
import { b3dSkybox } from './b3d-skybox.js'
import { button3d, label3d, select3d, slider3d, toggle3d, type Widget3d } from './widgets3d.js'
import { color3d } from './color-field.js'
import { touchOrbit } from './touch-orbit.js'
import { EffectPlayer } from './effect-player.js'
import { EFFECT_PRESETS, effectPreset, VOLCANO_STATES } from './effect-presets.js'
import {
  validateEffectRecipe,
  VOICES,
  soundDelay,
  type EffectLayer,
  type EffectRecipe,
} from './effect-recipe.js'

const STORE = 'tosijs-3d:effect-tool:'
const remember = (key: string, r: EffectRecipe) => {
  try {
    localStorage.setItem(STORE + key, JSON.stringify(r))
  } catch {
    /* the recipe is still in the page */
  }
}
const recall = (key: string): EffectRecipe | null => {
  try {
    const s = localStorage.getItem(STORE + key)
    const r = s != null ? JSON.parse(s) : null
    return r != null && validateEffectRecipe(r).length === 0 ? r : null
  } catch {
    return null
  }
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

function chooseFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** `effectTool()`'s element carries this as `.effect`. */
export interface EffectToolApi {
  /** A copy of the working recipe; set one to play it. */
  recipe: EffectRecipe
  readonly player: EffectPlayer | null
}

export function effectTool(): HTMLElement & { effect: EffectToolApi } {
  const ui = {
    preset: 'volcano',
    layer: 0,
    muted: false,
    distance: 40,
    timeOfDay: 18.5,
    status: '',
  }
  let recipe: EffectRecipe = recall(ui.preset) ?? effectPreset(ui.preset)!
  let player: EffectPlayer | null = null
  let cam: BABYLON.ArcRotateCamera | null = null
  let el: any = null
  const refresh = () => el?.refreshScenePanel()
  /*
  A FIREBALL rides a projectile, so it has no height of its own: shown here
  it would sit half in the ground. Lifted for viewing only.
  */
  let here: BABYLON.TransformNode | null = null
  const lift = () => {
    if (here != null) here.position.y = recipe.name === 'fireball' ? 1.5 : 0
  }
  const sky = b3dSkybox({ timeOfDay: ui.timeOfDay })

  /*
  WHICH PRESET A RECIPE IS: its own name when that is a preset, else
  'custom'. The working copy is kept under that, so loading a geyser while
  the volcano was showing does not overwrite the volcano.
  */
  const adopt = (r: EffectRecipe) => {
    recipe = clone(r)
    ui.preset = r.name != null && EFFECT_PRESETS[r.name] != null ? r.name : 'custom'
    ui.layer = 0
    if (player != null) player.activity = recipe.activity ?? 1
  }

  /** The recipe changed: play the new one (a one-shot from the start). */
  const changed = (restart = false) => {
    remember(ui.preset, recipe)
    if (player == null) return
    lift()
    player.setRecipe(clone(recipe))
    if (restart || recipe.duration != null) player.play()
  }
  const status = () => {
    const delay = soundDelay(ui.distance)
    return `${recipe.duration != null ? `one-shot, ${recipe.duration} s` : 'loops'} · sound ${delay.toFixed(2)} s late at ${ui.distance} m`
  }

  const num = (
    label: string,
    get: () => number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number
  ) =>
    slider3d({
      label,
      value: get(),
      min,
      max,
      step,
      handleChange: (v) => {
        set(v)
        changed()
      },
    })

  const layerWidgets = (l: EffectLayer): Widget3d[] => {
    const w: Widget3d[] = [
      num('start', () => l.start ?? 0, (v) => (l.start = v), 0, 5, 0.05),
    ]
    if (recipe.duration != null || l.duration != null)
      w.push(num('lasts', () => l.duration ?? recipe.duration ?? 1, (v) => (l.duration = v), 0.05, 15, 0.05))
    if (l.kind === 'particles') {
      w.push(
        num('per second', () => l.rate, (v) => (l.rate = v), 0, 300, 1),
        num('burst', () => l.burst ?? 0, (v) => (l.burst = v), 0, 300, 1),
        num('life', () => l.life[1], (v) => (l.life = [Math.min(l.life[0], v), v]), 0.1, 12, 0.05),
        num('speed', () => l.speed[1], (v) => (l.speed = [Math.min(l.speed[0], v * 0.6), v]), 0, 40, 0.1),
        num('size', () => l.size[1], (v) => (l.size = [Math.min(l.size[0], v * 0.6), v]), 0.01, 8, 0.01),
        num('gravity', () => l.gravity ?? 0, (v) => (l.gravity = v), -5, 20, 0.1),
        num('wind', () => l.wind ?? 0, (v) => (l.wind = v), 0, 1, 0.05),
        num('height', () => l.height ?? 0, (v) => (l.height = v), 0, 10, 0.05),
        color3d({
          label: 'first colour',
          value: l.colors[0],
          handleCommit: (hex) => {
            l.colors[0] = hex
            changed()
          },
        }) as unknown as Widget3d,
        color3d({
          label: 'last colour',
          value: l.colors[l.colors.length - 1],
          handleCommit: (hex) => {
            l.colors[l.colors.length - 1] = hex
            changed()
          },
        }) as unknown as Widget3d
      )
    } else if (l.kind === 'light') {
      w.push(
        num('intensity', () => l.intensity, (v) => (l.intensity = v), 0, 60, 0.1),
        num('range', () => l.range, (v) => (l.range = v), 0.5, 80, 0.5),
        num('flicker', () => l.flicker ?? 0, (v) => (l.flicker = v), 0, 1, 0.01),
        num('height', () => l.height ?? 0, (v) => (l.height = v), 0, 10, 0.05),
        color3d({
          label: 'colour',
          value: l.color,
          alpha: false,
          handleCommit: (hex) => {
            l.color = hex
            changed()
          },
        }) as unknown as Widget3d
      )
    } else {
      w.push(
        select3d({
          label: 'voice',
          value: l.voice,
          options: [...VOICES],
          handleChange: (v) => {
            l.voice = v as typeof l.voice
            changed()
          },
        }),
        num('gain', () => l.gain, (v) => (l.gain = v), 0, 1.5, 0.01),
        num('pitch', () => l.pitch ?? 1, (v) => (l.pitch = v), 0.25, 3, 0.01)
      )
    }
    return w
  }

  const panel = (): Widget3d[] => {
    const layers = recipe.layers
    ui.layer = Math.min(ui.layer, layers.length - 1)
    const w: Widget3d[] = [
      label3d({ text: 'Effect', collapsible: true, open: true }),
      select3d({
        label: 'preset',
        value: ui.preset,
        options: [...Object.keys(EFFECT_PRESETS), ...(ui.preset === 'custom' ? ['custom'] : [])],
        handleChange: (v) => {
          if (v === 'custom') return
          ui.preset = String(v)
          recipe = recall(ui.preset) ?? effectPreset(ui.preset)!
          ui.layer = 0
          if (player != null) {
            player.activity = recipe.activity ?? 1
            changed(true)
          }
          refresh()
        },
      }),
      button3d({ label: 'play', handleClick: () => player?.play() }),
      button3d({ label: 'stop', handleClick: () => player?.stop() }),
      slider3d({
        label: 'activity',
        value: player?.activity ?? recipe.activity ?? 1,
        min: 0,
        max: 1,
        step: 0.01,
        handleChange: (v) => {
          if (player != null) player.activity = v
          recipe.activity = v
          remember(ui.preset, recipe)
        },
      }),
    ]
    if (ui.preset === 'volcano')
      w.push(
        select3d({
          label: 'state',
          value:
            Object.entries(VOLCANO_STATES).find(([, a]) => Math.abs(a - (player?.activity ?? 0)) < 0.02)?.[0] ??
            'semi-active',
          options: Object.keys(VOLCANO_STATES),
          handleChange: (v) => {
            const a = VOLCANO_STATES[v as keyof typeof VOLCANO_STATES]
            if (player != null) player.activity = a
            recipe.activity = a
            remember(ui.preset, recipe)
            refresh()
          },
        })
      )
    w.push(
      toggle3d({
        label: 'mute',
        value: ui.muted,
        handleChange: (v) => {
          ui.muted = v
          if (player != null) player.muted = v
        },
      }),
      slider3d({
        label: 'listen from',
        value: ui.distance,
        min: 8,
        max: 600,
        step: 1,
        format: (v: number) => `${v} m`,
        handleChange: (v: number) => {
          ui.distance = v
          if (cam != null) cam.radius = v
          // The status line says how late the sound is; a refresh waits for
          // the drag to end.
          refresh()
        },
      }),
      slider3d({
        label: 'time of day',
        value: ui.timeOfDay,
        min: 0,
        max: 24,
        step: 0.1,
        handleChange: (v) => {
          ui.timeOfDay = v
          ;(sky as any).timeOfDay = v
        },
      }),
      label3d({ text: status(), muted: true, compact: true }),

      label3d({ text: 'Layers', collapsible: true, open: true }),
      select3d({
        label: 'layer',
        value: ui.layer,
        options: layers.map((l, i) => ({ label: `${i + 1}. ${l.name ?? l.kind} (${l.kind})`, value: i })),
        handleChange: (v) => {
          ui.layer = Number(v)
          refresh()
        },
      }),
      ...(layers[ui.layer] != null ? layerWidgets(layers[ui.layer]) : []),

      label3d({ text: 'Recipe', collapsible: true }),
      button3d({
        label: 'save',
        handleClick: () => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' }))
          const a = document.createElement('a')
          a.href = url
          a.download = `${recipe.name ?? ui.preset}.effect.json`
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        },
      }),
      button3d({
        label: 'load',
        handleClick: () =>
          void chooseFile('.json').then(async (f) => {
            if (f == null) return
            try {
              const r = JSON.parse(await f.text())
              const problems = validateEffectRecipe(r)
              if (problems.length) ui.status = `not an effect: ${problems[0]}`
              else {
                adopt(r)
                changed(true)
              }
            } catch (e) {
              ui.status = `could not read it: ${(e as Error).message}`
            }
            refresh()
          }),
      }),
      button3d({
        label: 'copy',
        handleClick: () => void navigator.clipboard?.writeText(JSON.stringify(recipe, null, 2)),
      }),
      button3d({
        label: 'start over',
        handleClick: () => {
          recipe = effectPreset(ui.preset) ?? recipe
          ui.layer = 0
          if (player != null) player.activity = recipe.activity ?? 1
          changed(true)
          refresh()
        },
      })
    )
    if (ui.status) w.push(label3d({ text: ui.status, muted: true, compact: true }))
    return w
  }

  el = b3d(
    {
      style: { width: '100%', height: '100%' },
      clearColor: '#1c2230',
      panelTitle: 'Effect',
      scenePanelOpen: true,
      scenePanel: panel,
      sceneCreated(owner: any) {
        const scene: BABYLON.Scene = owner.scene
        cam = new BABYLON.ArcRotateCamera('effect-cam', -2.1, 1.3, ui.distance, new BABYLON.Vector3(-8, 6, 0), scene)
        cam.minZ = 0.1
        cam.maxZ = 4000
        cam.attachControl(owner.querySelector('canvas'), true)
        touchOrbit(cam)
        owner.setActiveCamera(cam)
        const ground = BABYLON.MeshBuilder.CreateGround('effect-ground', { width: 1600, height: 1600 }, scene)
        const mat = new BABYLON.StandardMaterial('effect-ground', scene)
        mat.diffuseColor = new BABYLON.Color3(0.32, 0.3, 0.28)
        mat.specularColor = BABYLON.Color3.Black()
        ground.material = mat
        const node = new BABYLON.TransformNode('effect-here', scene)
        here = node
        lift()
        player = new EffectPlayer(scene, node, clone(recipe), {
          windAt: (x, z) => owner.weatherAt(x, z).wind,
        })
        player.play()
        refresh()
      },
    },
    sky,
    b3dLight({ intensity: 0.5 })
  )
  el.effect = {
    get recipe(): EffectRecipe {
      return clone(recipe)
    },
    set recipe(r: EffectRecipe) {
      const problems = validateEffectRecipe(r)
      if (problems.length) throw new Error(`not an effect recipe: ${problems[0]}`)
      adopt(r)
      changed(true)
      refresh()
    },
    get player(): EffectPlayer | null {
      return player
    },
  }
  return el
}
