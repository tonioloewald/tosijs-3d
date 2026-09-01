/*#
# w3d-theme

The **one** place the `--w3d-*` theme variables are read. Every SVG-UI module
(widgets3d, keyboard, table, …) draws from this table instead of re-typing the
variable names and fallback literals — three drifting copies of this block is
exactly how a themed color ends up wrong in one widget only (caught by the
0.6.0 review).

**Values are resolved ONCE, at module load, in JS — deliberately.** These
surfaces rasterize onto 3D textures via `XMLSerializer`, where a literal
`var(--w3d-text)` in a serialized attribute resolves against *nothing* and
paints black. Reading the computed value at load and baking the literal into
the SVG is what makes the same markup render identically in the DOM and on a
plane. The cost: the theme is not live-reactive to later JS changes — restyle
before the bundle loads (tosijs's `vars`/`StyleSheet` at startup is fine).

## Demo

Every token that currently **does** something, live. Change one and the panel
rebuilds — which is the point: the theme is read when a widget is BUILT, so a
theme editor rebuilds rather than repaints (see `setW3dTheme`).

Colours use tosijs-ui's `colorInput` rather than `<input type="color">`, because
the native one **cannot express alpha** and half this palette is translucent —
`panelBg`, `rowHover` and `selectedBg` are all `rgba()`. A picker that silently
drops the alpha channel would make those tokens look broken rather than
untouched.

```js
import { panel3d, row3d, label3d, slider3d, toggle3d, button3d, ui,
         setW3dTheme, w3dTheme } from 'tosijs-3d'
import { colorInput } from 'tosijs-ui'
import { elements } from 'tosijs'
const { div, label, select, option, span, input } = elements

// Only tokens with a live consumer — a control that cannot change anything is
// worse than an absent one, because it reads as a broken theme.
const colours = ['panelBg', 'text', 'muted', 'accent', 'rowBg', 'rowHover',
  'buttonBg', 'buttonHover', 'track', 'caret', 'placeholder']
const numbers = [['roundedRadius', 0, 24, 1], ['spacing', 0, 24, 1], ['strokeWidth', 0.5, 6, 0.5], ['lineHeight', 1, 2, 0.05], ['fontSize', 10, 28, 1]]
// The generic families first (always resolvable, whatever the platform), then
// faces that actually ship on both macOS and Windows — each with a fallback
// chain ending in a generic, because "installed on both" is a weaker promise
// than it sounds and Linux keeps none of these guarantees.
const fonts = [
  'system-ui, sans-serif',
  'sans-serif',
  'serif',
  'monospace',
  'Georgia, serif',
  'Helvetica, Arial, sans-serif',        // Helvetica on Mac, Arial on Windows
  '"Times New Roman", Times, serif',
  '"Courier New", Courier, monospace',
  'Verdana, Geneva, sans-serif',
  '"Trebuchet MS", Tahoma, sans-serif',
  'Palatino, "Palatino Linotype", "Book Antiqua", serif',
  'Impact, Haettenschweiler, sans-serif',
]

const stage = div({ style: 'padding:20px; background:#5a6472; border-radius:8px' })
const build = () => {
  const p = panel3d(
    { width: 300 },
    label3d({ text: 'Themed panel' }),
    row3d({ weights: [1, 2] }, label3d({ text: 'size' }),
      slider3d({ value: 0.6, showValue: 'always', format: (v) => v.toFixed(2) })),
    row3d({ weights: [1, 2] }, label3d({ text: 'name' }), ui.inputField({ placeholder: 'placeholder…' })),
    toggle3d({ label: 'a toggle' }),
    button3d({ label: 'A button' }),
  )
  const old = stage.querySelector('svg')
  old ? old.replaceWith(p) : stage.append(p)
}

const controls = div({ style: 'display:grid; gap:5px; font:13px system-ui; color:#ddd; min-width:230px' })
const row = (name, control) =>
  controls.append(label({ style: 'display:flex; gap:10px; align-items:center; justify-content:space-between' }, name, control))

for (const key of colours) {
  row(key, colorInput({
    value: w3dTheme[key],
    onChange(evt) { setW3dTheme({ [key]: evt.target.value }); build() },
  }))
}
// A slider alone hides the value you are setting — pair it with a number field
// so you can read the exact figure and type one in.
for (const [key, min, max, step] of numbers) {
  const apply = (v) => { setW3dTheme({ [key]: Number(v) }); build(); num.value = String(v); range.value = String(v) }
  const range = input({ type: 'range', min, max, step, value: String(w3dTheme[key]),
    onInput(evt) { apply(evt.target.value) } })
  const num = input({ type: 'number', min, max, step, value: String(w3dTheme[key]),
    style: 'width:64px', onChange(evt) { apply(evt.target.value) } })
  row(key, span({ style: 'display:flex; gap:8px; align-items:center' }, range, num))
}
// Each option is rendered IN its own face — a font menu that lists names in a
// single face makes you pick by memory rather than by looking.
row('fontFamily', select({
  onChange(evt) { setW3dTheme({ fontFamily: evt.target.value }); build() },
}, ...fonts.map((f) => option(
  { value: f, style: `font-family:${f}` },
  f.split(',')[0].replace(/"/g, ''),
))))

build()
preview.append(div({ style: 'display:flex; gap:22px; padding:16px; align-items:flex-start; flex-wrap:wrap' }, stage, controls))
```
```css
tosi-example .preview { background: #1b1f27; }
```

*/
/*{ "parent": "UI", "order": 900 }*/

