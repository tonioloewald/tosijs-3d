/*#
# keyboard

The **on-screen keyboard and text field** — the typing surface for a headset, where
there is no OS keyboard and no DOM `<input>` to fall back on. Both are `Widget3d`s, so
they drop into a [[widget-box]] / [[surface]] panel like any other control and work
identically as a flat overlay and rasterized onto a plane.

The logic lives in the pure models — [[key-layout]] (which keys, where, and what a
long-press offers) and [[text-edit]] (code-point-correct editing) — so this file is
paint plus gesture.

## Long-press for accents

Holding a letter that has alternatives (`a c e i n o s u y z`) pops them up; **slide
onto one and release** to insert it, or release on the key itself for the plain
character. The whole press is one gesture — the phone convention.

That gesture is exactly why `BoxChild.handlePointer` **captures**: the popup opens
*above* the key, so by the time you've slid onto `ö` the pointer is far outside the
key's own rect, and a hit-test-per-event model would have lost the gesture at the
first move.

## Demo

**Two fields, one keyboard.** Tap a field and the keyboard pops up as an **overlay
panel** (close it with ×) — it's not part of the main UI, exactly as an on-screen
keyboard shouldn't be. The **lit caret** marks the RECEIVER — the field the keys land
in; the other field's caret stays visible but dim. That's a deliberate distinction:
"who has the D-pad focus" and "where text goes" are different facts, so the receiver
stays lit even while you're tapping keys.

Tap the keys. `?123` switches to symbols, `⇧` shifts.

**Hold `o`** (or `a e i n s u y z c`) for the accents. Two ways to take one, because
touch and pointer want different things: **slide onto it and release**, or **lift your
finger** — the strip stays up and you tap the one you want. Lifting used to dismiss it,
which made the accents unreachable by finger.

**Hold the spacebar and slide** to drag the caret through the text. The drag continues
outside the key and outside the keyboard entirely (as iOS does) — a spacebar-width
gesture would only buy you a spacebar of travel.

**D-pad / arrow keys**: the keyboard is one panel row but MANY focus stops — it
implements the inner-focus protocol (`focusMove` returns `false` when a move runs off
the edge), so the D-pad walks key to key, arriving on the edge you entered from and
escaping at the edges rather than trapping focus (the VR demo below shows the escape
onto a sibling field). Clicking a key focuses it too (the ring lands where you
clicked), and **Space presses the focused key** — the action-button convention. A
hardware pad works via `gamepadFocus` (menu/A presses); a hardware keyboard also just
types: printable keys go straight into the receiver, Backspace deletes, arrows walk,
Enter presses. (Click the demo once so it has browser keyboard focus. With several
demos on the page, the one you last touched claims the gamepad.)

There is no completion/suggestion strip yet, and the interesting question isn't *whether*
but *from what*: see CONVERSATION-DESIGN.md → "Keyword dialogue", where the conclusion is
that a known, relevant word should be **clickable rather than typed**, so typing's
fallback role points completion at the player's own vocabulary rather than the world's.

```js
import { HardwareGamepadSource, ui } from 'tosijs-3d'
const {
  surface,
  widgetBox,
  widgetChild,
  box,
  textBlock,
  inputField,
  keyboard,
  svgPoint,
  gamepadFocus,
} = ui
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 380
const H = 390

// TWO fields, ONE keyboard — the keyboard is an OVERLAY (a closable panel that
// pops up when a field becomes the receiver), not part of the main UI. The LIT
// caret shows where text lands; the other field's caret stays visible but dim.
let target = null
let kbPanel = null
const use = (f) => {
  target = f
  // nameField, not `name` — shadowing window.name in a loose scope fails silently (tosijs-ui#53)
  for (const g of [nameField, mottoField]) g.setActive(g === f)
  openKeyboard()
}
const nameField = inputField({ placeholder: 'name…', onFocus: () => use(nameField) })
const mottoField = inputField({ value: 'hold o for ö', placeholder: 'motto…', onFocus: () => use(mottoField) })
const kb = keyboard({
  onKey: (ch) => target?.insert(ch),
  onAction: (a) => target?.action(a),
  // Hold the SPACEBAR and slide to move the caret (a hold that doesn't move
  // still types the space — headset triggers are slow).
  onCaretMove: (d) => target?.moveCaret(d),
})
const kbBox = widgetBox({ width: 364, padding: 8, gap: 8, background: '#0e1116' }, [kb])
const openKeyboard = () => {
  if (kbPanel) return
  // Untitled (a keyboard needs no label) and BELOW both fields — an overlay
  // that covers the field you might tap next is an overlay in the way.
  kbPanel = s.openPanel({ x: 8, y: 180 }, kbBox, {
    draggable: true, onClose: () => { kbPanel = null },
  })
}

const s = surface({ width: W, height: H })
s.setContent(
  box(
    { width: W, height: H, padding: 12, gap: 10, background: '#12151c' },
    textBlock('Two fields, one keyboard', { font: { size: 15, weight: 600 }, color: '#e6e6e6' }),
    textBlock('Tap a field — the keyboard pops up as an overlay (× closes it). The lit caret shows where text lands.', { font: { size: 12 }, color: '#9fb0c3' }),
    widgetChild(nameField),
    widgetChild(mottoField)
  )
)

const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: 0 }, s.el)
// Hardware keyboard (click the demo once so it has browser focus): printable
// keys type into the receiver, Backspace deletes, arrows walk the on-screen
// keys, Enter presses, and SPACE follows focus — a focused key is PRESSED
// (action-button convention), otherwise it types. preventDefault throughout,
// or the page scrolls.
const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
svgEl.addEventListener('keydown', (e) => {
  const kbHasFocus = kbPanel && kbBox.focusIndex() >= 0
  if (dirs[e.key]) { if (kbPanel) kbBox.focusMove(...dirs[e.key]); e.preventDefault() }
  else if (e.key === 'Enter') { if (kbPanel) kbBox.focusActivate(); e.preventDefault() }
  else if (e.key === ' ') {
    if (kbHasFocus) kbBox.focusActivate()
    else target?.insert(' ')
    e.preventDefault()
  }
  else if (e.key === 'Backspace') { target?.action('backspace'); e.preventDefault() }
  else if (e.key === 'Escape') kbPanel?.close()
  else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
    target?.insert(e.key)
    e.preventDefault()
  }
})
// A hardware pad drives the on-screen keys; `claim: svgEl` scopes it — the
// demo you last clicked owns the pad, so two live demos don't both react.
const pad = new HardwareGamepadSource()
gamepadFocus({ poll: () => pad.poll(), target: kbBox, claim: svgEl })
const at = (e) => {
  // svgPoint, not rect arithmetic: the viewBox is letterboxed when the
  // container's aspect ratio differs, and a linear map drifts as it's resized.
  const p = svgPoint(svgEl, e.clientX, e.clientY)
  return [p.x, p.y]
}
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))

preview.append(div({ style: 'padding:16px;background:#0c0e14' }, svgEl))
```

## In VR — the case it exists for

The same keyboard rasterized onto a plane in a 3D scene. Press **Enter VR** (top-left)
on a headset and type with the controller ray — that path is the whole reason this
exists, since a WebXR session can't rely on the system keyboard and there is no DOM
`<input>` inside an immersive scene.

Also wired here: **a hardware/XR gamepad drives focus** via `gamepadFocus` — D-pad walks
the keys, **menu** (or A) presses. That's the input a VR controller set leaves spare, so
claiming it doesn't fight locomotion.

```js
import { b3d, b3dLight, panelScene, HardwareGamepadSource, ui } from 'tosijs-3d'
const {
  surface,
  widgetBox,
  box,
  textBlock,
  inputField,
  keyboard,
  gamepadFocus,
  svgPoint,
} = ui
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 380
const H = 300

const readout = div({ style: 'margin:8px 4px;color:#8ea;font:13px system-ui' }, 'value: (empty)')
const field = inputField({
  placeholder: 'type with the ray, or a gamepad…',
  onChange: (v) => { readout.textContent = 'value: ' + (v || '(empty)') },
})
const kb = keyboard({
  onKey: (ch) => field.insert(ch),
  onAction: (a) => field.action(a),
  onCaretMove: (d) => field.moveCaret(d),
})

const s = surface({ width: W, height: H })
s.setContent(box({ width: W, height: H, padding: 12, gap: 8, background: '#12151c' },
  textBlock('Type in VR', { font: { size: 15, weight: 600 }, color: '#e6e6e6' })))
const panel = widgetBox({ width: 364, padding: 8, gap: 8, background: '#0e1116' }, [field, kb])
s.openPanel({ x: 8, y: 44 }, panel, { title: 'Text entry', draggable: true })

// The SAME surface shown flat AND used as the plane's texture (SvgTexture clones it
// each frame), so the two views can't drift — but sameness only covers RENDERING;
// input must be wired per presentation, so the flat copy gets its own pointer
// listeners (through svgPoint, as ever) alongside the scene-pick route below.
const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, s.el)
const at = (e) => { const p = svgPoint(svgEl, e.clientX, e.clientY); return [p.x, p.y] }
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))
// panelScene: plane + camera + pick routing + camera-yield, packaged.
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: s, width: 2.2, resolution: 1024 })

// panelScene restates the two contracts the flat overlay gets free from the
// DOM: the camera yields during a panel press (a press on UI is a gesture, not
// an orbit) and an off-plane release still ends the gesture — the lessons of
// this page's lost-pointerup saga, packaged (see UI-DESIGN-NOTES).
const scene = b3d(
  { style: 'border-radius:8px;overflow:hidden', sceneCreated },
  b3dLight({ intensity: 1 }),
  plane
)

const wrap = div({ style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
  div({ style: 'display:flex;gap:20px;flex:1;min-height:0;padding:14px 14px 4px' },
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'flat — same surface', svgEl),
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D — Enter VR to type with the ray', scene)),
  readout)
preview.append(wrap)

// A hardware pad drives focus; in a session the XR controllers do the same through
// XrGamepadSource. D-pad walks keys, menu/A presses. `claim: wrap` scopes the pad
// to this demo — click it first; the other keyboard demo on this page claims the
// same pad for itself when you click that one.
const pad = new HardwareGamepadSource()
gamepadFocus({ poll: () => pad.poll(), target: panel, claim: wrap })
```
```css
.preview {
  height: 100%;
}
```
*/
/*{ "parent": "UI", "order": 210 }*/

