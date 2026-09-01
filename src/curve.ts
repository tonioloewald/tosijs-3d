/*#
# curve

**The pure model behind [[curve-field|curve3d]]** — a continuous function from
`[0,1]` to itself, as sorted control points, with the editing rules that keep it
valid. Babylon-free, DOM-free, unit-tested.

## The range is CLOSED, and that is load-bearing

A curve cannot return 1.4. Tonio: _"let's assume we don't allow mapping outside
of `[0,1]` and instead scale the terrain block to avoid playing badly with
carving"._

A profile that can exceed its range silently changes the height a province
occupies, and that is precisely what [[carve]]/[[patch-field]] must agree about —
a bore cut against a heightfield that has since grown is a hole in the wrong
place, and it fails as *geometry*, reporting nothing. So **amplitude belongs to
the block and shape belongs to the curve**, and a drag clamps rather than
pushing the range.

## Two kinds, one difference

- **`profile`** — remaps a value. Both endpoints free.
- **`falloff`** — weight against normalised distance (`0` at the province centre,
  `1` at its extent). **Pinned to 0 at x = 1.** A province still carrying weight
  at its boundary does not blend into the terrain around it, and the result is a
  visible step at the footprint edge — the same silent geometry failure again.

## NOT monotonic

Tempting and wrong. A crater rim and a volcano's cone are non-monotonic
falloffs — they rise, then fall — and those are exactly the cases
`PROVINCE-DESIGN.md` says break the shared falloff deliberately. Pin the edge;
leave the middle alone.

## x is sorted, and a drag can reorder

Dragging a point past its neighbour is a legitimate edit, so `movePoint` returns
the point's **new index** along with the points. A caller that assumes the index
survived will start dragging a different point mid-gesture — which reads as the
curve fighting you.
*/
/*{ "parent": "Utilities", "order": 260 }*/

import { PiecewiseLinearFilter, type ControlPoint } from './gradient-filter'

export type { ControlPoint }

/** What the curve means, which is what decides its endpoint rules. */
export type CurveKind = 'profile' | 'falloff'

