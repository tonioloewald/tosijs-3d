/*
PRESS AND HOLD ON A PANEL CONTROL: \`holdMenusOn\`, which \`<tosi-b3d>\` puts on
every scene panel it opens. Pure of the DOM and of Babylon, so it is tested
headless.
*/

import type { ControlMenu, ControlNode } from './widget-semantics.js'
import { DPAD_HOLD_MS } from './radial-layout.js'

/** What `holdMenusOn` needs of a panel: its pointer entry and its named controls. */
interface HoldablePanel {
  handlePointer?: (kind: string, x: number, y: number) => void
  controls?: () => ControlNode[]
  __holdMenus?: boolean
}

/*
A PRESS AND HOLD ON A PANEL CONTROL with a `menu()` (an inventory thing's
places) opens its ring, as holding B does with the pad. Wraps the panel's
`handlePointer`: a press on such a control that stays still for the hold time
tells the panel to forget the press (`leave`, so it does not also pick the
thing up) and calls `open`; the rest of that press is the ring's. A press
that moves first is the panel's as usual (a drag). `when` says whether holds
count at all: `<tosi-b3d>` counts them only in a headset, since a mouse can
already drag a thing where it goes. Idempotent.
*/
export function holdMenusOn(
  panel: unknown,
  open: (menu: ControlMenu) => void,
  when: () => boolean = () => true
): void {
  const el = panel as HoldablePanel | null
  if (el == null || el.__holdMenus || typeof el.handlePointer !== 'function')
    return
  el.__holdMenus = true
  const orig = el.handlePointer
  let timer: ReturnType<typeof setTimeout> | null = null
  let start: { x: number; y: number } | null = null
  let fired = false
  const clear = () => {
    if (timer != null) clearTimeout(timer)
    timer = null
    start = null
  }
  const at = (x: number, y: number): ControlNode | null => {
    const walk = (nodes: ControlNode[]): ControlNode | null => {
      for (const n of nodes) {
        const b = n.box
        if (
          n.menu &&
          b &&
          x >= b.x &&
          x <= b.x + b.w &&
          y >= b.y &&
          y <= b.y + b.h
        )
          return n
        const c = n.children ? walk(n.children) : null
        if (c) return c
      }
      return null
    }
    try {
      return walk(el.controls?.() ?? [])
    } catch {
      return null
    }
  }
  el.handlePointer = function (kind: string, x: number, y: number) {
    if (kind === 'down') {
      clear()
      fired = false
      const n = when() ? at(x, y) : null
      if (n) {
        start = { x, y }
        timer = setTimeout(() => {
          timer = null
          const menu = n.menu?.()
          if (!menu || menu.items.length === 0) return
          fired = true
          orig.call(el, 'leave', 0, 0)
          open(menu)
        }, DPAD_HOLD_MS)
      }
      return orig.call(el, kind, x, y)
    }
    // The ring has this press: the panel hears nothing more of it.
    if (fired) {
      if (kind === 'up' || kind === 'leave') fired = false
      return
    }
    if (kind === 'move' && start && Math.hypot(x - start.x, y - start.y) > 6)
      clear()
    if (kind === 'up' || kind === 'leave') clear()
    return orig.call(el, kind, x, y)
  }
}