import { svgElements } from 'tosijs'
import {
  keyLayout,
  keyRects,
  keyAt,
  accentsFor,
  keyboardHeight,
  type KeyboardMode,
  type KeyAction,
  type KeyRect,
  keyIntent,
  modeForType,
  isValidForType,
  commitValueForType,
  type FieldType,
} from './key-layout'
import {
  edit,
  insert as editInsert,
  backspace as editBackspace,
  moveCaret as editMoveCaret,
  moveTo,
  type EditState,
} from './text-edit'
import { measureTextWidth, type FontSpec } from './widgets3d-layout'
import { nearestInDirection } from './flow-layout'
import type { Widget3d, WidgetHost, PointerKind } from './widgets3d'
import { iconGlyph } from './svg-icons'
import { w3dTheme } from './w3d-theme'

const { g, rect, text } = svgElements

// Theme reads live in ONE module (w3d-theme) — see the review-caught
// triplication; the local names keep this file's paint code readable.

/** A text field driven by the pure edit model. Tap to place the caret. */
export interface InputField extends Widget3d {
  /** Current text. */
  readonly value: string
  /** What this field holds. Drives the keyboard layout, validation and commit. */
  readonly type: FieldType
  /** The keyboard layout this field wants — hand it to `keyboard.setMode`. */
  readonly keyboardMode: KeyboardMode
  /** Is the CURRENT text acceptable while typing? Empty is always valid. */
  isValid: () => boolean
  /**
   * Settle the value: normalise it, or restore the last good one.
   *
   * Returns the value kept. Called on Enter automatically; a host should also
   * call it when focus leaves, since a field abandoned mid-edit must not leave
   * `1.` or `-` sitting in the document.
   */
  commit: () => string
  /** Insert text at the caret (what a key tap calls). */
  insert: (str: string) => void
  /** Apply a non-inserting key. */
  action: (a: KeyAction) => void
  /** Replace the value. */
  setValue: (v: string) => void
  /** Nudge the caret by `delta` code points — what the spacebar trackpad drives. */
  moveCaret: (delta: number) => void
  /**
   * Inner focus traversal (same protocol as the keyboard's). LEFT/RIGHT move the
   * insertion point and are always consumed; UP/DOWN are not, so focus escapes to
   * the neighbouring widget.
   *
   * Horizontal is consumed even at the ends on purpose: a caret that leaps out of
   * the field because you pressed left once too often is disorienting, and vertical
   * already provides a way out — which is the property that matters for not
   * trapping a D-pad.
   */
  focusMove: (dx: number, dy: number) => boolean
  /** D-pad focus left (the `Widget3d` protocol). Does NOT dim the caret — see
   * `setActive`: being the keyboard's target outlives holding the D-pad focus. */
  focusClear: () => void
  /**
   * Whether this field is the RECEIVER — the one the keyboard's output lands in.
   * The caret is the receiver indicator: bright when active, dim (never hidden)
   * when not, so with two fields you can see both carets and which one is live.
   * Activation is one-way from inside (tapping/typing turns it ON); only the
   * host turns it off, by activating another field — which is why the caret
   * stays lit while you're tapping keys on the KEYBOARD (box focus is there,
   * but the text still lands here).
   */
  setActive: (active: boolean) => void
  /** The receiver state — `true` while this field's caret is lit. */
  readonly active: boolean
  /** Host focus reflection (the `Widget3d` protocol): gaining focus activates. */
  setState: (state: {
    hovered: boolean
    pressed: boolean
    focused: boolean
  }) => void
  /** Called whenever the text changes. */
  onChange?: (value: string) => void
  /**
   * Called whenever this field becomes the receiver — by tap, D-pad arrival or
   * `setActive(true)`.
   *
   * Settable on the OBJECT as well as via config, mirroring `onChange`, so a
   * manager can learn about focus it did not initiate. Without it a tap and a
   * programmatic focus disagree about who is active, and keys go to the wrong
   * field — silently, and only sometimes.
   */
  onFocus?: () => void
}

/*
LIVE THEME READS — see the same note in widgets3d.

`const X = w3dTheme.x` at module scope captured the palette at IMPORT, so
`setW3dTheme` could not reach it and a theme editor changed nothing.
*/
const TH = {
  get TEXT() {
    return w3dTheme.text
  },
  get ACCENT() {
    return w3dTheme.accent
  },
  get KEY_BG() {
    return w3dTheme.buttonBg
  },
  get KEY_ACTION_BG() {
    return w3dTheme.track
  },
  get KEY_DOWN() {
    return w3dTheme.buttonActive
  },
  get FIELD_BG() {
    return w3dTheme.rowBg
  },
  get PLACEHOLDER() {
    return w3dTheme.placeholder
  },
  get PANEL_BG() {
    return w3dTheme.panelBg
  },
  get FONT_FAMILY() {
    return w3dTheme.fontFamily
  },
}

/**
 * Pixels of travel before a press becomes a scrub rather than a caret placement.
 *
 * Small, but not zero: a tap on a touchscreen or an XR ray always drifts a
 * pixel or two, and treating that as a scrub would make the field impossible to
 * click into.
 */
const SCRUB_SLOP = 3

