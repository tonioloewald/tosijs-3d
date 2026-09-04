import { type Pose, type Vec3 } from './spatial-transform.js';
/**
 * The pose a render-target camera should take so that portal `a`, seen from
 * `camera`, shows what lies beyond portal `b`.
 *
 * Reads as: express the camera in `a`'s frame, plant it in `b`'s. No flip —
 * see the convention note above for why, and for what it cost to get wrong.
 */
export declare function portalCamera(camera: Pose, a: Pose, b: Pose): Pose;
/**
 * The plane to clip the virtual camera against: portal `b`'s plane, facing into
 * the destination.
 *
 * Returned as `{ normal, d }` with the plane `normal · x + d = 0`. Without this,
 * anything standing between the exit portal and the virtual camera is drawn over
 * the view — a chair on the far side of the hall appearing in your doorway.
 */
export declare function clipPlaneFor(b: Pose): {
    normal: Vec3;
    d: number;
};
/**
 * Signed distance along the portal's travel axis: **negative approaching,
 * positive once through**.
 */
export declare function sideOf(p: Vec3, portal: Pose): number;
/**
 * Did this step pass through the portal's plane, approaching to through?
 *
 * A **step** test, for the same reason `medium.crossing` is one: a sprinting
 * player or a vehicle can be in front of the doorway on one frame and well past
 * it on the next, and a handover that waits to observe the camera *inside* a
 * threshold volume simply misses. The context swap must happen on the frame the
 * plane is crossed — one frame late is one frame of the wrong world.
 *
 * Note this only tests the PLANE. Whether the crossing was inside the doorway's
 * frame (rather than through the wall beside it) is a bounds check the caller
 * owns, because the portal's shape is the renderer's business.
 */
export declare function crossedPortal(from: Vec3, to: Vec3, portal: Pose): boolean;
/** Cumulative brightness after `depth` traversals of a portal of this quality. */
export declare function attenuationAt(attenuation: number, depth: number): number;
/**
 * How many recursion levels are worth drawing, given how lossy the portal is
 * and the brightness below which nobody can tell.
 *
 * `attenuation` is clamped under 1 deliberately: a perfect mirror would recurse
 * forever, and "the author typed 1.0" must not be a hang. `cap` is the hard
 * ceiling a device tier imposes — the answer is always the smaller of the two,
 * so a headset can insist on 2 no matter how clean the glass is.
 */
export declare function depthLimit(attenuation: number, epsilon?: number, cap?: number): number;
/** Remaining brightness at each recursion depth. `0` is the direct view. */
export type PortalFalloff = (depth: number) => number;
/** Geometric: `a^depth`. Physical, and slow — see the 95% note above. */
export declare const geometricFalloff: (attenuation: number) => PortalFalloff;
/**
 * Linear: a fixed decline per level, so `step = 0.1` gives exactly ten levels.
 * The pass count becomes a number you state rather than one you solve for.
 */
export declare const linearFalloff: (step: number) => PortalFalloff;
/**
 * Accelerating: the per-level loss grows by `growth` each time, so the first
 * bounce keeps almost everything and the tail falls off a cliff.
 *
 * `first = 0.05, growth = 2` loses 5%, then 10%, then 20% — dirt where nobody
 * is looking. This is the perceptually honest one: the first reflection is the
 * only one anyone inspects, and depth 4 exists to be atmosphere.
 */
export declare const acceleratingFalloff: (first?: number, growth?: number) => PortalFalloff;
/**
 * How many levels are worth drawing under any falloff curve: the first depth
 * whose remaining brightness is below `epsilon`, capped by the device tier.
 *
 * The cap always wins, so a headset can insist on 2 however clean the glass is.
 */
export declare function depthLimitFor(falloff: PortalFalloff, epsilon?: number, cap?: number): number;
//# sourceMappingURL=portal-transform.d.ts.map