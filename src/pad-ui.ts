/*#
# pad-ui

**Reaching a panel's controls with a gamepad.** A panel already describes
itself as named controls (its [widget semantics](/widget-semantics/): role,
value, where it is drawn, `set` and `activate`). `padNavigator` walks those
with a D-pad: up and down (or any direction) step to the nearest control that
way, left and right change a slider or a choice, and the click button presses
a button, flips a toggle or opens a section. It works through each control's
own path, as an agent or a screen reader does, so nothing here knows a widget.

`<tosi-b3d>` uses it for its gamepad UI mode: hold D-pad up to reach the system
bar, step along it, press **B** to open a panel, and the D-pad moves inside the
panel. Hold up again to go back to playing.

```javascript
import { padNavigator } from 'tosijs-3d/pad-ui'

const nav = padNavigator(() => panel.controls())
nav.move(0, 1)   // the first control, then the one below
nav.activate()   // press it
nav.focused      // the control with focus, its box to draw a ring round
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
 * Change a slider or a choice by one step (`dir` -1 or 1). False when the
 * control is not one that steps, so the press moves focus instead.
 */
export function stepControl(n: ControlNode, dir: number): boolean {
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

export interface PadNavigator {
  /** The control with focus, read fresh (null before the first move). */
  readonly focused: ControlNode | null
  /**
   * One D-pad press. Returns false when nothing lies that way (focus left the
   * panel), so the host can move it on (up off the top: the system bar).
   */
  move: (dx: number, dy: number) => boolean
  /** The click button. */
  activate: () => void
  /** Forget the focus (the panel closed, or the D-pad left it). */
  clear: () => void
}

/**
 * A D-pad over `read()`'s controls. Focus is kept by PATH, so a panel that
 * rebuilds itself (a section opening, a value changing) keeps it.
 */
export function padNavigator(read: () => ControlNode[]): PadNavigator {
  let path: string | null = null
  const current = () => {
    const all = padTargets(read())
    const i = path == null ? -1 : all.findIndex((n) => n.path === path)
    return { all, i }
  }
  return {
    get focused() {
      const { all, i } = current()
      return i >= 0 ? all[i] : null
    },
    move(dx, dy) {
      const { all, i } = current()
      if (all.length === 0) return false
      if (i < 0) {
        // Entering: the first control from the side you came in by.
        const first = dy < 0 || dx < 0 ? all[all.length - 1] : all[0]
        path = first.path
        return true
      }
      if (dx !== 0 && dy === 0 && stepControl(all[i], dx)) return true
      const boxes = all.map((n) => ({
        x: n.box!.x,
        y: n.box!.y,
        width: n.box!.w,
        height: n.box!.h,
      }))
      const next = nearestInDirection(boxes, i, { dx, dy })
      if (next == null) return false
      path = all[next].path
      return true
    },
    activate() {
      const { all, i } = current()
      if (i >= 0) pressControl(all[i])
    },
    clear() {
      path = null
    },
  }
}
