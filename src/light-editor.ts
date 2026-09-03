/*#
# light-editor

**`lightEditor3d` — the whole lamp, not just its curves.** A `Widget3d` that
edits what a light *is* (type, colour, intensity, range, shadows) alongside what
it *does over time* ([[curve-program|curveProgram3d]]), with a power switch so
you can watch the attack and decay play out.

## Demo

See [[curve-program]], which uses this to drive a real lamp.
## Why the two halves belong together

A program editor on its own is half a job: you can draw a beautiful strike-and-
decay and have no way to say the lamp is a warm 40 W spot that casts shadows.
Tonio, on the program editor by itself: _"presumably we need to be able to
configure the light's basic properties (like its basic color, intensity, whether
it casts shadows, the type of light, and so on, or we've only done half the
job."_

So this is one field, for the same reason a program is one field: what you get
back is a complete lamp description that can be handed straight to
[[b3d-lamp|b3dPointLight]] / `b3dSpotLight` / `b3dAreaLight`.

## Colour is HSV, not RGB

Two sliders — hue and saturation — and **no value slider**, because value *is*
`intensity` and having both would give you two ways to dim a lamp that disagree.

RGB would need three sliders to express "the same colour, a bit warmer", which
is the edit you actually make on a light. It also matches how the program's
`hue` and `saturation` channels modulate it, so the static colour and the
animated one are described in the same terms.

## A power SWITCH, not a button

It is state — the lamp is on or it is off — and a button reads as "do something
once". The first version of this was a button and Tonio did not recognise it as
the switch it was.

*/
/*{ "parent": "UI", "order": 264 }*/

import { svgElements } from 'tosijs'
import {
  label3d,
  slider3d,
  toggle3d,
  select3d,
  type PointerKind,
  type Widget3d,
  type WidgetHost,
} from './widgets3d'
import { curveProgram3d } from './curve-program'
import { shiftHue, type LightProgram } from './light-modulation'
import { stackLayout } from './widgets3d-layout'

const { g } = svgElements

/** What kind of lamp. Matches the three `b3d-lamp` elements. */
export type LightKind = 'point' | 'spot' | 'area'

/** A complete lamp description — everything the editor produces. */
export interface LightSettings {
  kind: LightKind
  /** Switched on. Runs the program's attack; `false` runs its decay. */
  on: boolean
  /** Hue in degrees, 0..360. */
  hue: number
  /** Saturation 0..1. `0` is white. */
  saturation: number
  intensity: number
  range: number
  shadows: boolean
  /** Cone angle in degrees. `spot` only. */
  angle: number
  /** The time-varying half. */
  program: LightProgram
}

export const DEFAULT_LIGHT: LightSettings = {
  kind: 'point',
  on: true,
  hue: 40,
  saturation: 0.25,
  intensity: 2,
  range: 15,
  shadows: true,
  angle: 46,
  program: {},
}

/**
 * The settings' colour as a hex string, ready for a lamp's `diffuse`.
 *
 * Full VALUE always: dimming is `intensity`'s job, and a colour that also
 * carried brightness would fight it — the same rule the modulation model
 * follows when it shifts hue.
 */
