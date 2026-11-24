/*
RADIAL LAYOUT, pure: where a radial menu's items go, which one a direction
picks, and whether a D-pad press was a tap or a hold. No DOM, no Babylon.

Picking is by ANGLE alone, past a small deadzone: each item owns a slice of
the circle out to infinity, so a target is as wide as the screen allows and
a flick in roughly the right direction lands on it (Fitts' law with
unbounded targets). The first item is at the top; they go clockwise.
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
 * The item a direction picks among `count`, or -1 inside the deadzone.
 * Item 0 is straight up; the rest follow clockwise, each owning an equal slice
 * centred on it.
 */
export function radialPick(
  dir: RadialDirection,
  count: number,
  options: RadialPickOptions = {}
): number {
  if (count <= 0) return -1
  const len = Math.hypot(dir.x, dir.y)
  if (!(len > (options.deadzone ?? 0.5))) return -1
  // Clockwise from up: atan2 of (x, -y).
  let a = Math.atan2(dir.x, -dir.y)
  if (a < 0) a += Math.PI * 2
  const slice = (Math.PI * 2) / count
  return Math.floor((a + slice / 2) / slice) % count
}

/** Item `i` of `count`: its angle (radians clockwise from up) and unit position (+y down). */
export function radialSlot(
  i: number,
  count: number
): { angle: number; x: number; y: number } {
  const angle = (i / Math.max(1, count)) * Math.PI * 2
  return { angle, x: Math.sin(angle), y: -Math.cos(angle) }
}

/** A slice's edges, radians clockwise from up. */
export function radialSlice(
  i: number,
  count: number
): { from: number; to: number } {
  const slice = (Math.PI * 2) / Math.max(1, count)
  const mid = i * slice
  return { from: mid - slice / 2, to: mid + slice / 2 }
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
