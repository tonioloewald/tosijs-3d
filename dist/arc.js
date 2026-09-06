/*#
# arc

**The pure model behind [[angle-field|angle3d and arc3d]].** An angle is a
direction; an arc is a direction *and* a width. No DOM, no Babylon — so the part
that is fiddliest to get right is the part a test can pin.

## An arc is a CENTRE and a WIDTH, not a start and an end

Offered as `start`/`end` the two can be dragged into meaninglessness, and the
interesting edit — *"same width, point it there"* — needs both moved together.
Centre-and-width makes that edit one number, and makes the two hard questions
one line each:

```javascript
arcContains(arc, angle)          // |wrap(angle − centre)| ≤ width / 2
arcWithinArc(inner, outer)       // ...and the widths differ by enough
```

Written as intervals those need four cases and a wrap check, and every consumer
would get one of them wrong. The interesting property is that **neither form
mentions where the arc starts**, so wrapping past north is not a special case —
it is unrepresentable.

## Degrees, and two different wraps

Per this library's convention the surface is degrees. Two wraps exist and they
are not interchangeable — see [[manipulator]], which owns both:

- `wrapDegrees` → `(-180, 180]`, for a DELTA or a difference. Signed, because
  turning back five degrees is −5 and calling it 355 sends you the long way.
- `normaliseDegrees` → `[0, 360)`, for a STORED angle, which has no direction to
  preserve and reads better without minus signs.

## A limit CATCHES, it does not jump

Drag past a stop and the handle stays at the stop. The alternative — snapping to
whichever end is nearer in wrapped distance — means dragging a hair past one
limit teleports the value to the other side of the dial, which is the worst
thing a constrained control can do. So `clampAngleToArc` picks the nearer END,
and the widget stops the gesture rather than restarting it elsewhere.

## An envelope EXPLAINS, it does not merely clamp

The motivating case: *"a game where you can place turrets on a ship and where it
goes restricts the firing arc and the placement of the gun."* A gun amidships on
the port rail bears from roughly 10° to 190°, and no placement lets it fire
through its own superstructure.

A control that silently snaps to a legal arc teaches nothing about why. So the
envelope is a first-class value the widget can DRAW — the permitted sector and
the blocked one — and clamping is what happens after you can see the reason.
*/
/*{ "parent": "Utilities", "order": 120 }*/
import { normaliseDegrees, wrapDegrees } from './manipulator.js';
export { normaliseDegrees, wrapDegrees };
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
/** A well-formed arc: centre normalised, width in `[0, 360]`. */
export function arcOf(centre, width) {
    return {
        centre: normaliseDegrees(centre),
        width: clamp(Number.isFinite(width) ? width : 0, 0, 360),
    };
}
/** The whole circle — the identity envelope, and the default for "no limit". */
export const FULL_CIRCLE = { centre: 0, width: 360 };
/** Where the arc begins, going anticlockwise-to-clockwise through its centre. */
export const arcStart = (a) => normaliseDegrees(a.centre - a.width / 2);
/** Where the arc ends. */
export const arcEnd = (a) => normaliseDegrees(a.centre + a.width / 2);
/**
 * Is this bearing inside the arc?
 *
 * One line, and it wraps for free: the difference is taken signed into
 * `(-180, 180]`, so an arc straddling north is not a special case. As an
 * interval test this is four cases and a wrap, which is where a consumer's
 * hand-rolled version goes wrong.
 */
export function arcContains(a, angle) {
    if (a.width >= 360)
        return true;
    return Math.abs(wrapDegrees(angle - a.centre)) <= a.width / 2 + 1e-9;
}
/**
 * Does `outer` wholly contain `inner`?
 *
 * The inner arc's centre must sit within the slack the widths leave — which is
 * both conditions at once, and the reason centre-and-width is the right shape.
 */
