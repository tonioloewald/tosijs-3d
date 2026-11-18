/*#
# pad-ui

**Reaching a panel's controls with a gamepad.** A panel already describes
itself as named controls (its [widget semantics](/widget-semantics/): role,
value, where it is drawn, `set` and `activate`). `padNavigator` walks those
with a D-pad: up and down (or any direction) step to the nearest control that
way, left and right change a slider or a choice, and the click button presses
a button, flips a toggle or opens a section. It works through each control's
own path, as an agent or a screen reader does, so nothing here knows a widget.

Up and down (and **Tab** / shift-Tab) step through the controls in order and
CYCLE, so the last is one press from the first. Left and right do what the
control does sideways: a slider moves, a choice changes, a text box's caret
moves; anything else goes to the control beside it (a row of icons).

When a panel opens, its DEFAULT control takes the focus, else its first.
Mark the default with `button3d({ label: 'OK', default: true })`, or any
widget with `asDefault(widget)`. A popup opened inside the panel (a select's
list, a confirm) takes the focus the same way and gives it back when it closes.

A control can also hear that it gained or lost the focus (`focus(on)` in its
semantics), to show what a hover would: a thing's info, whether a carried thing
fits a slot. When the focused control leaves the list (a thing taken across in
a trade), the one now in its place takes the focus, so taking one thing after
another is one press each. The [inventory](/inventory-box/) and
[trade](/inventory-trade/) panels give their things and places as controls.

`<tosi-b3d>` uses it on its open panel. The keyboard: **Tab** and shift-Tab
cycle, then Enter or space presses and the arrow keys move as the D-pad
does, until the mouse is used. A gamepad: hold D-pad up to reach the system
bar, step along it, **B** opens a panel and presses its controls; hold up in
a panel to close it (back to its button on the bar), and on the bar to go
back to playing. A panel that pops up while the pad is what you last used
takes the pad at once, and hold up closes it straight back to playing. A
modal (the pause, a respawn) takes the focus from whatever it covers, on
its first button.

```javascript
import { padNavigator } from 'tosijs-3d/pad-ui'

const nav = padNavigator(() => panel.controls())
nav.focusDefault() // the panel opened: its default button, else the first
nav.move(0, 1)     // the next control (the last cycles to the first)
nav.move(1, 0)     // a slider up a step, a caret right
nav.activate()     // press it
nav.focused        // the control with focus, its box to draw a ring round
```
*/
/*{ "parent": "gamepad-focus" }*/

import { nearestInDirection } from './flow-layout.js'
import { walkControls } from './widget-semantics.js'
import type { ControlNode } from './widget-semantics.js'

/** The roles a D-pad can land on. */
const REACHABLE = new Set([
  'button',
  'toggle',
  'slider',
  'select',
  'option',
  'tabs',
  'section',
  'colour',
  'textbox',
  'vector',
  'editor',
])

/** The controls a D-pad can land on: interactive, enabled, drawn. */
export function padTargets(tree: ControlNode[]): ControlNode[] {
  return walkControls(tree).filter(
    (n) =>
      n.interactive &&
      !n.disabled &&
      n.box != null &&
      n.box.w > 0 &&
      n.box.h > 0 &&
      REACHABLE.has(n.role)
  )
}

/** A slider takes this much of its track per press. */
export const SLIDER_STEP = 0.05

/**
 * Change a slider or a choice by one step (`dir` -1 or 1), or move a text
 * box's caret. False when the control has no left and right of its own, so
 * the press moves focus instead.
 */
export function stepControl(n: ControlNode, dir: number): boolean {
  if (n.nudge != null) {
    n.nudge(dir)
    return true
  }
  if (n.role === 'slider') {
    if (n.setFraction != null && n.fraction != null) {
      n.setFraction(Math.min(1, Math.max(0, n.fraction + dir * SLIDER_STEP)))
      return true
    }
    if (n.set != null && typeof n.value === 'number') {
      const lo = n.min ?? 0
      const hi = n.max ?? 1
      const step = n.step || (hi - lo) * SLIDER_STEP
      n.set(Math.min(hi, Math.max(lo, n.value + dir * step)))
      return true
    }
    return false
  }
  if ((n.role === 'select' || n.role === 'tabs') && n.options?.length) {
    if (n.set == null) return false
    const at = Math.max(0, n.options.indexOf(String(n.value)))
    const next = Math.min(n.options.length - 1, Math.max(0, at + dir))
    if (next !== at) n.set(n.options[next])
    return true
  }
  return false
}

/** Press a control: a button or section is activated, a toggle flipped. */
export function pressControl(n: ControlNode): void {
  if (n.activate != null) n.activate()
  else if (n.role === 'toggle' && n.set != null) n.set(!n.value)
}

/**
 * Make any widget its panel's default control (what takes the focus when the
 * panel opens). `button3d({ default: true })` is the same for a button.
 */
export function asDefault<
  W extends {
    semantics?: () => import('./widget-semantics.js').WidgetSemantics
  }
>(widget: W): W {
  const own = widget.semantics
  if (own != null) widget.semantics = () => ({ ...own(), isDefault: true })
  return widget
}

/** The control a panel (or a popup in it) focuses first: its default, else the first. */
export function defaultTarget(targets: ControlNode[]): ControlNode | null {
  return targets.find((n) => n.isDefault) ?? targets[0] ?? null
}

