/*#
# carry-box

**Drag and drop on a panel**: [carry](/carry/)'s model with a view. Tiles you
can pick up, sockets that take them, a ghost that follows the pointer, and
the two-tap path, as children of a [box](/box/), so they work wherever a box
does: on a page, on a panel in a flat scene, on a panel in a headset.

## Demo

A bag and a pair of hands. Drag a thing to a hand, or tap it and then tap
the hand. While something is held, the hands that would take it light up
and the others dim; point at a dim one to see why. The rifle needs both
hands free; the shield is cracked (its outline) and the lamp is running low
(its bar).

```js
import { ui, createCarry, carryTile, carrySocket, carryPanel } from 'tosijs-3d'
import { svgElements } from 'tosijs'
const { svg } = svgElements

const carry = createCarry()
const bag = new Set(['sword', 'shield', 'rifle', 'lamp'])
const hands = { left: null, right: null }
const LOOK = {
  sword: {},
  shield: { outline: 'damaged' },
  rifle: { badge: '2H' },
  lamp: { bar: 0.25, barColor: '#e0b040' },
}

const handTarget = (side) => ({
  id: side,
  accepts: (thing) => {
    if (hands[side]) return ['this hand is full']
    if (thing === 'rifle' && (hands.left || hands.right)) return ['two-handed: both hands must be free']
    return []
  },
  receive: (thing, from) => {
    bag.delete(thing)
    if (from === 'left' || from === 'right') hands[from] = null
    hands[side] = thing
    build()
  },
})
const bagTarget = {
  id: 'bag',
  accepts: (thing, from) => (from === 'bag' ? ['already in the bag'] : []),
  receive: (thing, from) => {
    hands[from] = null
    bag.add(thing)
    build()
  },
}

// TWO panels, one carry: the bag and the hands are separate surfaces, and a
// drag goes from one to the other.
const bagHost = svg({ viewBox: '0 0 300 190', width: 300, height: 190, style: 'touch-action:none' })
const handHost = svg({ viewBox: '0 0 220 250', width: 220, height: 250, style: 'touch-action:none' })
preview.append(bagHost, handHost)
const tileOf = (t, from) => carryTile({ carry, thing: t, from, label: t, decorations: () => LOOK[t] })
const panels = new Map()
function mount(host, children) {
  host.textContent = ''
  const b = ui.box({ width: Number(host.getAttribute('width')), padding: 12, gap: 10, background: '#1c2230', radius: 10 }, ...children)
  host.append(b.el)
  panels.set(host, carryPanel(b, carry))
}
function build() {
  mount(bagHost, [
    ui.textBlock('Bag', { font: { size: 14, weight: 600 }, color: '#ddd' }),
    ...[...bag].map((t) => tileOf(t, 'bag')),
    carrySocket({ carry, target: bagTarget, label: 'put back in the bag', width: 270, height: 30 }),
  ])
  mount(handHost, [
    ui.textBlock('Hands', { font: { size: 14, weight: 600 }, color: '#ddd' }),
    ...['left', 'right'].map((side) =>
      carrySocket({ carry, target: handTarget(side), label: side + ' hand', width: 190, holding: hands[side] ? tileOf(hands[side], side) : null })
    ),
  ])
}
build()
for (const host of [bagHost, handHost]) {
  const at = (e) => { const p = ui.svgPoint(host, e.clientX, e.clientY); return [p.x, p.y] }
  host.addEventListener('pointerdown', (e) => panels.get(host).handlePointer('down', ...at(e)))
  host.addEventListener('pointermove', (e) => panels.get(host).handlePointer('move', ...at(e)))
  host.addEventListener('pointerup', (e) => panels.get(host).handlePointer('up', ...at(e)))
  host.addEventListener('pointerleave', () => panels.get(host).handlePointer('leave', 0, 0))
}
// Let go anywhere else: it goes back where it was. (A panel's own release
// has already dropped it by the time this runs, so this only catches misses.)
window.addEventListener('pointerup', () => carry.cancel())
```

## How it fits together

- **`carryTile`** is a thing you can pick up: a label and its DECORATIONS,
  which the consumer supplies per thing: a small status `bar` (durability,
  charge, ammo; 0…1), an `outline` (`'damaged'`, `'broken'`, or any
  colour), a `badge` (a count, a mark). While it is being carried it fades
  where it was.
- **`carrySocket`** is a place it can go: it lights when what is held would
  fit, dims when it would not, and shows the reason when the pointer is on
  it. `holding` draws what is in it now.
- **`carryPanel(box, carry)`** goes between the host's pointer events and the
  box: a press on a tile that moves `DRAG_THRESHOLD` becomes a drag, a
  ghost follows the pointer, and letting go drops it on the socket under the
  pointer. A drop that is refused, lands on nothing or is cancelled
  outside every panel springs back: the ghost returns to where it was picked
  up, carrying the reason it was refused. A tap on a tile and then a tap on a
  socket does the same without carrying it.

Several panels share one `carry`, which is how a drag goes from one to
another (the demo's bag and hands are two): each reports what its own
sockets see, and whichever panel the pointer is let go over drops it. Let go
outside every panel and the host cancels (the demo listens on `window`).
*/
/*{ "parent": "carry", "order": 10 }*/

