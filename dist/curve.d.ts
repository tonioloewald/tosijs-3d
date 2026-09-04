import { type ControlPoint } from './gradient-filter.js';
export type { ControlPoint };
/**
 * What the curve means, which is what decides its endpoint rules.
 *
 * - `profile` — remaps a value. Both ends free.
 * - `falloff` — weight against normalised distance. Pinned to 0 at x = 1.
 * - `radial` — the FOOTPRINT: extent in each direction, x being angle over a
 *   full turn. **Periodic**, so the two ends are the same point.
 */
export type CurveKind = 'profile' | 'falloff' | 'radial';
/**
 * Put a point list into a state the rest of the module can rely on: sorted by x,
 * inside the unit square, spanning the full domain, and obeying the kind's
 * endpoint rule.
 *
 * Every mutating helper runs through this, so there is one definition of "valid"
 * rather than one per operation.
 */
export declare function normalizeCurve(points: ControlPoint[], kind?: CurveKind): ControlPoint[];
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
export declare function blendSample(base: number, province: number, weight: number): number;
/** Sample the curve. Input clamped, so a caller cannot read off the ends. */
export declare function evaluateCurve(points: ControlPoint[], t: number): number;
/**
 * Move a point, clamped into the unit square and obeying the kind's rules.
 *
 * Returns the point's NEW index: dragging past a neighbour reorders, and a
 * caller that keeps the old index silently grabs a different point mid-drag.
 */
export declare function movePoint(points: ControlPoint[], index: number, x: number, y: number, kind?: CurveKind): {
    points: ControlPoint[];
    index: number;
};
/** Add a point. Returns its index so a caller can drag it immediately. */
export declare function insertPoint(points: ControlPoint[], x: number, y: number, kind?: CurveKind): {
    points: ControlPoint[];
    index: number;
};
/**
 * Remove a point. The two ENDS cannot be removed and the curve keeps at least
 * two points — a curve with one point is a constant that no longer says what it
 * is constant across.
 */
export declare function deletePoint(points: ControlPoint[], index: number, kind?: CurveKind): ControlPoint[];
/** Index of the point within `radius` of (x, y), nearest first, or -1. */
export declare function pointAt(points: ControlPoint[], x: number, y: number, radius: number): number;
/**
 * Closest a vertex may come to the centre.
 *
 * Not a taste: with every radius positive and the angles monotonic over one
 * turn, the polygon is **star-shaped about its centre**, which is what makes
 * "normalised distance in this direction" well defined at all. A vertex at the
 * origin collapses two edges onto each other and the direction lookup stops
 * having an answer.
 */
export declare const MIN_EXTENT = 0.05;
/**
 * Smallest gap between two split markers, in curve x.
 *
 * Not zero: two markers at the same place make a segment of zero width, which
 * is a region you can never see, edit or get back — the marker under it becomes
 * ungrabbable because its neighbour is exactly on top of it.
 */
export declare const MIN_SPLIT_GAP = 0.02;
/**
 * Move split marker `i` to `x`, keeping the set ascending and inside `[0,1]`.
 *
 * Markers divide ONE curve into regions — a light's attack / sustain / decay
 * ([[light-modulation]]) is the first user. They are clamped rather than
 * refused: a drag that stops at its neighbour shows you the limit, where one
 * that ignores you looks broken. Same rule as a footprint vertex.
 *
 * Returns a new array; the input is untouched.
 */
export declare function moveMarker(markers: number[], i: number, x: number, minGap?: number): number[];
/** Force a marker set ascending and in range — for values arriving from outside. */
export declare function normalizeMarkers(markers: number[], minGap?: number): number[];
/** The closed radial curve as N distinct vertices — the last point is the first. */
export declare function polygonVertices(points: ControlPoint[]): ControlPoint[];
/** N vertices as a closed radial curve, ready to `evaluateCurve`. */
export declare function closePolygon(vertices: ControlPoint[]): ControlPoint[];
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
export declare function moveVertex(vertices: ControlPoint[], index: number, theta: number, r: number): {
    vertices: ControlPoint[];
    index: number;
};
/** Does every vertex clear the centre, with angles in order? */
export declare function isStarShaped(vertices: ControlPoint[]): boolean;
/** The identity: 0 → 0, 1 → 1. */
export declare function linear(): ControlPoint[];
/** Flat at `value` across the whole domain. Not valid as a falloff — see below. */
export declare function constant(value: number): ControlPoint[];
/** `steps` flat treads, each a hair short of the next so the riser is vertical. */
export declare function stepped(steps?: number): ControlPoint[];
/** Slow start. */
export declare function easeIn(): ControlPoint[];
/** Slow finish. */
export declare function easeOut(): ControlPoint[];
/** Smoothstep — slow at both ends. The usual province falloff. */
export declare function easeInOut(): ControlPoint[];
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
export declare function flipCurve(points: ControlPoint[]): ControlPoint[];
/**
 * The default falloff — a straight line from `(0,1)` to `(1,0)`.
 *
 * The mirror of `linear()`'s role for a profile: the plainest thing that obeys
 * the rules, so what you start from says nothing you did not ask for. It was a
 * smoothstep first, which quietly asserted a taste before the author had
 * expressed one.
 */
export declare function falloffDefault(): ControlPoint[];
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
export declare function ngon(sides: number): ControlPoint[];
/**
 * Every direction alike. A circle is the EXPENSIVE footprint — there is no
 * finite polygon that is one — so it is a 16-gon, which at province scale is
 * indistinguishable and costs sixteen numbers.
 */
