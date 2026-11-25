/*#
# radial menu

**A ring of choices you pick by pointing, not by aiming.** Each item owns a
whole slice of the circle, out to the edge of the screen, so a flick of a
stick (or a mouse moved roughly that way) picks it. That makes a radial menu
the fastest menu there is on a gamepad, and one of the few in a 3D view where
the targets have no edge to miss (Fitts' law with unbounded targets).

```js
import { b3d, b3dLight, b3dGround } from 'tosijs-3d'

const COLOURS = [
  { label: 'red', color: '#d33' },
  { label: 'gold', color: '#db3' },
  { label: 'green', color: '#3b5' },
  { label: 'blue', color: '#37d' },
  { label: 'violet', color: '#93c' },
]
let box = null
let babylon = null
let at = 0
const paint = (i) => {
  at = i
  box.material.diffuseColor = babylon.Color3.FromHexString(COLOURS[i].color)
  say.textContent = `The box is ${COLOURS[i].label}.`
}
const say = document.createElement('p')
const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      babylon = BABYLON
      box = el.make.box({ size: 1.5, y: 0.75, color: COLOURS[0].color })
    },
  },
  b3dLight({ intensity: 1 }),
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 })
)
const wheel = () => COLOURS.map((c, i) => ({ ...c, checked: i === at }))
scene.setDpad('right', {
  title: 'Paint',
  tap: () => paint((at + 1) % COLOURS.length),
  menu: wheel,
  handleSelect: (item) => paint(COLOURS.findIndex((c) => c.label === item.label)),
})
const open = document.createElement('button')
open.textContent = 'Open the ring'
open.onclick = () =>
  scene.openRadialMenu({
    title: 'Paint',
    items: wheel(),
    handleSelect: (item) => paint(COLOURS.findIndex((c) => c.label === item.label)),
  })
say.textContent = 'The box is red.'
preview.append(scene, say, open)
```
```css
.preview { display: flex; flex-direction: column; }
tosi-b3d { flex: 1; }
p { margin: 4px 8px; }
button { margin: 4px 8px; align-self: start; }
```

Tap the D-pad right (K on a keyboard) and the box takes the next colour.
Hold it and the ring opens: point the right stick (or the mouse) at a slice
and let go to paint it. Let go without pointing and nothing changes. So one button
does its everyday job on a tap and offers the menu on a hold, as GTA VI does
with its D-pad. The button opens the same ring from code: point and click.

## Using it

`b3d.setDpad(direction, { tap, menu, title, handleSelect })` gives a D-pad
direction (`'down'`, `'left'` or `'right'`; up is the system bar's) a tap and
a ring: `menu()` is read each time it opens, so it lists what is true now.
It returns its undo. While a direction has one, a game does not see that
button (a biped's reload on the left stops, for instance).

Any button can do the same: `b3d.holdMenu('leftBumper', { tap, menu, key,
handleSelect })` is GTA V's weapon wheel (`key` is a keyboard key that does
the same, a `KeyboardEvent.code`).

`b3d.openRadialMenu({ title, items, handleSelect })` opens one from code: the
right stick or the mouse points, a click or a press of A or B picks, and
moving the mouse back to the middle and clicking cancels. It returns its close.
In a headset it hangs ahead of you, and the right thumbstick points.

The ring is always picked with the RIGHT stick, so the left stick keeps
moving you while you choose.

**In a panel**, a control can offer a ring for a press and hold
(`menu()` in its semantics): holding B on it with the pad opens the ring, the
right stick points, letting go picks; a quick press still presses it. The
[inventory](/inventory-box/) does this: hold B on a thing and the ring is the
places it can go.

An item is `{ label, icon?, disabled?, checked?, weight?, apart? }` (any
other fields are yours: `handleSelect` gets the item back). `weight` is its
share of the ring. `apart` is for the choice you should not make by accident
(drop, delete): it points straight down, opposite the rest, narrower, with dead
space either side that picks nothing. A big target is easy to hit, so a
dangerous one is made small and lonely: Fitts' law, used backwards. `gated`
goes further, like a car's reverse gear: pushing straight out at it lights
nothing, so you go out to a neighbour and sweep round the rim into it (its
edge is dashed). The inventory's drop is both. `icon` is an icon name. Up to
eight read well.

`radialMenuSvg(items, options)` is the drawing alone (a `highlight(i)` on
it moves the lit slice in place); `radialPick` (radial-layout) is the pick.
*/
/*{ "parent": "ui" }*/

