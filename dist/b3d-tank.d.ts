import * as BABYLON from '@babylonjs/core';
import { B3dGroundVehicle } from './b3d-ground-vehicle.js';
import type { ControlInput } from './control-input.js';
import { type VehicleSpec, type VehicleState } from './ground-vehicle.js';
export declare class B3dTank extends B3dGroundVehicle {
    /** A diesel: lower than a car. */
    protected engineNote: number;
    static preferredTagName: string;
    inputMapping: import("./virtual-gamepad.js").InputMapping;
    inputLabels: Partial<Record<keyof import("./virtual-gamepad.js").VirtualGamepad, string>>;
    static initAttributes: {
        mass: number;
        maxSpeed: number;
        acceleration: number;
        braking: number;
        turnSpeed: number;
        url: string;
        library: string;
        meshName: string;
        enterable: boolean;
        player: boolean;
        scale: number;
        grip: number;
        headlights: "auto" | "on" | "off";
        sound: "on" | "off";
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    turnSpeed: number;
    private trackParts;
    private wheels;
    /**
     * How far each track's belt has run against the GROUND, metres: what the
     * links and wheels show. The model's own `offset` runs at the speed asked
     * for, so from a standing start it raced ahead of a hull still gathering
     * speed (29 m of belt for 11 m of ground), as if spinning in mud.
     */
    private belts;
    private turret;
    private gun;
    /** Where the gun is aimed, world yaw (radians): the stick moves it. */
    private aimYaw;
    /** The turret's turn on the hull, radians. */
    turretYaw: number;
    /** The gun's elevation, radians (up positive). */
    gunPitch: number;
    private aim;
    /** The right stick traverses the turret and elevates the gun, or moves the camera. */
    protected aimInput(x: number, y: number, dt: number): void;
    applyInput(input: ControlInput, dt: number): void;
    stickMode: 'gun' | 'camera';
    private modeWas;
    /** The right stick aims the gun (not the camera) in gun mode. */
    get stickAims(): boolean;
    /** A tank's chase sits farther back than a car's. */
    protected chaseScale: number;
    /** The view's lead toward where the turret is turning, radians (eased). */
    private peek;
    protected viewYaw(): number;
    protected resetView(heading: number): void;
    handleLoseFocus(): void;
    protected afterStep(state: VehicleState, dt: number): void;
    /** Each belt runs at the ground's speed under its track: the hull's, plus its turn. */
    private runBelts;
    protected makeDefaultBody(scene: BABYLON.Scene): BABYLON.TransformNode;
    protected specFor(control: BABYLON.TransformNode): VehicleSpec | null;
    /**
     * The animation that carries these links, and their pitch (the loop's
     * length over its links, from where they rest). Null if none moves them.
     */
    private linkTrack;
    private centreX;
    protected pose(_state: VehicleState): void;
    sceneDispose(): void;
}
export declare const b3dTank: import("tosijs").ElementCreator<B3dTank>;
//# sourceMappingURL=b3d-tank.d.ts.map