/** The popups open in a tree, by path. */
function popupsOf(tree: ControlNode[]): ControlNode[] {
  return walkControls(tree).filter((n) => n.role === 'popup')
}

export interface PadNavigator {
  /** The control with focus, read fresh (null when there is none). */
  readonly focused: ControlNode | null
  /**
   * One D-pad press. Up and down step through the controls in order and
   * cycle (from the first, up is the last); left and right change a slider,
   * a choice or a caret, else go to the control beside it. False only when
   * there is nothing to focus.
   */
  move: (dx: number, dy: number) => boolean
  /** Tab (1) or shift-Tab (-1): the next control in order, cycling. */
  tab: (dir: number) => boolean
  /** The click button. */
  activate: () => void
  /** Focus the default control (the panel just opened). */
  focusDefault: () => boolean
  /**
   * Call once a frame: a popup that opened since takes the focus (its
   * default, else its first control); one that closed gives it back to
   * what opened it.
   */
  sync: () => void
  /** Forget the focus (the panel closed). */
  clear: () => void
}

/**
 * A D-pad over `read()`'s controls. Focus is kept by PATH, so a panel that
 * rebuilds itself (a section opening, a value changing) keeps it.
 */
export function padNavigator(read: () => ControlNode[]): PadNavigator {
  let path: string | null = null
  let popups = new Set<string>()
  /** The control last told it has the focus, and its place in the cycle. */
  let shown: ControlNode | null = null
  let lastAt = -1
  /** Where the focus was when each popup opened. */
  const before = new Map<string, string | null>()
  const current = () => {
    const tree = read()
    const all = padTargets(tree)
    const i = path == null ? -1 : all.findIndex((n) => n.path === path)
    return { tree, all, i }
  }
  /** In a popup, only its controls are in the cycle. */
  const scope = (tree: ControlNode[], all: ControlNode[]) => {
    const open = popupsOf(tree)
    const top = open[open.length - 1]
    return top == null
      ? all
      : all.filter((n) => n.path.startsWith(top.path + '/'))
  }
  const step = (dir: number) => {
    const { tree, all, i } = current()
    const ring = scope(tree, all)
    if (ring.length === 0) return false
    const at = i < 0 ? -1 : ring.indexOf(all[i])
    const next =
      at < 0
        ? dir > 0
          ? 0
          : ring.length - 1
        : (at + dir + ring.length) % ring.length
    path = ring[next].path
    return true
  }
  /** Tell a control it gained or lost the focus (what a hover would show). */
  const settle = <R>(r: R): R => {
    const { tree, all, i } = current()
    const now = i >= 0 ? all[i] : null
    if (now?.path !== shown?.path) {
      shown?.focus?.(false)
      now?.focus?.(true)
    }
    shown = now
    if (now != null) lastAt = scope(tree, all).indexOf(now)
    return r
  }
  const nav: PadNavigator = {
    get focused() {
      const { all, i } = current()
      return i >= 0 ? all[i] : null
    },
    move(dx, dy) {
      return settle(moveBy(dx, dy))
    },
    tab: (dir) => settle(step(dir)),
    activate() {
      const { all, i } = current()
      if (i >= 0) pressControl(all[i])
    },
    focusDefault() {
      const { tree, all } = current()
      const first = defaultTarget(scope(tree, all))
      path = first?.path ?? null
      popups = new Set(popupsOf(tree).map((n) => n.path))
      return settle(first != null)
    },
    sync() {
      const { tree, all, i } = current()
      const open = popupsOf(tree).map((n) => n.path)
      const now = new Set(open)
      for (const p of open)
        if (!popups.has(p)) {
          before.set(p, path)
          const first = defaultTarget(
            all.filter((n) => n.path.startsWith(p + '/'))
          )
          if (first != null) path = first.path
        }
      for (const p of popups)
        if (!now.has(p)) {
          // Back to what opened it, if it is still there.
          const was = before.get(p) ?? null
          before.delete(p)
          if (i < 0 && was != null) path = was
        }
      popups = now
      if (path != null && !all.some((n) => n.path === path)) {
        // It went (a thing moved out of the list): the control now in its
        // place, so taking one after another is one press each.
        const ring = scope(tree, all)
        const at = Math.min(lastAt, ring.length - 1)
        path = (at >= 0 ? ring[at] : defaultTarget(ring))?.path ?? null
      }
      settle(null)
    },
    clear() {
      shown?.focus?.(false)
      shown = null
      lastAt = -1
      path = null
      popups = new Set()
      before.clear()
    },
  }
  function moveBy(dx: number, dy: number): boolean {
    if (dy !== 0) return step(dy > 0 ? 1 : -1)
    const { tree, all, i } = current()
    if (i < 0) return step(dx)
    if (stepControl(all[i], dx)) return true
    // Beside it (a row of icon buttons).
    const ring = scope(tree, all)
    const at = ring.indexOf(all[i])
    const boxes = ring.map((n) => ({
      x: n.box!.x,
      y: n.box!.y,
      width: n.box!.w,
      height: n.box!.h,
    }))
    const fy = boxes[at].y + boxes[at].height / 2
    const next = nearestInDirection(
      boxes,
      at,
      { dx, dy: 0 },
      (k) =>
        Math.abs(boxes[k].y + boxes[k].height / 2 - fy) < boxes[at].height / 2
    )
    if (next != null) path = ring[next].path
    return true
  }
  return nav
}