import { svgElements } from 'tosijs'
import type { Box, BoxChild, BoxChildState, PointerKind } from './box.js'
import { DRAG_THRESHOLD, type Carry, type CarryTarget } from './carry.js'

/** How a thing shows its condition, supplied by the consumer per thing. */
export interface CarryDecorations {
  /** A small status bar, 0…1 (durability, charge, ammo). Absent: none. */
  bar?: number
  barColor?: string
  /** `'damaged'`, `'broken'`, or any CSS colour. */
  outline?: string | null
  /** A short mark in the corner: a count, a quality, `2H`. */
  badge?: string
}

const OUTLINES: Record<string, string> = {
  damaged: '#e0a030',
  broken: '#e04838',
}

const { g, rect, text } = svgElements

/** The tile a press began on, per carry (set from the tile's pressed state). */
const pressedTile = new WeakMap<Carry<any>, CarryTileChild<any>>()
/** The panel a drag began in, per carry: the one that springs it back. */
const dragOrigin = new WeakMap<Carry<any>, object>()
/** Why the last drop did not land, per carry (absent: it landed). */
const lastRefusal = new WeakMap<Carry<any>, string[]>()

/** How long a refused thing takes to spring back, and how long its reason stays. */
const SPRING_MS = 220
const LINGER_MS = 900

export interface CarryTileChild<T> extends BoxChild {
  carryThing: T
  carryFrom: string
  /** Stop listening to the carry (call when the tile is thrown away). */
  dispose: () => void
}

export interface CarryTileOptions<T> {
  carry: Carry<T>
  thing: T
  /** Where it is now (a socket's id, a list's id). */
  from: string
  label: string
  width?: number
  height?: number
  decorations?: () => CarryDecorations | undefined
  /**
   * The place this tile is in, as a target: something dropped ON the tile
   * goes there. A long (scrolled) list is all tiles, so this is what makes
   * the whole list a place to drop.
   */
  target?: CarryTarget<T>
}

