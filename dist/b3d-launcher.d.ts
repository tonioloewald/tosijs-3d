import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d, RadarFaction } from './tosi-b3d';
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
    /**
     * Make this projectile show on radar (e.g. your own missile). It registers a
     * `RadarBlip` that follows the shell and unregisters when it disposes. A homing
     * weapon can chase it via the blip's `radarMesh()`.
     */
    radar?: {
        profile: number;
        faction: RadarFaction;
    };
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
    /**
     * Per-frame hook run AFTER the seeker, so it can constrain what homing asked
     * for — water drag, a depth floor, a speed cap in another medium. Same shape as
     * `ProjectileOpts.guide`; on a missile it composes with the seeker instead of
     * replacing it (tosijs-3d#13).
     */
    guide?: (state: {
        pos: Vec3;
        vel: Vec3;
    }, dt: number) => void;
    origin: BABYLON.Vector3;
    /** The mesh to home on. If it's disposed mid-flight the missile flies straight. */
    target: BABYLON.AbstractMesh;
    /** Cruise speed the motor accelerates to (and the seeker holds once reached). */
    speed: number;
    /** Max turn rate (rad/sec) — the missile's agility. */
    turnRate: number;
    /** Launch platform's world velocity — the missile INHERITS it so it doesn't drop
     * behind a fast mover, then thrusts up to `speed`. Default none. */
    inheritVelocity?: Vec3;
    /** Thrust acceleration (units/s²) ramping launch speed → cruise `speed`. Omit/0 =
     * instant cruise (legacy). */
    accel?: number;
    /** BOOST: seconds of forced forward acceleration off the rail. Default 0.45s.
     *
     * The motor thrusts along the body, so the round leaves accelerating more-or-less
     * straight — but the seeker is NOT asleep: its turn authority ramps in across this
     * window (`boostAuthority`), from 0 at launch to full at burnout. Agility is tied to
     * speed, which is the honest physical constraint: a slow round shouldn't be able to
     * yank itself sideways, a fast one should.
     *
     * It previously BLOCKED steering outright for the whole window, which cost the round
     * its opening 50-odd units — it's fired along the launcher's nose with a lock up to
     * 35° off it, so it flew the wrong way, and at a turn radius of v/turnRate (~50 units)
     * it couldn't recover: it overshot and never came back. Measured nose-launched at
     * turnRate 3, a hard gate hit 3 of 6 test geometries (missing everything past 25°
     * off-axis); the ramp hits 6 of 6 while still leaving straight. `0` = full authority
     * from frame 1. */
    boostTime?: number;
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
    /** Give the missile a radar signature (see ProjectileOpts.radar). */
    radar?: {
        profile: number;
        faction: RadarFaction;
    };
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