export function arcWithinArc(inner, outer) {
    if (outer.width >= 360)
        return true;
    if (inner.width > outer.width + 1e-9)
        return false;
    const slack = (outer.width - inner.width) / 2;
    return Math.abs(wrapDegrees(inner.centre - outer.centre)) <= slack + 1e-9;
}
/**
 * The nearest permitted bearing, catching at a stop rather than jumping.
 *
 * Outside the arc, the answer is whichever END is nearer — never the far side.
 * Snapping by wrapped distance to the arc's CENTRE would teleport a handle
 * dragged a hair past one limit to the opposite stop, which reads as the
 * control fighting you.
 */
export function clampAngleToArc(angle, limits) {
    if (arcContains(limits, angle))
        return normaliseDegrees(angle);
    const start = arcStart(limits);
    const end = arcEnd(limits);
    const toStart = Math.abs(wrapDegrees(angle - start));
    const toEnd = Math.abs(wrapDegrees(angle - end));
    return toStart <= toEnd ? start : end;
}
/**
 * The nearest legal arc: width first, then position.
 *
 * In that order deliberately. Position a too-wide arc first and it can only be
 * wrong, because nothing about where it points can make it fit — narrowing is
 * the constraint that has to give, and doing it first leaves the centre free to
 * honour what the author was actually aiming at.
 */
export function clampArc(value, limits = {}) {
    const envelope = limits.envelope ?? FULL_CIRCLE;
    const maxWidth = Math.min(limits.maxWidth ?? 360, envelope.width);
    const minWidth = Math.min(limits.minWidth ?? 0, maxWidth);
    const width = clamp(value.width, minWidth, maxWidth);
    if (envelope.width >= 360)
        return arcOf(value.centre, width);
    // The centre may move only within the slack the two widths leave.
    const slack = (envelope.width - width) / 2;
    const off = wrapDegrees(value.centre - envelope.centre);
    return arcOf(envelope.centre + clamp(off, -slack, slack), width);
}
/**
 * Which grip is nearest to a bearing, or null if none is within `reach`.
 *
 * The centre is tested LAST and loses ties. On a narrow arc all three grips are
 * within a few degrees of each other, and an edge you cannot grab is worse than
 * a rotation you have to reach for: rotating is also achievable by dragging an
 * edge and then the other, where a stuck width is simply stuck.
 */
export function nearestArcGrip(a, angle, reach = 12) {
    const d = (target) => Math.abs(wrapDegrees(angle - target));
    const candidates = [
        ['start', d(arcStart(a))],
        ['end', d(arcEnd(a))],
        ['centre', d(a.centre)],
    ];
    let best = null;
    let bestD = reach;
    for (const [grip, dist] of candidates) {
        if (dist < bestD) {
            bestD = dist;
            best = grip;
        }
    }
    return best;
}
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
export function dragArc(value, grip, angle, limits = {}) {
    if (grip === 'centre') {
        return clampArc({ centre: angle, width: value.width }, limits);
    }
    const fixed = grip === 'start' ? arcEnd(value) : arcStart(value);
    /*
    MEASURE THE NEW WIDTH FROM THE FIXED EDGE, IN THE ARC'S OWN DIRECTION.
  
    `wrapDegrees` would give the SHORT way round, which flips to the other side of
    the circle the moment the arc passes 180° wide — so a slow widen would snap to
    a narrow arc halfway through. `normaliseDegrees` of the directed difference
    keeps growth monotonic all the way to 360.
    */
    const width = grip === 'start'
        ? normaliseDegrees(fixed - angle)
        : normaliseDegrees(angle - fixed);
    const centre = grip === 'start'
        ? normaliseDegrees(fixed - width / 2)
        : normaliseDegrees(fixed + width / 2);
    return clampArc({ centre, width }, limits);
}
/**
 * The sector of `envelope` that is NOT permitted — what a widget draws as
 * blocked.
 *
 * Returns null when everything is allowed. The complement of an arc is another
 * arc: the same centre turned half a circle, with the leftover width. That it
 * is expressible at all is the payoff of centre-and-width, and it is what lets
 * the control show the ship rather than merely obey it.
 */
export function arcComplement(envelope) {
    if (envelope.width >= 360)
        return null;
    return arcOf(envelope.centre + 180, 360 - envelope.width);
}
//# sourceMappingURL=arc.js.map