/** A thing you can pick up: a label and its decorations. */
export function carryTile<T>(opts: CarryTileOptions<T>): CarryTileChild<T> {
  const { carry, thing, from, label } = opts
  const w = opts.width ?? 120
  const h = opts.height ?? 34
  const deco = opts.decorations?.() ?? {}
  const outline = deco.outline ? OUTLINES[deco.outline] ?? deco.outline : null
  // A small tile (in a socket on a schematic) centres a shortened label.
  const small = w < 80
  const fontSize = small ? 10 : 13
  const fit = small ? Math.max(2, Math.floor((w - 6) / (fontSize * 0.55))) : Infinity
  const shown = label.length > fit ? label.slice(0, fit - 1) + '…' : label
  const inset = Math.min(10, w * 0.12)
  const bg = rect({
    x: 0.5,
    y: 0.5,
    width: w - 1,
    height: h - 1,
    rx: 6,
    fill: '#2c3546',
    stroke: outline ?? '#4a5568',
    'stroke-width': outline ? 2 : 1,
  })
  const parts: Element[] = [
    bg,
    text(
      {
        x: small ? w / 2 : 10,
        y: deco.bar != null && !small ? h / 2 + 1 : h / 2 + fontSize * 0.38,
        fill: '#e8e8e8',
        'text-anchor': small ? 'middle' : 'start',
        'font-family': 'system-ui, sans-serif',
        'font-size': String(fontSize),
      },
      shown
    ),
  ]
  if (deco.bar != null) {
    const v = Math.max(0, Math.min(1, deco.bar))
    const bw = w - 2 * inset
    parts.push(
      rect({ x: inset, y: h - 9, width: bw, height: 4, rx: 2, fill: '#141a24' }),
      rect({ x: inset, y: h - 9, width: bw * v, height: 4, rx: 2, fill: deco.barColor ?? '#5fbf6a' })
    )
  }
  if (deco.badge) {
    parts.push(
      text(
        {
          x: w - (small ? 3 : 8),
          y: small ? 11 : 14,
          fill: '#9fb0c8',
          'text-anchor': 'end',
          'font-family': 'system-ui, sans-serif',
          'font-size': '10',
          'font-weight': '700',
        },
        deco.badge
      )
    )
  }
  const el = g({ 'data-carry-tile': '' }, ...parts) as unknown as SVGGElement
  const restyle = () => {
    const held = carry.state.thing === thing
    el.setAttribute('opacity', held ? '0.35' : '1')
  }
  const stop = carry.subscribe(restyle)
  const child: CarryTileChild<T> = {
    el,
    kind: 'inline',
    focusable: true,
    carryThing: thing,
    carryFrom: from,
    measure: () => ({ width: w, height: h }),
    setState(s: BoxChildState) {
      if (s.pressed) pressedTile.set(carry, child)
      bg.setAttribute('fill', s.pressed ? '#3b4860' : s.hovered || s.focused ? '#344054' : '#2c3546')
      const t = opts.target
      if (t && carry.state.thing != null && carry.state.thing !== thing) {
        if (s.hovered || s.focused) carry.over(t)
        else if (carry.state.target === t) carry.over(null)
      }
    },
    // The two-tap path: tap to pick up, tap it again to put it down, or tap
    // another thing in a place to put what is held there.
    handleActivate() {
      if (carry.state.thing === thing) carry.cancel()
      else if (carry.state.thing != null && opts.target) carry.drop(opts.target)
      else carry.pickUp(thing, from, 'tap')
    },
    dispose: stop,
  }
  return child
}

export interface CarrySocketChild<T> extends BoxChild {
  carryTarget: CarryTarget<T>
  /** Stop listening to the carry (call when the socket is thrown away). */
  dispose: () => void
}

export interface CarrySocketOptions<T> {
  carry: Carry<T>
  target: CarryTarget<T>
  label: string
  width?: number
  height?: number
  /**
   * What is in it now, drawn inside it. A tile here can be picked up from
   * the socket: pressed and dragged, or tapped.
   */
  holding?: BoxChild | null
  /**
   * `'row'` (default) draws a framed row with its label inside. `'art'` draws
   * nothing at rest, because a picture under it (a schematic) already shows
   * the socket: it outlines when it would take what is held, darkens when it
   * would not, and shows its label and the reason beneath it on hover. The
   * held tile fills it.
   */
  look?: 'row' | 'art'
}

/** A socket that would take what is held, and the one under the pointer. */
const FITS = '#6fd08c'
const LIT = '#c4f5d2'
const HALO = { stroke: '#0b0e14', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }

