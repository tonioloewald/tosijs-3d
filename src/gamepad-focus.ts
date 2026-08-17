/*#
# gamepad-focus

Drives an SVG UI's **focus traversal** from a [[virtual-gamepad|VirtualGamepad]] — the
missing wire between "the D-pad registers" and "the D-pad moves the highlight".

Everything either side of it already existed: `box`/`surface` expose
`focusMove` / `focusActivate` / `focusBack`, and `HardwareGamepadSource` /
`XrGamepadSource` produce a `VirtualGamepad` each frame. Nothing polled one and called
the other, so a gamepad could light up the on-screen pad and still not touch the UI.

```js
import { HardwareGamepadSource, ui } from 'tosijs-3d'
const { gamepadFocus } = ui

const pad = new HardwareGamepadSource()
const stop = gamepadFocus({ poll: () => pad.poll(), target: panel, claim: panelRootEl })
// …later
stop()
```

## One pad, several UIs — `claim`

With more than one gamepad-driven UI live on a page (two doc demos, say), a single
D-pad press would drive them all. Pass `claim` (the UI's root element) and the pad
follows the pointer: **the surface you last pressed in owns the pad** until another
claims it. Until anything is claimed every instance responds, so a lone UI needs no
wiring — the same last-touched rule `B3d` uses for scene input focus.

## Which controls, and why those

The **D-pad** and the **menu** button, deliberately: per the control conventions those
are the inputs a VR controller set doesn't otherwise spend, so a UI can claim them
without fighting locomotion or the gameplay bindings. The left stick is **not** used —
it's how you walk.

| control | does |
| --- | --- |
| D-pad ↑↓←→ | `focusMove(dx, dy)` |
| `menu` / `buttonA` | `focusActivate()` |
| `buttonB` | `focusBack()` |

## Edge-triggered, with a repeat

A gamepad reports *held*, not *pressed*, so polling raw state would fire every frame and
send focus rocketing across the panel. Presses are edge-detected, then repeat on a
**delay-then-interval** ramp (the typematic behaviour every keyboard has) so holding a
direction walks steadily instead of either sprinting or stopping dead.

The timing is passed in as `now` rather than read from a clock, so the ramp is
deterministic and testable — same discipline as the rest of the pure models here.
*/
/*{ "parent": "input", "order": 900 }*/

import type { VirtualGamepad } from './virtual-gamepad'

/** What a focus driver needs from its target — `box`, `surface`, or your own. */
export interface FocusTarget {
  focusMove: (dx: number, dy: number) => unknown
  focusActivate: () => unknown
  focusBack?: () => unknown
}

/** One frame's worth of decisions, as pure data. */
export interface FocusPulse {
  /** Directions to step this frame (usually 0 or 1 of them). */
  moves: Array<{ dx: number; dy: number }>
  activate: boolean
  back: boolean
}

const DIRS = [
  { key: 'dpadLeft', dx: -1, dy: 0 },
  { key: 'dpadRight', dx: 1, dy: 0 },
  { key: 'dpadUp', dx: 0, dy: -1 },
  { key: 'dpadDown', dx: 0, dy: 1 },
] as const

/**
 * The pure half: given the pad's current state and the previous frame's, decide what
 * should happen. Holds `held` timing so a direction repeats on a ramp.
 *
 * Exported so the ramp can be tested without a gamepad, a clock, or a DOM.
 */
