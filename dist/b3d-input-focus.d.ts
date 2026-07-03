import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import { B3dControllable } from './b3d-controllable';
import { MappedInputProvider } from './virtual-gamepad';
export declare class B3dInputFocus extends B3dChild {
    static initAttributes: {
        enterDistance: number;
    };
    owner: B3d | null;
    private focusedEntity;
    /** The currently controlled entity (biped/vehicle), or null. */
    get focused(): B3dControllable | null;
    private playerEntity;
    private gameController;
    /** The current MappedInputProvider (exposed for late-binding by controllables) */
    inputMappedProvider: MappedInputProvider | null;
    private interactWasPressed;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    private discoverEntities;
    focusEntity(entity: B3dControllable): void;
    private setupCameraForEntity;
    private _checkInteract;
    private enterVehicle;
    private exitVehicle;
    sceneDispose(): void;
}
export declare const inputFocus: import("tosijs").ElementCreator<B3dInputFocus>;
//# sourceMappingURL=b3d-input-focus.d.ts.map