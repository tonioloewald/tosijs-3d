import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { B3dControllable } from './b3d-controllable.js';
import type { ControlInput } from './control-input.js';
import { carMapping } from './virtual-gamepad.js';
export declare class B3dCar extends B3dControllable {
    static preferredTagName: string;
    inputMapping: typeof carMapping;
    static initAttributes: {
        url: string;
        enterable: boolean;
        maxSpeed: number;
        acceleration: number;
        braking: number;
        turnRate: number;
        friction: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    entries?: BABYLON.InstantiatedEntries;
    private speed;
    private wheels;
    getCameraTarget(): BABYLON.Node | null;
    applyInput(input: ControlInput, dt: number): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
export declare const b3dCar: import("tosijs").ElementCreator<B3dCar>;
//# sourceMappingURL=b3d-car.d.ts.map