import * as BABYLON from '@babylonjs/core';
export interface ExplodeOptions {
    /** Number of fragments to create (default: 20) */
    fragments?: number;
    /** Outward force applied to fragments (default: 5) */
    force?: number;
    /** Gravity acceleration for kinematic mode (default: -9.81, ignored with physics) */
    gravity?: number;
    /** Random tumble rotation speed (default: 3) */
    tumble?: number;
    /** Duration in seconds, or 'frustum' to dispose when all fragments leave view (default: 2) */
    duration?: number | 'frustum';
    /** Time fraction (0-1) when fragments start fading (default: 0.5) */
    fadeStart?: number;
    /** Dispose the original mesh (default: true, otherwise just hides it) */
    disposeOriginal?: boolean;
    /** Explosion center override (default: mesh bounding center) */
    center?: BABYLON.Vector3;
    /** Restitution (bounciness) for physics fragments (default: 0.3) */
    restitution?: number;
    /** Friction for physics fragments (default: 0.5) */
    friction?: number;
}
/**
 * Shatter a mesh into fragments and animate them flying apart.
 * The original mesh is hidden (or disposed). Fragments are automatically
 * cleaned up after the animation completes.
 *
 * If a physics engine is active on the scene, fragments get rigid bodies
 * and bounce realistically. Otherwise, a kinematic fallback is used.
 */
/**
 * Shatter a mesh — or a whole HIERARCHY — into fragments.
 *
 * Accepts a `TransformNode` as well as a `Mesh`, because a library-instantiated
 * model's root is a geometry-less transform node with the real meshes beneath it.
 * Handed one of those, it explodes every descendant that HAS geometry, which is
 * also the better outcome: a multi-part model comes apart properly instead of one
 * piece shattering while the rest hangs in the air.
 *
 * It used to take a `Mesh` and call `getVerticesData` on whatever it was given.
 * `b3d-destroyable`'s new `library` path made that a guaranteed crash on every
 * kill — and because the throw happened inside a render observer, every observer
 * registered after it was skipped: camera follow, flight integration, all of it.
 * The scene stopped advancing while input kept being read, which presents as "the
 * game has seized but the controls still respond". A cosmetic effect must never
 * be able to take down the frame loop (tosijs-3d#24, manta-recon).
 */
export declare function explodeMesh(node: BABYLON.Mesh | BABYLON.TransformNode, scene: BABYLON.Scene, options?: ExplodeOptions): void;
//# sourceMappingURL=b3d-exploder.d.ts.map