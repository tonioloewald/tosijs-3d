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

Tap the keys. `?123` switches to symbols, `⇧` shifts.

**Hold `o`** (or `a e i n s u y z c`) for the accents. Two ways to take one, because
touch and pointer want different things: **slide onto it and release**, or **lift your
finger** — the strip stays up and you tap the one you want. Lifting used to dismiss it,
which made the accents unreachable by finger.

**Hold the spacebar and slide** to drag the caret through the text. The drag continues
outside the key and outside the keyboard entirely (as iOS does) — a spacebar-width
gesture would only buy you a spacebar of travel.

**D-pad / arrow keys** (click the demo once so it has keyboard focus): the keyboard is
one panel row but MANY focus stops — it implements the inner-focus protocol
(`focusMove` returns `false` when a move runs off the edge), so arrows walk key to
key, arriving on the edge you entered from, and **escaping off the top onto the text
field** rather than trapping the D-pad forever. `Enter` presses the focused key.

There is no completion/suggestion strip yet, and the interesting question isn't *whether*
but *from what*: see CONVERSATION-DESIGN.md → "Keyword dialogue", where the conclusion is
that a known, relevant word should be **clickable rather than typed**, so typing's
fallback role points completion at the player's own vocabulary rather than the world's.

```js
import { surface, widgetBox, box, textBlock, inputField, keyboard, svgPoint } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 380
const H = 300

const field = inputField({ value: 'hold o for ö', placeholder: 'type something…' })
const kb = keyboard({
  onKey: (ch) => field.insert(ch),
  onAction: (a) => field.action(a),
  // Hold the SPACEBAR and slide to move the caret — and the drag keeps working
  // outside the key, and outside the keyboard, which is what makes it usable.
  onCaretMove: (d) => field.moveCaret(d),
})

const s = surface({ width: W, height: H })
s.setContent(
  box(
    { width: W, height: H, padding: 12, gap: 10, background: '#12151c' },
    textBlock('SVG keyboard', { font: { size: 15, weight: 600 }, color: '#e6e6e6' })
  )
)
const panel = widgetBox(
  { width: 364, padding: 8, gap: 8, background: '#0e1116' },
  [field, kb]
)
s.openPanel({ x: 8, y: 44 }, panel, { title: 'Text entry', draggable: true })

const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: 0 }, s.el)
// D-pad traversal — arrows walk the keys, Enter presses, Escape drops focus.
const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
svgEl.addEventListener('keydown', (e) => {
  if (dirs[e.key]) { panel.focusMove(...dirs[e.key]); e.preventDefault() }
  else if (e.key === 'Enter') { panel.focusActivate(); e.preventDefault() }
  else if (e.key === 'Escape') panel.focusBack()
})
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
*/
/*{ "parent": "UI" }*/

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
import type { Widget3d, PointerKind } from './widgets3d'

const { g, rect, text } = svgElements

const cssVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}
const TEXT = cssVar('--w3d-text', '#f0f0f0')
const MUTED = cssVar('--w3d-muted', '#9aa0a6')
const ACCENT = cssVar('--w3d-accent', '#39c5ff')
const KEY_BG = cssVar('--w3d-button-bg', '#2a2f3a')
const KEY_ACTION_BG = cssVar('--w3d-track', '#3a3f4a')
const KEY_DOWN = cssVar('--w3d-button-active', '#3a4150')
const FIELD_BG = cssVar('--w3d-row-bg', 'rgba(255,255,255,0.05)')
const PANEL_BG = cssVar('--w3d-panel-bg', 'rgba(20,22,28,0.94)')
const FONT_FAMILY = cssVar('--w3d-font-family', 'system-ui, sans-serif')

/** A text field driven by the pure edit model. Tap to place the caret. */
export interface InputField extends Widget3d {
  /** Current text. */
  readonly value: string
  /** Insert text at the caret (what a key tap calls). */
  insert: (str: string) => void
  /** Apply a non-inserting key. */
  action: (a: KeyAction) => void
  /** Replace the value. */
  setValue: (v: string) => void
  /** Nudge the caret by `delta` code points — what the spacebar trackpad drives. */
  moveCaret: (delta: number) => void
  /** Called whenever the text changes. */
  onChange?: (value: string) => void
}

export function inputField(
  config: {
    value?: string
    placeholder?: string
    fontSize?: number
    height?: number
    onChange?: (value: string) => void
    onEnter?: (value: string) => void
  } = {}
): InputField {
  const H = config.height ?? 40
  const SIZE = config.fontSize ?? 16
  const PAD = 10
  const font: FontSpec = { size: SIZE, family: FONT_FAMILY, weight: '400' }

  let state: EditState = edit(config.value ?? '')
  let width = 0
  let focused = false

  const bg = rect({ x: 0, y: 0, height: H, rx: 6, fill: FIELD_BG })
  const label = text({
    x: PAD,
    y: H / 2,
    'dominant-baseline': 'middle',
    'font-size': SIZE,
    'font-family': FONT_FAMILY,
    fill: TEXT,
  })
  const caret = rect({ y: 8, width: 2, height: H - 16, fill: ACCENT })
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
    label.setAttribute('fill', empty ? MUTED : TEXT)
    caret.setAttribute('x', String(caretX()))
    caret.setAttribute('opacity', focused ? '1' : '0')
  }

  const change = (next: EditState): void => {
    const before = state.text
    state = next
    paint()
    if (state.text !== before) {
      config.onChange?.(state.text)
      api.onChange?.(state.text)
    }
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

  const api: InputField = {
    el,
    get value() {
      return state.text
    },
    layout(w: number) {
      width = w
      bg.setAttribute('width', String(w))
      paint()
      return H
    },
    handle(kind: PointerKind, x: number) {
      if (kind === 'down') {
        focused = true
        change(moveTo(state, indexAtX(x)))
      }
    },
    insert(str: string) {
      focused = true
      change(editInsert(state, str))
    },
    action(a: KeyAction) {
      focused = true
      if (a === 'backspace') change(editBackspace(state))
      else if (a === 'space') change(editInsert(state, ' '))
      else if (a === 'enter') config.onEnter?.(state.text)
      // shift / mode / done are the keyboard's own business
    },
    setValue(v: string) {
      change(edit(v))
    },
    moveCaret(delta: number) {
      focused = true
      change(editMoveCaret(state, delta))
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

export function keyboard(
  config: {
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
  } = {}
): Keyboard {
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
    stroke: ACCENT,
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
  let caretDrag: { lastX: number; accum: number } | null = null

  /** Tint the spacebar while it's acting as a trackpad, so the mode is visible. */
  const spaceHint = (on: boolean): void => {
    const i = rects.findIndex((r) => r.key.action === 'space')
    if (i < 0) return
    const cell = keysLayer.children[i] as SVGGElement | undefined
    const bg = cell?.firstChild as SVGRectElement | undefined
    bg?.setAttribute('fill', on ? ACCENT : KEY_ACTION_BG)
  }

  /** Index of the accent cell under (x,y), or -1. */
  const cellAt = (cells: SVGRectElement[], x: number, y: number): number => {
    for (let i = 0; i < cells.length; i++) {
      const cx = Number(cells[i].getAttribute('x'))
      const cy = Number(cells[i].getAttribute('y'))
      const w = Number(cells[i].getAttribute('width'))
      const h = Number(cells[i].getAttribute('height'))
      if (x >= cx && x <= cx + w && y >= cy && y <= cy + h) return i
    }
    return -1
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
    r.key.action ? KEY_ACTION_BG : KEY_BG

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
        'font-family': FONT_FAMILY,
        fill: TEXT,
      })
      lbl.textContent = r.key.label
      keysLayer.append(g({ 'data-key': r.key.label }, bg, lbl))
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
        fill: PANEL_BG,
        stroke: KEY_DOWN,
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
        fill: KEY_BG,
      })
      cells.push(cell as SVGRectElement)
      const lbl = text({
        x: cx + (CW - 2) / 2,
        y: y + 4 + CH / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': 17,
        'font-family': FONT_FAMILY,
        fill: TEXT,
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

  /** Highlight the accent under x (the drag half of press-hold-drag). */
  const trackPopup = (x: number): void => {
    if (!press || press.accents.length === 0) return
    const CW = 32
    const first = press.cells[0]
    const x0 = Number(first.getAttribute('x'))
    const i = Math.floor((x - x0) / CW)
    const pick = i >= 0 && i < press.accents.length ? i : -1
    if (pick === press.pick) return
    press.pick = pick
    press.cells.forEach((c, j) =>
      c.setAttribute('fill', j === pick ? ACCENT : KEY_BG)
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
        // A strip left open by a lifted finger takes the next tap, before any key
        // does — otherwise the accents would be sitting there un-tappable, with the
        // keys behind them stealing the press.
        if (sticky) {
          const i = cellAt(sticky.cells, x, y)
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
        // A tap RELOCATES an active key focus (so switching pointer → D-pad
        // resumes from where you last touched) but doesn't summon the ring for a
        // pure pointer user — unlike the table, typing is a stream of taps and a
        // ring chasing every keystroke is noise.
        if (focusIdx >= 0) {
          focusIdx = rects.indexOf(r)
          paintFocus()
        }
        press = { rect: r, timer: null, accents: [], pick: -1, cells: [] }
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
              caretDrag = { lastX: x, accum: 0 }
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
        }
        return
      }
      if (kind === 'move') {
        if (press.accents.length > 0) trackPopup(x)
        // Sliding off the key before the popup opens cancels the hold — otherwise a
        // scroll-ish drag would pop an accent picker you didn't ask for.
        else if (keyAt(rects, x, y) !== press.rect) clearTimer()
        return
      }
      if (kind === 'up' && caretDrag) {
        // The press became a caret drag, so it does NOT also type a space.
        clearTimer()
        spaceHint(false)
        caretDrag = null
        press = null
        return
      }
      if (kind === 'up') {
        clearTimer()
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
          fireKey(press.rect)
        }
        press = null
        return
      }
      // leave — the gesture was cancelled outright (pointer left the surface, or the
      // host took the capture away). End the caret drag too, or the spacebar stays
      // tinted and the next press resumes a gesture the user abandoned.
      clearTimer()
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
      // applies unchanged. Null = ran off the edge → focus escapes to the host.
      const next = nearestInDirection(rects, focusIdx, { dx, dy })
      if (next == null) return false
      focusIdx = next
      paintFocus()
      return true
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
