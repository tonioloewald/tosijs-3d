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

/**
 * What the curve means, which is what decides its endpoint rules.
 *
 * - `profile` — remaps a value. Both ends free.
 * - `falloff` — weight against normalised distance. Pinned to 0 at x = 1.
 * - `radial` — the FOOTPRINT: extent in each direction, x being angle over a
 *   full turn. **Periodic**, so the two ends are the same point.
 */
export type CurveKind = 'profile' | 'falloff' | 'radial'

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
  /*
  A radial curve WRAPS: x = 0 and x = 1 are the same direction, one full turn
  apart. If the ends disagree the footprint has a discontinuity along the +x
  axis — a slice out of the province at exactly one bearing, which reads as a
  crack rather than as a curve that needed pinning.

  So the last point is not a free point at all; it is a readout of the first.
  */
  if (kind === 'radial' && out.length > 1) {
    out[out.length - 1] = { x: 1, y: out[0].y }
  }
  return out
}

/**
 * Compose a base sample with a province's, by the province's weight.
 *
 * **This is the whole reason the range is closed.** A convex combination of two
 * values in `[0,1]`, by a weight in `[0,1]`, is in `[0,1]` — so a tile's bounds
 * are known BEFORE anything is evaluated, however many provinces overlap and
 * whatever curves they carry. That is what [[carve]] and [[patch-field]] need:
 * not "the terrain is usually about this tall", but a height a bore can be
 * authored against.
 *
 * Amplitude is then a single multiply on the composed result — it scales the
 * whole block, and cannot push one province through the top of it. Tonio, on a
 * first draft of the province demo that got this backwards: _"shouldn't height
 * just scale the whole terrain tile? If it pulls polygons outside the bounds
 * then it doesn't play nicely with carving, does it?"_ It does not.
 *
 * Inputs are clamped rather than trusted, because the guarantee is worth more
 * than the caller's arithmetic.
 */
