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
import { PiecewiseLinearFilter } from './gradient-filter';
const clamp01 = (n) => !Number.isFinite(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n;
/**
 * Put a point list into a state the rest of the module can rely on: sorted by x,
 * inside the unit square, spanning the full domain, and obeying the kind's
 * endpoint rule.
 *
 * Every mutating helper runs through this, so there is one definition of "valid"
 * rather than one per operation.
 */
export function normalizeCurve(points, kind = 'profile') {
    const out = points
        .filter((p) => p != null && Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }))
        .sort((a, b) => a.x - b.x);
    if (out.length === 0)
        return kind === 'falloff' ? falloffDefault() : linear();
    // The domain must be covered, or `evaluate` holds the end value flat over a
    // stretch nobody authored — which looks like a bug in the curve rather than
    // a missing point.
    if (out[0].x > 0)
        out.unshift({ x: 0, y: out[0].y });
    if (out[out.length - 1].x < 1)
        out.push({ x: 1, y: out[out.length - 1].y });
    if (kind === 'falloff')
        out[out.length - 1] = { x: 1, y: 0 };
    /*
    A radial curve WRAPS: x = 0 and x = 1 are the same direction, one full turn
    apart. If the ends disagree the footprint has a discontinuity along the +x
    axis — a slice out of the province at exactly one bearing, which reads as a
    crack rather than as a curve that needed pinning.
  
    So the last point is not a free point at all; it is a readout of the first.
    */
    if (kind === 'radial' && out.length > 1) {
        out[out.length - 1] = { x: 1, y: out[0].y };
    }
    return out;
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
export function blendSample(base, province, weight) {
    const w = clamp01(weight);
    return clamp01(base) * (1 - w) + clamp01(province) * w;
}
/** Sample the curve. Input clamped, so a caller cannot read off the ends. */
export function evaluateCurve(points, t) {
    return new PiecewiseLinearFilter(points.map((p) => ({ ...p }))).evaluate(t);
}
/**
 * Move a point, clamped into the unit square and obeying the kind's rules.
 *
 * Returns the point's NEW index: dragging past a neighbour reorders, and a
 * caller that keeps the old index silently grabs a different point mid-drag.
 */
export function movePoint(points, index, x, y, kind = 'profile') {
    if (index < 0 || index >= points.length)
        return { points, index };
    const last = points.length - 1;
    const moved = { x: clamp01(x), y: clamp01(y) };
    // The end points own the domain edges — dragging one inward would leave the
    // curve undefined out to the boundary, which `normalizeCurve` would then
    // "fix" by inventing a point, fighting the drag.
    if (index === 0)
        moved.x = 0;
    if (index === last)
        moved.x = 1;
    if (kind === 'falloff' && index === last)
        moved.y = 0;
    const next = points.map((p, i) => (i === index ? moved : { ...p }));
    // Dragging either end of a PERIODIC curve moves both — they are one point seen
    // twice, and letting them diverge is how the seam gets in.
    if (kind === 'radial' && (index === 0 || index === last)) {
        next[0] = { x: 0, y: moved.y };
        next[next.length - 1] = { x: 1, y: moved.y };
    }
    // Identity by reference, so the index survives the sort exactly.
    const target = next[index];
    next.sort((a, b) => a.x - b.x);
    return { points: normalizeCurve(next, kind), index: next.indexOf(target) };
}
/** Add a point. Returns its index so a caller can drag it immediately. */
export function insertPoint(points, x, y, kind = 'profile') {
    const p = { x: clamp01(x), y: clamp01(y) };
    const next = [...points.map((q) => ({ ...q })), p];
    next.sort((a, b) => a.x - b.x);
    return { points: normalizeCurve(next, kind), index: next.indexOf(p) };
}
/**
 * Remove a point. The two ENDS cannot be removed and the curve keeps at least
 * two points — a curve with one point is a constant that no longer says what it
 * is constant across.
 */
