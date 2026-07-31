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

Tap the keys. `?123` switches to symbols, `⇧` shifts, and holding `o` (or `a`, `e`,
`u`…) opens the accent popup — drag onto one and release.

```js
import { surface, widgetBox, box, textBlock, inputField, keyboard } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 380
const H = 300

const field = inputField({ value: 'hold o for ö', placeholder: 'type something…' })
const kb = keyboard({
  onKey: (ch) => field.insert(ch),
  onAction: (a) => field.action(a),
})

const s = surface({ width: W, height: H })
s.setContent(
  box(
    { width: W, height: H, padding: 12, gap: 10, background: '#12151c' },
    textBlock('SVG keyboard', { font: { size: 15, weight: 600 }, color: '#e6e6e6' })
  )
)
s.openPanel({ x: 8, y: 44 }, widgetBox(
  { width: 364, padding: 8, gap: 8, background: '#0e1116' },
  [field, kb]
), { title: 'Text entry', draggable: true })

const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, s.el)
const at = (e) => {
  const r = svgEl.getBoundingClientRect()
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
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
  moveTo,
  type EditState,
} from './text-edit'
import { measureTextWidth, type FontSpec } from './widgets3d-layout'
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
  const caretX = (): number => {
    const before = Array.from(state.text).slice(0, state.caret).join('')
    return PAD + measureTextWidth(before, font)
  }

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
      const w = PAD + measureTextWidth(chars.slice(0, i).join(''), font)
      const d = Math.abs(w - x)
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
}

export function keyboard(
  config: {
    mode?: KeyboardMode
    keyHeight?: number
    gap?: number
    /** ms to hold before the accent popup opens. */
    holdMs?: number
    onKey?: (text: string) => void
    onAction?: (action: KeyAction) => void
  } = {}
): Keyboard {
  const KH = config.keyHeight ?? 38
  const GAP = config.gap ?? 5
  const HOLD = config.holdMs ?? 350

  let mode: KeyboardMode = config.mode ?? 'alpha'
  let shift = false
  let width = 0
  let rects: KeyRect[] = []

  const keysLayer = g({ 'data-kb': 'keys' }) as SVGGElement
  const popupLayer = g({ 'data-kb': 'popup' }) as SVGGElement
  const el = g({ 'data-w3d': 'keyboard' }, keysLayer, popupLayer) as SVGGElement

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
    const y = r.y - CH - 10
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
        const r = keyAt(rects, x, y)
        if (!r) return
        press = { rect: r, timer: null, accents: [], pick: -1, cells: [] }
        const alts = r.key.value ? accentsFor(r.key.value) : []
        if (alts.length > 0) {
          press.timer = setTimeout(() => {
            if (press) openPopup(r, alts)
          }, HOLD)
        }
        return
      }
      if (!press) return
      if (kind === 'move') {
        if (press.accents.length > 0) trackPopup(x)
        // Sliding off the key before the popup opens cancels the hold — otherwise a
        // scroll-ish drag would pop an accent picker you didn't ask for.
        else if (keyAt(rects, x, y) !== press.rect) clearTimer()
        return
      }
      if (kind === 'up') {
        clearTimer()
        if (press.accents.length > 0) {
          // Released on an accent → insert it; released off the strip → the plain key.
          if (press.pick >= 0) config.onKey?.(press.accents[press.pick])
          else fireKey(press.rect)
          closePopup()
        } else if (keyAt(rects, x, y) === press.rect) {
          fireKey(press.rect)
        }
        press = null
        return
      }
      // leave
      clearTimer()
      closePopup()
      press = null
    },
  }
  return api
}