export function blendSample(
  base: number,
  province: number,
  weight: number
): number {
  const w = clamp01(weight)
  return clamp01(base) * (1 - w) + clamp01(province) * w
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
  // Dragging either end of a PERIODIC curve moves both — they are one point seen
  // twice, and letting them diverge is how the seam gets in.
  if (kind === 'radial' && (index === 0 || index === last)) {
    next[0] = { x: 0, y: moved.y }
    next[next.length - 1] = { x: 1, y: moved.y }
  }
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

/* ------------------------------------------------------- footprint polygons */

/**
 * Closest a vertex may come to the centre.
 *
 * Not a taste: with every radius positive and the angles monotonic over one
 * turn, the polygon is **star-shaped about its centre**, which is what makes
 * "normalised distance in this direction" well defined at all. A vertex at the
 * origin collapses two edges onto each other and the direction lookup stops
 * having an answer.
 */
export const MIN_EXTENT = 0.05

/** Smallest angular gap between neighbouring vertices, as a fraction of a turn. */
const MIN_GAP = 0.005

/** The closed radial curve as N distinct vertices — the last point is the first. */
export function polygonVertices(points: ControlPoint[]): ControlPoint[] {
  const c = normalizeCurve(points, 'radial')
  return c.slice(0, -1).map((p) => ({ ...p }))
}

/** N vertices as a closed radial curve, ready to `evaluateCurve`. */
export function closePolygon(vertices: ControlPoint[]): ControlPoint[] {
  return normalizeCurve(vertices, 'radial')
}

/**
 * Move one vertex, keeping the polygon valid.
 *
 * Tonio: _"you can't move a point to make an edge degenerate (i.e. the ngon has
 * to have points monotonic in theta and enclose the center)."_ Both are clamps
 * rather than rejections — a drag that stops at the limit tells you where the
 * limit is, whereas a drag that refuses to move looks broken.
 *
 * The angle is clamped **between its neighbours the short way round**, so a
 * vertex can slide anywhere in its own gap and never through one.
 *
 * It returns the vertex's NEW index, because the list is a CYCLIC sequence being
 * stored in a linear array: vertex 0 dragged backwards past x = 0 is a perfectly
 * legal move that lands it at the far end. Keeping the array canonically sorted
 * and reporting where the point went beats leaving it unsorted — a sweep over
 * every vertex and a spread of angles found exactly this, and an unsorted
 * footprint breaks the direction lookup that is the whole point of it.
 */
export function moveVertex(
  vertices: ControlPoint[],
  index: number,
  theta: number,
  r: number
): { vertices: ControlPoint[]; index: number } {
  const n = vertices.length
  if (n < 3 || index < 0 || index >= n) return { vertices, index }
  const turn = (t: number): number => ((t % 1) + 1) % 1
  const prev = vertices[(index - 1 + n) % n].x
  const next = vertices[(index + 1) % n].x
  // Everything measured as a distance FORWARD from the previous vertex, so the
  // wrap at x = 1 needs no special case.
  const gap = turn(next - prev) || 1
  const want = turn(turn(theta) - prev)
  const lo = MIN_GAP
  const hi = Math.max(lo, gap - MIN_GAP)
  const t = Math.min(hi, Math.max(lo, want))
  const next_ = vertices.map((v, i) =>
    i === index
      ? { x: turn(prev + t), y: Math.max(MIN_EXTENT, clamp01(r)) }
      : { ...v }
  )
  const target = next_[index]
  next_.sort((a, b) => a.x - b.x)
  return { vertices: next_, index: next_.indexOf(target) }
}

/** Does every vertex clear the centre, with angles in order? */
export function isStarShaped(vertices: ControlPoint[]): boolean {
  if (vertices.length < 3) return false
  if (!vertices.every((v) => v.y >= MIN_EXTENT && v.y <= 1)) return false
  return vertices.every((v, i) => i === 0 || vertices[i - 1].x < v.x)
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

/**
 * A regular n-gon — exactly `n` VERTICES, not a sampled curve.
 *
 * Tonio: _"a hexagon would just be a hexagon. A circle becomes the expensive
 * shape but even that could be a 16 gon and work quite well."_ Which is the
 * right data: six numbers for a hexagon, and every vertex a thing you can grab.
 *
 * This only works because `polygonExtent` casts a ray at the real straight EDGE
 * rather than interpolating radius against angle. A straight edge is NOT linear
 * in polar — interpolating in (θ, r) bows it inward — and an earlier version
 * papered over that by sampling each edge twelve times, which is a lot of points
 * to carry to avoid doing the intersection once.
 *
 * Circumradius 1, so the VERTICES reach the declared extent and the edges fall
 * inside it. (Inscribing is equally defensible and makes "extent" stop matching
 * the number you set, which is worse.)
 */
export function ngon(sides: number): ControlPoint[] {
  const n = Math.max(3, Math.round(sides))
  const out: ControlPoint[] = []
  for (let i = 0; i < n; i++) out.push({ x: i / n, y: 1 })
  return out
}

/**
 * Every direction alike. A circle is the EXPENSIVE footprint — there is no
 * finite polygon that is one — so it is a 16-gon, which at province scale is
 * indistinguishable and costs sixteen numbers.
 */
export function circle(): ControlPoint[] {
  return ngon(16)
}

/**
 * Where the ray at `theta` (a fraction of a turn) leaves the polygon.
 *
 * Real ray/segment intersection against the straight edge, so the flats are
 * flat. Interpolating r against θ instead — the obvious thing, and what a
 * piecewise-linear curve does — bows every edge inward toward the centre, which
 * reads as the model failing rather than as an interpolation choice.
 *
 * Returns 0 for a degenerate polygon rather than throwing: a caller sampling a
 * terrain grid wants a number, and `moveVertex` already makes degeneracy
 * unreachable through the editor.
 */
export function polygonExtent(
  vertices: ControlPoint[],
  theta: number
): number {
  const n = vertices.length
  if (n < 3) return 0
  const a = ((theta % 1) + 1) % 1 * Math.PI * 2
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const pt = (v: ControlPoint) => ({
    x: v.y * Math.cos(v.x * Math.PI * 2),
    y: v.y * Math.sin(v.x * Math.PI * 2),
  })
  for (let i = 0; i < n; i++) {
    const p = pt(vertices[i])
    const q = pt(vertices[(i + 1) % n])
    const ex = q.x - p.x
    const ey = q.y - p.y
    // Cross the segment with the ray direction; parallel means this edge is not
    // the one the ray leaves through.
    const denom = ex * dy - ey * dx
    if (Math.abs(denom) < 1e-12) continue
    const t = -(p.x * dy - p.y * dx) / denom
    if (t < -1e-9 || t > 1 + 1e-9) continue
    const r = (p.x + t * ex) * dx + (p.y + t * ey) * dy
    // Forward along the ray only — the opposite edge also intersects the LINE.
    if (r > 0) return r
  }
  return 0
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
  // Footprints. `circle` is `constant(1)` — every direction alike — which is why
  // a constant is meaningful here and meaningless as a falloff.
  { name: 'circle', kinds: ['radial'], build: circle },
  { name: 'triangle', kinds: ['radial'], build: () => ngon(3) },
  { name: 'square', kinds: ['radial'], build: () => ngon(4) },
  { name: 'hexagon', kinds: ['radial'], build: () => ngon(6) },
  { name: 'octagon', kinds: ['radial'], build: () => ngon(8) },
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

/** The default curve for a kind — the plainest thing that obeys its rules. */
export function defaultCurve(kind: CurveKind): ControlPoint[] {
  if (kind === 'falloff') return falloffDefault()
  if (kind === 'radial') return circle()
  return linear()
}
