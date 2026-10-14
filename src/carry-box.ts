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

const host = svg({ viewBox: '0 0 420 360', width: 420, height: 360, style: 'touch-action:none' })
preview.append(host)
let panel = null
function build() {
  host.textContent = ''
  const tiles = [...bag].map((t) => carryTile({ carry, thing: t, from: 'bag', label: t, decorations: () => LOOK[t] }))
  const sockets = ['left', 'right'].map((side) =>
    carrySocket({ carry, target: handTarget(side), label: side + ' hand', width: 180, holding: hands[side] ? carryTile({ carry, thing: hands[side], from: side, label: hands[side], decorations: () => LOOK[hands[side]] }) : null })
  )
  const children = [ui.textBlock('Bag', { font: { size: 14, weight: 600 }, color: '#ddd' }), ...tiles, carrySocket({ carry, target: bagTarget, label: 'put back in the bag', width: 380, height: 30 }), ui.textBlock('Hands', { font: { size: 14, weight: 600 }, color: '#ddd' }), ...sockets]
  const b = ui.box({ width: 420, padding: 12, gap: 10, background: '#1c2230', radius: 10 }, ...children)
  host.append(b.el)
  panel = carryPanel(b, carry)
}
build()
const at = (e) => { const p = ui.svgPoint(host, e.clientX, e.clientY); return [p.x, p.y] }
host.addEventListener('pointerdown', (e) => panel.handlePointer('down', ...at(e)))
host.addEventListener('pointermove', (e) => panel.handlePointer('move', ...at(e)))
host.addEventListener('pointerup', (e) => panel.handlePointer('up', ...at(e)))
host.addEventListener('pointerleave', () => panel.handlePointer('leave', 0, 0))
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
  pointer (or puts it back). A tap on a tile and then a tap on a socket does
  the same without carrying it.

Several panels can share one `carry`, which is how a drag goes from one to
another: each reports what its own sockets see.
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

export interface CarryTileChild<T> extends BoxChild {
  carryThing: T
  carryFrom: string
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
}

