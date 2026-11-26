/*#
# radial menu

**A ring of choices you pick by pointing, not by aiming.** Each item owns a
whole slice of the circle, out to the edge of the screen, so a flick of a
stick (or a mouse moved roughly that way) picks it. That makes a radial menu
the fastest menu there is on a gamepad, and one of the few in a 3D view where
the targets have no edge to miss (Fitts' law with unbounded targets).

```js
import { b3d, b3dLight, b3dGround, fitPanel, label3d, color3d, button3d } from 'tosijs-3d'

const COLOURS = [
  { label: 'red', color: '#dd3333' },
  { label: 'gold', color: '#ddbb33' },
  { label: 'green', color: '#33bb55' },
  { label: 'blue', color: '#3377dd' },
  { label: 'violet', color: '#9933cc' },
]
let scene = null
let box = null
let babylon = null
let at = 0
let custom = '#ff8800'
const say = document.createElement('p')
const hidden = () => box.visibility < 1
const tell = () => {
  const what = at < 0 ? custom : COLOURS[at].label
  say.textContent = hidden() ? 'The box is hidden.' : `The box is ${what}.`
}
const paint = (i) => {
  at = i
  box.visibility = 1
  box.material.diffuseColor = babylon.Color3.FromHexString(i < 0 ? custom : COLOURS[i].color)
  tell()
}
// A colour of your own, picked in the scene's modal (so it works in a headset).
const pickCustom = () => {
  let close = null
  const { svg, height } = fitPanel([
    label3d({ text: 'Custom colour' }),
    color3d({ value: custom, alpha: false, handleChange: (hex) => { custom = hex; paint(-1) } }),
    button3d({ label: 'done', default: true, handleClick: () => close?.() }),
  ], { width: 300 })
  close = scene.showModal(svg, height)
}
// Each slice wears its colour (`color`). HIDE is gated: pull straight out
// into it, then sideways either way to confirm. CUSTOM is set apart: small,
// at the bottom, with empty space round it.
const wheel = () => [
  ...COLOURS.map((c, i) => ({ ...c, checked: i === at })),
  { label: hidden() ? 'show' : 'hide', gated: !hidden() },
  { label: 'custom', icon: 'colorPicker', color: custom, apart: true, checked: at < 0 },
]
const pick = (item) => {
  if (item.label === 'hide' || item.label === 'show') {
    // Hidden is a ghost, so it can still be pressed to bring it back.
    box.visibility = hidden() ? 1 : 0.15
    tell()
  } else if (item.label === 'custom') pickCustom()
  else paint(COLOURS.findIndex((c) => c.label === item.label))
}
const painting = {
  title: 'Paint',
  tap: () => paint((Math.max(0, at) + 1) % COLOURS.length),
  menu: wheel,
  handleSelect: pick,
}
scene = b3d(
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
Hold it and the ring opens: point either stick (or the mouse) at a slice
and let go to paint it. **Hide** is gated: push straight out into it (it
half lights), then move sideways either way to confirm. **Custom**, small at
the bottom, opens a colour picker. To get out without choosing, let the
stick go back to the middle (or move the mouse there) and let go: nothing is
lit in the middle, and that undoes an armed or confirmed gate too. So one button
does its everyday job on a tap and offers the menu on a hold, as GTA VI does
with its D-pad.

**With the mouse** (or a finger, or a headset's trigger), press and hold the
box: the ring opens where you pressed, drag toward a colour and let go. A quick click on the box
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

`b3d.openRadialMenu({ title, items, handleSelect })` opens one from code:
either stick or the mouse points, a click or A picks, and B or a click in the
middle dismisses. It returns its close.
In a headset, opened from code it hangs ahead of you and either thumbstick
points. Opened by a press and hold with the trigger (a mesh, a panel control),
it is drawn where the press landed, a hand-span wide and turned to you, and
the controller's ray points at it: aim at a slice and let go, or aim at the
middle and let go to pick nothing. Rest on a chevron to go down a level. Given
`pointer` (a press's client x, y, from a `pointerdown` handler), it is drawn
there and the press holds it open: the drag from that point lights a slice and letting go picks.
Let go without dragging and it stays open, to click.

`b3d.meshMenu(mesh, { tap, menu, title, handleSelect })` puts a ring on a
press and hold on a mesh (or its children; or pass a test on the mesh pressed).
A quick press is `tap`, and a press that moves before the hold turns the view
as usual, so it costs the camera nothing.

**Clicking the right stick** (either thumbstick in a headset) picks what is
lit and closes the ring, held or not; with nothing lit it dismisses. **A pick
blinks** before it acts, as a Mac menu's chosen item did: lit, then off, on,
off, on, a thirtieth of a second each, then the ring goes or opens the next
level (`RADIAL_BLINK_MS`). A keyboard ring's pick blinks off and on, shorter,
because typing waits on it.

Either stick picks, since a ring held open by B leaves only the left thumb
free. The left stick keeps moving you until you push it past the middle of
its travel; then it is the ring's until the ring closes.

**In a panel**, a control can offer a ring for a press and hold
(`menu()` in its semantics): holding B on it with the pad opens the ring,
either stick points, letting go picks; a quick press still presses it. In a
headset a press and hold with the trigger does the same: aim toward a slice and
let go. A mouse does not, since it can already drag. The
[inventory](/inventory-box/) does this: hold B on a thing (in a list or a slot)
and the ring is the places it can go. On an empty slot, the things that fit,
from both halves of the loadout; on a full slot, where its thing can go and a
**swap** sub-ring of what could take its place (the pistol for the sword in
your hand: the two change places). A sub-ring's choices call their own
`handleSelect`; the ring's `handleSelect` hears only its top level.

An item is `{ label, icon?, color?, disabled?, checked?, weight?, apart?, gated? }` (any
other fields are yours: `handleSelect` gets the item back). `weight` is its
share of the ring. `color` (any CSS colour) is its slice's colour, toned down
at rest and full when lit, with ink that reads on it. `apart` is for the choice you should not make by accident
(drop, delete): it points straight down, opposite the rest, narrower, with dead
space either side that picks nothing. A big target is easy to hit, so a
dangerous one is made small and lonely: Fitts' law, used backwards. `gated`
goes further, like a car's reverse gear: pull straight out into it, which
arms it and picks nothing yet, then move sideways, either way and however far,
to confirm. Arriving on it from another slice never arms it, so no sweep
round the ring lands there by accident. A gated slice is narrow, with empty
space either side, and is drawn as a T: the stem from the middle out, an arm
along the rim each way. The inventory's drop and close are gated; so would be a shop's "sell all
junk" or "repair all". `icon` is an icon name. Up to
eight read well.

**Sub-rings.** An item with `items` (a list, or a function read when it
opens) opens them in its place, marked by a chevron at its rim. Its way
back is a slice of its own at twelve o'clock (**back**). In a ring opened by
a hold (D-pad up, B, the trigger, the grips), the hold lasts the whole way:
see resting, below; letting go picks the lit choice or closes, on a chevron
or back too. In a ring nothing holds (opened from code, or clicked), picking
a chevron opens it; press A (or what opened it) again, point and let go; a
click picks with a mouse, and B goes back. An item's own `handleSelect` is
called when it is picked, as well as the ring's.

**Resting opens a level, as in a marking menu.** Rest on a sub-ring item for
half a second (`RADIAL_DWELL_MS`) and it opens, still held by whatever was
holding the ring, so one continuous drag (or one held button and a stick)
can go down several levels and let go on the choice. In the new level the
slice you are pointing at does not light until you move off it, so the push
that opened it does not pick in it; any other choice is one move away. Rest on **back** and it goes back up a
level the same way.

**The system bar as a ring.** Holding D-pad up opens the scene's system bar
as a ring, each button a slice with its own icon, and a [bar menu](/bar-menu/)
a sub-ring (a menu of choices shows the current one on the bar and on its
slice, and in its sub-ring's middle). A panel that is showing is ticked, and picking it closes it;
with any showing, **close all** sits apart at the bottom. Holding up never
closes anything by itself. Holding **both bumpers** (L1 and R1) for half a
second opens it too, and in a headset **both grips**, unless a game has the
bumpers; a stick points and letting go picks. In a headset a ring that a
press did not open is drawn straight ahead of your eyes. `b3d.openSystemRing()` opens it from code. That is how a scene
with no visible UI still has all of it a hold away.

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
  /** An icon name (`svgIcons`), or an SVG element (cloned: a button's own icon). */
  icon?: string | SVGElement
  /** Shown, never picked. */
  disabled?: boolean
  /** Marked as the current one. */
  checked?: boolean
  /** Its share of the ring (default 1). */
  weight?: number
  /** Set apart: narrower, dead space either side, pointing down (drop, delete). */
  apart?: boolean
  /** Gated: pull straight out into it, then sideways to confirm (see `gatedPick`). */
  gated?: boolean
  /** Its slice's colour (any CSS colour): toned down at rest, full when lit. */
  color?: string
  /** A SUB-RING: picking this item opens these in its place (read when it opens). */
  items?: RadialItem[] | (() => RadialItem[])
  /** Empty space, never drawn or picked (with `toward`: a ring fanned to one side). */
  spacer?: boolean
  /** Turn the ring so this item points here (radians clockwise from up). */
  toward?: number
  /** Called when this item is picked (beside the ring's own `handleSelect`). */
  handleSelect?: () => void
  [key: string]: unknown
}

