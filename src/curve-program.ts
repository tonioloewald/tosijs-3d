/*#
# Light program editor

**`curveProgram3d` — the editor for a whole [[light-modulation|LightProgram]]:
several curves that share one pair of split markers.** One `Widget3d`, one
value in, one value out, one undo step per gesture.

## Demo

**The editor drives a real lamp.** Drag a point or a split and the light changes
under it; flip the power SWITCH and watch the program's attack and decay play
out on the actual scene, which is the only way to tell whether a curve you drew
is the curve you wanted.

It uses [[light-editor|lightEditor3d]], which wraps this widget with the lamp's
static properties — colour, intensity, range, shadows, type. A program editor
alone is half a job: you can draw a perfect strike and have no way to say the
lamp is a warm spot that casts shadows.

```js
import {
  lightEditor3d, lightColor, panel3d, label3d,
  b3d, b3dLight, b3dPointLight, b3dSpotLight, b3dAreaLight,
} from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'
const { div } = elements

// A fluorescent: strikes in stutters, hums, then dies to a red ember.
const program = {
  brightness: [
    { x: 0, y: 0 }, { x: 0.06, y: 0.85 }, { x: 0.1, y: 0.05 },
    { x: 0.17, y: 1 }, { x: 0.23, y: 0.08 }, { x: 0.3, y: 0.95 },
    { x: 0.35, y: 1 }, { x: 0.45, y: 0.93 }, { x: 0.52, y: 1 },
    { x: 0.63, y: 0.9 }, { x: 0.75, y: 1 },
    { x: 0.8, y: 0.34 }, { x: 0.95, y: 0.26 }, { x: 1, y: 0 },
  ],
  hue: [{ x: 0, y: 0.5 }, { x: 0.75, y: 0.5 }, { x: 0.85, y: 0.04 }, { x: 1, y: 0 }],
  saturation: [{ x: 0, y: 0.2 }, { x: 0.75, y: 0.2 }, { x: 0.9, y: 1 }, { x: 1, y: 1 }],
  hueShiftDeg: 190,
  saturationScale: 5,
  attackEnd: 0.35, sustainEnd: 0.75,
  attack: 1.3, period: 3, decay: 3.2,
}

// The lamp is REPLACED when the type changes, because point / spot / area are
// three different elements. Everything else applies to the live one.
let lamp = null
const mount = document.createElement('div')

const makeLamp = (s) => {
  const common = {
    x: 0, y: 4.2, z: 0,
    diffuse: lightColor(s), range: s.range, intensity: s.intensity,
    shadows: s.shadows ? 'on' : 'off',
    on: s.on ? 'on' : 'off',
    program: s.program,
  }
  return s.kind === 'spot'
    ? b3dSpotLight({ ...common, angle: s.angle, exponent: 6 })
    : s.kind === 'area'
      ? b3dAreaLight({ ...common, width: 3, height: 1.2 })
      : b3dPointLight(common)
}

// The WHOLE lamp, not just its curves: a power switch, colour, intensity,
// range, shadows, and the program. Everything applies live.
const editor = lightEditor3d({
  // The guidance lives HERE, in the demo that needed it, rather than inside the
  // widget where it shipped into everyone's panel.
  hint: 'flip the power to watch the attack and decay',
  value: {
    kind: 'point', on: true,
    hue: 205, saturation: 0.19, intensity: 2.1, range: 15,
    shadows: true, program,
  },
  handleChange: (s) => {
    if (lamp == null) return
    // A TYPE change is a different element, so swap it. Removing and adding is
    // a genuine removal + build, not a move, so the new lamp starts fresh.
    if (s.kind !== lamp.dataset.kind) {
      const next = makeLamp(s)
      next.dataset.kind = s.kind
      lamp.replaceWith(next)
      lamp = next
      return
    }
    // `on` is an 'on'|'off' STRING, not a boolean — an absent boolean
    // attribute reads false, so a default-true boolean is not expressible.
    lamp.on = s.on ? 'on' : 'off'
    lamp.shadows = s.shadows ? 'on' : 'off'
    lamp.diffuse = lightColor(s)
    lamp.intensity = s.intensity
    lamp.range = s.range
    lamp.program = s.program
    if (s.kind === 'spot') lamp.angle = s.angle
  },
})

const scene = b3d(
  {
    style: 'flex:1;min-width:0;border-radius:8px;overflow:hidden',
    sceneCreated(el, BABYLON) {
      el.scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.03, 1)

      const checker = new BABYLON.DynamicTexture('checker', 512, el.scene, false)
      const ctx = checker.getContext()
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#3a3f47' : '#2d323a'
          ctx.fillRect(x * 32, y * 32, 32, 32)
        }
      }
      checker.update()
      checker.uScale = checker.vScale = 2

      const mat = new BABYLON.StandardMaterial('floor', el.scene)
      mat.diffuseTexture = checker
      mat.specularColor = BABYLON.Color3.Black()
      const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 16, height: 16 }, el.scene)
      floor.material = mat

      const propMat = new BABYLON.StandardMaterial('prop', el.scene)
      propMat.diffuseColor = new BABYLON.Color3(0.62, 0.6, 0.58)
      propMat.specularColor = BABYLON.Color3.Black()
      const props = [
        BABYLON.MeshBuilder.CreateBox('prop', { width: 1.2, height: 2.4, depth: 1.2 }, el.scene),
        BABYLON.MeshBuilder.CreateBox('prop', { size: 1 }, el.scene),
        BABYLON.MeshBuilder.CreateSphere('prop', { diameter: 1.5 }, el.scene),
      ]
      props[0].position.set(-2.2, 1.2, 0.6)
      props[1].position.set(1.6, 0.5, -1.4)
      props[2].position.set(2.4, 0.75, 1.6)
      for (const m of props) m.material = propMat

      el.register({ meshes: [floor, ...props] })
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3.2, radius: 13, target: [0, 1, 0] })
    },
  },
  b3dLight({ intensity: 0.06 }),
  mount
)

lamp = makeLamp(editor.value)
lamp.dataset.kind = editor.value.kind
mount.append(lamp)

preview.append(
  div(
    { style: 'display:flex;gap:14px;height:100%;padding:12px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'flex:0 0 330px;overflow:auto' },
      panel3d({ width: 310 }, label3d({ text: 'Light' }), editor)),
    div({ style: 'flex:1;min-width:0;display:flex' }, scene)
  )
)
```
```css
.preview {
  height: 100%;
}
```
## Why this is ONE widget and not six fields

A program is four curves (`brightness`, `hue`, `saturation`, `range`) plus the
markers that divide all of them into attack / sustain / decay. Those markers
belong to the **lamp**, not to any channel.

Exposed as six sibling fields, a generated panel would let brightness and hue be
edited into disagreement about where the attack ends — and that is not a state
the runtime can represent, so the document could hold a program that cannot run.
`tosijs-3d-ensemble`, whose format treats the JSON as the truth, put the
consequence plainly: _"a truth that cannot be executed is worse than a coarser
panel."_ So the invariant lives where it can be enforced — inside one widget.

It also makes the undo story fall out. One gesture is one `handleCommit` is one
entry in a history, instead of six callbacks nobody can tell belonged together.

## Controlled: value in, value out

The widget renders what you give it and emits a new program; it does not hold a
second copy of your document. During a drag it keeps a working value (an SVG
control has to), but the boundary is explicit:

| callback | when | for |
| --- | --- | --- |
| `handleChange(program)` | live, including mid-drag | a 3D preview that must follow the gesture |
| `handleCommit(program, describe)` | once, when the gesture ends | the document, and one undo step |

`describe` is a bare verb phrase — `'edit brightness curve'`, `'move attack
split'` — because a consumer attaches the subject themselves.

## Schema

`lightProgramSchema()` marks the whole object `"x-widget": "light-program"`, and
each channel carries `"x-widget": "curve"` with an `"x-curve-kind"`. A panel
generated from JSON Schema dispatches on the token and hands the entire value
here.

*/
/*{ "parent": "UI", "order": 263 }*/