const clamp01 = (n: number): number =>
  !Number.isFinite(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n

/**
 * Put a point list into a state the rest of the module can rely on: sorted by x,
 * inside the unit square, spanning the full domain, and obeying the kind's
 * endpoint rule.
 *
 * Every mutating helper runs through this, so there is one definition of "valid"
 * rather than one per operation.
 */
export function normalizeCurve(
  points: ControlPoint[],
  kind: CurveKind = 'profile'
): ControlPoint[] {
  const out = points
    .filter((p) => p != null && Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x)

  if (out.length === 0) return kind === 'falloff' ? falloffDefault() : linear()
  // The domain must be covered, or `evaluate` holds the end value flat over a
  // stretch nobody authored — which looks like a bug in the curve rather than
  // a missing point.
  if (out[0].x > 0) out.unshift({ x: 0, y: out[0].y })
  if (out[out.length - 1].x < 1) out.push({ x: 1, y: out[out.length - 1].y })
  if (kind === 'falloff') out[out.length - 1] = { x: 1, y: 0 }
  return out
}

/** Sample the curve. Input clamped, so a caller cannot read off the ends. */
export function evaluateCurve(points: ControlPoint[], t: number): number {
  return new PiecewiseLinearFilter(points.map((p) => ({ ...p }))).evaluate(t)
}

/**
 * Move a point, clamped into the unit square and obeying the kind's rules.
 *
 * Returns the point's NEW index: dragging past a neighbour reorders, and a
 * caller that keeps the old index silently grabs a different point mid-drag.
 */
export function movePoint(
  points: ControlPoint[],
  index: number,
  x: number,
  y: number,
  kind: CurveKind = 'profile'
): { points: ControlPoint[]; index: number } {
  if (index < 0 || index >= points.length) return { points, index }
  const last = points.length - 1
  const moved = { x: clamp01(x), y: clamp01(y) }

  // The end points own the domain edges — dragging one inward would leave the
  // curve undefined out to the boundary, which `normalizeCurve` would then
  // "fix" by inventing a point, fighting the drag.
  if (index === 0) moved.x = 0
  if (index === last) moved.x = 1
  if (kind === 'falloff' && index === last) moved.y = 0

  const next = points.map((p, i) => (i === index ? moved : { ...p }))
  // Identity by reference, so the index survives the sort exactly.
  const target = next[index]
  next.sort((a, b) => a.x - b.x)
  return { points: normalizeCurve(next, kind), index: next.indexOf(target) }
}

/** Add a point. Returns its index so a caller can drag it immediately. */
export function insertPoint(
  points: ControlPoint[],
  x: number,
  y: number,
  kind: CurveKind = 'profile'
): { points: ControlPoint[]; index: number } {
  const p = { x: clamp01(x), y: clamp01(y) }
  const next = [...points.map((q) => ({ ...q })), p]
  next.sort((a, b) => a.x - b.x)
  return { points: normalizeCurve(next, kind), index: next.indexOf(p) }
}

/**
 * Remove a point. The two ENDS cannot be removed and the curve keeps at least
 * two points — a curve with one point is a constant that no longer says what it
 * is constant across.
 */
export function deletePoint(
  points: ControlPoint[],
  index: number,
  kind: CurveKind = 'profile'
): ControlPoint[] {
  if (points.length <= 2) return points
  if (index <= 0 || index >= points.length - 1) return points
  return normalizeCurve(
    points.filter((_, i) => i !== index),
    kind
  )
}

/** Index of the point within `radius` of (x, y), nearest first, or -1. */
export function pointAt(
  points: ControlPoint[],
  x: number,
  y: number,
  radius: number
): number {
  let best = -1
  let bestD = radius * radius
  points.forEach((p, i) => {
    const dx = p.x - x
    const dy = p.y - y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

/* ------------------------------------------------------------------ presets */

/** Sample a continuous easing into control points a piecewise-linear can hold. */
function sampled(f: (t: number) => number, steps = 8): ControlPoint[] {
  const out: ControlPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    out.push({ x: t, y: clamp01(f(t)) })
  }
  return out
}

/** The identity: 0 → 0, 1 → 1. */
export function linear(): ControlPoint[] {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
}

/** Flat at `value` across the whole domain. Not valid as a falloff — see below. */
export function constant(value: number): ControlPoint[] {
  const y = clamp01(value)
  return [
    { x: 0, y },
    { x: 1, y },
  ]
}

/** `steps` flat treads, each a hair short of the next so the riser is vertical. */
export function stepped(steps = 4): ControlPoint[] {
  const n = Math.max(2, Math.round(steps))
  const out: ControlPoint[] = []
  for (let i = 0; i < n; i++) {
    const y = i / (n - 1)
    out.push({ x: i / n, y })
    out.push({ x: (i + 1) / n - 0.001, y })
  }
  out.push({ x: 1, y: 1 })
  return out
}

/** Slow start. */
export function easeIn(): ControlPoint[] {
  return sampled((t) => t * t)
}

/** Slow finish. */
export function easeOut(): ControlPoint[] {
  return sampled((t) => 1 - (1 - t) * (1 - t))
}

/** Smoothstep — slow at both ends. The usual province falloff. */
export function easeInOut(): ControlPoint[] {
  return sampled((t) => t * t * (3 - 2 * t))
}

/**
 * Turn a profile preset into a falloff one: same shape, other way up.
 *
 * Tonio: _"0,1 to 1,0 works fine as well if we just think the other way up and
 * it makes the same presets work for both."_ Which collapses what were two
 * preset sets into one — and the endpoint rule survives the flip for free,
 * because a preset ending at y = 1 flips to one ending at y = 0, which is
 * exactly what a falloff must do.
 *
 * `constant` is the one that does not survive, and that is the same exclusion
 * already documented: a constant flipped is still constant, so it still carries
 * weight at the boundary. The rule holds; the preset was always the exception.
 *
 * A y-flip cannot reorder x, so no re-sort is needed.
 */
export function flipCurve(points: ControlPoint[]): ControlPoint[] {
  return points.map((p) => ({ x: p.x, y: clamp01(1 - p.y) }))
}

/**
 * The default falloff — a straight line from `(0,1)` to `(1,0)`.
 *
 * The mirror of `linear()`'s role for a profile: the plainest thing that obeys
 * the rules, so what you start from says nothing you did not ask for. It was a
 * smoothstep first, which quietly asserted a taste before the author had
 * expressed one.
 */
export function falloffDefault(): ControlPoint[] {
  return flipCurve(linear())
}

/** A crater/volcano rim — non-monotonic, and the reason monotonicity is not enforced. */
export function rim(peak = 0.7, height = 1): ControlPoint[] {
  const p = Math.min(0.95, Math.max(0.05, peak))
  return normalizeCurve(
    [
      { x: 0, y: 0.15 },
      { x: p * 0.5, y: 0.3 },
      { x: p, y: clamp01(height) },
      { x: (1 + p) / 2, y: 0.35 },
      { x: 1, y: 0 },
    ],
    'falloff'
  )
}

export interface CurvePreset {
  name: string
  /** Which kinds it is OFFERED for — see `constant`. */
  kinds: CurveKind[]
  build: () => ControlPoint[]
}

/**
 * The presets, tagged with where they are valid.
 *
 * **`constant` is a profile preset only**, and that falls straight out of the
 * endpoint rule: a constant falloff is weight 1 at the boundary, which is
 * exactly the step the `f(1) = 0` pin exists to prevent. Offering it for a
 * falloff would mean offering a seam.
 */
export const curvePresets: CurvePreset[] = [
  { name: 'linear', kinds: ['profile', 'falloff'], build: linear },
  { name: 'ease in', kinds: ['profile', 'falloff'], build: easeIn },
  { name: 'ease out', kinds: ['profile', 'falloff'], build: easeOut },
  { name: 'ease in-out', kinds: ['profile', 'falloff'], build: easeInOut },
  { name: 'stepped', kinds: ['profile', 'falloff'], build: () => stepped(4) },
  // Profile only, and not an arbitrary exclusion: a constant flipped is still
  // constant, so it still carries weight at the boundary. See `flipCurve`.
  { name: 'constant', kinds: ['profile'], build: () => constant(0.6) },
  // Falloff only, because a rim is a shape you want against DISTANCE and it has
  // no useful reading as a value remap.
  { name: 'rim', kinds: ['falloff'], build: () => rim() },
]

/**
 * The presets valid for a kind — what a menu should offer.
 *
 * A falloff gets the SAME set, flipped: one definition of "ease in", presented
 * the way round that kind needs it.
 */
export function presetsFor(kind: CurveKind): CurvePreset[] {
  return curvePresets
    .filter((p) => p.kinds.includes(kind))
    .map((p) =>
      kind === 'falloff' && p.name !== 'rim'
        ? { ...p, build: () => flipCurve(p.build()) }
        : p
    )
}
