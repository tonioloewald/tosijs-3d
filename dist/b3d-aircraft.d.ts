import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { B3dControllable } from './b3d-controllable';
import type { ControlInput } from './control-input';
import type { B3dRadar } from './b3d-radar';
export declare class B3dAircraft extends B3dControllable {
    inputMapping: import("./virtual-gamepad").InputMapping;
    static initAttributes: {
        url: string;
        library: string;
        meshName: string;
        player: boolean;
        enterable: boolean;
        ceiling: number;
        hudChaseOff: boolean;
        hudSize: number;
        hudForward: number;
        maxSpeed: number;
        afterburnerSpeed: number;
        acceleration: number;
        vtolSpeed: number;
        /** How fast the craft may back up in hover (units/s). */
        reverseSpeed: number;
        /** How fast the trigger moves the throttle lever (setting/sec). */
        throttleRate: number;
        /**
         * AUTO LANDING GEAR. `'on'` finds the model's gear-retract AnimationGroups
         * by name and runs them with height above ground: up on climb-out, down on
         * approach. `'off'` leaves the gear to you (call `setGear`).
         */
        autoGear: "on" | "off";
        /** Height above ground (m) at which the gear retracts. It extends again at
         * 60% of this — hysteresis, so a bumpy approach doesn't cycle it. */
        gearAltitude: number;
        /** Optional sound for the gear cycle (URL). Played spatially at the
         * airframe, once per transition. */
        gearSound: string;
        /** Volume for `gearSound`. */
        gearVolume: number;
        /** Seconds for a full gear cycle. */
        gearTime: number;
        /** How far the LOOK stick can swing the view (degrees each way). */
        lookRange: number;
        /** Max nose-UP attitude the stick can command, degrees. */
        maxPitch: number;
        /** Max nose-DOWN attitude, degrees. 0 = same as `maxPitch`. */
        maxDive: number;
        /** Look slew rate (degrees/sec at full deflection). */
        lookRate: number;
        /** How fast the view springs back to centre when the stick is released
         * (fraction of the remaining offset per second). */
        lookReturn: number;
        /**
         * How much of the airframe's PITCH the chase camera inherits. `0` (the
         * default) is the level pivot: the plane pitches within a steady frame.
         * `1` is as if the camera were parented to the airframe — climb and the
         * view swings up with the nose.
         */
        chasePitchFollow: number;
        /**
         * How fast the inherited pitch catches up (per second). This is what makes
         * `chasePitchFollow` viable at all: raw parenting hands the camera the
         * airframe's attitude JITTER, which a ~5m lever arm amplifies into visible
         * shake — the reason the pivot was flattened in the first place. Low-passing
         * it keeps the intent (a climb aims the view up) and drops the noise.
         */
        chasePitchLag: number;
        hoverCeiling: number;
        groundY: number;
        crashSpeed: number;
        weapons: string;
        gunRate: number;
        gunSpeed: number;
        gunDamage: number;
        missileSpeed: number;
        missileAccel: number;
        missileBoost: number;
        missileTurnRate: number;
        missileDamage: number;
        bombDamage: number;
        lockRange: number;
        lockConeDeg: number;
        reticle: string;
        reticleRange: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    airspeed: number;
    altitude: number;
    throttleLevel: number;
    vtolActive: boolean;
    stalling: boolean;
    pullUp: boolean;
    grounded: boolean;
    crashed: boolean;
    /** Armed once you clear TAKEOFF_MARGIN above the pad; only then can a touchdown crash you. */
    private _hasFlown;
    /** Active camera mode — toggled by the `view` button. Also read by the XR
     * chase rig to sit in the cockpit vs. behind the aircraft. */
    cameraView: 'chase' | 'cockpit';
    private viewWasPressed;
    /** Camera offsets (read by the XR rig too). The cockpit rides inside the
     * airframe banking with it; the chase springs to a yaw-frame offset behind +
     * above, so it stays level and looks down at the plane (not dead-on its tail)
     * rather than being swung below when the aircraft pitches/rolls. */
    eyeHeight: number;
    cockpitForward: number;
    chaseMinHeight: number;
    chaseHeight: number;
    chaseDistance: number;
    private velocity;
    private _fwd;
    private _gunCd;
    private _bombCd;
    private _missileCd;
    private _bombWas;
    private _missileWas;
    private fbw;
    private fbwSeeded;
    ceiling: number;
    hudChaseOff: boolean;
    reticle: string;
    reticleRange: number;
    private _hud;
    private _hudMounted;
    private _radar;
    private _reticleMesh;
    private meshNode;
    private _chasePivot;
    private _chaseLookPitch;
    /** Damped airframe pitch the chase has actually inherited (see
     * `chasePitchFollow`) — smoothed, never the raw attitude. */
    private _chaseFollowPitch;
    /** Where the LOOK stick has swung the view (radians), and how fast it
     * springs back when released. */
    private _lookYaw;
    private _lookPitch;
    private meshesToDispose;
    private _lastGroundDist;
    private _groundNormal;
    /** True while the airframe is in open air INSIDE the ground (a bore/cavern):
     * heightfield assumptions are suspended for the frame. */
    private _inCavity;
    private _worldVel;
    private _prevPos;
    private _prevPosValid;
    private _ray;
    private _ownMeshes;
    private groundClearance;
    private libraryNode;
    getCameraTarget(): BABYLON.Node | null;
    applyInput(input: ControlInput, dt: number): void;
    private updateWeapons;
    private _camQuat;
    /** Push the attached radar's detected contacts onto the HUD as radar traces. */
    private _pushRadarToHud;
    /** The attached `<tosi-b3d-radar>` child (found once), or null. */
    get radar(): B3dRadar | null;
    /** The airframe's own meshes — the collision ray must skip these so a shell/bomb
     * spawned at the belly (or the nose in a climb) never detonates on us. */
    private ownMeshes;
    /** World nose direction (unit) and a muzzle point `ahead` metres in front.
     * Computed through the WORLD matrix, never node.position: with a
     * _centerOfGravity pivot the rendered airframe swings about the CoG under
     * attitude, and position alone points at the stance origin — shots would
     * spawn beside/behind the visible plane in a turn. */
    private muzzle;
    /** Fire one cannon shell forward, inheriting the airframe's velocity. */
    fireGuns(): void;
    /** Drop a bomb — it inherits the airframe's velocity and falls under gravity.
     * Released a little below the belly and set to ignore our own geometry, so a bank
     * doesn't detonate it on the wing. */
    dropBomb(): void;
    /**
     * Fire a guided missile at your **nearest radar lock** (no lock ⇒ it goes ballistic
     * straight ahead). With a `<tosi-b3d-radar>` attached the lock comes from the radar;
     * without one it falls back to the legacy forward-cone acquire. The missile carries a
     * small radar signature (profile 0.25, friendly) so it shows on the HUD.
     */
    fireMissile(): void;
    private get gunWarhead();
    /** Nearest destroyable within `range` and inside the forward cone (or null). */
    private acquireTarget;
    /** The model's gear-retract animations, found by name (see `_findGear`). */
    private _gearGroups;
    /** true = retracted (or retracting). Starts DOWN: you spawn on the ground. */
    private _gearUp;
    private _gearSound;
    /** 0 = down, 1 = up — scrubbed toward `_gearTarget`. */
    private _gearPos;
    private _gearTarget;
    /**
     * Find the gear animations on a freshly-loaded model, by NAME.
     *
     * Convention over configuration: a group whose name mentions "gear" and
     * "retract" (or "up") is a landing-gear animation, so the scout's
     * "Main Gear (L) Retract" / "Nose Gear Retract" are picked up with no
     * authoring beyond what's already in the GLB. Library instances carry their
     * groups on `metadata.animationGroups` (renamed per instance), so several
     * aircraft each animate their own gear.
     */
    private _findGear;
    /**
     * Raise or lower the gear. Public so an AI pilot, a cutscene or a key bind
     * can call it; `autoGear` drives it from altitude otherwise.
     */
    setGear(up: boolean): void;
    /**
     * The gear is SCRUBBED, not played.
     *
     * Letting the AnimationGroup play itself looked obvious and doesn't work:
     * glTF animations arrive with a cyclic loop mode, so a group told to stop at
     * the end can snap back to frame 0 — the gear cycles and then vanishes
     * (exactly what Tonio saw) — and reverse playback via `start(from > to)` is
     * unreliable across Babylon versions. Advancing a normalised position and
     * calling `goToFrame` sidesteps all of it: no loop mode, no end-of-group
     * behaviour, no second animation to author for the reverse, and an
     * interrupted cycle simply turns around from wherever it had got to.
     */
    private _scrubGear;
    /** True while the gear is up (or on its way). */
    get gearUp(): boolean;
    private _playGearSound;
    /** Drive the gear from height above ground, with hysteresis so a bumpy
     * approach or a hill passing underneath doesn't cycle it. */
    private _updateGear;
    /** Distance from the aircraft origin down to the nearest ground: the lower of
     * any terrain collider the raycast hits and the configured ground plane. */
    private groundDistance;
    /** Transition to the crashed/wrecked state: stop, lock out control, notify. */
    private crash;
    /** Raycast downward to find distance to ground. Returns Infinity if no hit.
     * Reuses a cached Ray and own-mesh set (rebuilt on model load) to avoid
     * per-call allocation on this per-frame path. */
    private raycastGround;
    private updatePullUp;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private loadFromUrl;
    private loadFromLibrary;
    private setupMesh;
    /**
     * Build the gun-aiming reticle: a ring parented to the airframe, sitting
     * `reticleRange` metres ahead on the cannon's bore line with its hole facing
     * forward — you fly the target INTO the ring to aim the straight-ahead guns. It
     * rides the airframe (and so the XR rig) automatically. Player + `reticle:'on'`
     * + armed only.
     */
    private _createReticle;
    private chaseCamera;
    private cockpitCamera;
    setupFollowCamera(): void;
    /** Switch the camera between chase and cockpit. Routes through `setGameplayCamera`, which is a
     * no-op in VR (the XR rig owns the view there and reads `cameraView` itself) — so this can't
     * steal the headset's camera. */
    setCameraView(view: 'chase' | 'cockpit'): void;
    sceneDispose(): void;
}
export declare const b3dAircraft: import("tosijs").ElementCreator<B3dAircraft>;
//# sourceMappingURL=b3d-aircraft.d.ts.map