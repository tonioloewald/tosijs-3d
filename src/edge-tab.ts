/*#
# edge-tab

In a headset, a panel that would go out of view is drawn as its header: a
rounded tab at the edge of what you can see, on the side the panel went. Turn
back toward it and it opens again where it was. Tap the tab and the panel
comes to where you are looking.

This matters most on glasses with a narrow window, such as optical see-through
AR, where the picture covers a small part of what you see. There a panel cut
off by the edge of the display shows you where the display ends: you see the
window you are looking through. It also matters on a wide headset, where a
panel behind you is otherwise somewhere you have to remember.

Panels opened from the system bar and the settings panel do this in a
headset, as does any frame panel given `edgeTab`.

## When a panel becomes a tab

Measured in the headset's own view, the narrower of the two eyes on each side,
so a tab is never in one eye only.

- A panel that fits in view becomes a tab when more than a tenth of it would
  be past an edge (`EDGE_TAB_OVERHANG`), and opens again when all of it fits
  with a margin to spare (`EDGE_TAB_MARGIN`). The gap between the two keeps a
  panel at the edge from flickering.
- A panel bigger than the view, on either axis, stays open while the middle of
  the view is on it, since it can never fit.
- A panel behind you, or beside you, is a tab.

The tab is at the panel's distance, so it sits about as deep as the panel, and
the same angular size wherever it is (about 2.6° tall). It points toward the
middle of the panel, along the line from the middle of the view. Two tabs on
one edge stand side by side.

## Using it

`attachEdgeTab(scene, { title, icon, handleTap, drawScene })` returns
`{ update(panel), hide(), collapsed, mesh, dispose() }`. Call `update` each
frame with the panel's plane (its corners are read from its bounds). It
returns true while the panel should be hidden and the tab shown. A frame
panel takes `edgeTab: { title }` and does all of this itself, in a session
only; its default `handleTap` brings it to your gaze.

`attachEdgeTab` is in the barrel. The rule is pure and lives in this module
(`tosijs-3d/edge-tab`: `panelExtent`, `edgeCollapsed`, `edgeTabSpot`,
`edgeTabAvoid`, `tabRect`, `fitTab`), in tangents of the head's view, so it
can be tested without a headset. A tab is fitted by its real corners: off the
axis of a wide headset it covers nearly twice the tangent its size suggests.
*/
/*{ "parent": "b3d-panel", "order": 40 }*/

/** A direction in the head's frame: x right, y up, z ahead. */
export interface HeadVec {
  x: number
  y: number
  z: number
}

/**
 * The view as tangents of its half-angles: a direction (x, y, 1) in the
 * head's frame is in view when `left <= x <= right` and `bottom <= y <= top`.
 */
export interface TangentBounds {
  left: number
  right: number
  bottom: number
  top: number
}

/** Where a panel is, in the head's view (tangents, as `TangentBounds`). */
export interface PanelExtent extends TangentBounds {
  /** Its middle: tangents when ahead, and when behind, the side it is on. */
  cx: number
  cy: number
  /** A corner is beside or behind the eye: the extent says nothing. */
  behind: boolean
}

/**
 * How much of a panel (a fraction of its own width or height) may be past an
 * edge before it becomes a tab. A hair of overlap does not flip it.
 */
export const EDGE_TAB_OVERHANG = 0.1
/**
 * Room to spare, as a fraction of the view, that a tab needs before it opens
 * again; also how far a tab sits in from the edge.
 */
export const EDGE_TAB_MARGIN = 0.04
/** A tab's height, in radians of view (about 2.6°). */
export const EDGE_TAB_HEIGHT = 0.045

/** The view both eyes share: the narrower bound on each side. */
export function tangentBounds(eyes: TangentBounds[]): TangentBounds {
  if (eyes.length === 0) return { left: -1, right: 1, bottom: -1, top: 1 }
  return {
    left: Math.max(...eyes.map((e) => e.left)),
    right: Math.min(...eyes.map((e) => e.right)),
    bottom: Math.max(...eyes.map((e) => e.bottom)),
    top: Math.min(...eyes.map((e) => e.top)),
  }
}

/**
 * A panel's corners (head frame) as an extent in the view. A corner less
 * than 3° ahead of the side of your head makes it `behind`: its tangent is
 * meaningless there.
 */