export function lightColor(
  s: Pick<LightSettings, 'hue' | 'saturation'>
): string {
  const rgb = shiftHue({ r: 1, g: 0, b: 0 }, s.hue, 1)
  const mixed = {
    r: 1 + (rgb.r - 1) * s.saturation,
    g: 1 + (rgb.g - 1) * s.saturation,
    b: 1 + (rgb.b - 1) * s.saturation,
  }
  const hex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(mixed.r)}${hex(mixed.g)}${hex(mixed.b)}`
}

export interface LightEditor3dOptions {
  value?: Partial<LightSettings>
  /** Live, including mid-drag — for the lamp itself. */
  handleChange?: (settings: LightSettings) => void
  /** Once per gesture — for a document and one undo step. */
  handleCommit?: (settings: LightSettings, describe: string) => void
}

export interface LightEditorField extends Widget3d {
  readonly value: LightSettings
  setValue: (next: Partial<LightSettings>) => void
}

/**
 * An editor for a whole lamp.
 *
 * ```js
 * const editor = lightEditor3d({
 *   value: { kind: 'spot', hue: 35, intensity: 600 },
 *   handleChange: (s) => applyToLamp(s),
 * })
 * ```
 */
export function lightEditor3d(
  config: LightEditor3dOptions = {}
): LightEditorField {
  let s: LightSettings = { ...DEFAULT_LIGHT, ...config.value }

  const el = g({ 'data-w3d': 'light-editor' })

  const emit = (describe: string, commit: boolean): void => {
    config.handleChange?.({ ...s })
    if (commit) config.handleCommit?.({ ...s }, describe)
  }

  /*
  A slider's gesture end is not exposed, so each one commits on every change.
  That is the honest option today rather than a silent lie: a consumer
  coalescing by `describe` still gets one undo entry per control, and the
  alternative — pretending a drag is one gesture when the widget cannot tell —
  would put the WRONG value in a history.

  Filed as the follow-up rather than worked around here, because the fix
  belongs in `slider3d` where the pointer actually is.
  */
  const num = (
    label: string,
    key: 'intensity' | 'range' | 'angle' | 'hue' | 'saturation',
    min: number,
    max: number,
    step: number
  ) =>
    slider3d({
      label,
      value: s[key],
      min,
      max,
      step,
      showValue: 'always',
      onChange: (v) => {
        s = { ...s, [key]: v }
        emit(`set light ${key}`, true)
      },
    })

  const rows: Widget3d[] = [
    // The switch FIRST: it is the control you reach for while watching the
    // program, and burying it under six sliders would hide the thing the
    // program editor exists to demonstrate.
    //
    // Its label is just "power". The explanation goes ABOVE as its own line,
    // because a control's label should name the control — a label carrying an
    // instruction reads as part of the sentence and stops looking like a
    // switch, which is how the first version went unrecognised.
    label3d({ text: 'flip it to watch the attack and decay', muted: true }),
    toggle3d({
      label: 'power',
      value: s.on,
      onChange: (v) => {
        s = { ...s, on: v }
        emit(v ? 'switch light on' : 'switch light off', true)
      },
    }),
    select3d({
      label: 'type',
      value: s.kind,
      options: ['point', 'spot', 'area'],
      onChange: (v) => {
        s = { ...s, kind: v as LightKind }
        emit('set light type', true)
      },
    }),
    num('hue', 'hue', 0, 360, 1),
    num('saturation', 'saturation', 0, 1, 0.01),
    num('intensity', 'intensity', 0, 1000, 1),
    num('range', 'range', 1, 60, 1),
    num('cone angle (spot)', 'angle', 5, 160, 1),
    toggle3d({
      label: 'casts shadows',
      value: s.shadows,
      onChange: (v) => {
        s = { ...s, shadows: v }
        emit(v ? 'enable light shadows' : 'disable light shadows', true)
      },
    }),
    label3d({ text: 'program — attack · sustain · decay', muted: true }),
  ]

  const program = curveProgram3d({
    value: s.program,
    handleChange: (p) => {
      s = { ...s, program: p }
      config.handleChange?.({ ...s })
    },
    handleCommit: (p, describe) => {
      s = { ...s, program: p }
      config.handleCommit?.({ ...s }, describe)
    },
  })
  rows.push(program)

  for (const r of rows) el.appendChild(r.el)

  let offsets: number[] = []
  let heights: number[] = []
  const GAP = 4
  let captured = -1

  const childAt = (y: number): number => {
    for (let i = 0; i < offsets.length; i++) {
      if (y >= offsets[i] && y <= offsets[i] + heights[i]) return i
    }
    return -1
  }

  return {
    el,

    setHost(host: WidgetHost) {
      for (const r of rows) r.setHost?.(host)
    },

    layout(width: number) {
      heights = rows.map((r) => r.layout?.(width) ?? 0)
      const stacked = stackLayout(heights, GAP)
      offsets = stacked.offsets
      rows.forEach((r, i) => {
        r.el.setAttribute('transform', `translate(0, ${offsets[i]})`)
      })
      return stacked.total
    },

    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'down') captured = childAt(y)
      const i = captured >= 0 ? captured : childAt(y)
      if (i < 0) return
      rows[i].handle?.(kind, x, y - offsets[i])
      if (kind === 'up' || kind === 'leave') captured = -1
    },

    hitTest(x: number, y: number) {
      const i = childAt(y)
      if (i < 0) return false
      return rows[i].hitTest?.(x, y - offsets[i]) ?? true
    },

    get value() {
      return { ...s }
    },

    setValue(next: Partial<LightSettings>) {
      s = { ...s, ...next }
      if (next.program) program.setValue(next.program)
    },
  }
}
