import { normaliseDegrees, wrapDegrees } from './manipulator.js';
export { normaliseDegrees, wrapDegrees };
/**
 * A sector of a circle: which way it points, and how wide it is.
 *
 * `centre` is stored normalised into `[0, 360)`; `width` is `0..360`, where 360
 * is the whole circle and 0 is a bearing with no spread.
 */
export interface Arc {
    centre: number;
    width: number;
}
/** A well-formed arc: centre normalised, width in `[0, 360]`. */
export declare function arcOf(centre: number, width: number): Arc;
/** The whole circle — the identity envelope, and the default for "no limit". */
export declare const FULL_CIRCLE: Arc;
/** Where the arc begins, going anticlockwise-to-clockwise through its centre. */
export declare const arcStart: (a: Arc) => number;
/** Where the arc ends. */
export declare const arcEnd: (a: Arc) => number;
/**
 * Is this bearing inside the arc?
 *
 * One line, and it wraps for free: the difference is taken signed into
 * `(-180, 180]`, so an arc straddling north is not a special case. As an
 * interval test this is four cases and a wrap, which is where a consumer's
 * hand-rolled version goes wrong.
 */
export declare function arcContains(a: Arc, angle: number): boolean;
/**
 * Does `outer` wholly contain `inner`?
 *
 * The inner arc's centre must sit within the slack the widths leave — which is
 * both conditions at once, and the reason centre-and-width is the right shape.
 */
export declare function arcWithinArc(inner: Arc, outer: Arc): boolean;
/**
 * The nearest permitted bearing, catching at a stop rather than jumping.
 *
 * Outside the arc, the answer is whichever END is nearer — never the far side.
 * Snapping by wrapped distance to the arc's CENTRE would teleport a handle
 * dragged a hair past one limit to the opposite stop, which reads as the
 * control fighting you.
 */
export declare function clampAngleToArc(angle: number, limits: Arc): number;
/** Width limits for an arc, and the sector it must lie inside. */
export interface ArcLimits {
    minWidth?: number;
    maxWidth?: number;
    /** The arc may only lie within this one. Defaults to the whole circle. */
    envelope?: Arc;
}
/**
 * The nearest legal arc: width first, then position.
 *
 * In that order deliberately. Position a too-wide arc first and it can only be
 * wrong, because nothing about where it points can make it fit — narrowing is
 * the constraint that has to give, and doing it first leaves the centre free to
 * honour what the author was actually aiming at.
 */
export declare function clampArc(value: Arc, limits?: ArcLimits): Arc;
/** Which part of an arc a gesture has hold of. */
export type ArcGrip = 'start' | 'end' | 'centre';
/**
 * Which grip is nearest to a bearing, or null if none is within `reach`.
 *
 * The centre is tested LAST and loses ties. On a narrow arc all three grips are
 * within a few degrees of each other, and an edge you cannot grab is worse than
 * a rotation you have to reach for: rotating is also achievable by dragging an
 * edge and then the other, where a stuck width is simply stuck.
 */
export declare function nearestArcGrip(a: Arc, angle: number, reach?: number): ArcGrip | null;
/**
 * Apply a drag on `grip` to `value`, and return the new arc.
 *
 * - **an edge** changes the WIDTH, the other edge staying put
 * - **the centre** rotates the whole arc, the width staying put
 *
 * Dragging an edge past its opposite would invert the arc, which is never what
 * the gesture meant — the width stops at zero instead. Dragging one the whole
 * way round would wrap it to a hair's width; it saturates at the full circle
 * instead, for the same reason.
 */
export declare function dragArc(value: Arc, grip: ArcGrip, angle: number, limits?: ArcLimits): Arc;
/**
 * The sector of `envelope` that is NOT permitted — what a widget draws as
 * blocked.
 *
 * Returns null when everything is allowed. The complement of an arc is another
 * arc: the same centre turned half a circle, with the leftover width. That it
 * is expressible at all is the payoff of centre-and-width, and it is what lets
 * the control show the ship rather than merely obey it.
 */
export declare function arcComplement(envelope: Arc): Arc | null;
//# sourceMappingURL=arc.d.ts.map