export function deletePoint(points, index, kind = 'profile') {
    if (points.length <= 2)
        return points;
    if (index <= 0 || index >= points.length - 1)
        return points;
    return normalizeCurve(points.filter((_, i) => i !== index), kind);
}
/** Index of the point within `radius` of (x, y), nearest first, or -1. */
export function pointAt(points, x, y, radius) {
    let best = -1;
    let bestD = radius * radius;
    points.forEach((p, i) => {
        const dx = p.x - x;
        const dy = p.y - y;
        const d = dx * dx + dy * dy;
        if (d <= bestD) {
            bestD = d;
            best = i;
        }
    });
    return best;
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
export const MIN_EXTENT = 0.05;
/** Smallest angular gap between neighbouring vertices, as a fraction of a turn. */
const MIN_GAP = 0.005;
/** The closed radial curve as N distinct vertices — the last point is the first. */
export function polygonVertices(points) {
    const c = normalizeCurve(points, 'radial');
    return c.slice(0, -1).map((p) => ({ ...p }));
}
/** N vertices as a closed radial curve, ready to `evaluateCurve`. */
export function closePolygon(vertices) {
    return normalizeCurve(vertices, 'radial');
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
export function moveVertex(vertices, index, theta, r) {
    const n = vertices.length;
    if (n < 3 || index < 0 || index >= n)
        return { vertices, index };
    const turn = (t) => ((t % 1) + 1) % 1;
    const prev = vertices[(index - 1 + n) % n].x;
    const next = vertices[(index + 1) % n].x;
    // Everything measured as a distance FORWARD from the previous vertex, so the
    // wrap at x = 1 needs no special case.
    const gap = turn(next - prev) || 1;
    const want = turn(turn(theta) - prev);
    const lo = MIN_GAP;
    const hi = Math.max(lo, gap - MIN_GAP);
    const t = Math.min(hi, Math.max(lo, want));
    const next_ = vertices.map((v, i) => i === index
        ? { x: turn(prev + t), y: Math.max(MIN_EXTENT, clamp01(r)) }
        : { ...v });
    const target = next_[index];
    next_.sort((a, b) => a.x - b.x);
    return { vertices: next_, index: next_.indexOf(target) };
}
/** Does every vertex clear the centre, with angles in order? */
export function isStarShaped(vertices) {
    if (vertices.length < 3)
        return false;
    if (!vertices.every((v) => v.y >= MIN_EXTENT && v.y <= 1))
        return false;
    return vertices.every((v, i) => i === 0 || vertices[i - 1].x < v.x);
}
/* ------------------------------------------------------------------ presets */
/** Sample a continuous easing into control points a piecewise-linear can hold. */
function sampled(f, steps = 8) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        out.push({ x: t, y: clamp01(f(t)) });
    }
    return out;
}
/** The identity: 0 → 0, 1 → 1. */
export function linear() {
    return [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
    ];
}
/** Flat at `value` across the whole domain. Not valid as a falloff — see below. */
export function constant(value) {
    const y = clamp01(value);
    return [
        { x: 0, y },
        { x: 1, y },
    ];
}
/** `steps` flat treads, each a hair short of the next so the riser is vertical. */
export function stepped(steps = 4) {
    const n = Math.max(2, Math.round(steps));
    const out = [];
    for (let i = 0; i < n; i++) {
        const y = i / (n - 1);
        out.push({ x: i / n, y });
        out.push({ x: (i + 1) / n - 0.001, y });
    }
    out.push({ x: 1, y: 1 });
    return out;
}
/** Slow start. */
export function easeIn() {
    return sampled((t) => t * t);
}
/** Slow finish. */
export function easeOut() {
    return sampled((t) => 1 - (1 - t) * (1 - t));
}
/** Smoothstep — slow at both ends. The usual province falloff. */
export function easeInOut() {
    return sampled((t) => t * t * (3 - 2 * t));
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
export function flipCurve(points) {
    return points.map((p) => ({ x: p.x, y: clamp01(1 - p.y) }));
}
/**
 * The default falloff — a straight line from `(0,1)` to `(1,0)`.
 *
 * The mirror of `linear()`'s role for a profile: the plainest thing that obeys
 * the rules, so what you start from says nothing you did not ask for. It was a
 * smoothstep first, which quietly asserted a taste before the author had
 * expressed one.
 */
export function falloffDefault() {
    return flipCurve(linear());
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
export function ngon(sides) {
    const n = Math.max(3, Math.round(sides));
    const out = [];
    for (let i = 0; i < n; i++)
        out.push({ x: i / n, y: 1 });
    return out;
}
/**
 * Every direction alike. A circle is the EXPENSIVE footprint — there is no
 * finite polygon that is one — so it is a 16-gon, which at province scale is
 * indistinguishable and costs sixteen numbers.
 */
export function circle() {
    return ngon(16);
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
export function polygonExtent(vertices, theta) {
    const n = vertices.length;
    if (n < 3)
        return 0;
    const a = ((theta % 1) + 1) % 1 * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const pt = (v) => ({
        x: v.y * Math.cos(v.x * Math.PI * 2),
        y: v.y * Math.sin(v.x * Math.PI * 2),
    });
    for (let i = 0; i < n; i++) {
        const p = pt(vertices[i]);
        const q = pt(vertices[(i + 1) % n]);
        const ex = q.x - p.x;
        const ey = q.y - p.y;
        // Cross the segment with the ray direction; parallel means this edge is not
        // the one the ray leaves through.
        const denom = ex * dy - ey * dx;
        if (Math.abs(denom) < 1e-12)
            continue;
        const t = -(p.x * dy - p.y * dx) / denom;
        if (t < -1e-9 || t > 1 + 1e-9)
            continue;
        const r = (p.x + t * ex) * dx + (p.y + t * ey) * dy;
        // Forward along the ray only — the opposite edge also intersects the LINE.
        if (r > 0)
            return r;
    }
    return 0;
}
/**
 * A jittered n-gon — a footprint that does not look drawn with a compass.
 *
 * Deterministic: the jitter comes from a hash of the vertex index, not
 * `Math.random`, so the same call gives the same coastline every time. A
 * footprint that reshuffled on reload would make a province unreproducible,
 * which is the one thing a seeded world cannot have.
 *
 * Angles are jittered by less than a third of a gap, so the order — and with it
 * the star-shape — survives without needing a clamp.
 */
export function messyNgon(sides = 16, jitter = 0.22, seed = 1) {
    const n = Math.max(3, Math.round(sides));
    const hash = (i) => {
        const v = Math.sin((i + 1) * 127.1 + seed * 311.7) * 43758.5453;
        return v - Math.floor(v);
    };
    const out = [];
    for (let i = 0; i < n; i++) {
        const wobble = (hash(i) - 0.5) * (1 / n) * 0.6;
        out.push({
            x: ((i / n + wobble) % 1 + 1) % 1,
            y: clamp01(1 - hash(i + n) * jitter),
        });
    }
    out.sort((a, b) => a.x - b.x);
    return out;
}
/* --------------------------------------------------- named landform presets */
/**
 * Trench, continental shelf, then mountains — the shape of a real coastline in
 * one levels map.
 *
 * The lowest ground drops away steeply (a trench), most of the middle is a broad
 * FLAT (the shelf, which is why so much of the world is shallow sea and coastal
 * plain), and only the top of the range climbs hard. It is the flat middle that
 * makes it read as Earth rather than as noise: real terrain spends most of its
 * area near sea level.
 */
export function shelfAndMountains() {
    return [
        { x: 0, y: 0 },
        { x: 0.06, y: 0.05 },
        { x: 0.11, y: 0.28 },
        { x: 0.46, y: 0.34 },
        { x: 0.66, y: 0.46 },
        { x: 0.85, y: 0.7 },
        { x: 1, y: 1 },
    ];
}
/**
 * Old desert: a plain at one level, then terraces above it.
 *
 * Weathering cuts flats and leaves risers, so an old landscape is stepped where
 * a young one is smooth — and everything below the plain is a single level
 * because it has had time to fill in.
 */
export function desertTerraces() {
    return [
        { x: 0, y: 0.3 },
        { x: 0.4, y: 0.32 },
        { x: 0.4, y: 0.45 },
        { x: 0.62, y: 0.47 },
        { x: 0.62, y: 0.6 },
        { x: 0.82, y: 0.62 },
        { x: 0.82, y: 0.74 },
        { x: 1, y: 0.78 },
    ];
}
/** Full weight across most of the province, then off — the flat-topped case. */
export function plateauFalloff(hold = 0.62) {
    return [
        { x: 0, y: 1 },
        { x: Math.min(0.9, hold), y: 1 },
        { x: 1, y: 0 },
    ];
}
/** Eased both ends — the province melts into its surroundings. */
export function smoothEdge() {
    return flipCurve(easeInOut());
}
/** Holds, then drops in the last tenth: a rim, a crater wall, a quarry. */
export function abruptEdge(hold = 0.88) {
    return [
        { x: 0, y: 1 },
        { x: Math.min(0.97, hold), y: 0.94 },
        { x: 1, y: 0 },
    ];
}
/** A crater/volcano rim — non-monotonic, and the reason monotonicity is not enforced. */
export function rim(peak = 0.7, height = 1) {
    const p = Math.min(0.95, Math.max(0.05, peak));
    return normalizeCurve([
        { x: 0, y: 0.15 },
        { x: p * 0.5, y: 0.3 },
        { x: p, y: clamp01(height) },
        { x: (1 + p) / 2, y: 0.35 },
        { x: 1, y: 0 },
    ], 'falloff');
}
/**
 * The presets, tagged with where they are valid.
 *
 * **`constant` is a profile preset only**, and that falls straight out of the
 * endpoint rule: a constant falloff is weight 1 at the boundary, which is
 * exactly the step the `f(1) = 0` pin exists to prevent. Offering it for a
 * falloff would mean offering a seam.
 */
/*
Named for what they ARE, not for their maths.

"ease in-out" tells you the shape of a graph; "smooth edge" tells you what the
province will look like, which is the question actually being asked. The maths
names survive as building blocks (`easeInOut` and friends are still exported) —
they just are not what a menu should offer.
*/
export const curvePresets = [
    // ---- shape: a levels map from height sample to height
    { name: 'no change', kinds: ['profile'], build: linear },
    { name: 'shelf + mountains', kinds: ['profile'], build: shelfAndMountains },
    { name: 'desert terraces', kinds: ['profile'], build: desertTerraces },
    { name: 'terraced', kinds: ['profile'], build: () => stepped(4) },
    { name: 'flatten', kinds: ['profile'], build: () => constant(0.6) },
    { name: 'steepen', kinds: ['profile'], build: easeIn },
    { name: 'soften', kinds: ['profile'], build: easeOut },
    // ---- falloff: weight by distance. All reach 0 at the boundary.
    { name: 'plateau', kinds: ['falloff'], build: () => plateauFalloff() },
    { name: 'smooth edge', kinds: ['falloff'], build: smoothEdge },
    { name: 'abrupt edge', kinds: ['falloff'], build: () => abruptEdge() },
    { name: 'linear', kinds: ['falloff'], build: falloffDefault },
    // A rim is a shape you want against DISTANCE and has no reading as a remap.
    { name: 'rim', kinds: ['falloff'], build: () => rim() },
    // ---- footprint
    { name: 'circle', kinds: ['radial'], build: circle },
    { name: 'messy circle', kinds: ['radial'], build: () => messyNgon() },
    { name: 'square', kinds: ['radial'], build: () => ngon(4) },
    { name: 'hexagon', kinds: ['radial'], build: () => ngon(6) },
    { name: 'triangle', kinds: ['radial'], build: () => ngon(3) },
    { name: 'octagon', kinds: ['radial'], build: () => ngon(8) },
];
/**
 * The presets valid for a kind — what a menu should offer.
 *
 * A falloff gets the SAME set, flipped: one definition of "ease in", presented
 * the way round that kind needs it.
 */
export function presetsFor(kind) {
    // No flipping any more: the falloff presets are written the way round they are
    // used, because "smooth edge" is a thing in its own right rather than
    // "ease in-out, upside down". `flipCurve` remains for callers converting a
    // profile they already have.
    return curvePresets.filter((p) => p.kinds.includes(kind));
}
/** The default curve for a kind — the plainest thing that obeys its rules. */
export function defaultCurve(kind) {
    if (kind === 'falloff')
        return falloffDefault();
    if (kind === 'radial')
        return circle();
    return linear();
}
//# sourceMappingURL=curve.js.map