export interface InputFieldOptions {
  value?: string
  placeholder?: string
  fontSize?: number
  height?: number
  onChange?: (value: string) => void
  onEnter?: (value: string) => void
  /** The field became the receiver (tap, D-pad arrival, or `setActive(true)`)
   * — the host's hook for exclusivity (dim the others) and for summoning the
   * keyboard overlay. */
  onFocus?: () => void
  /**
   * Drag across a numeric field to change its value ("scrub"), in units per
   * pixel. `0` (default) disables it.
   *
   * ensemble asked for "a number you can drag OR type" (tosijs-3d#50). Since a
   * typed field already knows it is numeric, scrubbing belongs here rather than
   * in a separate control — otherwise every numeric widget needs its own copy
   * of parse, format and commit.
   */
  scrub?: number
  /** Quantise a scrub (and a commit) to this. `0` = free. */
  step?: number
  /** Clamp a scrubbed value. */
  min?: number
  max?: number
  /**
   * What this field holds — the same idea as HTML's `inputmode`.
   *
   * One property, three jobs: the host raises the matching keyboard layout on
   * focus (`modeForType`), `commit()` normalises or refuses the value, and a
   * host can ask `isValid()` without knowing what kind of field it has. It is
   * why there is no separate `numberField` — a number field is this one,
   * configured (tosijs-3d#37, item 2).
   */
  type?: FieldType
  /**
   * Should tapping this field summon an on-screen keyboard?
   *
   * - `auto` (default) — the AFFORDANCE is always drawn, and a tap auto-opens
   *   only on a coarse pointer (touch). See below for why those differ.
   * - `always` — auto-open on any pointer. What an XR panel wants.
   * - `never` — no affordance, no auto-open.
   *
   * Needs somewhere to PUT a keyboard — see `openKeyboard`.
   */
  keyboard?: 'auto' | 'always' | 'never'
  /**
   * Where the keyboard goes. Return a closer.
   *
   * **A short panel cannot host one, and this is why the option exists.** The
   * panel-overlay route (`WidgetHost.showPopup`) caps a popup to the panel's own
   * bounds, which is right for a dropdown and wrong for a keyboard: on a 64px
   * panel the keyboard was squeezed to 64px AND placed over the field it types
   * into. Measured, not guessed.
   *
   * So the field asks and the app answers. Flat that might be a positioned
   * sibling; in a scene it wants `openPopup` on the B3d — a plane of its own,
   * unbounded by the panel. Omit it and the field uses the panel overlay only
   * when there is genuinely room below, and otherwise leaves the glyph inert
   * rather than showing you something broken.
   */
  openKeyboard?: (field: InputField) => (() => void) | void
}

/**
 * **One keyboard, many fields.** Owns which field is receiving, so hosts stop
 * doing it by hand.
 *
 * Three jobs that always travel together, and were three separate chores in
 * every consumer (tosijs-3d#37, items 1 and 7):
 *
 * - **Exclusivity.** Focusing one field un-focuses the rest. Two lit fields
 *   both claiming the keyboard is worse than none, because the caret is
 *   somewhere you are not looking.
 * - **Commit on leave.** The field you are leaving settles, so a half-typed
 *   `1.` or `-` never survives as a value. Nobody remembers to do this by hand
 *   until they find a `NaN` in a document.
 * - **Layout.** The incoming field's `type` chooses the keyboard mode, which is
 *   the whole point of having a type — a numeric field raising the numpad
 *   without anyone asking.
 *
 * `handleKey` takes a key NAME plus modifiers rather than an event, so the same
 * routing works from a DOM listener, a synthetic source, or a test. Attaching a
 * real listener stays the host's choice: this library never grabs the document.
 */
export function fieldGroup(config: {
  fields: InputField[]
  /** Told which layout to show when focus moves. Any object with `setMode`. */
  keyboard?: { setMode: (m: KeyboardMode) => void }
}): {
  readonly active: InputField | null
  focus: (field: InputField | null) => void
  /** Route a key. Returns whether it was consumed — so a host can `preventDefault`. */
  handleKey: (
    key: string,
    mods?: { ctrl?: boolean; meta?: boolean; alt?: boolean }
  ) => boolean
  /** Commit and un-focus whatever is active. */
  blur: () => void
  /**
   * Route real keyboard events from `target` (default `window`). Returns a
   * function that detaches.
   *
   * Opt-in, and the library still never grabs the document on its own — but
   * without this every flat host writes the same six lines, and a field you can
   * click into that then refuses every character is a bad first impression. It
   * was one: the theme demo shipped with an unusable field because nothing was
   * wired to it.
   */
  attach: (target?: EventTarget) => () => void
} {
  let active: InputField | null = null

  const focus = (field: InputField | null): void => {
    if (field === active) return
    const leaving = active
    /*
    Claim `active` BEFORE touching the fields.

    `setActive(true)` makes a field announce its own focus, which routes back
    here — so with the assignment at the end, the re-entrant call still saw the
    old value, recursed, and ran the whole body twice (the keyboard mode was set
    twice per focus change, which a listener counting mode changes would see as
    a flicker). Claiming first makes re-entry hit the guard above and return.
    */
    active = field
    // Settle the outgoing field before the incoming one lights up, so a refused
    // value is restored while the eye is still on it.
    leaving?.commit()
    for (const f of config.fields) f.setActive(f === field)
    if (field) config.keyboard?.setMode(field.keyboardMode)
  }

  // A field can also be focused by being TAPPED, which the field reports and the
  // group must not miss — otherwise a tap and a programmatic focus disagree
  // about who is active, and the keys go to the wrong one.
  for (const f of config.fields) {
    const prior = f.onFocus
    f.onFocus = () => {
      prior?.()
      focus(f)
    }
  }

  const api = {
    get active() {
      return active
    },
    focus,
    blur() {
      focus(null)
    },
    attach(target: EventTarget = globalThis.window) {
      const onKey = (evt: Event): void => {
        const e = evt as KeyboardEvent
        // Only claim the key if a field consumed it — otherwise Tab still
        // traverses, Escape still closes, and cmd-R still reloads.
        // Map the event's modifier flags explicitly rather than passing the
        // event — `keyIntent` takes a plain shape so it stays testable without
        // a DOM, and a KeyboardEvent does not structurally match it.
        const consumed = api.handleKey(e.key, {
          ctrl: e.ctrlKey,
          meta: e.metaKey,
          alt: e.altKey,
        })
        if (consumed) e.preventDefault()
      }
      target.addEventListener('keydown', onKey)
      return () => target.removeEventListener('keydown', onKey)
    },
    handleKey(
      key: string,
      mods: { ctrl?: boolean; meta?: boolean; alt?: boolean } = {}
    ): boolean {
      if (!active) return false
      const intent = keyIntent(key, mods)
      if (intent == null) return false
      if ('insert' in intent) active.insert(intent.insert)
      else if ('action' in intent) active.action(intent.action)
      else active.moveCaret(intent.move)
      return true
    },
  }
  return api
}

/*
THE ON-SCREEN KEYBOARD PREFERENCE IS SHARED, not per field.

Tonio: _"the glyph might also be treated as a toggle. If you click it, you start
getting the on screen keyboard automatically until you toggle it off."_ — which
is the better model: you are not asking for a keyboard once, you are telling the
app that reaching a real one is inconvenient, and that stays true for the next
field too.

It therefore cannot live on a field. Per-field state would mean toggling it on
for every field you touch, and — worse — two glyphs on one panel showing
contradictory states, which is the same "two things claiming to be the value"
fault as a slider disagreeing with its readout.

In memory for the session, deliberately: `localStorage` is not available
everywhere this renders, and a preference that silently persisted across an app's
own sessions is a decision for the app, not for a text field. `setAutoKeyboard`
is exported so an app that wants to remember it can.
*/
let autoKeyboard: boolean | null = null
const autoKeyboardListeners = new Set<() => void>()