export function panelExtent(corners: HeadVec[]): PanelExtent {
  let mx = 0
  let my = 0
  let mz = 0
  let behind = corners.length === 0
  let left = Infinity
  let right = -Infinity
  let bottom = Infinity
  let top = -Infinity
  for (const c of corners) {
    mx += c.x
    my += c.y
    mz += c.z
    const len = Math.hypot(c.x, c.y, c.z)
    if (c.z <= len * 0.05) {
      behind = true
      continue
    }
    const tx = c.x / c.z
    const ty = c.y / c.z
    if (tx < left) left = tx
    if (tx > right) right = tx
    if (ty < bottom) bottom = ty
    if (ty > top) top = ty
  }
  const n = corners.length || 1
  mx /= n
  my /= n
  mz /= n
  const ml = Math.hypot(mx, my, mz)
  let cx: number
  let cy: number
  if (mz > ml * 0.05) {
    cx = mx / mz
    cy = my / mz
  } else {
    // Behind: which side, far out. Straight behind counts as to the right.
    const s = Math.hypot(mx, my)
    cx = s > 1e-9 ? (mx / s) * 1e3 : 1e3
    cy = s > 1e-9 ? (my / s) * 1e3 : 0
  }
  if (behind) {
    left = right = cx
    bottom = top = cy
  }
  return { left, right, bottom, top, cx, cy, behind }
}

/**
 * Is the panel a tab this frame? `collapsed` is what it was last frame, so
 * opening takes more room than closing (see the page).
 */
export function edgeCollapsed(
  p: PanelExtent,
  view: TangentBounds,
  collapsed: boolean,
  overhang = EDGE_TAB_OVERHANG,
  margin = EDGE_TAB_MARGIN
): boolean {
  if (p.behind) return true
  const axis = (lo: number, hi: number, vLo: number, vHi: number) => {
    const span = vHi - vLo
    const ext = hi - lo
    if (ext >= span * (1 - 2 * margin)) {
      // Bigger than the view: open while the middle of the view is on it.
      const c = (vLo + vHi) / 2
      const band = collapsed ? span * margin * 2 : 0
      return lo <= c - band && hi >= c + band
    }
    if (collapsed)
      return lo >= vLo + span * margin && hi <= vHi - span * margin
    const over = Math.max(vLo - lo, hi - vHi, 0)
    return over <= ext * overhang
  }
  return !(
    axis(p.left, p.right, view.left, view.right) &&
    axis(p.bottom, p.top, view.bottom, view.top)
  )
}

/** Where a tab goes, in tangents, and which way it points. */
export interface EdgeTabSpot {
  x: number
  y: number
  /** Toward the panel: 0 is right, 90 up (degrees). */
  angleDeg: number
  /** The edge it is against. */
  side: 'left' | 'right' | 'bottom' | 'top'
}

/**
 * Put a tab `halfW` by `halfH` (tangents) at the edge of the view, on the
 * line from the middle of the view toward the panel's middle, inset by
 * `margin` of the view.
 */
export function edgeTabSpot(
  p: PanelExtent,
  view: TangentBounds,
  halfW: number,
  halfH: number,
  margin = EDGE_TAB_MARGIN
): EdgeTabSpot {
  const vx = (view.left + view.right) / 2
  const vy = (view.bottom + view.top) / 2
  let dx = p.cx - vx
  let dy = p.cy - vy
  if (Math.hypot(dx, dy) < 1e-6) {
    // Its middle is in the middle of the view: toward the side that is past.
    dx = Math.max(0, p.right - view.right) - Math.max(0, view.left - p.left)
    dy = Math.max(0, p.top - view.top) - Math.max(0, view.bottom - p.bottom)
    if (Math.hypot(dx, dy) < 1e-9) dy = 1
  }
  const hx = Math.max(
    0,
    (view.right - view.left) / 2 - halfW - margin * (view.right - view.left)
  )
  const hy = Math.max(
    0,
    (view.top - view.bottom) / 2 - halfH - margin * (view.top - view.bottom)
  )
  const sx = Math.abs(dx) > 1e-12 ? hx / Math.abs(dx) : Infinity
  const sy = Math.abs(dy) > 1e-12 ? hy / Math.abs(dy) : Infinity
  const t = Math.min(sx, sy)
  const side: EdgeTabSpot['side'] =
    sx <= sy ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'top' : 'bottom'
  return {
    x: vx + dx * t,
    y: vy + dy * t,
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    side,
  }
}

