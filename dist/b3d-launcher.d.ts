import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import { type BallisticParams, type Vec3 } from './ballistics';
import type { WarheadSpec } from './warhead';
export interface ProjectileOpts {
    origin: BABYLON.Vector3;
    /** Full launch velocity (direction × speed). */
    velocity: BABYLON.Vector3;
    /** Payload fired on impact. */
    warhead: WarheadSpec;
    /** Gravity + drag + mass for the flight integrator. */
    params: BallisticParams;
    radius?: number;
    color?: string;
    /** Seconds before an un-impacted shell self-disposes (default 6). */
    maxLifetime?: number;
    /** Line-of-sight gating for the impact warhead (default true). */
    useLos?: boolean;
    /** Called with the impact point when the shell detonates. */
    onImpact?: (point: BABYLON.Vector3) => void;
    /**
     * Per-frame steering hook, called BEFORE the ballistic integration with the live
     * `{pos, vel}` and `dt`. Mutate `state.vel` to home/guide the shell (see
     * `spawnMissile`). Omit for an unguided ballistic shell.
     */
    guide?: (state: {
        pos: Vec3;
        vel: Vec3;
    }, dt: number) => void;
    /**
     * Meshes the collision ray must ignore — the FIRING entity's own geometry, so a
     * shell/bomb spawned at/near the shooter (a bomb off the belly, guns in a climb)
     * doesn't immediately detonate on it. Return true to skip a mesh.
     */
    ignore?: (m: BABYLON.AbstractMesh) => boolean;
}
/**
 * Spawn one ballistic shell into the scene and fly it under `params` until it hits
 * something pickable (then it detonates its `warhead` at the impact point) or its
 * lifetime runs out. Integrates its own position in JS, so it fixes BOTH the mesh and
 * that position on a floating-origin shift. Returns a handle to force-dispose it.
 * Reusable by launchers, turrets, and (as an unguided bomb) gravity-only drops.
 */
export declare function spawnProjectile(owner: B3d, opts: ProjectileOpts): {
    dispose: () => void;
};
export interface MissileOpts {
    origin: BABYLON.Vector3;
    /** The mesh to home on. If it's disposed mid-flight the missile flies straight. */
    target: BABYLON.AbstractMesh;
    /** Cruise speed (held constant by the seeker). */
    speed: number;
    /** Max turn rate (rad/sec) — the missile's agility. */
    turnRate: number;
    warhead: WarheadSpec;
    /** Initial launch direction (defaults to straight at the target). */
    direction?: BABYLON.Vector3;
    /** Gravity/drag on the missile (default: none — pure thrust/homing). */
    params?: BallisticParams;
    radius?: number;
    color?: string;
    maxLifetime?: number;
    useLos?: boolean;
    onImpact?: (point: BABYLON.Vector3) => void;
    /** Ignore the firing entity's own meshes on the collision ray (see ProjectileOpts). */
    ignore?: (m: BABYLON.AbstractMesh) => boolean;
}
/**
 * Spawn a **guided missile** that homes on `target`: each frame it leads the target
 * (`interceptLead`) and turns its velocity toward that lead point within `turnRate`,
 * holding `speed` constant — a seeker built from the pure guidance model. Detonates
 * its warhead on impact like any projectile. Reuses `spawnProjectile` (swept
 * collision, floating-origin fix, lifetime) via its `guide` hook.
 */
export declare function spawnMissile(owner: B3d, opts: MissileOpts): {
    dispose: () => void;
};
export declare class B3dLauncher extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        muzzleSpeed: number;
        fireRate: number;
        ammo: number;
        reloadRate: number;
        reloadDelay: number;
        gravity: number;
        drag: number;
        mass: number;
        missileSpeed: number;
        turnRate: number;
        projRadius: number;
        projColor: string;
        maxLifetime: number;
        damage: number;
        fullRadius: number;
        blastRadius: number;
        los: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    meshName: string;
    muzzleSpeed: number;
    fireRate: number;
    ammo: number;
    reloadRate: number;
    reloadDelay: number;
    gravity: number;
    drag: number;
    mass: number;
    missileSpeed: number;
    turnRate: number;
    projRadius: number;
    projColor: string;
    maxLifetime: number;
    damage: number;
    fullRadius: number;
    blastRadius: number;
    los: string;
    private _ammoPool;
    private _cooldown;
    private _tick?;
    get warheadSpec(): WarheadSpec;
    get ballisticParams(): BallisticParams;
    /** Ammo currently in the magazine. */
    get ammoRemaining(): number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** World-space muzzle point (barrel tip, in front of the launcher). */
    muzzle(): BABYLON.Vector3;
    /** The launcher's current forward (its default fire direction). */
    forward(): BABYLON.Vector3;
    /**
     * Fire one shell in `direction` (defaults to the launcher's forward), from
     * `origin` (defaults to the muzzle). Returns false — firing nothing — when the
     * fire-rate cooldown hasn't elapsed or the magazine is empty.
     */
    fire(direction?: BABYLON.Vector3, origin?: BABYLON.Vector3): boolean;
    /**
     * Fire one GUIDED shell that homes on `target` (subject to the same fire-rate +
     * ammo gate as `fire`). Launches along `direction` (default: the launcher's
     * forward) then curves onto the target. Returns false if it couldn't fire.
     */
    fireAt(target: BABYLON.AbstractMesh, direction?: BABYLON.Vector3): boolean;
    sceneDispose(): void;
}
export declare const b3dLauncher: (...args: unknown[]) => B3dLauncher;
//# sourceMappingURL=b3d-launcher.d.ts.map