export function createFocusPulse(
  opts: {
    /** ms a direction must be held before it starts repeating. Default 400. */
    repeatDelayMs?: number
    /** ms between repeats once started. Default 90. */
    repeatRateMs?: number
  } = {}
) {
  const DELAY = opts.repeatDelayMs ?? 400
  const RATE = opts.repeatRateMs ?? 90
  // Per-direction: when it went down, and when it last fired.
  const held = new Map<string, { since: number; last: number }>()
  let prevActivate = false
  let prevBack = false

  return (pad: VirtualGamepad, now: number): FocusPulse => {
    const moves: FocusPulse['moves'] = []
    for (const d of DIRS) {
      const down = Boolean((pad as unknown as Record<string, unknown>)[d.key])
      const h = held.get(d.key)
      if (!down) {
        held.delete(d.key)
        continue
      }
      if (!h) {
        // Edge: fire immediately, then wait out the delay before repeating.
        held.set(d.key, { since: now, last: now })
        moves.push({ dx: d.dx, dy: d.dy })
      } else if (now - h.since >= DELAY && now - h.last >= RATE) {
        h.last = now
        moves.push({ dx: d.dx, dy: d.dy })
      }
    }
    // `menu` is the primary confirm (it's the button a VR set leaves spare); `a` is
    // accepted too because on a hardware pad that's where a thumb expects it.
    const act = Boolean(pad.menu || pad.buttonA)
    const bk = Boolean(pad.buttonB)
    const pulse: FocusPulse = {
      moves,
      activate: act && !prevActivate, // confirm does NOT repeat — one press, one action
      back: bk && !prevBack,
    }
    prevActivate = act
    prevBack = bk
    return pulse
  }
}

/*
One pad, several UIs: with more than one live demo (or panel) on a page, a single
D-pad press would drive them ALL — the same problem `B3d` solves for keyboards with
scene input focus, so the same solution: the surface the pointer last went DOWN in
claims the pad. Until anything claims, every instance responds — a lone UI just
works with zero wiring.
*/
let claimed: object | null = null

/**
 * Poll a gamepad each animation frame and drive `target`'s focus. Returns a stop
 * function; call it when the UI closes or the driver should hand over.
 *
 * Pass `claim` (the UI's root element) when the page may hold several gamepad-driven
 * UIs: a pointerdown inside `claim` routes the pad here until another instance is
 * claimed. Omit it for a lone UI.
 */
export interface GamepadFocusOptions {
  poll: () => VirtualGamepad
  target: FocusTarget
  /** Root element that claims the pad when the pointer goes down inside it. */
  claim?: Element
  repeatDelayMs?: number
  repeatRateMs?: number
  /** Override the frame pump (tests, or an XR session's own rAF). */
  raf?: (cb: () => void) => number
  cancel?: (id: number) => void
}

export function gamepadFocus(opts: GamepadFocusOptions): () => void {
  const pulse = createFocusPulse(opts)
  const raf =
    opts.raf ?? ((cb: () => void) => requestAnimationFrame(() => cb()))
  const cancel = opts.cancel ?? ((id: number) => cancelAnimationFrame(id))
  const token = {}
  let onDown: ((e: Event) => void) | null = null
  if (opts.claim) {
    onDown = (e: Event) => {
      if (opts.claim!.contains(e.target as Node)) claimed = token
      // A press OUTSIDE our claim releases it (owner-only, so instances don't
      // race). Without this, an instance created WITHOUT `claim` on the same
      // page was starved forever: it registers no claim element, so no click
      // could ever route the pad back to it. Click-away → unclaimed → every
      // instance responds again, which is also the lone-UI default.
      else if (claimed === token) claimed = null
    }
    window.addEventListener('pointerdown', onDown, true)
  }
  let id = 0
  let stopped = false

  const tick = (): void => {
    if (stopped) return
    // Always RUN the pulse (it holds the edge/repeat state — skipping it would
    // burst stale presses on activation); only APPLY it when active.
    const p = pulse(opts.poll(), performance.now())
    if (claimed === null || claimed === token) {
      for (const m of p.moves) opts.target.focusMove(m.dx, m.dy)
      if (p.activate) opts.target.focusActivate()
      if (p.back) opts.target.focusBack?.()
    }
    id = raf(tick)
  }
  id = raf(tick)

  return () => {
    stopped = true
    cancel(id)
    if (onDown) window.removeEventListener('pointerdown', onDown, true)
    if (claimed === token) claimed = null
  }
}