import { svgElements } from 'tosijs'
import { canonicalProgram, type LightProgram } from './light-modulation'
import { readCurve, type ControlPoint } from './curve'
import {
  curve3d,
  curveMarkers,
  type CurveField,
  type CurveMarkers,
} from './curve-field'
import { stackLayout } from './widgets3d-layout'
import { offsetHost } from './widgets3d'
import type { PointerKind, Widget3d, WidgetHost } from './widgets3d'

const { g } = svgElements

/** The channels a program can carry, in the order they are drawn. */
export const PROGRAM_CHANNELS = [
  'brightness',
  'hue',
  'saturation',
  'range',
] as const

export type ProgramChannel = (typeof PROGRAM_CHANNELS)[number]

export interface CurveProgram3dOptions {
  /** The program to edit. Plain JSON — see `LightProgram`. */
  value?: LightProgram
  /**
   * Which channels to show. Defaults to the ones the value actually carries,
   * with `brightness` always present.
   *
   * Defaulting to *present* channels rather than all four keeps a simple lamp
   * a simple panel — an editor showing three empty plots invites you to fill
   * them in, which is the opposite of what a default should suggest.
   */
  channels?: ProgramChannel[]
  /** Live, including mid-drag — for a preview that must follow the gesture. */
  handleChange?: (program: LightProgram) => void
  /** Once per gesture, canonical — for the document and one undo step. */
  handleCommit?: (program: LightProgram, describe: string) => void
}

export interface CurveProgramField extends Widget3d {
  /** The current program. A copy — mutating it does nothing. */
  readonly value: LightProgram
  /** Replace the program (a document update flowing back in). */
  setValue: (program: LightProgram) => void
}

const CHANNEL_LABEL: Record<ProgramChannel, string> = {
  brightness: 'brightness',
  hue: 'hue — 0.5 leaves the colour alone',
  saturation: 'saturation — 1 as declared, 0 white',
  range: 'range',
}

