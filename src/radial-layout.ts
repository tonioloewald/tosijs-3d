/*
RADIAL LAYOUT, pure: where a radial menu's items go, which one a direction
picks, and whether a D-pad press was a tap or a hold. No DOM, no Babylon.

Picking is by ANGLE alone, past a small deadzone: each item owns a slice of
the circle out to infinity, so a target is as wide as the screen allows and
a flick in roughly the right direction lands on it (Fitts' law with
unbounded targets). The first item is at the top; they go clockwise. An
item set apart (`apart`) is the exception, on purpose: narrower, with dead
space round it, opposite the rest.
*/

/** Screen-style direction: +x right, +y DOWN (a stick's y is flipped by the caller). */
export interface RadialDirection {
  x: number
  y: number
}

export interface RadialPickOptions {
  /** Below this length the direction picks nothing (0…1 for a stick; pixels for a pointer). */
  deadzone?: number
}

/**
 * What the layout needs to know of an item. `weight` is its share of the
 * circle (default 1). `apart` sets it apart: a narrow empty gap either side
 * that picks nothing, and the ring turns so it points straight DOWN, opposite
 * the rest. That is for an item you should not pick by accident (drop, delete):
 * a smaller target with dead space round it, Fitts' law used backwards.
 */
export interface RadialShape {
  weight?: number
  apart?: boolean
}

/** Each side of an `apart` item, as a share of an ordinary slice. */
export const RADIAL_APART_GAP = 0.3

/** A slice's edges and middle, radians clockwise from up (`from` may be negative). */
export interface RadialArc {
  from: number
  to: number
  mid: number
}

const TAU = Math.PI * 2

/**
 * Where each item's slice goes. A count is that many equal slices with item 0
 * at the top; shapes may differ in weight and be set apart (see `RadialShape`).
 */
export function radialLayout(
  items: number | readonly RadialShape[]
): RadialArc[] {
  const shapes: readonly RadialShape[] =
    typeof items === 'number'
      ? Array.from({ length: Math.max(0, items) }, () => ({}))
      : items
  if (shapes.length === 0) return []
  const w = (s: RadialShape) => Math.max(0, s.weight ?? 1)
  const units = shapes.reduce(
    (t, s) => t + w(s) + (s.apart ? RADIAL_APART_GAP * 2 : 0),
    0
  )
  const unit = units > 0 ? TAU / units : 0
  let at = 0
  const arcs = shapes.map((s) => {
    if (s.apart) at += RADIAL_APART_GAP * unit
    const from = at
    at += w(s) * unit
    const to = at
    if (s.apart) at += RADIAL_APART_GAP * unit
    return { from, to, mid: (from + to) / 2 }
  })
  // Turn the ring: the first item set apart points down, else item 0 up.
  const k = shapes.findIndex((s) => s.apart)
  const turn = k >= 0 ? Math.PI - arcs[k].mid : -arcs[0].mid
  return arcs.map((a) => ({
    from: a.from + turn,
    to: a.to + turn,
    mid: a.mid + turn,
  }))
}

/**
 * The item a direction picks, or -1 inside the deadzone (or in the gap beside
 * an item set apart). `items` is a count (item 0 straight up, the rest
 * clockwise, equal slices) or shapes (see `radialLayout`).
 */
export function radialPick(
  dir: RadialDirection,
  items: number | readonly RadialShape[],
  options: RadialPickOptions = {}
): number {
  const arcs = radialLayout(items)
  if (arcs.length === 0) return -1
  const len = Math.hypot(dir.x, dir.y)
  if (!(len > (options.deadzone ?? 0.5))) return -1
  // Clockwise from up: atan2 of (x, -y).
  const a = Math.atan2(dir.x, -dir.y)
  for (let i = 0; i < arcs.length; i++) {
    const { from, to } = arcs[i]
    const d = (((a - from) % TAU) + TAU) % TAU
    if (d < to - from) return i
  }
  return -1
}

/** Item `i`: its angle (radians clockwise from up) and unit position (+y down). */
export function radialSlot(
  i: number,
  items: number | readonly RadialShape[]
): { angle: number; x: number; y: number } {
  const angle = radialLayout(items)[i]?.mid ?? 0
  return { angle, x: Math.sin(angle), y: -Math.cos(angle) }
}

/** A slice's edges, radians clockwise from up. */
export function radialSlice(
  i: number,
  items: number | readonly RadialShape[]
): { from: number; to: number } {
  const a = radialLayout(items)[i]
  return a ? { from: a.from, to: a.to } : { from: 0, to: 0 }
}

/** How long a D-pad press must be held to be a hold (a menu), ms. */
export const DPAD_HOLD_MS = 300

export interface PressState {
  /** When the press began (ms), or -1 while up. */
  since: number
  /** The hold has fired for this press. */
  held: boolean
}

export const pressState = (): PressState => ({ since: -1, held: false })

/**
 * One frame of a button that taps or holds: `'tap'` on a release before the
 * hold time, `'hold'` once when the hold time passes while down, `'release'`
 * on letting go after a hold, else null. Mutates `state`.
 */
export function pressStep(
  state: PressState,
  down: boolean,
  now: number,
  holdMs = DPAD_HOLD_MS
): 'tap' | 'hold' | 'release' | null {
  if (down) {
    if (state.since < 0) {
      state.since = now
      state.held = false
      return null
    }
    if (!state.held && now - state.since >= holdMs) {
      state.held = true
      return 'hold'
    }
    return null
  }
  if (state.since < 0) return null
  const was = state.held
  state.since = -1
  state.held = false
  return was ? 'release' : 'tap'
}