const rootStyle =
  typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement)
    : null

/** Read a CSS variable's computed value, falling back when absent/headless. */
export const cssVar = (name: string, fallback: string): string => {
  const v = rootStyle?.getPropertyValue(name).trim()
  return v ? v : fallback
}

/**
 * The `--w3d-*` theme, resolved at load. One object so a consumer (or a test)
 * can see the whole palette in one place; individual constants below for the
 * common destructure.
 */
export const w3dTheme = {
  fontSize: parseFloat(cssVar('--w3d-font-size', '16')) || 16,
  fontFamily: cssVar('--w3d-font-family', 'system-ui, sans-serif'),
  text: cssVar('--w3d-text', '#f0f0f0'),
  muted: cssVar('--w3d-muted', '#9aa0a6'),
  headingWeight: cssVar('--w3d-heading-weight', '700'),
  textWeight: cssVar('--w3d-text-weight', '400'),
  panelBg: cssVar('--w3d-panel-bg', 'rgba(20,22,28,0.94)'),
  buttonBg: cssVar('--w3d-button-bg', '#2a2f3a'),
  buttonHover: cssVar('--w3d-button-hover', '#333b49'),
  buttonActive: cssVar('--w3d-button-active', '#3a4150'),
  track: cssVar('--w3d-track', '#3a3f4a'),
  accent: cssVar('--w3d-accent', '#39c5ff'),
  rowBg: cssVar('--w3d-row-bg', 'rgba(255,255,255,0.05)'),
  rowHover: cssVar('--w3d-row-hover', 'rgba(255,255,255,0.13)'),
  /*
  STATUS SURFACES — `info` / `warning` / `error`.

  Backgrounds, not text colours: a status panel in a dark theme is a tinted
  SURFACE that `text` still reads on, and the bright hue you would use for a
  label is unreadable behind one. So these are deliberately dark and saturated
  rather than the usual blue/amber/red you would set on a glyph.

  They exist because the alternative is what we did first — a one-off literal
  picked for a single dialog, which is how a design system rots. A prompt that
  needs to stand out from the panel behind it asks for `info`, not for a hex.
  Opaque on purpose: a translucent status surface lets the panel underneath
  show through the very message it is interrupting you with.
  */
  info: cssVar('--w3d-info', '#1d4e6b'),
  warning: cssVar('--w3d-warning', '#6b4a17'),
  error: cssVar('--w3d-error', '#6b2323'),

  /*
  INTERACTION STATES — hover, focus, selected, disabled.

  Four states that must stay TELLABLE APART, which is the whole reason they are
  separate tokens rather than one "highlight". See UI-DESIGN-NOTES: selection is
  drawn as an ICON precisely so it does not compete with hover and focus for
  intensity; these give the same discipline to the surfaces underneath.

  `focus` is a stroke, not a fill — a focus ring has to be visible ON a hovered
  row and ON a selected one, so it cannot be another background or it
  disappears exactly when it is needed.
  */
  focus: cssVar('--w3d-focus', '#39c5ff'),
  selectedBg: cssVar('--w3d-selected-bg', 'rgba(57,197,255,0.18)'),
  disabledBg: cssVar('--w3d-disabled-bg', 'rgba(255,255,255,0.03)'),
  /*
  Disabled needs its own TEXT colour too, not just a background. Dimming only
  the surface leaves full-strength text on it, which reads as enabled — the
  label is what people look at.
  */
  disabledText: cssVar('--w3d-disabled-text', '#5c6270'),

  /*
  SHAPE AND RHYTHM.

  These were literals scattered across the widgets — `rx: 6` in seven places,
  `rx: 8` in four, `rx: 14` for the panel — which is how a rounded corner ends
  up subtly different in one widget only. Same failure the colour table was
  created to stop.
  */
  strokeWidth: parseFloat(cssVar('--w3d-stroke-width', '2')) || 2,
  roundedRadius: parseFloat(cssVar('--w3d-rounded-radius', '6')) || 6,
  spacing: parseFloat(cssVar('--w3d-spacing', '8')) || 8,
  lineHeight: parseFloat(cssVar('--w3d-line-height', '1.35')) || 1.35,

  /*
  CODE FACE — separate from the UI face on purpose.

  A value you have to read character by character (a hex, a path, an id) wants
  a monospace face even when the surrounding UI does not, and inheriting the UI
  weight makes code look bolder than it is at small sizes.
  */
  codeFontFamily: cssVar(
    '--w3d-code-font-family',
    'ui-monospace, SFMono-Regular, Menlo, monospace'
  ),
  codeFontWeight: cssVar('--w3d-code-font-weight', '400'),

  /*
  Surfaces a popup needs and a panel does not: something to sit ON (`overlay`,
  the scrim that makes a modal modal) and something to separate rows with
  (`divider`) without drawing a full-strength line.
  */
  overlay: cssVar('--w3d-overlay', 'rgba(0,0,0,0.5)'),
  divider: cssVar('--w3d-divider', 'rgba(255,255,255,0.10)'),
  /** Placeholder and caret — the two field colours that were literals. */
  placeholder: cssVar('--w3d-placeholder', '#6b7280'),
  caret: cssVar('--w3d-caret', '#39c5ff'),
}

