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

**The same panel twice — flat DOM (top left) and as a texture in a 3D scene
(bottom left) — with the editor on the right.** Change a token and both
rebuild, which is the point: one UI, two presentations, and a theme that has to
reach them identically or the pair drifts.

The editor is [[theme-editor]], a component rather than demo code, so an adopter
gets this UI instead of copying it. Alpha comes from tosijs-ui's `colorInput`
passed in — the native `<input type="color">` cannot express it, and half this
palette is `rgba()`.

```js
import { b3d, b3dLight, panelScene, panel3d, row3d, label3d, slider3d,
         toggle3d, button3d, ui, themeEditor } from 'tosijs-3d'
import { colorInput } from 'tosijs-ui'
import { elements, tosi } from 'tosijs'
const { div } = elements

// Bound state, as the other widget demos do — so a rebuild does not reset what
// you set, and the values survive every theme change.
const { demo } = tosi({ demo: { size: 0.6, sound: false, name: '' } })

// ONE panel, shown twice. `panelScene` rasterises the SAME svg element onto the
// plane, so the 3D view is a render of the flat one rather than a copy of it —
// which is what makes "one UI, two presentations" literal here: there is
// nothing that can drift, because there is only one thing.
//
// A field accepts no keys by itself: `inputField` listens to nothing by design,
// because in a headset the keys come from the SVG keyboard rather than the DOM.
// `fieldGroup` bridges that, and `attach()` wires real keydown events.
const makePanel = () => {
  const field = ui.inputField({
    placeholder: 'type here…',
    value: demo.name.value,
    onChange: (v) => { demo.name = v },
  })
  const panel = panel3d(
    { width: 300 },
    label3d({ text: 'Themed panel' }),
    row3d({ weights: [1, 2] }, label3d({ text: 'size' }),
      slider3d({ value: demo.size, showValue: 'always', format: (v) => v.toFixed(2) })),
    row3d({ weights: [1, 2] }, label3d({ text: 'name' }), field),
    toggle3d({ label: 'sound', value: demo.sound }),
    button3d({ label: 'A button' }),
  )
  return { panel, field }
}

// Four equal cells. The panels take the left column (DOM above, 3D below) and
// the editor spans the right — so the two renders of the same panel sit one
// above the other, which is where a difference between them would be obvious.
const cell = { display: 'grid', placeItems: 'center', minWidth: '0', minHeight: '0', overflow: 'auto' }
const flat = div({ style: { ...cell, background: '#5a6472', borderRadius: '8px', padding: '12px' } })
const stage = div({ style: { ...cell, background: '#11141a', borderRadius: '8px' } })
let scene = null

let detach = null
const build = () => {
  const { panel, field } = makePanel()
  const old = flat.querySelector('svg')
  old ? old.replaceWith(panel) : flat.append(panel)

  // The plane takes the very same element as its texture.
  const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4 })
  const next = b3d({ sceneCreated }, b3dLight({ y: 1, intensity: 0.9 }), plane)
  scene ? scene.replaceWith(next) : stage.append(next)
  scene = next

  // Re-bind after every rebuild: the old field is gone, and a group holding a
  // detached field routes keys to nothing.
  detach?.()
  detach = ui.fieldGroup({ fields: [field] }).attach()
}

build()
preview.append(div(
  {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '16px',
      padding: '16px',
      height: '100%',
      boxSizing: 'border-box',
    },
  },
  flat,
  // The editor spans both rows of the right column — it is a tall list, and
  // splitting it across a cell boundary would make it scroll twice.
  div(
    { style: { ...cell, gridRow: '1 / 3', gridColumn: '2', alignContent: 'start', justifyItems: 'start' } },
    themeEditor({ colorInput, onChange: build })
  ),
  stage,
))
```
```css
tosi-example .preview { background: #1b1f27; color: #e6e6e6; min-height: 620px; }
tosi-b3d { width: 100%; height: 100%; border-radius: 8px; overflow: hidden; }
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

/**
 * **Build something under a different theme**, then put the old one back.
 *
 * The theme is global — one table, read by every widget — and that is usually
 * what you want: a palette exists so a UI looks like one UI. But an inspector
 * beside a toolbar, a warning panel, or a preview of a theme you are editing
 * all want to differ from their surroundings without becoming a second design
 * system.
 *
 * This works because of the property that makes the global table safe in the
 * first place: **a widget reads the theme when it is BUILT.** So a scope is
 * just "set, build, restore" — no plumbing through every widget, no second
 * table, and a widget built inside keeps its colours forever after, because
 * they were baked into its attributes.
 *
 * ```js
 * // `setW3dTheme` is the DEFAULT; this is the override for one panel.
 * const warning = withTheme({ panelBg: '#6b2323', text: '#ffd7d7' }, () =>
 *   panel3d({ width: 300 }, label3d({ text: 'Careful' })))
 * ```
 *
 * **Why this rather than `panel3d({ theme })`.** A panel's children are
 * constructed as ARGUMENTS, so they are already built by the time the panel
 * function runs — an option on the panel could only re-colour the panel's own
 * background while its contents kept the default, which is worse than not
 * offering it. Wrapping the construction puts the children inside the scope,
 * because that is when they evaluate.
 *
 * The unit that gets its own palette is therefore a panel, not a widget: you
 * theme a thing you build, and a panel is the thing you build.
 *
 * **Synchronous only, and deliberately not enforced.** `build` must not await:
 * the restore happens when it returns, so an async build would leak its theme
 * into whatever ran next. Enforcing that would mean rejecting a function that
 * merely returns a promise for an unrelated reason, and the honest constraint
 * is "build synchronously", which is what widget construction already is.
 *
 * Only the keys you override are saved and restored, so nested scopes compose
 * and an unrelated `setW3dTheme` from elsewhere is not clobbered on the way
 * out.
 */
export function withTheme<T>(partial: Partial<W3dTheme>, build: () => T): T {
  const saved: Partial<W3dTheme> = {}
  for (const key of Object.keys(partial) as Array<keyof W3dTheme>) {
    saved[key] = w3dTheme[key] as never
  }
  setW3dTheme(partial)
  try {
    return build()
  } finally {
    // `finally`, so a throw inside `build` cannot leave the palette changed —
    // a theme that silently persists after an error is the worst version of
    // this bug, because the next widget looks wrong for no visible reason.
    setW3dTheme(saved)
  }
}
