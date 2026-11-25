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
  { label: 'red', color: '#dd3333' },
  { label: 'gold', color: '#ddbb33' },
  { label: 'green', color: '#33bb55' },
  { label: 'blue', color: '#3377dd' },
  { label: 'violet', color: '#9933cc' },
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
// Each slice wears its colour (\`color\` on an item).
const wheel = () => COLOURS.map((c, i) => ({ ...c, checked: i === at }))
const pick = (item) => paint(COLOURS.findIndex((c) => c.label === item.label))
const painting = {
  title: 'Paint',
  tap: () => paint((at + 1) % COLOURS.length),
  menu: wheel,
  handleSelect: pick,
}
const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      babylon = BABYLON
      box = el.make.box({ size: 1.5, y: 0.75, color: COLOURS[0].color })
      // Press and hold the box: drag toward a colour and let go.
      el.meshMenu(box, painting)
    },
  },
  b3dLight({ intensity: 1 }),
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 })
)
scene.setDpad('right', painting)
const open = document.createElement('button')
open.textContent = 'Open the ring'
// Press and drag off the button to pick; or click, then click a slice.
open.onpointerdown = (e) =>
  scene.openRadialMenu({
    title: 'Paint',
    items: wheel(),
    handleSelect: pick,
    pointer: { x: e.clientX, y: e.clientY },
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
with its D-pad.

**With the mouse** (or a finger, or a headset's trigger), press and hold the
box: the ring opens, drag toward a colour and let go. A quick click on the box
is the tap. The button does the same from code: press it and drag off toward a
slice, or just click it and then click a slice.

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
In a headset it hangs ahead of you, and the right thumbstick points. Given
`pointer` (a press's client x, y, from a `pointerdown` handler), the press
holds it open: the drag from that point lights a slice and letting go picks.
Let go without dragging and it stays open, to click.

`b3d.meshMenu(mesh, { tap, menu, title, handleSelect })` puts a ring on a
press and hold on a mesh (or its children; or pass a test on the mesh pressed).
A quick press is `tap`, and a press that moves before the hold turns the view
as usual, so it costs the camera nothing.

The ring is always picked with the RIGHT stick, so the left stick keeps
moving you while you choose.

**In a panel**, a control can offer a ring for a press and hold
(`menu()` in its semantics): holding B on it with the pad opens the ring, the
right stick points, letting go picks; a quick press still presses it. With the
mouse (a finger, a headset's trigger) a press and hold on it does the same:
drag toward a slice and let go. A press that moves first is still a drag. The
[inventory](/inventory-box/) does this: hold B on a thing and the ring is the
places it can go.

An item is `{ label, icon?, color?, disabled?, checked?, weight?, apart?, gated? }` (any
other fields are yours: `handleSelect` gets the item back). `weight` is its
share of the ring. `color` (any CSS colour) is its slice's colour, toned down
at rest and full when lit, with ink that reads on it. `apart` is for the choice you should not make by accident
(drop, delete): it points straight down, opposite the rest, narrower, with dead
space either side that picks nothing. A big target is easy to hit, so a
dangerous one is made small and lonely: Fitts' law, used backwards. `gated`
goes further, like a car's reverse gear: pushing straight out at it lights
nothing, so you go out to a neighbour and sweep round the rim into it. It is
drawn as that path: no inner part, and an arm along the rim each way toward
its neighbours. The inventory's drop is both; so would be a shop's "sell all
junk" or "repair all". `icon` is an icon name. Up to
eight read well.

`radialMenuSvg(items, options)` is the drawing alone (a `highlight(i)` on
it moves the lit slice in place); `radialPick` (radial-layout) is the pick.
*/
/*{ "parent": "ui" }*/

import { svgElements } from 'tosijs'
import { RADIAL_APART_GAP, radialSlice, radialSlot } from './radial-layout.js'
import { iconGlyph } from './svg-icons.js'
import { w3dTheme } from './w3d-theme.js'
import { contrastInk, formatColor, parseColor, type Rgba } from './color.js'

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
  /** Its slice's colour (any CSS colour): toned down at rest, full when lit. */
  color?: string
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

/** A corner of an outline (polar), and how it joins the next: straight or round the middle. */
interface Corner {
  a: number
  r: number
  next: 'line' | 'arc'
}

/*
An outline of straight lines and arcs about the middle, every corner rounded:
each side is trimmed by `c` at both ends (an arc by c / r of angle) and a
quadratic curve with the sharp corner as its control point joins them.
*/
function rounded(corners: Corner[], c: number): string {
  const n = corners.length
  const xy = (k: Corner) => pt(k.a, k.r)
  // The point `d` along a side (`kind`) from corner i toward corner j.
  const along = (i: number, j: number, d: number, kind: Corner['next']) => {
    const p = corners[i]
    const q = corners[j]
    if (kind === 'arc') return pt(p.a + (Math.sign(q.a - p.a) * d) / p.r, p.r)
    const P = xy(p)
    const Q = xy(q)
    const len = Math.hypot(Q.x - P.x, Q.y - P.y) || 1
    return {
      x: P.x + ((Q.x - P.x) * d) / len,
      y: P.y + ((Q.y - P.y) * d) / len,
    }
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const kind = corners[i].next
    const start = along(i, j, c, kind)
    const end = along(j, i, c, kind)
    d += i === 0 ? `M ${fmt(start)} ` : `${fmt(start)} `
    if (corners[i].next === 'arc') {
      const span = corners[j].a - corners[i].a
      const big = Math.abs(span) - (2 * c) / corners[i].r > Math.PI ? 1 : 0
      const r = corners[i].r
      d += `A ${r} ${r} 0 ${big} ${span > 0 ? 1 : 0} ${fmt(end)} `
    } else d += `L ${fmt(end)} `
    d += `Q ${fmt(xy(corners[j]))} `
  }
  // The last curve ends where the outline began.
  return d + `${fmt(along(0, 1, c, corners[0].next))} Z`
}

/** A side GAP/2 inside the line at angle θ meets a circle of radius r this far in. */
const inset = (r: number) => Math.asin(Math.min(1, GAP / 2 / r))

/*
A slice from angle `from` to `to` (clockwise from up, +y down). Its sides are
not radii: each runs parallel to the slice's own edge line, GAP/2 inside it,
so the gap between two slices is GAP wide at the hub and at the rim alike. A
side GAP/2 from the line at angle θ meets a circle of radius r at
θ + asin(GAP/2 / r): pulled in more at the hub, less at the rim.
*/
function wedge(from: number, to: number): string {
  const c = Math.max(
    0,
    Math.min(CORNER, ((to - from) * R_IN) / 3, (R_OUT - R_IN) / 3)
  )
  return rounded(
    [
      { a: from + inset(R_IN), r: R_IN, next: 'line' },
      { a: from + inset(R_OUT), r: R_OUT, next: 'arc' },
      { a: to - inset(R_OUT), r: R_OUT, next: 'line' },
      { a: to - inset(R_IN), r: R_IN, next: 'arc' },
    ],
    c
  )
}

/** Where a gated slice starts: its inner part is not there (you cannot come from the middle). */
const R_GATE = R_IN + (R_OUT - R_IN) * 0.42
/** How thick a gated slice's arms are, along the rim. */
const ARM = 24

/*
A GATED slice draws its path: no inner part (straight out from the middle
lights nothing), and an arm along the rim each way, across the dead gap toward
its neighbours, which is the way in: out to a neighbour, then round. Two Ls
back to back. `reach` is how far (radians) the arms go beyond the slice.
*/
function gatedWedge(from: number, to: number, reach: number): string {
  if (!(reach > 0.01)) {
    return rounded(
      [
        { a: from + inset(R_GATE), r: R_GATE, next: 'line' },
        { a: from + inset(R_OUT), r: R_OUT, next: 'arc' },
        { a: to - inset(R_OUT), r: R_OUT, next: 'line' },
        { a: to - inset(R_GATE), r: R_GATE, next: 'arc' },
      ],
      CORNER * 0.6
    )
  }
  const rArm = R_OUT - ARM
  return rounded(
    [
      { a: from + inset(R_GATE), r: R_GATE, next: 'line' },
      { a: from + inset(rArm), r: rArm, next: 'arc' },
      { a: from - reach, r: rArm, next: 'line' },
      { a: from - reach, r: R_OUT, next: 'arc' },
      { a: to + reach, r: R_OUT, next: 'line' },
      { a: to + reach, r: rArm, next: 'arc' },
      { a: to - inset(rArm), r: rArm, next: 'line' },
      { a: to - inset(R_GATE), r: R_GATE, next: 'arc' },
    ],
    CORNER * 0.6
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

/*
How far a gated slice's arms reach past it: across its dead gap (an item set
apart has one each side, RADIAL_APART_GAP of an ordinary slice), stopping a
GAP short of the neighbour. No gap, no arms.
*/
function armReach(item: RadialItem, from: number, to: number): number {
  if (!item.apart) return 0
  const unit = (to - from) / Math.max(0.01, item.weight ?? 1)
  return RADIAL_APART_GAP * unit - (GAP * 1.5) / R_OUT
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
  /*
  A slice's two fills, at rest and lit. A coloured item is its colour mixed
  45% toward the theme's button at rest and the colour itself when lit, with
  black or white ink, whichever reads on it.
  */
  const mix = (a: Rgba, b: Rgba, t: number): Rgba => ({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: 1,
  })
  const fills = items.map((item) => {
    const c = item.color ? parseColor(item.color) : null
    const bg = parseColor(theme.buttonBg)
    if (c == null || bg == null)
      return { rest: theme.buttonBg, lit: theme.accent, ink: null }
    return {
      rest: formatColor(mix(c, bg, 0.45)),
      lit: formatColor({ ...c, a: 1 }),
      ink: contrastInk(mix(c, bg, 0.2)),
    }
  })
  items.forEach((item, i) => {
    const { from, to } = radialSlice(i, items)
    const s = path({
      d: item.gated
        ? gatedWedge(from, to, armReach(item, from, to))
        : n === 1 && !item.apart
        ? fullRing()
        : wedge(from, to),
      fill: fills[i].rest,
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
    const rMark = item.gated ? (R_GATE + R_OUT) / 2 : R_ICON
    const cx = at.x * rMark
    const cy = at.y * rMark
    const ink = item.disabled ? theme.muted : fills[i].ink ?? theme.text
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
    slices.forEach((s, k) => {
      s.setAttribute('fill', k === lit ? fills[k].lit : fills[k].rest)
      // A coloured slice is lit by its own colour, so it also takes a rim.
      s.setAttribute(
        'stroke',
        k === lit && items[k].color ? theme.text : 'rgba(255,255,255,0.25)'
      )
      s.setAttribute('stroke-width', k === lit && items[k].color ? '4' : '2')
    })
    label.textContent = lit >= 0 ? items[lit].label : ''
  }
  Object.defineProperties(el, {
    highlight: { value: highlight },
    lit: { get: () => lit },
    items: { value: items },
  })
  return el
}