/** The hub under the pointer (a click there dismisses), or not. */
/** What the pointer over the hub would do: close the ring, or pick the middle (a keyboard ring's key). */
export type RadialHubZone = 'close' | 'pick' | null

/** The hub's radius (drawing units): a click inside it is the hub's, not a slice's. */
export const RADIAL_HUB = 64

/** An item's icon, sized and placed (a name or an element). */
function mark(
  icon: string | SVGElement,
  opts: { color: string; size: number; x: number; y: number }
): SVGElement {
  if (typeof icon === 'string')
    return iconGlyph(icon, opts) as unknown as SVGElement
  const el = icon.cloneNode(true) as SVGElement
  el.setAttribute('x', String(opts.x))
  el.setAttribute('y', String(opts.y))
  el.setAttribute('width', String(opts.size))
  el.setAttribute('height', String(opts.size))
  el.setAttribute('color', opts.color)
  el.style.removeProperty('height')
  el.style.removeProperty('width')
  return el
}

export interface RadialMenuSvg extends SVGSVGElement {
  /**
   * Light item `i` (-1: none), in place. `armed` is a gated item pulled into
   * and waiting for its sideways move: drawn half lit, its edge solid.
   */
  highlight(i: number, armed?: number): void
  /** The lit item, -1 for none. */
  readonly lit: number
  /** Light the hub (the pointer is over it: a click dismisses, or picks the middle), or not. */
  hubLit(zone: RadialHubZone): void
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

/** How thick a gated slice's arms are, along the rim. */
const ARM = 24

/*
A GATED slice draws its gesture as a T: the stem runs from the hub to the rim
(pull straight out into it), and an arm along the rim each way, into the empty
gap beside it (then sideways, either way, to confirm). `reach` is how far
(radians) the arms go beyond the slice.
*/
function gatedWedge(from: number, to: number, reach: number): string {
  if (!(reach > 0.01)) return wedge(from, to)
  const rArm = R_OUT - ARM
  return rounded(
    [
      { a: from + inset(R_IN), r: R_IN, next: 'line' },
      { a: from + inset(rArm), r: rArm, next: 'arc' },
      { a: from - reach, r: rArm, next: 'line' },
      { a: from - reach, r: R_OUT, next: 'arc' },
      { a: to + reach, r: R_OUT, next: 'line' },
      { a: to + reach, r: rArm, next: 'arc' },
      { a: to - inset(rArm), r: rArm, next: 'line' },
      { a: to - inset(R_IN), r: R_IN, next: 'arc' },
    ],
    CORNER * 0.6
  )
}

/** A label in a slice: one line, or two split at the middle space. */
function labelText(
  label: string,
  cx: number,
  cy: number,
  ink: string,
  scale = 1,
  weight: string = w3dTheme.headingWeight
) {
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
  // One character (a keyboard's accent, a punctuation mark) is a small glyph:
  // drawn larger.
  const longest = Math.max(...lines.map((l) => [...l].length))
  const size = (longest > 9 ? 17 : longest === 1 ? 26 : 21) * scale
  const top = cy - ((lines.length - 1) * size * 1.1) / 2 + size * 0.35
  return text(
    {
      'text-anchor': 'middle',
      'font-size': size,
      'font-family': w3dTheme.fontFamily,
      'font-weight': weight,
      fill: ink,
    },
    ...lines.map((l, i) => tspan({ x: cx, y: top + i * size * 1.1 }, l))
  )
}

/*
How far a gated slice's arms reach past it: across its empty gap (a gated or
apart item has one each side, RADIAL_APART_GAP of an ordinary slice), stopping
a GAP short of the neighbour.
*/
function armReach(item: RadialItem, from: number, to: number): number {
  if (!item.apart && !item.gated) return 0
  const unit =
    (to - from) / Math.max(0.01, item.weight ?? (item.gated ? 0.6 : 1))
  return RADIAL_APART_GAP * unit - (GAP * 1.5) / R_OUT
}

/**
 * A radial menu as an SVG: a ring of slices with each item's icon (or the
 * start of its label), the lit one's label and the title in the middle.
 */
export function radialMenuSvg(
  items: readonly RadialItem[],
  options: {
    title?: string
    /**
     * How big the slices' names are (default 1). A ring of single characters
     * drawn small (the keyboard's) reads better larger.
     */
    fontScale?: number
    /**
     * The weight of the slices' names and of `centre` (default the theme's
     * heading weight). The keyboard's ring uses its keys' (the text weight).
     */
    fontWeight?: string
    /**
     * The middle is itself a choice, drawn as a key would be (the keyboard's
     * ring: a tap in the middle types the plain character): this, large, on
     * a button's colour, in place of the title.
     */
    centre?: string
  } = {}
): RadialMenuSvg {
  const fontScale = options.fontScale ?? 1
  const fontWeight = options.fontWeight ?? w3dTheme.headingWeight
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
  const accent = parseColor(theme.accent)
  const button = parseColor(theme.buttonBg)
  const halfAccent =
    accent && button ? formatColor(mix(accent, button, 0.55)) : theme.accent
  const fills = items.map((item) => {
    const c = item.color ? parseColor(item.color) : null
    const bg = parseColor(theme.buttonBg)
    if (c == null || bg == null)
      return {
        rest: theme.buttonBg,
        lit: theme.accent,
        half: halfAccent,
        ink: null,
        litInk: null,
      }
    return {
      rest: formatColor(mix(c, bg, 0.45)),
      lit: formatColor({ ...c, a: 1 }),
      half: formatColor(mix(c, bg, 0.2)),
      ink: contrastInk(mix(c, bg, 0.2)),
      litInk: contrastInk({ ...c, a: 1 }),
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
      // A spacer is empty space (a ring fanned to one side).
      ...(item.spacer ? { display: 'none' } : {}),
    }) as unknown as SVGPathElement
    slices.push(s)
    ring.append(s)
    const at = radialSlot(i, items)
    const rMark = item.gated ? (R_IN + R_OUT - ARM) / 2 : R_ICON
    const cx = at.x * rMark
    const cy = at.y * rMark
    const ink = item.disabled ? theme.muted : fills[i].ink ?? theme.text
    // An icon carries its name under it, on the slice: the centre does not
    // change while you choose.
    const glyph = item.icon
      ? (g(
          mark(item.icon, { color: ink, size: 34, x: cx - 17, y: cy - 30 }),
          text(
            {
              x: cx,
              y: cy + 24,
              'text-anchor': 'middle',
              'font-size': 19,
              'font-family': theme.fontFamily,
              fill: ink,
            },
            item.label
          )
        ) as unknown as SVGElement)
      : (labelText(
          item.label,
          cx,
          cy,
          ink,
          fontScale,
          fontWeight
        ) as unknown as SVGElement)
    inks.push(glyph)
    ring.append(glyph)
    // A sub-ring: a chevron at the rim says there is more beyond.
    if (item.items != null)
      ring.append(
        path({
          d: (() => {
            const a = Math.atan2(at.x, -at.y)
            const tip = pt(a, R_OUT - 8)
            const l = pt(a - 0.07, R_OUT - 20)
            const r = pt(a + 0.07, R_OUT - 20)
            return `M ${fmt(l)} L ${fmt(tip)} L ${fmt(r)}`
          })(),
          fill: 'none',
          stroke: ink,
          'stroke-width': 3,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        })
      )
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
  /*
  The hub shows the title and what is current (below), and does not follow
  the pointer: each slice carries its own name (under its icon, when it has one).
  */
  const hub = circle({ cx: 0, cy: 0, r: RADIAL_HUB, fill: theme.panelBg })
  ring.append(hub, title, label)
  /*
  A MIDDLE THAT IS A CHOICE (the key a keyboard ring was opened on) looks
  like one: a key's fill and edge, its character large in full ink. Drawn
  as the muted title it read as inactive.
  */
  if (options.centre != null) {
    // Large, but inside the middle: a longer name (?123) is drawn smaller.
    const size = Math.min(56, 34 * fontScale, 170 / [...options.centre].length)
    title.textContent = options.centre
    title.setAttribute('y', String(size * 0.35))
    title.setAttribute('font-size', String(size))
    title.setAttribute('font-weight', String(fontWeight))
    title.setAttribute('fill', theme.text)
    hub.setAttribute('stroke', 'rgba(255,255,255,0.25)')
    hub.setAttribute('stroke-width', '2')
  }
  /*
  THE CENTRE SHOWS WHAT IS CURRENT: the checked item (its name, on its
  colour), since that is what letting go in the middle leaves in place. It
  does not follow the pointer.
  */
  const current = items.findIndex((it) => it.checked && !it.spacer)
  const hubFill =
    current >= 0 && items[current].color
      ? fills[current].lit
      : options.centre != null
      ? theme.buttonBg
      : theme.panelBg
  const hubInk =
    current >= 0 && items[current].color
      ? fills[current].litInk ?? theme.text
      : theme.text
  const currentLabel = current >= 0 ? items[current].label : ''
  hub.setAttribute('fill', hubFill)
  label.textContent = currentLabel
  label.setAttribute('fill', hubInk)
  if (hubFill !== theme.panelBg && options.centre == null) {
    title.setAttribute('fill', hubInk)
    title.setAttribute('opacity', '0.7')
  }
  const el = svg(
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${RADIAL_SIZE} ${RADIAL_SIZE}`,
      width: RADIAL_SIZE,
      height: RADIAL_SIZE,
      // A pick blinks between two pictures: the texture keeps them.
      'data-texture-cache': '',
    },
    ring
  ) as unknown as RadialMenuSvg
  let lit = -1
  let armedNow = -1
  // An Event of the element's own window (a test's DOM has its own).
  const askRepaint = () => {
    const view = el.ownerDocument?.defaultView as
      | (Window & { Event: typeof Event })
      | null
    el.dispatchEvent(new (view?.Event ?? Event)('panelrepaint'))
  }
  const highlight = (i: number, armed = -1) => {
    const next = i >= 0 && i < items.length && !items[i].disabled ? i : -1
    if (next === lit && armed === armedNow) return
    lit = next
    armedNow = armed
    slices.forEach((s, k) => {
      s.setAttribute(
        'fill',
        k === lit ? fills[k].lit : k === armed ? fills[k].half : fills[k].rest
      )
      if (items[k].gated)
        s.setAttribute(
          'stroke-dasharray',
          k === armed || k === lit ? '' : '4 7'
        )
      // A coloured slice is lit by its own colour, so it also takes a rim.
      s.setAttribute(
        'stroke',
        k === lit && items[k].color ? theme.text : 'rgba(255,255,255,0.25)'
      )
      s.setAttribute('stroke-width', k === lit && items[k].color ? '4' : '2')
    })
    // Drawn on the next frame, not on its panel's timer (a blink is 1/30 s).
    askRepaint()
  }
  let zoneNow: RadialHubZone = null
  const hubLit = (zone: RadialHubZone) => {
    if (zone === zoneNow) return
    zoneNow = zone
    if (zone != null) highlight(-1)
    hub.setAttribute('fill', zone ? halfAccent : hubFill)
    label.textContent = zone === 'close' ? zone : currentLabel
    label.setAttribute('fill', zone ? theme.text : hubInk)
    askRepaint()
  }
  Object.defineProperties(el, {
    hubLit: { value: hubLit },
    highlight: { value: highlight },
    lit: { get: () => lit },
    items: { value: items },
  })
  return el
}