/** A tab already placed this frame (its middle and half sizes, tangents). */
export interface PlacedTab {
  x: number
  y: number
  halfW: number
  halfH: number
}

/**
 * Move a tab along its edge until it overlaps none already placed, toward
 * its own panel, and keep it in the view. Returns where it ends up.
 */
export function edgeTabAvoid(
  spot: EdgeTabSpot,
  halfW: number,
  halfH: number,
  placed: PlacedTab[],
  view: TangentBounds,
  margin = EDGE_TAB_MARGIN
): { x: number; y: number } {
  let { x, y } = spot
  const along = spot.side === 'top' || spot.side === 'bottom' ? 'x' : 'y'
  const gap = margin * 0.25 * (view.right - view.left)
  const lo =
    along === 'x'
      ? view.left + halfW + margin * (view.right - view.left)
      : view.bottom + halfH + margin * (view.top - view.bottom)
  const hi =
    along === 'x'
      ? view.right - halfW - margin * (view.right - view.left)
      : view.top - halfH - margin * (view.top - view.bottom)
  const overlaps = (t: PlacedTab) =>
    Math.abs(t.x - x) < t.halfW + halfW + gap &&
    Math.abs(t.y - y) < t.halfH + halfH + gap
  for (let i = 0; i < placed.length * 2 + 1; i++) {
    const hit = placed.find(overlaps)
    if (hit == null) break
    if (along === 'x') {
      const dir = (spot.x >= hit.x ? 1 : -1) * (x > hi - 1e-9 ? -1 : 1)
      x = hit.x + dir * (hit.halfW + halfW + gap)
      x = Math.max(lo, Math.min(hi, x))
    } else {
      const dir = (spot.y >= hit.y ? 1 : -1) * (y > hi - 1e-9 ? -1 : 1)
      y = hit.y + dir * (hit.halfH + halfH + gap)
      y = Math.max(lo, Math.min(hi, y))
    }
  }
  return { x, y }
}

/**
 * Where the corners of a tab facing the eye fall in the view: its middle in
 * direction (x, y, 1), `halfW` and `halfH` its half sizes over its distance,
 * upright. Off the axis a tab covers more tangent than its size says.
 */
export function tabRect(
  x: number,
  y: number,
  halfW: number,
  halfH: number
): TangentBounds {
  const l = Math.hypot(x, y, 1)
  const z = { x: x / l, y: y / l, z: 1 / l }
  // Right: up × z, then up again: z × right.
  const rl = Math.hypot(z.z, z.x) || 1
  const r = { x: z.z / rl, y: 0, z: -z.x / rl }
  const u = {
    x: z.y * r.z - z.z * r.y,
    y: z.z * r.x - z.x * r.z,
    z: z.x * r.y - z.y * r.x,
  }
  const out = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const cx = z.x + r.x * sx * halfW + u.x * sy * halfH
      const cy = z.y + r.y * sx * halfW + u.y * sy * halfH
      const cz = Math.max(1e-6, z.z + r.z * sx * halfW + u.z * sy * halfH)
      const tx = cx / cz
      const ty = cy / cz
      if (tx < out.left) out.left = tx
      if (tx > out.right) out.right = tx
      if (ty < out.bottom) out.bottom = ty
      if (ty > out.top) out.top = ty
    }
  return out
}

/**
 * Nudge a tab at (x, y) until all of it is inside the view, `margin` of the
 * view in from every edge, by its real corners (`tabRect`).
 */
export function fitTab(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  view: TangentBounds,
  margin = EDGE_TAB_MARGIN
): { x: number; y: number } {
  const mx = margin * (view.right - view.left)
  const my = margin * (view.top - view.bottom)
  for (let i = 0; i < 8; i++) {
    const r = tabRect(x, y, halfW, halfH)
    let dx = 0
    let dy = 0
    if (r.right > view.right - mx) dx = view.right - mx - r.right
    else if (r.left < view.left + mx) dx = view.left + mx - r.left
    if (r.top > view.top - my) dy = view.top - my - r.top
    else if (r.bottom < view.bottom + my) dy = view.bottom + my - r.bottom
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) break
    x += dx
    y += dy
  }
  return { x, y }
}