export declare function circle(): ControlPoint[];
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
export declare function polygonExtent(vertices: ControlPoint[], theta: number): number;
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
export declare function messyNgon(sides?: number, jitter?: number, seed?: number): ControlPoint[];
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
export declare function shelfAndMountains(): ControlPoint[];
/**
 * Old desert: a plain at one level, then terraces above it.
 *
 * Weathering cuts flats and leaves risers, so an old landscape is stepped where
 * a young one is smooth — and everything below the plain is a single level
 * because it has had time to fill in.
 */
export declare function desertTerraces(): ControlPoint[];
/** Full weight across most of the province, then off — the flat-topped case. */
export declare function plateauFalloff(hold?: number): ControlPoint[];
/** Eased both ends — the province melts into its surroundings. */
export declare function smoothEdge(): ControlPoint[];
/** Holds, then drops in the last tenth: a rim, a crater wall, a quarry. */
export declare function abruptEdge(hold?: number): ControlPoint[];
/** A crater/volcano rim — non-monotonic, and the reason monotonicity is not enforced. */
export declare function rim(peak?: number, height?: number): ControlPoint[];
export interface CurvePreset {
    name: string;
    /** Which kinds it is OFFERED for — see `constant`. */
    kinds: CurveKind[];
    build: () => ControlPoint[];
}
/**
 * The presets, tagged with where they are valid.
 *
 * **`constant` is a profile preset only**, and that falls straight out of the
 * endpoint rule: a constant falloff is weight 1 at the boundary, which is
 * exactly the step the `f(1) = 0` pin exists to prevent. Offering it for a
 * falloff would mean offering a seam.
 */
export declare const curvePresets: CurvePreset[];
/**
 * The presets valid for a kind — what a menu should offer.
 *
 * A falloff gets the SAME set, flipped: one definition of "ease in", presented
 * the way round that kind needs it.
 */
export declare function presetsFor(kind: CurveKind): CurvePreset[];
/** The default curve for a kind — the plainest thing that obeys its rules. */
export declare function defaultCurve(kind: CurveKind): ControlPoint[];
/**
 * Decimal places a curve is rounded to when committed.
 *
 * A curve lives in a file an author commits and diffs, so raw drag floats mean
 * nudging one control rewrites every number with new noise. Four places is
 * below UI resolution, kills the noise, and stays readable — agreed with
 * ensemble, who diff these by hand.
 */
export declare const CURVE_PRECISION = 4;
/**
 * The two accepted serialised forms.
 *
 * A bare array is the DEFAULT and the one to write: the domain (`kind`) is a
 * property of the FIELD, so declaring it in the schema keeps one truth instead
 * of copying it into every instance.
 *
 * The wrapper is accepted, not required, for a case ensemble raised that we
 * could not have known: their format has open bags (`Piece.meta`, `Zone.values`)
 * where no schema applies, so a bare curve landing there loses its domain
 * entirely. Reading both costs nothing and gives a schema-less context
 * something self-describing to put there.
 */
export type SerializedCurve = ControlPoint[] | {
    kind?: CurveKind;
    points: ControlPoint[];
};
/** A validation issue, in the shape ensemble's `validate()` collects. */
export interface CurveIssue {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    /**
     * JSON Pointer RELATIVE to the value handed in — `/3/x` for a bare array,
     * `/points/3/x` for a wrapper, `''` for the value as a whole.
     *
     * Relative because the consumer knows where the field lives and we do not.
     * Ensemble prefixes with the field's own path; that join is theirs to do, and
     * this way `validateCurve` needs to know nothing about ensembles.
     */
    path: string;
}
/**
 * Read either accepted form into `{kind, points}`, normalized.
 *
 * NEVER throws. A curve from a newer tosijs-3d, or from an open bag, or from a
 * hand-edit that went wrong, degrades to something usable — because the
 * alternative is an editor that will not open the document you need to fix.
 */
export declare function readCurve(value: SerializedCurve | null | undefined, fallbackKind?: CurveKind): {
    kind: CurveKind;
    points: ControlPoint[];
};
/**
 * The canonical bytes for a curve: sorted, rounded, and nothing else on it.
 *
 * Same input, same output — so an author who nudges one control gets a diff
 * touching one line rather than the whole curve. Key order is fixed by
 * construction (`{x, y}`), since JS preserves insertion order and
 * `JSON.stringify` follows it.
 */
export declare function canonicalCurve(points: ControlPoint[], kind?: CurveKind): ControlPoint[];
/**
 * Report what is wrong with a serialised curve without throwing or fixing it.
 *
 * `error` means it is not a curve; `warning` means it is one we had to
 * interpret. Both are reportable and neither is fatal — an editor shows
 * everything and keeps working, which is only possible if reading and
 * validating are separate operations.
 */
export declare function validateCurve(value: unknown, kind?: CurveKind): CurveIssue[];
/**
 * A JSON Schema fragment for a curve field, for a panel generated from schema.
 *
 * `x-widget` dispatches to the editor; `x-curve-kind` says what x MEANS, which
 * the numbers cannot. Separate keys rather than a compound token, because a
 * compound would put string-parsing in the one place that dispatches on the
 * widget — ensemble's convention, and their other adjuncts (`x-unit`,
 * `x-labels`) follow it.
 */
export declare function curveSchema(kind?: CurveKind, extra?: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=curve.d.ts.map