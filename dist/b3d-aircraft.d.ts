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
        hudChase: boolean;
        hudSize: number;
        hudForward: number;
        maxSpeed: number;
        afterburnerSpeed: number;
        acceleration: number;
        vtolSpeed: number;
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
    hudChase: boolean;
    reticle: string;
    reticleRange: number;
    private _hud;
    private _hudMounted;
    private _radar;
    private _reticleMesh;
    private meshNode;
    private _chasePivot;
    private _chaseLookPitch;
    private meshesToDispose;
    private _lastGroundDist;
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
    /** World nose direction (unit) and a muzzle point `ahead` metres in front. */
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