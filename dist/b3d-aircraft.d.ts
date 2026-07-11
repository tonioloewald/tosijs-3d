import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { B3dControllable } from './b3d-controllable';
import type { ControlInput } from './control-input';
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
        missileTurnRate: number;
        missileDamage: number;
        bombDamage: number;
        lockRange: number;
        lockConeDeg: number;
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
    private _hud;
    private _hudMounted;
    private meshNode;
    private meshesToDispose;
    private _lastGroundDist;
    private _ray;
    private _ownMeshes;
    private groundClearance;
    private libraryNode;
    getCameraTarget(): BABYLON.Node | null;
    applyInput(input: ControlInput, dt: number): void;
    private updateWeapons;
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
    /** Fire a guided missile at the nearest target in the forward cone (else dumb). */
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
    private chaseCamera;
    private cockpitCamera;
    setupFollowCamera(): void;
    /** Switch the camera between chase and cockpit. In VR the XR rig reads
     * cameraView and owns the viewpoint, so we must NOT swap the active scene
     * camera (that would steal it from the WebXR camera and break the headset). */
    setCameraView(view: 'chase' | 'cockpit'): void;
    sceneDispose(): void;
}
export declare const b3dAircraft: import("tosijs").ElementCreator<B3dAircraft>;
//# sourceMappingURL=b3d-aircraft.d.ts.map