/** A place a carried thing can go: lights, dims and says why. */
export function carrySocket<T>(opts: CarrySocketOptions<T>): CarrySocketChild<T> {
  const { carry, target, label, holding } = opts
  const art = opts.look === 'art'
  const w = opts.width ?? 160
  const h = opts.height ?? (holding ? 66 : 52)
  const frame = rect({
    x: 1,
    y: 1,
    width: w - 2,
    height: h - 2,
    rx: art ? 4 : 8,
    fill: art ? 'none' : '#161b25',
    stroke: art ? 'none' : '#55607a',
    'stroke-width': art ? 2.5 : 1.5,
    'stroke-dasharray': art ? '' : '5 4',
  })
  const textAt = art
    ? { x: w / 2, 'text-anchor': 'middle', ...HALO }
    : { x: 10 }
  const caption = text(
    {
      ...textAt,
      y: art ? h + 13 : 14,
      fill: art ? '#dfe6f2' : '#8a96ad',
      'font-family': 'system-ui, sans-serif',
      'font-size': '11',
    },
    art ? '' : label
  )
  const why = text(
    {
      ...textAt,
      y: art ? h + 26 : h - 8,
      fill: '#f0907c',
      'font-family': 'system-ui, sans-serif',
      'font-size': '11',
    },
    ''
  )
  const parts: Element[] = []
  if (!art) parts.push(frame, caption)
  if (holding) {
    // In a row, under the caption and clear of the reason line; on art, filling it.
    parts.push(g({ transform: art ? '' : 'translate(10, 20)' }, holding.el))
  }
  // On art the frame and words go OVER what it holds.
  if (art) parts.push(frame, caption)
  parts.push(why)
  const el = g({ 'data-carry-socket': '' }, ...parts) as unknown as SVGGElement
  let hovered = false
  // On art the frame grows past the drawn socket's edge so a lit or darkened
  // socket covers it.
  const setFrame = (inset: number, stroke: number) => {
    frame.setAttribute('x', String(inset))
    frame.setAttribute('y', String(inset))
    frame.setAttribute('width', String(w - 2 * inset))
    frame.setAttribute('height', String(h - 2 * inset))
    frame.setAttribute('stroke-width', String(stroke))
  }
  const holdsHeld = () => {
    const t = (holding as CarryTileChild<T> | null | undefined)?.carryThing
    return t !== undefined && carry.state.thing === t
  }
  const restyle = () => {
    const s = carry.state
    if (s.thing == null || holdsHeld()) {
      el.setAttribute('opacity', '1')
      if (art) setFrame(1, 2.5)
      else {
        frame.setAttribute('stroke-width', '1.5')
        frame.setAttribute('stroke-dasharray', '5 4')
      }
      frame.setAttribute('stroke', art ? (hovered ? '#9fb0c8' : 'none') : '#55607a')
      frame.setAttribute('fill', art ? 'none' : '#161b25')
      frame.removeAttribute('fill-opacity')
      if (art) caption.textContent = hovered ? label : ''
      why.textContent = ''
      return
    }
    const v = carry.verdictFor(target)
    const ok = !!v?.ok
    // While something is held, every socket that would take it lights and
    // the one under the pointer lights brighter; the rest go dark.
    if (art) {
      setFrame(ok ? -2 : -3, ok ? (hovered ? 4 : 3) : 0)
      frame.setAttribute('stroke', ok ? (hovered ? LIT : FITS) : 'none')
      frame.setAttribute('fill', ok ? FITS : '#05070b')
      frame.setAttribute('fill-opacity', ok ? (hovered ? '0.55' : '0.22') : '0.78')
      caption.textContent = hovered ? label : ''
    } else {
      el.setAttribute('opacity', ok ? '1' : '0.45')
      frame.setAttribute('stroke', ok ? (hovered ? LIT : FITS) : '#55607a')
      frame.setAttribute('stroke-width', ok ? (hovered ? '3' : '2') : '1.5')
      frame.setAttribute('stroke-dasharray', ok && hovered ? '' : '5 4')
      frame.setAttribute('fill', ok ? (hovered ? '#2c5a3c' : '#1a2b22') : '#161b25')
    }
    why.textContent = hovered && v && !ok ? v.reasons[0] ?? '' : ''
  }
  const stop = carry.subscribe(restyle)
  restyle()
  return {
    el,
    kind: 'block',
    focusable: true,
    carryTarget: target,
    measure: () => ({ width: w, height: h }),
    setState(s: BoxChildState) {
      hovered = s.hovered || s.focused
      // A press on a filled socket is a press on what it holds: that is how
      // a thing is dragged OUT of a socket.
      holding?.setState?.(s)
      if (carry.state.thing != null) {
        if (hovered) carry.over(target)
        else if (carry.state.target === target) carry.over(null)
      }
      restyle()
    },
    handleActivate() {
      // Tapping the socket that holds what is carried puts it back.
      if (holdsHeld()) carry.cancel()
      // The second tap of the two-tap path.
      else if (carry.state.thing != null) carry.drop(target)
      // The first: pick up what it holds.
      else holding?.handleActivate?.()
    },
    dispose() {
      stop()
      ;(holding as CarryTileChild<T> | null | undefined)?.dispose?.()
    },
  }
}

