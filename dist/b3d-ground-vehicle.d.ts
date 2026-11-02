import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { B3dControllable } from './b3d-controllable.js';
import type { ControlInput } from './control-input.js';
import { type VehicleSpec, type VehicleState } from './ground-vehicle.js';
export declare abstract class B3dGroundVehicle extends B3dControllable {
    static initAttributes: {
        url: string;
        library: string;
        meshName: string;
        enterable: boolean;
        /** Driven from the start (by the `inputFocus` it is in). */
        player: boolean;
        /** Uniform scale of the model (Kenney's cars are about 0.6 of life size). */
        scale: number;
        /** kg */
        mass: number;
        /** m/s */
        maxSpeed: number;
        /** m/s² from a standstill (the engine's pull is mass × this). */
        acceleration: number;
        /** m/s² of braking. */
        braking: number;
        /** Tyre or track grip, as a friction coefficient. */
        grip: number;
        /** `'auto'`: on at night while someone drives it. `'on'` or `'off'` to say so. */
        headlights: "auto" | "on" | "off";
        /** The engine's sound while someone drives it, positional. `'off'` for none. */
        sound: "on" | "off";
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    url: string;
    library: string;
    meshName: string;
    enterable: boolean;
    player: boolean;
    scale: number;
    mass: number;
    maxSpeed: number;
    acceleration: number;
    braking: number;
    grip: number;
    headlights: 'auto' | 'on' | 'off';
    sound: 'on' | 'off';
    /** @deprecated Removed: use `steerDeg` (b3d-car). Setting it warns once. */
    set turnRate(_v: unknown);
    /** @deprecated Removed: use `grip`. Setting it warns once. */
    set friction(_v: unknown);
    /** The model's spec, once the vehicle has a body. */
    spec: VehicleSpec | null;
    /** Its state: position, motion, each contact. */
    state: VehicleState | null;
    /** The node the model drives (the vehicle's origin, unscaled). */
    control: BABYLON.TransformNode | null;
    private controls;
    /** The chase camera, made the first time the vehicle is driven. */
    chaseCamera: BABYLON.FreeCamera | null;
    private rig;
    private focused;
    private camYaw;
    private orbit;
    private boom;
    /** How far the camera has climbed its arc to see past something, radians. */
    private camLift;
    /** How far back the chase camera sits, against the size's own (a tank's is farther). */
    protected chaseScale: number;
    private lookWant;
    /**
     * The right stick aims something (a tank's turret and gun) rather than the
     * camera: a headset's chase view does not zoom with it.
     */
    get stickAims(): boolean;
    private anchor;
    /** The heights its wall rays run at, each with the body's extent there (its own frame). */
    /** The headlights' beam (a pooled light) and the lamps you see. */
    private beam;
    private releaseBeam;
    private engine;
    /** The engine's note relative to a car's (a tank's is lower). */
    protected engineNote: number;
    private beamFrom;
    private lamps;
    private tailLamps;
    private wallBands;
    /** A track's climbing points: the low wall rays let them onto an obstacle. */
    private climbPoints;
    private ownMeshes;
    private stopLibraryWait?;
    private onOrigin;
    /** Build the spec from the loaded model; return null if it cannot drive. */
    protected abstract specFor(control: BABYLON.TransformNode): VehicleSpec | null;
    /** Pose wheels, tracks and treads from the state. */
    protected abstract pose(state: VehicleState): void;
    /** A body for a vehicle given no model (the tank has one; the car has none). */
    protected makeDefaultBody(_scene: BABYLON.Scene): BABYLON.TransformNode | null;
    /** Speed along the nose, m/s. */
    get speed(): number;
    getCameraTarget(): BABYLON.Node | null;
    getChaseAnchor(): BABYLON.TransformNode | null;
    getWorldVelocity(): BABYLON.Vector3 | null;
    applyInput(input: ControlInput, _dt: number): void;
    /** The right stick. A car looks around with it; a tank aims its turret. */
    protected aimInput(x: number, y: number, _dt: number): void;
    /** Which way the chase camera faces, given its lagged follow of the heading. */
    protected viewYaw(followYaw: number): number;
    /** Where the camera sits on its boom, 0…1 (`CHASE_BOOM` at rest). */
    protected viewBoom(): number;
    /** Called on gaining focus with the vehicle's heading (radians). */
    protected resetView(_heading: number): void;
    /** Called after each step of the model, while it is running. */
    protected afterStep(_state: VehicleState, _dt: number): void;
    handleGainFocus(): void;
    handleLoseFocus(): void;
    /**
     * Make the chase camera if need be and make it the scene's camera, settled
     * behind the vehicle. Called on gaining focus, and again once the model has
     * loaded if focus came first.
     */
    setupFollowCamera(): void;
    /** Taken in a headset, where the camera could not be swapped: swap on leaving it. */
    private viewPending;
    private aimCamera;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private loadFromLibrary;
    /**
     * The model's own animations (a tank's track links), stopped: a subclass
     * drives them from the model in `pose` (as frames, not by playing them).
     */
    protected animations: BABYLON.AnimationGroup[];
    private adopt;
    private contactHubs;
    private fitLights;
    private updateLights;
    /** The vehicle's own meshes, which its rays must not hit. */
    private isMine;
    /**
     * What its rays hit: anything collidable but itself (made once, not per
     * ray). Water included: a car that ignored it sank to the seabed, out of the
     * world as far as a driver could tell.
     */
    private collides;
    /**
     * What the chase camera must not be inside or behind: anything solid but
     * the vehicle itself, TRAFFIC INCLUDED. Traffic is \`b3dNoCollide\` so a
     * vehicle's wall rays do not stop dead on it, and the camera used the same
     * test and went inside other cars (Tonio).
     */
    private seesPast;
    private groundCache;
    /** Whether any contact's ray found ground this frame. */
    private groundFound;
    private ground;
    private _drive;
    private surface;
    private updateLook;
    /**
     * Which way a headset's chase view faces, from the heading, radians: the
     * orbit (a car), or the turret and its lead (a tank). The XR rig orbits
     * round the vehicle by it.
     */
    chaseView(): number;
    /** How far back a headset's chase sits: this vehicle's own (a tank's is farther). */
    get chaseDistance(): number;
    /** The engine, while driven: its note rises with speed, and it opens up on the throttle. */
    private updateEngine;
    private blockByWalls;
    /** Put the node (and the camera's anchor) where the state says. */
    private place;
    sceneDispose(): void;
}
//# sourceMappingURL=b3d-ground-vehicle.d.ts.map