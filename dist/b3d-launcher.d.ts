import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d, RadarFaction } from './tosi-b3d.js';
import { type BallisticParams, type Vec3 } from './ballistics.js';
import { type Medium, type MediumCrossing } from './medium.js';
import type { WarheadSpec } from './warhead.js';
import type { Cause } from './destroyable.js';
/**
 * WHERE a round stopped, and what it stopped against.
 *
 * `point` alone is not enough to place anything on a surface: a scorch mark, a
 * dent decal, a spark spray and a ricochet all need to know which way the
 * surface FACES. `pickWithRay` already returns that — the launcher was calling
 * `getNormal()`'s owner and then throwing it away, so every consumer that
 * wanted an oriented effect had to re-cast the same ray to recover it
 * (tosijs-3d#29).
 *
 * `normal` and `mesh` are NULLABLE and the null case is real, not defensive: a
 * depth fuse detonates in open water, and a timed or proximity round detonates
 * in mid-air. There is no surface, so there is no normal — and a caller that
 * assumes one would orient its effect off stale or zeroed data. Branch on it.
 */
export interface Impact {
    /** World-space point of detonation. */
    point: BABYLON.Vector3;
    /** World-space surface normal, or `null` if nothing was struck. */
    normal: BABYLON.Vector3 | null;
    /** The mesh struck, or `null` for a fuse that went off in open space. */
    mesh: BABYLON.AbstractMesh | null;
}
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
    /**
     * Damage what it PASSES THROUGH instead of detonating an area effect.
     *
     * A cannon shell should hurt the wing it hit. An AOE payload resolves by
     * distance to a destroyable's registered point — one point, at the model's
     * origin — so scaling a craft up puts its extremities outside the blast and a
     * point-blank hit does nothing, silently (#23).
     *
     * Direct damage has no length scale in it, so it survives any change of craft
     * or world scale. The target is resolved by ANCESTRY, because a library model
     * hangs asynchronously beneath the registered root and the picked mesh is a
     * wing three levels down.
     */
    directHit?: boolean;
    /** Who to credit for what this shell destroys — see [[destroyable|Cause]]. */
    cause?: Cause;
    /**
     * Called when the shell detonates, with the point, the surface normal and the
     * mesh struck (see `Impact` — normal/mesh are null for a fuse in open space).
     */
    whenImpact?: (impact: Impact) => void;
    /**
     * @deprecated Use `whenImpact`, which also carries the surface normal.
     *
     * Renamed off the `on*` prefix as well as widened: an `onFoo` key in an
     * options bag that gets lifted onto an element becomes an addEventListener
     * call and the callback silently never fires (see CLAUDE.md). This shape is
     * headed for `<tosi-b3d-launcher>`, so the name was a trap waiting to be
     * sprung. Still honoured, with a one-shot warning.
     */
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
     * Draw the round as THIS instead of the default sphere — a node you supply
     * (e.g. `library.instantiate('Missile', { canonical: true })`).
     *
     * The engine keeps owning motion, collision, lifetime and disposal; only the
     * appearance changes. It is also **oriented along velocity** each step, which
     * a sphere never needed: a modelled missile with no facing flies sideways,
     * and that is the part a consumer can't add from outside without duplicating
     * the integrator. (tosijs-3d#19 — manta-recon had an authored Missile that
     * sat unused.)
     *
     * Made non-pickable on adoption, like the default sphere: a projectile that
     * picks itself blocks the blast's own line of sight.
     */
    mesh?: BABYLON.TransformNode;
    /** React to a medium boundary: the entry splash, the breakout plume, the
     * audio. Called with which way it went and which medium it was. */
    whenCrossing?: (kind: MediumCrossing, medium: Medium, at: {
        x: number;
        y: number;
        z: number;
    }) => void;
    /** Detonate this many metres INSIDE a medium — a depth charge. */
    detonateDepth?: number;
    /** Named medium the round refuses to leave — a torpedo, for which the
     * surface is a ceiling. It is held just inside rather than reflected. */
    stayIn?: string;
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
    /** Draw the missile as this node, oriented along velocity. See
     * `ProjectileOpts.mesh` — a homing round is the one most worth modelling. */
    mesh?: BABYLON.TransformNode;
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
    /** Seeker agility in RADIANS/sec. Prefer `turnRateDeg` if you think in
     * degrees — give either, not both. */
    turnRate: number;
    /** Seeker agility in DEGREES/sec. Wins over `turnRate` when both are given,
     * on the grounds that the more explicit unit is the more deliberate one. */
    turnRateDeg?: number;
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
    whenImpact?: (impact: Impact) => void;
    /** @deprecated Use `whenImpact` (see ProjectileOpts). */
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
    static preferredTagName: string;
    static initAttributes: {
        meshName: string;
        /** Instantiate `meshName` from this LIBRARY instead of the placeholder box.
         * `_muzzle` on the model says where rounds leave (#34). */
        library: string;
        grip: string;
        socket: string;
        /**
         * Uniform scale for the loaded model.
         *
         * Weapon packs are authored at their own idea of real scale and a character
         * rig at its own, and the two rarely agree TO THE EYE even when both are
         * nominally correct — Kenney's pistol is a chunky 0.29m, which reads large
         * in a 1.83m hand. Tonio, fitting one: "I'd also want to scale the weapon
         * down somewhat."
         *
         * Applied to the mesh's `scaling`, which `AbstractMesh.render()` does NOT
         * overwrite — the one part of a transform it leaves alone — so unlike
         * `x`/`y`/`z` it survives without being re-applied every frame.
         */
        modelScale: number;
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
    library: string;
    grip: string;
    socket: string;
    modelScale: number;
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
    /**
     * What you last SET, if it is still the current value — otherwise derived.
     *
     * The naive `rad * 180/PI` round-trip is lossy: `30` comes back as
     * `29.999999999999996`, which is what a slider readout or a saved scene would
     * then show. Caching the pair you supplied fixes that without introducing a
     * second source of truth, because the memo carries its own PROVENANCE — the
     * radian value it produced. If anything writes `turnRate` afterwards the memo
     * no longer matches and we derive fresh, so invalidation is exact and needs
     * no observer, no dirty flag and no staleness window (Tonio's design).
     *
     * `turnRate` remains the one stored value; this is still a computed view.
     */
    private _degMemo;
    get turnRateDeg(): number;
    set turnRateDeg(v: number);
    projRadius: number;
    projColor: string;
    maxLifetime: number;
    damage: number;
    fullRadius: number;
    blastRadius: number;
    los: string;
    private _ammoPool;
    private _cooldown;
    private _stopLoad;
    private _muzzleNode;
    private _tick?;
    get warheadSpec(): WarheadSpec;
    get ballisticParams(): BallisticParams;
    /** Ammo currently in the magazine. */
    get ammoRemaining(): number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /**
     * Shift the model so its GRIP lands on `x`/`y`/`z`, not its origin.
     *
     * Runs once, after the model loads, because it needs the geometry. A `_grip`
     * node wins if the model carries one — the same deal `_muzzle` gets, and the
     * thing this heuristic exists to substitute for.
     */
    /** The grip offset, measured once — see `_applyGrip`. */
    private _gripOffset;
    private _applyGrip;
    /**
     * The grip, guessed from the shape: the centroid of the lowest third.
     *
     * Measured against Kenney's pack, where it lands inside the handle on every
     * one-handed weapon — pistol (0, 0.011, -0.105), uzi (0, 0.045, -0.039),
     * shotgun (0, 0.023, -0.106). It is a guess about shape and it will be wrong
     * for anything not held near its lowest point, a shoulder-carried launcher
     * being the obvious case. `_grip` or an explicit offset is the answer there.
     *
     * Everything is converted into the LAUNCHER MESH's own local frame rather
     * than read in world space, because a weapon held by a character hangs under
     * a `__root__` carrying the glTF handedness mirror — so a world-space
     * measurement comes back with its z sign flipped relative to the offsets we
     * are about to write.
     */
    private _deriveGrip;
    /**
     * Swap to a different model from the same library, at runtime.
     *
     * The load is a one-shot latch (see `_loadLibraryModel`), which is right for
     * the normal case and wrong for a fitting tool that switches weapons while you
     * watch. This releases the latch and drops the current mesh so the next frame
     * loads whatever `meshName` now says.
     *
     * The proxy children go with it — `addSolidProxy` parents them to the mesh, so
     * disposing the hierarchy takes them too, and forgetting that would leave an
     * invisible collider hanging in the air where the old weapon was.
     */
    reloadModel(): void;
    /** Load the library model, once, after the attribute drain has finished. */
    private _libLoaded;
    private _loadLibraryModel;
    /**
     * A NESTED launcher rides its holder.
     *
     * Without this, `b3dBiped({...}, b3dLauncher({...}))` reads as "this character
     * is carrying a gun" and renders as a crate lying at the world origin — the
     * mesh is placed in world space, and nothing ever told it about the thing it
     * is nested in. The FIRING was already right (a biped fires along its own
     * aim), which made the gap worse rather than better: correct behaviour
     * attached to scenery.
     *
     * So `x`/`y`/`z` become a LOCAL offset when nested, which is what they
     * obviously mean once there is something to be local to — a hip, a hardpoint,
     * a turret ring.
     *
     * `semanticParent` rather than `parentElement`, because tosijs mounts light
     * DOM children inside a `<tosi-slot>` and the raw parent is that wrapper.
     */
    private _rideHolder;
    /**
     * The joint named by `socket`, as something to parent to.
     *
     * Babylon gives a glTF skeleton's bones LINKED TRANSFORM NODES — real nodes
     * in the scene graph that the animation drives — so parenting to one is
     * ordinary parenting and needs no `attachToBone` bookkeeping. A rig without
     * them (a non-glTF import) has no node to hang off, and that is a fallback
     * rather than a failure.
     */
    private _socketNode;
    /**
     * Riding a BONE rather than the holder's root.
     *
     * Read by the biped, which must not then rotate the weapon to the aim: the
     * hand already carries it, and applying both gives you the hand's rotation
     * times the aim's.
     */
    get socketed(): boolean;
    private _socketed;
    /** Once per message — this runs from the render loop. */
    private _warnedSockets;
    private _warnSocket;
    /**
     * The node the launcher RIDES ON, if it is mounted on something.
     *
     * Cached, because it is asked for on every shot and the answer only changes
     * when the launcher is re-parented — which `_rideHolder` does once.
     */
    private _mountRoot;
    private _mount;
    /**
     * Geometry a round must not detonate on: our own barrel, and WHOEVER IS
     * HOLDING US.
     *
     * The barrel alone was not enough, and the way it failed is worth recording
     * because it does not look like a collision bug. A biped fires from
     * `aimOrigin`, which is 0.35m in front of the body — and the body's collision
     * ellipsoid has a radius of 0.75. So every round spawned INSIDE the shooter,
     * hit him on its first swept step, and detonated. Tonio: "I don't seem to be
     * able to aim, just cause explosions in front of me." Nothing was wrong with
     * the aiming; the round never got out of the man.
     *
     * Moving the muzzle further forward would be the wrong fix — it would make
     * the number bigger until a wider character or a crouch broke it again, and
     * it would put the muzzle through a wall the shooter is standing against.
     * Whoever holds the gun is not a target for it, at any distance.
     */
    private _selfHit;
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