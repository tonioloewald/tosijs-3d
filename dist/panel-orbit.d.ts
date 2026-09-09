/** A point in the anchor's local space. */
export interface OrbitVec3 {
    x: number;
    y: number;
    z: number;
}
/**
 * A panel's seat on its sphere.
 *
 * `azimuthDeg` is 0 straight ahead and grows to the RIGHT; `elevationDeg` is 0
 * at eye level and grows UP. Degrees, per this library's convention — these are
 * authored and read by people.
 */
export interface Orbit {
    azimuthDeg: number;
    elevationDeg: number;
    radius: number;
}
/**
 * Furthest up a panel may be dragged — and it is the DEFAULT SEAT exactly.
 *
 * Not a round number picked for symmetry. The XR panel is seated 60° up the
 * sight-line, and from the headset: *"It starts about as high as it should be
 * allowed."* So the ceiling is the seat, which also means the panel can only
 * ever be dragged somewhere more comfortable than where it began.
 *
 * (`tosi-b3d`'s `ELEV` is the other half of that pair. A test pins them equal,
 * because a seat that drifts above its own ceiling would be clamped on the
 * first drag and appear to jump.)
 */
export declare const ORBIT_MAX_ELEVATION = 60;
/**
 * Furthest down. Deliberately further than the ceiling: looking down is
 * comfortable and looking up is not, so the band is asymmetric on purpose.
 */
export declare const ORBIT_MIN_ELEVATION = -70;
/** Furthest to either side. Short of your shoulder line. */
export declare const ORBIT_MAX_AZIMUTH = 110;
/**
 * How far past a limit a drag may VISIBLY stretch before it springs back.
 *
 * A hard stop is the right resting behaviour and the wrong live one: the panel
 * simply stops following your hand, which reads as a dropped drag rather than a
 * limit — and in a headset, where the only feedback is what you can see, there
 * is nothing else to tell you which it was. Tonio: *"It could follow you and
 * rubber band back."*
 *
 * So the band is feedback, not a wider clamp. It never becomes a place the
 * panel can rest.
 */
export declare const ORBIT_RUBBER_BAND = 18;
/**
 * Hold a seat inside the reachable band.
 *
 * Radius is clamped positive rather than left alone: a zero or negative radius
 * puts the panel at the anchor's origin — inside your head — where it is both
 * unreadable and unpickable, and nothing downstream would report why.
 */
export declare function clampOrbit(o: Orbit): Orbit;
/**
 * The local position a seat puts the panel at.
 *
 * Forward is +Z, up is +Y, right is +X — the engine's frame, so the result
 * drops straight onto a `TransformNode.position`.
 */
export declare function orbitPosition(o: Orbit): OrbitVec3;
/**
 * The seat a position corresponds to. Inverse of `orbitPosition`.
 *
 * A point at the origin has no direction, so it reports straight ahead rather
 * than whatever `atan2(0, 0)` happens to give — the same rule `windToPolar`
 * follows, and for the same reason: a bearing nobody chose flickers.
 */
export declare function orbitOf(p: OrbitVec3): Orbit;
/**
 * Where a POINTING RAY lands on the sphere — the drag, done properly.
 *
 * ⚠️ NOT the ray's direction. The direction belongs to the CONTROLLER and the
 * sphere is centred on your HEAD, so applying one to the other treats your hand
 * as if it were at your eyes. The panel then sits where the arithmetic says
 * rather than where you are pointing, and every wobble of your hand swings it
 * by the whole offset between the two — which is what "jittery, and doesn't
 * track the cursor" was.
 *
 * The question is "where on my sphere am I pointing", so: take a point along
 * the ray at the sphere's radius, and ask which way THAT lies from the centre.
 * Both arguments are in the anchor's own space; the caller does the transform,
 * and must transform the origin as a POINT and the direction as a VECTOR —
 * using the same one for both is the same class of error again.
 */
export declare function orbitFromAim(rayOrigin: OrbitVec3, rayDirection: OrbitVec3, current: Orbit): Orbit;
/**
 * One axis of the rubber band: how far past a limit an overshoot SHOWS.
 *
 * `max · (1 - e^(-over/max))`. Three properties earn it over a linear scale
 * with a cap: it starts at 1:1 so small overshoots feel like nothing unusual,
 * it stiffens smoothly rather than hitting a second hard stop, and it asymptotes
 * — pull as far as you like and the panel never runs away.
 */
export declare function rubberBand(over: number, max?: number): number;
/**
 * A seat for LIVE DRAG feedback: inside the band it is exact, outside it
 * stretches and stiffens.
 *
 * Pair it with `clampOrbit` on release — that is what makes it a band rather
 * than a bigger box. A panel must never come to rest out here, because out here
 * is where its own recovery buttons are hard to reach.
 */
export declare function bandOrbit(o: Orbit): Orbit;
/**
 * Where a pointing direction puts the panel, at the radius it already has.
 *
 * This is the drag: the panel goes where you point, and the radius comes from
 * where it already was rather than from how far away you happened to aim. The
 * direction need not be unit-length; a zero direction leaves the seat alone,
 * because a controller reporting nothing should not fling the panel to a corner.
 *
 * ⚠️ RAW — neither clamped nor banded, because only the caller knows which it
 * wants. `bandOrbit` while the hand is down, `clampOrbit` when it lets go.
 */
export declare function orbitFromDirection(dir: OrbitVec3, current: Orbit): Orbit;
/**
 * How tall a panel looks from the anchor, in degrees.
 *
 * A panel's height is metres; a seat is angles. This is the bridge, and it is
 * why the same panel needs more room low down than it does close up.
 */
export declare function angularHeight(height: number, radius: number): number;
/**
 * The CENTRE a seat puts the panel's centre at, given how tall it looks.
 *
 * A seat names the edge FURTHEST from the equator, and the panel extends back
 * TOWARD eye level. Tonio, from the headset: *"Panels below the equator should
 * be bottom relative."*
 *
 * The reason generalises to both halves. Centre-anchoring makes a tall panel
 * grow in BOTH directions, so half of it goes somewhere worse than where you
 * put it: a panel seated at −40° trails down past −70° into the floor, and one
 * seated at the 60° ceiling pushes its top above the ceiling it was clamped to.
 * Pinning the far edge means the extra height always lands somewhere more
 * comfortable, and the seat you dragged to is the extreme rather than the
 * middle.
 *
 * At the equator the two halves agree at centred, so there is no discontinuity
 * to feel as you drag through it.
 */
export declare function orbitCentre(seat: Orbit, angularHeightDeg: number): Orbit;
/**
 * How far a seat had to be clamped — `0` when the drag landed inside the band.
 *
 * Exists so a caller can SAY so: a panel that stops following your hand with no
 * explanation reads as a broken drag rather than a limit, and the fix is a nudge
 * of feedback rather than a wider band.
 */
export declare function orbitClampedBy(wanted: Orbit): number;
//# sourceMappingURL=panel-orbit.d.ts.map