export type W3dTheme = typeof w3dTheme

/*
RESERVED — declared, documented, and not yet consumed by any widget:

  focus  selectedBg  disabledBg  disabledText  overlay  divider
  codeFontFamily  codeFontWeight

They are here because the palette should be decided once rather than grown a
colour at a time, and because a consumer theming an app wants to set them
before the widgets that need them exist. But **setting one currently changes
nothing**, which is why the demo above does not offer controls for them: a knob
that cannot move anything reads as a broken theme rather than an unfinished
one, and that is a worse first impression than an absent control.

Each has a named consumer waiting: `focus`/`strokeWidth` for a focus ring,
`selectedBg` for selection, `disabledBg`/`disabledText` for a disabled state
(no widget has one yet), `overlay` for a modal scrim now that `openPopup`
exists, `divider` for row separators, and the code face for anything that
displays a value you read character by character.
*/

/**
 * **Override the theme at runtime.**
 *
 * The `--w3d-*` variables are read ONCE at load, and deliberately so: an SVG
 * destined to be rasterised onto a texture is serialised away from the
 * document, where `var(--w3d-text)` resolves against nothing and paints black.
 * Baking literals is what makes the same widget work in the DOM and in a scene.
 *
 * The cost of that is no live cascade — restyling the page after load changes
 * nothing. This is the way back in, and it is what a theme editor (or the demo
 * below) needs.
 *
 * **Widgets read the theme when they are BUILT**, so existing ones do not
 * repaint. Rebuild them after calling this. That is a real constraint rather
 * than an oversight: a widget that re-read its colours every frame would have
 * to re-resolve them per rasterised texture too, which is the cost this design
 * exists to avoid.
 */
export function setW3dTheme(partial: Partial<W3dTheme>): void {
  Object.assign(w3dTheme, partial)
}
