import * as BABYLON from '@babylonjs/core';
import { B3dGroundVehicle } from './b3d-ground-vehicle.js';
import type { VehicleSpec, VehicleState } from './ground-vehicle.js';
export declare class B3dCar extends B3dGroundVehicle {
    static preferredTagName: string;
    inputMapping: import("./virtual-gamepad.js").InputMapping;
    inputLabels: Partial<Record<keyof import("./virtual-gamepad.js").VirtualGamepad, string>>;
    static initAttributes: {
        steerDeg: number;
        drive: "rear" | "front" | "all";
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
    steerDeg: number;
    drive: 'rear' | 'front' | 'all';
    private wheelParts;
    protected specFor(control: BABYLON.TransformNode): VehicleSpec | null;
    protected pose(state: VehicleState): void;
    sceneDispose(): void;
}
export declare const b3dCar: import("tosijs").ElementCreator<B3dCar>;
//# sourceMappingURL=b3d-car.d.ts.map