type Pt = { x: number; y: number }

/**
 * The thing being dragged, drawn in `parent` (a panel's own SVG, or the page
 * overlay). It hangs ABOVE the pointer, so the socket you are over stays in
 * sight (and on a touch screen, out from under the finger).
 */
function carryGhost(parent: Element) {
  const LIFT = 46
  let run = 0
  const el = g(
    { 'pointer-events': 'none', opacity: '0.85' },
    rect({ x: -50, y: -60, width: 100, height: 28, rx: 6, fill: '#3b4860', stroke: '#9fb0c8' })
  ) as unknown as SVGGElement
  const font = { 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif' }
  const label = text({ x: 0, y: -41, fill: '#fff', 'font-size': '12', ...font }, '')
  const why = text({ x: 0, y: -18, fill: '#f0907c', 'font-size': '11', ...font, ...HALO }, '')
  el.append(label, why)
  const place = (x: number, y: number) => {
    if (!el.isConnected) parent.append(el)
    el.setAttribute('transform', `translate(${x}, ${y})`)
  }
  const hide = () => el.remove()
  return {
    show(x: number, y: number, name: string) {
      run++
      label.textContent = name
      why.textContent = ''
      place(x, y)
    },
    hide,
    // Back to where it was picked up, settling ON the thing (the lift eases
    // away as it goes), and showing why for a moment.
    springBack(from: Pt, to: Pt, reason: string) {
      const mine = ++run
      why.textContent = reason
      const t0 = performance.now()
      const step = () => {
        if (mine !== run) return
        const t = Math.min(1, (performance.now() - t0) / SPRING_MS)
        const e = 1 - (1 - t) ** 3
        place(from.x + (to.x - from.x) * e, from.y + (to.y + LIFT - from.y) * e)
        if (t < 1) requestAnimationFrame(step)
        else setTimeout(() => mine === run && hide(), reason ? LINGER_MS : 60)
      }
      step()
    },
  }
}

/**
 * Calls `then` each time the carry empties: with the reason (possibly empty)
 * when a drag that `mine()` claims did not land, and with null otherwise.
 */
function whenDropMisses<T>(carry: Carry<T>, mine: () => boolean, then: (why: string | null) => void) {
  let held = false
  return carry.subscribe((s) => {
    if (s.thing != null) {
      if (s.mode === 'drag' && mine()) held = true
      return
    }
    if (!held) return then(null)
    held = false
    // The panel that let go records why after the carry empties; read it then.
    queueMicrotask(() => {
      const why = lastRefusal.get(carry)
      lastRefusal.delete(carry)
      then(why ? why.join(' ') : null)
    })
  })
}

const overlays = new WeakMap<Carry<any>, { dispose: () => void }>()

/**
 * The ghost for panels ON A PAGE: one overlay above everything, following
 * the pointer across panels (give each `carryPanel` `ghost: false`). A drop
 * that misses springs back to where the drag began, wherever that was. One
 * per carry; calling it again returns the same one. Panels on a 3D plane
 * have no page to draw on and keep their own ghosts.
 */
export function carryOverlay<T>(carry: Carry<T>): { dispose: () => void } {
  const had = overlays.get(carry)
  if (had) return had
  const layer = svgElements.svg() as unknown as SVGSVGElement
  layer.setAttribute(
    'style',
    'position:fixed; inset:0; width:100vw; height:100vh; pointer-events:none; z-index:2147483647; overflow:visible'
  )
  const ghost = carryGhost(layer)
  let press: Pt | null = null
  let home: Pt | null = null
  let last: Pt | null = null
  const down = (e: PointerEvent) => (press = { x: e.clientX, y: e.clientY })
  const move = (e: PointerEvent) => {
    if (carry.state.thing == null || carry.state.mode !== 'drag') return
    if (!layer.isConnected) document.body.append(layer)
    home ??= press
    last = { x: e.clientX, y: e.clientY }
    ghost.show(last.x, last.y, String(carry.state.thing))
  }
  // Capture phase: a panel's handler drops on release, and the ghost must
  // know where that was first.
  const up = (e: PointerEvent) => (last = { x: e.clientX, y: e.clientY })
  window.addEventListener('pointerdown', down, true)
  window.addEventListener('pointermove', move, true)
  window.addEventListener('pointerup', up, true)
  const stop = whenDropMisses(carry, () => true, (why) => {
    ghost.hide()
    if (why != null && home && last) ghost.springBack(last, home, why)
    home = null
  })
  const it = {
    dispose() {
      stop()
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
      layer.remove()
      overlays.delete(carry)
    },
  }
  overlays.set(carry, it)
  return it
}

export interface CarryPanel {
  /** Feed the panel's pointer events here instead of to the box. */
  handlePointer: (kind: PointerKind, x: number, y: number) => void
  /** Stop listening to the carry (a panel that is rebuilt makes a new one). */
  dispose: () => void
}

/**
 * Drag and drop for one box: a press on a tile that moves far enough is a
 * drag; a ghost follows the pointer; letting go drops it on the socket under
 * the pointer, and a drop that does not land springs back. Everything else is
 * the box's own pointer handling.
 */
export function carryPanel<T>(
  box: Box,
  carry: Carry<T>,
  opts: {
    /** Where a drop goes when the pointer is over no socket or tile of its own (a list's whole panel). */
    fallback?: CarryTarget<T>
    /**
     * Draw the ghost in this panel (default). Panels on a page pass `false`
     * and share a `carryOverlay`, so the ghost crosses from one to the next
     * instead of being clipped by each.
     */
    ghost?: boolean
  } = {}
): CarryPanel {
  const self = {}
  const drawGhost = opts.ghost !== false
  let press: { x: number; y: number } | null = null
  // Where the drag was picked up and where its ghost was last seen HERE.
  let home: { x: number; y: number } | null = null
  let last: { x: number; y: number } | null = null
  /*
  "A DRAG IS ON" BELONGS TO THE CARRY, not to this panel: a drag that starts
  here and is let go over another panel must drop there, and that panel did
  not see it start. So every panel asks the shared carry.
  */
  const dragging = () => carry.state.thing != null && carry.state.mode === 'drag'
  const ghost = carryGhost(box.el)
  const showGhost = (x: number, y: number) => {
    last = { x, y }
    if (drawGhost) ghost.show(x, y, String(carry.state.thing))
  }
  const hideGhost = () => ghost.hide()
  const stop = whenDropMisses(carry, () => dragOrigin.get(carry) === self, (why) => {
    hideGhost()
    if (drawGhost && why != null && home && last) ghost.springBack(last, home, why)
  })
  return {
    handlePointer(kind, x, y) {
      if (kind === 'down') {
        press = { x, y }
        pressedTile.delete(carry)
        box.handlePointer(kind, x, y)
        return
      }
      if (kind === 'move') {
        const tile = pressedTile.get(carry)
        if (
          press &&
          !dragging() &&
          tile &&
          Math.hypot(x - press.x, y - press.y) > DRAG_THRESHOLD
        ) {
          home = press
          dragOrigin.set(carry, self)
          // Until a drop lands, assume it will not (a release outside every
          // panel is a cancel nobody reports).
          lastRefusal.set(carry, [])
          carry.pickUp(tile.carryThing, tile.carryFrom, 'drag')
        }
        if (dragging()) showGhost(x, y)
        // The box keeps its hover bookkeeping, which is how a socket knows
        // the pointer is on it.
        box.handlePointer(kind, x, y)
        if (dragging() && opts.fallback && carry.state.target == null) carry.over(opts.fallback)
        return
      }
      if (kind === 'up') {
        press = null
        pressedTile.delete(carry)
        if (dragging()) {
          last = { x, y }
          const r = carry.drop()
          if (r.done) lastRefusal.delete(carry)
          else lastRefusal.set(carry, r.reasons.filter((w) => w !== 'dropped on nothing'))
          // Clear the box's press without activating anything.
          box.handlePointer('leave', 0, 0)
          return
        }
        box.handlePointer(kind, x, y)
        return
      }
      // leave: the drag goes on (into another panel, perhaps); only this
      // panel's view of it ends.
      press = null
      if (dragging()) {
        hideGhost()
        carry.over(null)
      }
      box.handlePointer(kind, x, y)
    },
    dispose: stop,
  }
}