/** Is the on-screen keyboard set to appear on its own? */
export function autoKeyboardEnabled(): boolean {
  // Unset means "not decided yet", so fall back to the sniff — a touch device
  // should not need to be told.
  if (autoKeyboard != null) return autoKeyboard
  const mm = (globalThis as { matchMedia?: (q: string) => { matches: boolean } })
    .matchMedia
  if (typeof mm !== 'function') return false
  try {
    return mm('(pointer: coarse)').matches
  } catch {
    return false
  }
}

/** Turn the on-screen keyboard on or off for every field at once. */
export function setAutoKeyboard(on: boolean): void {
  autoKeyboard = on
  for (const fn of autoKeyboardListeners) fn()
}

export function inputField(config: InputFieldOptions = {}): InputField {
  const H = config.height ?? 40
  const SIZE = config.fontSize ?? 16
  const PAD = 10
  const font: FontSpec = { size: SIZE, family: TH.FONT_FAMILY, weight: '400' }

  const fieldType: FieldType = config.type ?? 'text'
  let state: EditState = edit(config.value ?? '')
  /*
  The last value that could stand as an answer.
  
  Kept so a refused commit has somewhere to fall back to. ensemble had to build
  this per field ("reject gibberish by restoring the last good value rather
  than writing NaN into the document"); it belongs to the field, because the
  field is what knows its own type.
  */
  let lastGood = commitValueForType(config.value ?? '', fieldType) ?? ''
  let scrubFrom = 0
  let scrubBase = NaN
  let scrubbing = false
  /**
   * Quantise and clamp a scrubbed value, then render it at the step's own
   * precision — a scrub that produced `2.7000000000000006` would be technically
   * right and useless to read.
   */
  const formatScrub = (raw: number): string => {
    const step = config.step ?? 0
    let v = step > 0 ? Math.round(raw / step) * step : raw
    if (config.min != null) v = Math.max(config.min, v)
    if (config.max != null) v = Math.min(config.max, v)
    if (fieldType === 'integer') v = Math.round(v)
    /*
    Decimals come from the STEP'S OWN precision, not from a log.

    `ceil(-log10(0.25))` is 1, so a correctly-quantised 1.25 was rendered as
    "1.3" — the formatting silently un-did the quantisation, and a grid step of
    0.25 was the exact case ensemble asked for. Reading the digits off the step
    is right for every step anyone writes by hand (0.25, 22.5, 0.125).
    */
    const decimals = (n: number): number => {
      const [, frac] = String(n).split('.')
      // Exponent form (1e-7) has no fractional digits to count; fall back to
      // printing the number as-is rather than rounding it to an integer.
      return String(n).includes('e') ? -1 : frac?.length ?? 0
    }
    const dp = step > 0 ? decimals(step) : -1
    return dp >= 0 ? v.toFixed(dp) : String(v)
  }
  let width = 0
  let focused = false
  const activate = (): void => {
    if (focused) return
    focused = true
    paintRef()
    config.onFocus?.()
    api.onFocus?.()
  }
  // paint() is defined below; route through a ref so activate can be declared
  // here beside the state it guards.
  let paintRef: () => void = () => {}

  const bg = rect({ x: 0, y: 0, height: H, rx: 6, fill: TH.FIELD_BG })
  const label = text({
    x: PAD,
    y: H / 2,
    'dominant-baseline': 'middle',
    'font-size': SIZE,
    'font-family': TH.FONT_FAMILY,
    fill: TH.TEXT,
  })
  // The caret gets its own token rather than borrowing TH.ACCENT: it is the one
  // mark that must stay findable against a themed field background, and a theme
  // that tones the accent down for calm should not make the caret vanish.
  const caret = rect({
    y: 8,
    width: w3dTheme.strokeWidth,
    height: H - 16,
    fill: w3dTheme.caret,
  })
  const el = g({ 'data-w3d': 'input' }, bg, label, caret) as SVGGElement

  /** x offset of the caret, measured through the same measurer that draws. */
  /**
   * Width of the text up to code-point index `n`.
   *
   * Measured on the RENDERED `<text>` via `getSubStringLength`, not with a canvas
   * measurer. The two disagree — canvas `measureText` and SVG text layout apply
   * kerning, font fallback and sub-pixel advances differently — and because the
   * caret is placed by summing a prefix, the disagreement ACCUMULATES: the caret is
   * right at the start and drifts steadily right toward the end of the string.
   * Asking the element that actually drew the glyphs has no error to accumulate.
   *
   * Note `getSubStringLength` counts UTF-16 units, while our caret is in code
   * points, so the index has to be converted — the same emoji/accent hazard as
   * everywhere else in this pair of files.
   */
  const advanceTo = (n: number): number => {
    const before = Array.from(state.text).slice(0, n).join('')
    if (before.length === 0) return 0
    // Not rendered yet, or no SVG text metrics (happy-dom in tests) — fall back to
    // the canvas measurer, which is close enough to lay out with and exact enough
    // for a test that only checks ordering.
    const el = label as unknown as SVGTextContentElement
    if (typeof el.getSubStringLength !== 'function')
      return measureTextWidth(before, font)
    try {
      return el.getSubStringLength(0, before.length)
    } catch {
      return measureTextWidth(before, font)
    }
  }

  const caretX = (): number => PAD + advanceTo(state.caret)

  const paint = (): void => {
    const empty = state.text.length === 0
    label.textContent = empty ? config.placeholder ?? '' : state.text
    label.setAttribute('fill', empty ? TH.PLACEHOLDER : TH.TEXT)
    caret.setAttribute('x', String(caretX()))
    // Always visible, DIM when unfocused: with two fields on a panel the caret
    // is the focus indicator, and a vanished caret reads as "focus is lost and
    // unrecoverable" rather than "focus is elsewhere".
    caret.setAttribute('opacity', focused ? '1' : '0.35')
  }

  paintRef = paint

  const change = (next: EditState): void => {
    const before = state.text
    state = next
    paint()
    if (state.text !== before) {
      config.onChange?.(state.text)
      api.onChange?.(state.text)
    }
  }

  /**
   * Settle the value, or put the last good one back.
   *
   * Validation happens HERE rather than per keystroke, because `-` and `1.` are
   * legitimate things to have typed so far and illegitimate things to have
   * meant. Blocking them as you type makes `-5` and `0.5` impossible to enter
   * left to right; that asymmetry is the whole reason this is a separate step.
   */
  const commitField = (): string => {
    const settled = commitValueForType(state.text, fieldType)
    if (settled == null) {
      if (state.text !== lastGood) change(edit(lastGood))
      return lastGood
    }
    if (settled !== state.text) change(edit(settled))
    lastGood = settled
    return settled
  }

  /** Nearest caret index to an x offset — a click places the caret between glyphs. */
  const indexAtX = (x: number): number => {
    const chars = Array.from(state.text)
    let best = 0
    let bestD = Infinity
    for (let i = 0; i <= chars.length; i++) {
      // Same measurer as the caret uses, so a tap lands where the caret then draws.
      const d = Math.abs(PAD + advanceTo(i) - x)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  /*
  A KEYBOARD AFFORDANCE, always drawn — auto-open is the convenience, not the
  feature.

  Auto-opening on touch and never on a mouse is the obvious rule and it is wrong
  at the edges. Tonio: _"if you're playing on a computer plugged into a TV there
  may BE a keyboard but you'd rather not have to get it."_ The device says
  nothing about whether the keyboard is within reach — a games console, a
  laptop docked to a screen across the room, a headset with a desk somewhere
  under it. Sniffing gets those all wrong in the same direction: it decides you
  do not need what you cannot reach.

  So the glyph is always there and always works, and the sniff only chooses
  whether you ALSO get it without asking. That way the guess can be wrong
  without stranding anyone.
  */
  const kbMode = config.keyboard ?? 'auto'
  const KB_ZONE = 26
  let host: WidgetHost | null = null
  let kbOpen: { close: () => void } | null = null
  /** Latched on press: the gesture belongs to where it started. */
  let glyphPress = false
  /**
   * Did THIS gesture start in the field?
   *
   * An outside press dismisses the keyboard on `down` and then the `up` arrives
   * here with the preference switched on — which auto-reopened it, so the
   * keyboard could never be put away. A release with no matching press is not a
   * tap, and must not act.
   */
  let pressedInField = false


  /*
  The glyph SHOWS the shared preference, because it sets it.

  A toggle that does not show its state is a button that lies — and with the
  preference shared, every field's glyph has to agree, so they all repaint when
  any one of them is pressed.
  */
  const kbGlyph =
    kbMode === 'never' ? null : (svgElements.g({ 'data-kb-toggle': '' }) as SVGGElement)
  if (kbGlyph) el.appendChild(kbGlyph)

  const paintGlyph = (): void => {
    if (kbGlyph == null) return
    while (kbGlyph.firstChild) kbGlyph.removeChild(kbGlyph.firstChild)
    kbGlyph.appendChild(
      iconGlyph('keyboard', {
        color: autoKeyboardEnabled() ? TH.ACCENT : TH.PLACEHOLDER,
        size: 16,
        x: 0,
        y: Math.round((H - 16) / 2),
      })
    )
  }
  paintGlyph()
  if (kbGlyph) autoKeyboardListeners.add(paintGlyph)

  /** A keyboard needs about this much room, or it is not a keyboard. */
  const KB_MIN_HEIGHT = 150

  /**
   * The glyph's job: flip the shared preference, and make this field match it
   * immediately — turning it on should show you a keyboard now, not next time.
   */
  const toggleAutoKeyboard = (): void => {
    const next = !autoKeyboardEnabled()
    setAutoKeyboard(next)
    if (next && kbOpen == null) openKeyboard()
    else if (!next && kbOpen != null) openKeyboard() // closes, see below
  }

  const openKeyboard = (): void => {
    if (kbMode === 'never') return
    if (kbOpen != null) {
      // Tapping the glyph again puts it away — a summoned panel you cannot
      // dismiss the same way you called it is a panel in your way.
      kbOpen.close()
      kbOpen = null
      return
    }
    const kb = keyboard({
      mode: api.keyboardMode,
      onKey: (k) => api.insert(k),
      onAction: (a) => api.action(a),
      onCaretMove: (d) => api.moveCaret(d),
    })

    // The app's own answer wins: it is the only thing that knows whether a
    // plane, a sibling or a surface is right here.
    if (config.openKeyboard != null) {
      const close = config.openKeyboard(api)
      kbOpen = { close: () => close?.() }
      return
    }

    /*
    Otherwise the panel overlay — but ONLY with room to land below.

    `showPopup` caps to the panel's bounds, so on a short panel this produced a
    keyboard squeezed to the panel's height and placed ON TOP of the field. A
    keyboard covering what it types into is the one placement that cannot be
    allowed, and half a keyboard is not a degraded mode.

    Refusing leaves the glyph visibly doing nothing, which is poor — but it is
    honest, and `openKeyboard` is the documented way out. Sized from the ROOM
    below the field, not from the panel, since that is what it has to fit in.
    */
    const roomBelow = (host?.bounds?.height ?? 0) - (host?.top ?? 0) - H
    if (host == null || roomBelow < KB_MIN_HEIGHT) return
    kbOpen = host.showPopup(
      {
        anchor: { x: 0, y: 0, width, height: H },
        side: 'below',
        // FIT THE HOST, don't ask for a nominal 360: a wider keyboard than the
        // panel is simply clipped at the right edge, so the last column of keys
        // — enter, backspace — becomes unreachable. Measured: 360 in a 320 panel
        // lost a column in both the flat and the textured view.
        width: Math.min(360, host.bounds.width),
        maxHeight: roomBelow,
      },
      kb
    )
  }

  const api: InputField = {
    el,
    setHost(h) {
      host = h
    },
    get value() {
      return state.text
    },
    layout(w: number) {
      width = w
      bg.setAttribute('width', String(w))
      kbGlyph?.setAttribute(
        'transform',
        `translate(${Math.round(w - KB_ZONE + 4)}, 0)`
      )
      paint()
      return H
    },
    handle(kind: PointerKind, x: number) {
      /*
      DRAG TO SCRUB, TAP TO TYPE — and the difference is a threshold, not a mode.

      A press that never moves places the caret, which is what a text field must
      do; a press that travels scrubs. Deciding on movement rather than on a
      modifier or a separate hit zone means the two never have to be aimed at
      differently, which matters most in XR where aiming is the expensive part.
      */
      /*
      The glyph zone is not the field. A press there must not place a caret and
      must not start a scrub — a numeric field would otherwise leap as you
      reached for the keyboard, which is not something you can undo by letting
      go.

      The gesture belongs to where it BEGAN, so this latches on the press. The
      first version tested the live x and broke scrubbing twice over: a drag that
      merely ENDED near the right edge was swallowed, and before `layout()` ran
      `width` was 0, so `x >= width - KB_ZONE` was true everywhere and the whole
      field became the glyph. Both caught by the existing scrub tests, which is
      the argument for having had them.
      */
      if (kind === 'down') {
        glyphPress =
          kbGlyph != null && width > 0 && x >= width - KB_ZONE
        if (glyphPress) return
      }
      if (glyphPress) {
        if (kind === 'up') {
          glyphPress = false
          toggleAutoKeyboard()
        } else if (kind === 'leave') {
          glyphPress = false
        }
        return
      }
      if (kind === 'down') {
        pressedInField = true
        scrubFrom = x
        scrubBase = Number(state.text)
        scrubbing = false
        activate()
        change(moveTo(state, indexAtX(x)))
        return
      }
      const canScrub = (config.scrub ?? 0) > 0 && Number.isFinite(scrubBase)
      if (kind === 'move' && canScrub) {
        const dx = x - scrubFrom
        if (!scrubbing && Math.abs(dx) < SCRUB_SLOP) return
        scrubbing = true
        const raw = scrubBase + dx * (config.scrub as number)
        change(edit(formatScrub(raw)))
        return
      }
      if (kind === 'up' && scrubbing) {
        scrubbing = false
        commitField()
        return
      }
      /*
      A TAP in the field auto-opens — but only where the sniff says a hardware
      keyboard probably is not to hand.

      `always` is what an XR panel passes; `auto` opens on a coarse pointer and
      otherwise leaves it to the glyph. A field that sprouted a keyboard on every
      desktop click would be worse than one that never did, which is why the
      default errs toward not.

      Guarded on `!scrubbing` so a scrub that ends inside the field does not also
      summon a panel over what you were just adjusting.
      */
      if (kind === 'up') {
        const wasTap = pressedInField
        pressedInField = false
        // `always` is what an XR panel passes; `auto` follows the shared
        // preference, which the glyph sets and a touch device seeds.
        if (
          wasTap &&
          kbOpen == null &&
          (kbMode === 'always' || (kbMode === 'auto' && autoKeyboardEnabled()))
        ) {
          openKeyboard()
        }
      }
    },
    insert(str: string) {
      activate()
      change(editInsert(state, str))
    },
    action(a: KeyAction) {
      activate()
      if (a === 'backspace') change(editBackspace(state))
      else if (a === 'space') change(editInsert(state, ' '))
      else if (a === 'enter') {
        // Settle BEFORE reporting: a handler receiving `1.` or `-` from a
        // number field would have to re-do this work, and every handler would
        // have to remember to.
        const kept = commitField()
        config.onEnter?.(kept)
      }
      // shift / mode / done are the keyboard's own business
    },
    get type() {
      return fieldType
    },
    get keyboardMode() {
      return modeForType(fieldType)
    },
    isValid() {
      return isValidForType(state.text, fieldType)
    },
    commit: commitField,
    setValue(v: string) {
      change(edit(v))
    },
    moveCaret(delta: number) {
      activate()
      change(editMoveCaret(state, delta))
    },
    focusMove(dx: number, _dy: number) {
      if (dx === 0) return false // vertical → let focus leave the field
      activate()
      change(editMoveCaret(state, dx > 0 ? 1 : -1))
      return true
    },
    focusClear() {
      // D-pad focus moved on — but the text still lands HERE, so the caret
      // stays lit. Only `setActive(false)` (the host activating another field)
      // dims it: "who has the D-pad" and "where text goes" are different facts.
    },
    setActive(v: boolean) {
      if (v) activate()
      else {
        focused = false
        paint()
      }
    },
    get active() {
      return focused
    },
    setState(s) {
      // Gaining the host's focus makes this the receiver; LOSING it doesn't
      // un-receive (tapping keyboard keys moves box focus to the keyboard while
      // the text keeps landing here).
      if (s.focused) activate()
    },
  }
  void width
  return api
}

/**
 * The on-screen keyboard. Emits `onKey(text)` for inserting keys and `onAction()`
 * for the rest; it owns its own `mode` and `shift` state.
 */
export interface Keyboard extends Widget3d {
  readonly mode: KeyboardMode
  setMode: (m: KeyboardMode) => void
  /** The key D-pad focus is on, or `null` — exposed for tests and debug readouts. */
  readonly focusedKey: KeyRect | null
  /**
   * Inner focus traversal (the {@link Widget3d} protocol, concrete here): the
   * keyboard is ONE box child but MANY focus stops. Returns `false` when the move
   * runs off the edge of the keys, so the host box moves focus on to the next
   * widget — otherwise the D-pad would be trapped in here forever.
   */
  focusMove: (dx: number, dy: number) => boolean
  /** Press the focused key (Enter / A). */
  focusActivate: () => void
  /** Drop key focus (the host's focus moved elsewhere). */
  focusClear: () => void
}

export interface KeyboardOptions {
  mode?: KeyboardMode
  keyHeight?: number
  gap?: number
  /** ms to hold before the accent popup opens — and before the spacebar becomes a
   * caret trackpad. */
  holdMs?: number
  /**
   * Px of travel per caret step once the **spacebar has become a trackpad** (hold
   * it, then slide). Default 12 — about a character width, so the caret tracks
   * your finger instead of racing it.
   */
  caretStepPx?: number
  onKey?: (text: string) => void
  onAction?: (action: KeyAction) => void
  /** Caret nudged by the spacebar-as-trackpad gesture (±1 per step). */
  onCaretMove?: (delta: number) => void
}

export function keyboard(config: KeyboardOptions = {}): Keyboard {
  const KH = config.keyHeight ?? 38
  const GAP = config.gap ?? 5
  const HOLD = config.holdMs ?? 350
  const CARET_STEP = config.caretStepPx ?? 12

  let mode: KeyboardMode = config.mode ?? 'alpha'
  let shift = false
  let width = 0
  let rects: KeyRect[] = []

  const keysLayer = g({ 'data-kb': 'keys' }) as SVGGElement
  // Focus ring in its own layer, between keys and popup, so repainting the keys
  // (mode/shift relayout) doesn't throw it away.
  const focusRing = rect({
    'data-kb-focus': '',
    fill: 'none',
    stroke: TH.ACCENT,
    'stroke-width': 2,
    rx: 8,
    visibility: 'hidden',
  }) as SVGRectElement
  const focusLayer = g({ 'data-kb': 'focus' }, focusRing) as SVGGElement
  const popupLayer = g({ 'data-kb': 'popup' }) as SVGGElement
  const el = g(
    { 'data-w3d': 'keyboard' },
    keysLayer,
    focusLayer,
    popupLayer
  ) as SVGGElement

  /** Index into `rects` of the D-pad-focused key; -1 = no key focus. */
  let focusIdx = -1

  /** Tint a key while it's held — a key with no down-state feels dead under a finger. */
  const keyTint = (r: KeyRect, on: boolean): void => {
    const i = rects.indexOf(r)
    const cell = keysLayer.children[i] as SVGGElement | undefined
    const bg = cell?.firstChild as SVGRectElement | undefined
    if (!bg) return
    bg.setAttribute(
      'fill',
      on ? TH.KEY_DOWN : r.key.action ? TH.KEY_ACTION_BG : TH.KEY_BG
    )
  }

  const paintFocus = (): void => {
    const r = rects[focusIdx]
    if (!r) {
      focusRing.setAttribute('visibility', 'hidden')
      return
    }
    focusRing.setAttribute('x', String(r.x - 2))
    focusRing.setAttribute('y', String(r.y - 2))
    focusRing.setAttribute('width', String(r.width + 4))
    focusRing.setAttribute('height', String(r.height + 4))
    focusRing.setAttribute('visibility', 'visible')
  }

  /**
   * A popup left open after the finger lifted, waiting to be tapped. Distinct from
   * `press` (which is an in-flight gesture) — this one has no pointer on it.
   */
  let sticky: {
    rect: KeyRect
    accents: string[]
    cells: SVGRectElement[]
  } | null = null

  /** Live spacebar-as-trackpad gesture: where it last was, and sub-step travel. */
  let caretDrag: { lastX: number; accum: number; moved: boolean } | null = null

  /** The key currently pressed-tinted, as an index into `rects`; -1 = none. */
  let pressedVis = -1

  /*
  Pressed-key feedback. On the FLAT overlay a click has ambient confirmation
  (the OS cursor, the field updating in your focal area) — but on a textured
  plane in 3D the field may be small, cropped, or outside where you're looking,
  and a keyboard whose keys don't visibly press reads as a DEAD keyboard even
  while it's typing perfectly (reported from device, and the session's typing
  was sitting in the field the whole time).
  */
  // ONE primitive writes a key's fill (`null` = its resting color); the tint
  // policies below are one-liners over it — the review found three sibling
  // helpers each re-deriving the cell/bg lookup.
  const setKeyFill = (i: number, fill: string | null): void => {
    const r = rects[i]
    const cell = keysLayer.children[i] as SVGGElement | undefined
    const bg = cell?.firstChild as SVGRectElement | undefined
    if (r && bg) bg.setAttribute('fill', fill ?? keyFill(r))
  }

  const pressVis = (i: number, on: boolean): void =>
    setKeyFill(i, on ? TH.KEY_DOWN : null)

  const endPressVis = (): void => {
    if (pressedVis >= 0) {
      pressVis(pressedVis, false)
      pressedVis = -1
    }
  }

  /** Tint the spacebar while it's acting as a trackpad, so the mode is visible. */
  const spaceHint = (on: boolean): void => {
    const i = rects.findIndex((r) => r.key.action === 'space')
    if (i >= 0) setKeyFill(i, on ? TH.ACCENT : null)
  }

  // The in-flight press. `accents` is non-empty once the popup is open.
  let press: {
    rect: KeyRect
    timer: ReturnType<typeof setTimeout> | null
    accents: string[]
    pick: number
    cells: SVGRectElement[]
  } | null = null

  const keyFill = (r: KeyRect): string =>
    r.key.action ? TH.KEY_ACTION_BG : TH.KEY_BG

  const paintKeys = (): void => {
    keysLayer.replaceChildren()
    for (const r of rects) {
      const bg = rect({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        rx: 6,
        fill: keyFill(r),
      })
      const lbl = text({
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': r.key.action ? 13 : 16,
        'font-family': TH.FONT_FAMILY,
        fill: TH.TEXT,
      })
      lbl.textContent = r.key.label
      const cell = g({ 'data-key': r.key.label }, bg, lbl) as SVGGElement
      /*
      Discoverability signifier: hold-capable keys carry a faint glyph in the
      corner — ▾ for a long-press accent strip, ↔ for the spacebar's
      hold-to-drag caret. Without it the gestures are pure folklore: nothing
      distinguishes `o` from `q`, and nothing at all suggests holding SPACE.
      Faint on purpose — it should read at a glance you aim at it, not add
      noise to the whole board. (`spaceHint`'s accent tint while the trackpad
      is ACTIVE is separate — this is the invitation, that's the confirmation.)
      */
      const hint =
        r.key.value && accentsFor(r.key.value).length > 0
          ? '▾'
          : r.key.action === 'space' && config.onCaretMove
          ? '↔'
          : ''
      if (hint) {
        const h = text({
          'data-kb-hint': hint,
          x: r.x + r.width - 8,
          y: r.y + r.height - 6,
          'text-anchor': 'middle',
          'font-size': 12,
          'font-family': TH.FONT_FAMILY,
          fill: TH.TEXT,
          opacity: 0.5,
        })
        h.textContent = hint
        cell.append(h)
      }
      keysLayer.append(cell)
    }
  }

  const relayout = (): void => {
    rects = keyRects(keyLayout(mode, shift), {
      width,
      keyHeight: KH,
      gap: GAP,
    })
    paintKeys()
    // A mode switch can shrink the key count; keep focus on a real key (same
    // index ≈ same place on the board, which is what a D-pad user expects).
    if (focusIdx >= rects.length) focusIdx = rects.length - 1
    paintFocus()
  }

  const closePopup = (): void => {
    popupLayer.replaceChildren()
    if (press) {
      press.accents = []
      press.cells = []
    }
  }

  /** Open the accent popup above the held key. */
  const openPopup = (r: KeyRect, accents: string[]): void => {
    const CW = 32
    const CH = 36
    const w = accents.length * CW + 8
    // Keep it on-surface: centre over the key, then clamp into the keyboard width.
    let x = r.x + r.width / 2 - w / 2
    x = Math.max(0, Math.min(width - w, x))
    /*
    The strip must stay INSIDE the keyboard's own rect. It renders fine outside
    (the layers aren't clipped) but the host box routes pointers by child rect —
    so a strip that pokes above the keyboard is drawn over the NEIGHBOURING
    widget, and tapping it feeds the tap to that widget instead. Concretely: the
    top row is qwertyuiop — every vowel — and its strip landed on the text
    field, which ate the tap. So: above the key, clamped to the top edge; and if
    clamping would sit the strip on the pressed key itself (top row), open
    below the key instead.
    */
    let y = Math.max(0, r.y - CH - 10)
    if (y + CH + 8 > r.y + r.height / 2) y = r.y + r.height + 10
    const cells: SVGRectElement[] = []
    const kids: SVGElement[] = [
      rect({
        x,
        y,
        width: w,
        height: CH + 8,
        rx: 8,
        fill: TH.PANEL_BG,
        stroke: TH.KEY_DOWN,
      }),
    ]
    accents.forEach((c, i) => {
      const cx = x + 4 + i * CW
      const cell = rect({
        x: cx,
        y: y + 4,
        width: CW - 2,
        height: CH,
        rx: 5,
        fill: TH.KEY_BG,
      })
      cells.push(cell as SVGRectElement)
      const lbl = text({
        x: cx + (CW - 2) / 2,
        y: y + 4 + CH / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': 17,
        'font-family': TH.FONT_FAMILY,
        fill: TH.TEXT,
      })
      lbl.textContent = c
      kids.push(cell, lbl)
    })
    popupLayer.replaceChildren(...kids)
    if (press) {
      press.accents = accents
      press.cells = cells
      press.pick = -1
    }
  }

  /** Highlight the accent under the pointer (the drag half of press-hold-drag). */
  /*
  The accent-strip hit mapping, in ONE place — band-with-slack + x index, not
  strict cell containment (2px cell gaps + edge pixels let visually-on-strip
  taps fall through to the key behind; a VR ray hits this constantly). The
  review caught two drifted copies of this claiming to be "the same mapping"
  (SLACK 8 vs 10) — the slack is now one constant, generous side.
  */
  const ACCENT_SLACK = 10
  const accentIndexAt = (
    cells: SVGRectElement[],
    count: number,
    x: number,
    y: number
  ): number => {
    if (cells.length === 0) return -1
    const CW = 32
    const x0 = Number(cells[0].getAttribute('x'))
    const y0 = Number(cells[0].getAttribute('y'))
    const ch = Number(cells[0].getAttribute('height'))
    if (y < y0 - ACCENT_SLACK || y > y0 + ch + ACCENT_SLACK) return -1
    const i = Math.floor((x - x0) / CW)
    return i >= 0 && i < count ? i : -1
  }

  const trackPopup = (x: number, y: number): void => {
    if (!press || press.accents.length === 0) return
    // In-the-strip only (band + slack): an x-only test read "hovering the HELD
    // KEY" as a pick, so ray jitter picked accents you never chose.
    const pick = accentIndexAt(press.cells, press.accents.length, x, y)
    if (pick === press.pick) return
    press.pick = pick
    press.cells.forEach((c, j) =>
      c.setAttribute('fill', j === pick ? TH.ACCENT : TH.KEY_BG)
    )
  }

  const fireKey = (r: KeyRect): void => {
    const k = r.key
    if (k.value !== undefined) {
      config.onKey?.(k.value)
      // A shift is one-shot, like a phone: type A, then keep typing lower case.
      if (shift) {
        shift = false
        relayout()
      }
      return
    }
    if (k.action === 'shift') {
      shift = !shift
      relayout()
      return
    }
    if (k.action === 'mode' && k.mode) {
      mode = k.mode
      shift = false
      relayout()
      return
    }
    if (k.action) config.onAction?.(k.action)
  }

  const clearTimer = (): void => {
    if (press?.timer) {
      clearTimeout(press.timer)
      press.timer = null
    }
  }

  const api: Keyboard = {
    el,
    get mode() {
      return mode
    },
    setMode(m: KeyboardMode) {
      mode = m
      relayout()
    },
    layout(w: number) {
      width = w
      relayout()
      return keyboardHeight(keyLayout(mode, shift).length, KH, GAP)
    },
    handle(kind: PointerKind, x: number, y: number) {
      if (kind === 'down') {
        /*
        SELF-HEAL FIRST: a fresh down while a gesture is still "live" means the
        previous up never arrived (observed with scene-picked input — a lost up
        left a key tinted, and worse, an orphaned SPACE press had become a caret
        drag, so the NEXT click's up read as "end of drag: type nothing" — the
        mystifying first-click-dead). Flush the stale gesture and process this
        down normally, so a lost up costs nothing rather than wedging the board.
        (`sticky` is not stale state — it is deliberately waiting for this tap.)
        */
        if (press || caretDrag) {
          clearTimer()
          endPressVis()
          if (caretDrag) {
            spaceHint(false)
            caretDrag = null
          }
          closePopup()
          press = null
        }
        // A strip left open by a lifted finger takes the next tap, before any key
        // does — otherwise the accents would be sitting there un-tappable, with the
        // keys behind them stealing the press.
        if (sticky) {
          /*
          Same GENEROUS mapping as the slide gesture (band + x index), not
          strict cell containment: the strip's cells have 2px gaps and edge
          pixels, and a strict test let a tap that was visually ON the strip
          fall through to the KEY BEHIND it — routine with a ray, where a
          "click on ö" registering as the key under the strip reads as madness.
          */
          const i = accentIndexAt(sticky.cells, sticky.accents.length, x, y)
          if (i >= 0) {
            config.onKey?.(sticky.accents[i])
          } else {
            // Tapping the key that OPENED the strip types its plain character —
            // you held for the alternatives, changed your mind, and asked for
            // the base letter. Dismiss-only here read as "nothing happens" on a
            // real device. Anywhere ELSE the tap is spent on dismissing rather
            // than also typing whatever was under it, as a popup ought to.
            const r = keyAt(rects, x, y)
            if (r === sticky.rect) fireKey(r)
          }
          closePopup()
          sticky = null
          return
        }
        const r = keyAt(rects, x, y)
        if (!r) return
        // Focus follows the press, as the table does: the ring lands where you
        // clicked, so Space/Enter or a D-pad can immediately act on it. (First
        // shipped as relocate-only to keep rings out of pointer typing, but on
        // a real device the missing ring read as "focus is broken", and it
        // orphaned the click-then-Space flow — visible beats quiet.)
        focusIdx = rects.indexOf(r)
        paintFocus()
        press = { rect: r, timer: null, accents: [], pick: -1, cells: [] }
        pressedVis = rects.indexOf(r)
        pressVis(pressedVis, true)
        const alts = r.key.value ? accentsFor(r.key.value) : []
        if (alts.length > 0) {
          press.timer = setTimeout(() => {
            if (press) openPopup(r, alts)
          }, HOLD)
        } else if (r.key.action === 'space' && config.onCaretMove) {
          /*
          Hold the SPACEBAR and it becomes a caret trackpad — slide to move the
          insertion point. Space is the right home for it: it's the widest key (so
          there's room to travel) and the only one whose long-press has no other
          meaning, unlike a letter's accents.

          It also solves a problem the field can't: tapping to place a caret works
          well with a mouse but is fiddly with a fingertip, and impossible to do
          precisely with a VR ray at distance. Dragging is precise at any scale.

          THE DRAG DELIBERATELY CONTINUES OUTSIDE THE KEY — and outside the keyboard
          entirely — which is how iOS does it and is most of why it feels good: a
          spacebar-width gesture would give you a spacebar's worth of travel. That
          works because `move` is handled off the accumulated dx WITHOUT
          hit-testing, and because a raw `BoxChild` CAPTURES the pointer (see
          widget-box) — the same mechanism the accent picker needed, since its popup
          also opens away from the key you pressed.
          */
          press.timer = setTimeout(() => {
            if (press) {
              caretDrag = { lastX: x, accum: 0, moved: false }
              spaceHint(true)
            }
          }, HOLD)
        }
        return
      }
      if (!press) return
      if (kind === 'move' && caretDrag) {
        // Accumulate travel and emit whole steps, so slow movement still tracks
        // rather than being rounded away.
        caretDrag.accum += x - caretDrag.lastX
        caretDrag.lastX = x
        while (Math.abs(caretDrag.accum) >= CARET_STEP) {
          const dir = caretDrag.accum > 0 ? 1 : -1
          config.onCaretMove?.(dir)
          caretDrag.accum -= dir * CARET_STEP
          caretDrag.moved = true
        }
        return
      }
      if (kind === 'move') {
        if (press.accents.length > 0) trackPopup(x, y)
        // Sliding off the key before the popup opens cancels the hold — otherwise a
        // scroll-ish drag would pop an accent picker you didn't ask for.
        else if (keyAt(rects, x, y) !== press.rect) clearTimer()
        return
      }
      if (kind === 'up' || kind === 'leave') keyTint(press.rect, false)
      if (kind === 'up' && caretDrag) {
        clearTimer()
        endPressVis()
        spaceHint(false)
        /*
        A drag that MOVED the caret does not also type a space. But a hold that
        never moved it is just a SLOW TAP — and on a headset trigger, an
        ordinary press routinely outlasts the hold timer, so treating it as "a
        drag that went nowhere: type nothing" made the spacebar feel broken
        (space appearing only sometimes, reported from device). No movement, no
        drag — the space types.
        */
        const wasTap =
          !caretDrag.moved && press && keyAt(rects, x, y) === press.rect
        caretDrag = null
        if (wasTap && press) fireKey(press.rect)
        press = null
        return
      }
      if (kind === 'up') {
        clearTimer()
        // Restore BEFORE fireKey — a shift/mode key relayouts, which rebuilds
        // the cells this index points into.
        endPressVis()
        if (press.accents.length > 0) {
          if (press.pick >= 0) {
            // Slid onto an accent and released — the mouse/VR-ray gesture.
            config.onKey?.(press.accents[press.pick])
            closePopup()
          } else {
            /*
            Released WITHOUT having slid onto one — so the popup STAYS OPEN and the
            next tap picks from it.

            On touch this is the whole gesture: you press, the strip appears under
            your fingertip where you cannot see it, and you lift to look. Closing on
            release (and typing the plain letter) made the accents unreachable by
            finger — reported from a real device. Sticky costs nothing for pointer
            users, who slide and never land here.

            Deliberately NOT typing the base character on this release either: you
            asked for the alternatives, so inserting `o` and closing would be
            answering a question you didn't ask. Tap the key again for the plain one.
            */
            sticky = {
              rect: press.rect,
              accents: press.accents,
              cells: press.cells,
            }
          }
        } else if (keyAt(rects, x, y) === press.rect) {
          // A tap RELOCATES focus that is already active, so switching pointer →
          // D-pad resumes from what you touched. It does NOT summon the ring when
          // focus is absent: typing is a stream of taps, and a ring chasing every
          // keystroke is noise. Press feedback (keyTint) is what a tap gets instead.
          if (focusIdx >= 0) {
            focusIdx = rects.indexOf(press.rect)
            paintFocus()
          }
          fireKey(press.rect)
        }
        press = null
        return
      }
      // leave — the gesture was cancelled outright (pointer left the surface, or the
      // host took the capture away). End the caret drag too, or the spacebar stays
      // tinted and the next press resumes a gesture the user abandoned.
      clearTimer()
      endPressVis()
      if (caretDrag) {
        spaceHint(false)
        caretDrag = null
      }
      closePopup()
      press = null
    },
    get focusedKey() {
      return rects[focusIdx] ?? null
    },
    focusMove(dx: number, dy: number) {
      if (focusIdx < 0) {
        // Entering: seed focus at the edge matching the direction of travel —
        // arriving downward (from the field) lands on the top row, not wherever
        // focus happened to be last.
        const kbH = keyboardHeight(keyLayout(mode, shift).length, KH, GAP)
        const ex = dx > 0 ? 0 : dx < 0 ? width : width / 2
        const ey = dy > 0 ? 0 : dy < 0 ? kbH : kbH / 2
        let bestD = Infinity
        for (let i = 0; i < rects.length; i++) {
          const cx = rects[i].x + rects[i].width / 2 - ex
          const cy = rects[i].y + rects[i].height / 2 - ey
          const d = cx * cx + cy * cy
          if (d < bestD) {
            bestD = d
            focusIdx = i
          }
        }
        paintFocus()
        return focusIdx >= 0
      }
      // KeyRects are structurally FlowBoxes, so the box's own D-pad geometry
      // applies unchanged. Null = ran off the edge.
      const next = nearestInDirection(rects, focusIdx, { dx, dy })
      if (next != null) {
        focusIdx = next
        paintFocus()
        return true
      }
      /*
      Off the LEFT or RIGHT edge → wrap within the row rather than escaping.

      Vertical escape is the useful one (up from the top row reaches the field), but
      horizontal escape isn't: rows are ragged, so running off the end of `asdfghjkl`
      would drop you somewhere arbitrary in a neighbouring row — or out of the
      keyboard entirely, which is never what you meant by "right". Wrapping keeps a
      row a closed loop, so holding right walks it and comes back round.
      */
      if (dx !== 0) {
        const row = rects.filter((r) => r.y === rects[focusIdx].y)
        if (row.length > 1) {
          const wrapped = dx > 0 ? row[0] : row[row.length - 1]
          focusIdx = rects.indexOf(wrapped)
          paintFocus()
          return true
        }
      }
      return false
    },
    focusActivate() {
      const r = rects[focusIdx]
      if (r) fireKey(r)
    },
    focusClear() {
      focusIdx = -1
      paintFocus()
    },
  }
  return api
}