/** A thing you can pick up: a label and its decorations. */
export function carryTile<T>(opts: CarryTileOptions<T>): CarryTileChild<T> {
  const { carry, thing, from, label } = opts
  const w = opts.width ?? 120
  const h = opts.height ?? 34
  const deco = opts.decorations?.() ?? {}
  const outline = deco.outline ? OUTLINES[deco.outline] ?? deco.outline : null
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
        x: 10,
        y: deco.bar != null ? h / 2 + 1 : h / 2 + 5,
        fill: '#e8e8e8',
        'font-family': 'system-ui, sans-serif',
        'font-size': '13',
      },
      label
    ),
  ]
  if (deco.bar != null) {
    const v = Math.max(0, Math.min(1, deco.bar))
    parts.push(
      rect({ x: 10, y: h - 9, width: w - 20, height: 4, rx: 2, fill: '#141a24' }),
      rect({ x: 10, y: h - 9, width: (w - 20) * v, height: 4, rx: 2, fill: deco.barColor ?? '#5fbf6a' })
    )
  }
  if (deco.badge) {
    parts.push(
      text(
        {
          x: w - 8,
          y: 14,
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
  carry.subscribe(restyle)
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
    },
    // The two-tap path: tap to pick up, tap it again to put it down.
    handleActivate() {
      if (carry.state.thing === thing) carry.cancel()
      else carry.pickUp(thing, from, 'tap')
    },
  }
  return child
}

export interface CarrySocketChild<T> extends BoxChild {
  carryTarget: CarryTarget<T>
}

export interface CarrySocketOptions<T> {
  carry: Carry<T>
  target: CarryTarget<T>
  label: string
  width?: number
  height?: number
  /** What is in it now, drawn inside it. */
  holding?: BoxChild | null
}

/** A place a carried thing can go: lights, dims and says why. */
export function carrySocket<T>(opts: CarrySocketOptions<T>): CarrySocketChild<T> {
  const { carry, target, label } = opts
  const w = opts.width ?? 160
  const h = opts.height ?? (opts.holding ? 66 : 52)
  const frame = rect({
    x: 1,
    y: 1,
    width: w - 2,
    height: h - 2,
    rx: 8,
    fill: '#161b25',
    stroke: '#55607a',
    'stroke-width': 1.5,
    'stroke-dasharray': '5 4',
  })
  const caption = text(
    {
      x: 10,
      y: 14,
      fill: '#8a96ad',
      'font-family': 'system-ui, sans-serif',
      'font-size': '11',
    },
    label
  )
  const why = text(
    {
      x: 10,
      y: h - 8,
      fill: '#f0907c',
      'font-family': 'system-ui, sans-serif',
      'font-size': '11',
    },
    ''
  )
  const parts: Element[] = [frame, caption]
  if (opts.holding) {
    // Under the caption, clear of the reason line.
    const inner = g({ transform: 'translate(10, 20)' }, opts.holding.el)
    parts.push(inner)
  }
  parts.push(why)
  const el = g({ 'data-carry-socket': '' }, ...parts) as unknown as SVGGElement
  let hovered = false
  const restyle = () => {
    const s = carry.state
    if (s.thing == null) {
      el.setAttribute('opacity', '1')
      frame.setAttribute('stroke', '#55607a')
      frame.setAttribute('fill', '#161b25')
      why.textContent = ''
      return
    }
    const v = carry.verdictFor(target)
    const ok = !!v?.ok
    el.setAttribute('opacity', ok ? '1' : '0.45')
    frame.setAttribute('stroke', ok ? '#6fd08c' : '#55607a')
    frame.setAttribute('fill', hovered && ok ? '#1f3328' : '#161b25')
    why.textContent = hovered && v && !ok ? v.reasons[0] ?? '' : ''
  }
  carry.subscribe(restyle)
  return {
    el,
    kind: 'block',
    focusable: true,
    carryTarget: target,
    measure: () => ({ width: w, height: h }),
    setState(s: BoxChildState) {
      hovered = s.hovered || s.focused
      if (carry.state.thing != null) {
        if (hovered) carry.over(target)
        else if (carry.state.target === target) carry.over(null)
      }
      restyle()
    },
    // The second tap of the two-tap path.
    handleActivate() {
      if (carry.state.thing != null) carry.drop(target)
    },
  }
}

export interface CarryPanel {
  /** Feed the panel's pointer events here instead of to the box. */
  handlePointer: (kind: PointerKind, x: number, y: number) => void
}

/**
 * Drag and drop for one box: a press on a tile that moves far enough is a
 * drag; a ghost follows the pointer; letting go drops it on the socket under
 * the pointer. Everything else is the box's own pointer handling.
 */
export function carryPanel<T>(box: Box, carry: Carry<T>): CarryPanel {
  let press: { x: number; y: number } | null = null
  let dragging = false
  const ghost = g(
    { 'pointer-events': 'none', opacity: '0.85' },
    rect({ x: -50, y: -14, width: 100, height: 28, rx: 6, fill: '#3b4860', stroke: '#9fb0c8' })
  ) as unknown as SVGGElement
  const ghostText = text(
    {
      x: 0,
      y: 5,
      fill: '#fff',
      'text-anchor': 'middle',
      'font-family': 'system-ui, sans-serif',
      'font-size': '12',
    },
    ''
  )
  ghost.append(ghostText)
  const showGhost = (x: number, y: number) => {
    if (!ghost.isConnected) box.el.append(ghost)
    ghost.setAttribute('transform', `translate(${x}, ${y})`)
  }
  const hideGhost = () => ghost.remove()
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
          !dragging &&
          tile &&
          Math.hypot(x - press.x, y - press.y) > DRAG_THRESHOLD
        ) {
          dragging = true
          carry.pickUp(tile.carryThing, tile.carryFrom, 'drag')
          ghostText.textContent = String(tile.carryThing)
        }
        if (dragging) showGhost(x, y)
        // The box keeps its hover bookkeeping, which is how a socket knows
        // the pointer is on it.
        box.handlePointer(kind, x, y)
        return
      }
      if (kind === 'up') {
        press = null
        pressedTile.delete(carry)
        if (dragging) {
          dragging = false
          hideGhost()
          carry.drop()
          // Clear the box's press without activating anything.
          box.handlePointer('leave', 0, 0)
          return
        }
        box.handlePointer(kind, x, y)
        return
      }
      // leave
      if (dragging) {
        hideGhost()
        carry.over(null)
      }
      box.handlePointer(kind, x, y)
    },
  }
}
