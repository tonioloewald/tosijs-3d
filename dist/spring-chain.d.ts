import type { Quat, Vec3 } from './spatial-transform.js';
/**
 * How the anchor is turned: a world rotation, or a function taking a
 * direction in the anchor's frame to world (for hierarchies a quaternion
 * cannot describe, such as glTF's mirrored root).
 */
export type Orientation = Quat | ((v: Vec3) => Vec3);
export interface SpringParams {
    /** 0 hangs free, 1 holds its rest shape almost rigidly. Per second-ish. */
    stiffness: number;
    /** Fraction of velocity lost per second (0 swings for ever, 1 is treacle). */
    damping: number;
    /** Metres per second², world space. */
    gravity: Vec3;
    /** How fat the chain is, for colliders. */
    radius: number;
}
export declare const SPRING_DEFAULTS: SpringParams;
/** A sphere the chain cannot enter (a head, a shoulder), world space. */
export interface SpringCollider {
    center: Vec3;
    radius: number;
}
export interface SpringChain {
    /** Current points, world space; [0] is the anchor. */
    points: Vec3[];
    /** Points a step ago (Verlet's velocity). */
    prev: Vec3[];
    /** Segment lengths, points[i] → points[i + 1]. */
    lengths: number[];
    /**
     * Each segment's rest direction in the ANCHOR's frame: what `stiffness`
     * pulls toward, carried by the anchor's rotation.
     */
    rest: Vec3[];
    /** Unspent time, carried to the next step. */
    carry: number;
}
/**
 * A chain at rest through `points` (world). `toAnchor` takes a world
 * direction into the anchor bone's frame: the conjugate of its world
 * rotation, or a function for a mirrored hierarchy.
 */
export declare function springChain(points: readonly Vec3[], anchorRotation: Quat, toAnchor?: (v: Vec3) => Vec3): SpringChain;
/**
 * Put the chain back in its rest shape at the anchor (a teleport, a
 * respawn, a floating-origin shift: anything that is not motion).
 */
export declare function resetSpringChain(chain: SpringChain, anchor: Vec3, anchorRotation: Orientation): void;
/** Shift every point (a floating-origin rebase moves the world, not the hair). */
export declare function shiftSpringChain(chain: SpringChain, d: Vec3): void;
/**
 * Advance `dt` seconds with the anchor now at `anchor`, turned
 * `anchorRotation`. Runs whole fixed steps; the remainder waits for the
 * next call. A long stall (a hidden tab) is not replayed: at most a quarter
 * of a second is simulated.
 */
export declare function stepSpringChain(chain: SpringChain, anchor: Vec3, anchorRotation: Orientation, dt: number, params?: Partial<SpringParams>, colliders?: readonly SpringCollider[]): void;
//# sourceMappingURL=spring-chain.d.ts.map