/**
 * An editor for a whole light program.
 *
 * ```js
 * const editor = curveProgram3d({
 *   value: program,
 *   handleChange: (p) => lamp.program = p,          // live preview
 *   handleCommit: (p, why) => doc.edit(why, () => save(p)),  // one undo step
 * })
 * ```
 */
export function curveProgram3d(
  config: CurveProgram3dOptions = {}
): CurveProgramField {
  let program: LightProgram = { ...(config.value ?? {}) }

  const present = PROGRAM_CHANNELS.filter((c) => program[c] != null)
  const channels: ProgramChannel[] =
    config.channels ??
    (present.length > 0
      ? (Array.from(new Set(['brightness', ...present])) as ProgramChannel[])
      : ['brightness'])

  const el = g({ 'data-w3d': 'light-program' })

  /*
  Suppress emission while a value is being pushed IN from outside.

  Without it, `setValue` -> `markers.set` -> `handleChange` echoes a change
  back at the consumer who just set it. For a document that treats its own
  change events as edits, that is an undo entry for an undo — the loop that
  makes "controlled" components feel haunted.
  */
  let applying = false

  /*
  ONE marker model for every channel. This is the invariant the widget exists
  to hold: `attackEnd`/`sustainEnd` are properties of the PROGRAM, so there is
  exactly one of them here and every plot draws and drags the same pair.
  */
  const markers: CurveMarkers = curveMarkers(
    [program.attackEnd ?? 0.35, program.sustainEnd ?? 0.75],
    {
      labels: ['attack', 'decay'],
      handleChange: (v) => {
        program = { ...program, attackEnd: v[0], sustainEnd: v[1] }
        if (!applying) config.handleChange?.({ ...program })
      },
      handleCommit: (v, describe) => {
        program = { ...program, attackEnd: v[0], sustainEnd: v[1] }
        if (!applying) commit(describe)
      },
    }
  )

  /** Canonical, once per gesture — what a document should record. */
  function commit(describe: string): void {
    config.handleCommit?.(canonicalProgram(program), describe)
  }

  const fields: CurveField[] = channels.map((channel) => {
    const seed = program[channel]
    const field = curve3d({
      label: CHANNEL_LABEL[channel],
      // `name` and not `label`: the label is prose for the panel, this is the
      // token that lands in an undo history.
      name: channel,
      markers,
      value: typeof seed === 'number' ? undefined : readCurve(seed).points,
      handleChange: (points: ControlPoint[]) => {
        program = { ...program, [channel]: points }
        config.handleChange?.({ ...program })
      },
      handleCommit: (points: ControlPoint[], describe: string) => {
        program = { ...program, [channel]: points }
        commit(describe)
      },
    })
    return field
  })

  for (const f of fields) el.appendChild(f.el)

  let offsets: number[] = []
  let heights: number[] = []
  let total = 0
  const GAP = 6

  /** Which child owns a y, or -1. */
  const childAt = (y: number): number => {
    for (let i = 0; i < offsets.length; i++) {
      if (y >= offsets[i] && y <= offsets[i] + heights[i]) return i
    }
    return -1
  }

  // A drag must stay with the child it started in even when the pointer leaves
  // that child's band — otherwise dragging a point upward hands the gesture to
  // the plot above mid-move, which is indistinguishable from the curve
  // fighting you.
  let captured = -1

  const api: CurveProgramField = {
    el,

    setHost(host: WidgetHost) {
      // Same offset hop as the light editor: a child anchors in its own
      // coordinates and the container owes it the translation.
      fields.forEach((f, i) =>
        f.setHost?.(offsetHost(host, () => ({ x: 0, y: offsets[i] ?? 0 })))
      )
    },

    layout(width: number) {
      heights = fields.map((f) => f.layout?.(width) ?? 0)
      const stacked = stackLayout(heights, GAP)
      offsets = stacked.offsets
      total = stacked.total
      fields.forEach((f, i) => {
        f.el.setAttribute('transform', `translate(0, ${offsets[i]})`)
      })
      return total
    },

    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'down') captured = childAt(y)
      const i = captured >= 0 ? captured : childAt(y)
      if (i < 0) return
      fields[i].handle?.(kind, x, y - offsets[i])
      if (kind === 'up' || kind === 'leave') captured = -1
    },

    hitTest(x: number, y: number) {
      const i = childAt(y)
      if (i < 0) return false
      return fields[i].hitTest?.(x, y - offsets[i]) ?? true
    },

    get value() {
      return { ...program }
    },

    setValue(next: LightProgram) {
      applying = true
      program = { ...next }
      // Push the document's values down into the children rather than letting
      // them keep their own — this is what "controlled" means here, and it is
      // how an undo from outside reaches the plots.
      channels.forEach((channel, i) => {
        const c = program[channel]
        if (typeof c === 'number' || c == null) return
        fields[i].setPoints(readCurve(c).points)
      })
      markers.set([program.attackEnd ?? 0.35, program.sustainEnd ?? 0.75])
      applying = false
    },
  }

  return api
}