import { svgElements } from 'tosijs'
import { radialSlice, radialSlot } from './radial-layout.js'
import { iconGlyph } from './svg-icons.js'
import { w3dTheme } from './w3d-theme.js'

export interface RadialItem {
  label: string
  /** An icon name (`svgIcons`). */
  icon?: string
  /** Shown, never picked. */
  disabled?: boolean
  /** Marked as the current one. */
  checked?: boolean
  /** Its share of the ring (default 1). */
  weight?: number
  /** Set apart: narrower, dead space either side, pointing down (drop, delete). */
  apart?: boolean
  /** Gated: reached by sweeping round the rim into it, not straight out. */
  gated?: boolean
  [key: string]: unknown
}

export interface RadialMenuSvg extends SVGSVGElement {
  /** Light item `i` (-1: none), in place. */
  highlight(i: number): void
  /** The lit item, -1 for none. */
  readonly lit: number
  readonly items: readonly RadialItem[]
}

/** The drawing's size, in its own units (a square). */
export const RADIAL_SIZE = 400

const R_OUT = 190
const R_IN = 70
const R_ICON = 132

/** The gap between two slices, the same width all the way out (drawing units). */
const GAP = 8
/** How round a slice's corners are. */
const CORNER = 10

const pt = (a: number, r: number) => ({
  x: Math.sin(a) * r,
  y: -Math.cos(a) * r,
})
const fmt = (p: { x: number; y: number }) =>
  `${p.x.toFixed(2)} ${p.y.toFixed(2)}`

/** A whole ring (one item alone). */
function fullRing(): string {
  const half = (r: number, sweep: number) =>
    `A ${r} ${r} 0 1 ${sweep} ${fmt(
      pt(Math.PI, r)
    )} A ${r} ${r} 0 1 ${sweep} ${fmt(pt(0, r))}`
  return (
    `M ${fmt(pt(0, R_OUT))} ${half(R_OUT, 1)} ` +
    `M ${fmt(pt(0, R_IN))} ${half(R_IN, 0)} Z`
  )
}

/*
A slice from angle `from` to `to` (clockwise from up, +y down) with rounded
corners. Its sides are not radii: each runs parallel to the slice's own edge
line, GAP/2 inside it, so the gap between two slices is GAP wide at the hub and
at the rim alike. A side GAP/2 from the line at angle θ meets a circle of
radius r at θ + asin(GAP/2 / r): pulled in more at the hub, less at the rim.
Each corner is a quadratic curve with the sharp corner as its control point.
*/
function wedge(from: number, to: number): string {
  const h = GAP / 2
  const inset = (r: number) => Math.asin(Math.min(1, h / r))
  const aIn = from + inset(R_IN)
  const aOut = from + inset(R_OUT)
  const bIn = to - inset(R_IN)
  const bOut = to - inset(R_OUT)
  // Narrow slices get smaller corners (never more than a third of a side).
  const c = Math.max(
    0,
    Math.min(CORNER, ((bIn - aIn) * R_IN) / 3, (R_OUT - R_IN) / 3)
  )
  const toward = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    d: number
  ) => {
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    return {
      x: p.x + ((q.x - p.x) * d) / len,
      y: p.y + ((q.y - p.y) * d) / len,
    }
  }
  const Ai = pt(aIn, R_IN)
  const Ao = pt(aOut, R_OUT)
  const Bo = pt(bOut, R_OUT)
  const Bi = pt(bIn, R_IN)
  const outFrom = aOut + c / R_OUT
  const outTo = bOut - c / R_OUT
  const inFrom = bIn - c / R_IN
  const inTo = aIn + c / R_IN
  const bigOut = outTo - outFrom > Math.PI ? 1 : 0
  const bigIn = inFrom - inTo > Math.PI ? 1 : 0
  return (
    `M ${fmt(toward(Ai, Ao, c))} L ${fmt(toward(Ao, Ai, c))} ` +
    `Q ${fmt(Ao)} ${fmt(pt(outFrom, R_OUT))} ` +
    `A ${R_OUT} ${R_OUT} 0 ${bigOut} 1 ${fmt(pt(outTo, R_OUT))} ` +
    `Q ${fmt(Bo)} ${fmt(toward(Bo, Bi, c))} L ${fmt(toward(Bi, Bo, c))} ` +
    `Q ${fmt(Bi)} ${fmt(pt(inFrom, R_IN))} ` +
    `A ${R_IN} ${R_IN} 0 ${bigIn} 0 ${fmt(pt(inTo, R_IN))} ` +
    `Q ${fmt(Ai)} ${fmt(toward(Ai, Ao, c))} Z`
  )
}

/** A label in a slice: one line, or two split at the middle space. */
function labelText(label: string, cx: number, cy: number, ink: string) {
  const { text, tspan } = svgElements
  const words = label.split(' ')
  let lines = [label]
  if (label.length > 8 && words.length > 1) {
    let best = 1
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' ').length
      const b = words.slice(k).join(' ').length
      const was = Math.abs(
        words.slice(0, best).join(' ').length -
          words.slice(best).join(' ').length
      )
      if (Math.abs(a - b) < was) best = k
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  }
  const size = Math.max(...lines.map((l) => l.length)) > 9 ? 17 : 21
  const top = cy - ((lines.length - 1) * size * 1.1) / 2 + size * 0.35
  return text(
    {
      'text-anchor': 'middle',
      'font-size': size,
      'font-family': w3dTheme.fontFamily,
      'font-weight': w3dTheme.headingWeight,
      fill: ink,
    },
    ...lines.map((l, i) => tspan({ x: cx, y: top + i * size * 1.1 }, l))
  )
}

/**
 * A radial menu as an SVG: a ring of slices with each item's icon (or the
 * start of its label), the lit one's label and the title in the middle.
 */
export function radialMenuSvg(
  items: readonly RadialItem[],
  options: { title?: string } = {}
): RadialMenuSvg {
  const { path, text, g, svg, circle } = svgElements
  const n = Math.max(1, items.length)
  const half = RADIAL_SIZE / 2
  const theme = w3dTheme
  const slices: SVGPathElement[] = []
  const inks: SVGElement[] = []
  const ring = g({ transform: `translate(${half} ${half})` })
  items.forEach((item, i) => {
    const { from, to } = radialSlice(i, items)
    const s = path({
      d: n === 1 && !item.apart ? fullRing() : wedge(from, to),
      fill: theme.buttonBg,
      stroke: 'rgba(255,255,255,0.25)',
      'stroke-width': 2,
      'fill-rule': 'evenodd',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      // A gated slice's edge is dashed: there is a way in, but not straight.
      ...(item.gated ? { 'stroke-dasharray': '4 7' } : {}),
    }) as unknown as SVGPathElement
    slices.push(s)
    ring.append(s)
    const at = radialSlot(i, items)
    const cx = at.x * R_ICON
    const cy = at.y * R_ICON
    const ink = item.disabled ? theme.muted : theme.text
    const mark = item.icon
      ? (iconGlyph(item.icon, {
          color: ink,
          size: 40,
          x: cx - 20,
          y: cy - 20,
        }) as unknown as SVGElement)
      : (labelText(item.label, cx, cy, ink) as unknown as SVGElement)
    inks.push(mark)
    ring.append(mark)
    if (item.checked)
      ring.append(
        circle({
          cx: at.x * (R_OUT - 16),
          cy: at.y * (R_OUT - 16),
          r: 6,
          fill: theme.accent,
        })
      )
  })
  const title = text(
    {
      x: 0,
      y: -10,
      'text-anchor': 'middle',
      'font-size': 20,
      'font-family': theme.fontFamily,
      fill: theme.muted,
    },
    options.title ?? ''
  )
  const label = text(
    {
      x: 0,
      y: 22,
      'text-anchor': 'middle',
      'font-size': 24,
      'font-family': theme.fontFamily,
      'font-weight': theme.headingWeight,
      fill: theme.text,
    },
    ''
  )
  ring.append(
    circle({ cx: 0, cy: 0, r: R_IN - 6, fill: theme.panelBg }),
    title,
    label
  )
  const el = svg(
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${RADIAL_SIZE} ${RADIAL_SIZE}`,
      width: RADIAL_SIZE,
      height: RADIAL_SIZE,
    },
    ring
  ) as unknown as RadialMenuSvg
  let lit = -1
  const highlight = (i: number) => {
    const next = i >= 0 && i < items.length && !items[i].disabled ? i : -1
    if (next === lit) return
    lit = next
    slices.forEach((s, k) =>
      s.setAttribute('fill', k === lit ? theme.accent : theme.buttonBg)
    )
    label.textContent = lit >= 0 ? items[lit].label : ''
  }
  Object.defineProperties(el, {
    highlight: { value: highlight },
    lit: { get: () => lit },
    items: { value: items },
  })
  return el
}
