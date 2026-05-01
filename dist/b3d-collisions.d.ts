import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dCollisions extends Component {
    static initAttributes: {
        debug: boolean;
    };
    debug: boolean;
    owner: B3d | null;
    private colliders;
    private _callback?;
    private debugMaterial?;
    private getDebugMaterial;
    private setupCollider;
    private createSphereCollider;
    private createBoxCollider;
    private createCylinderCollider;
    private getCollideType;
    private processAdditions;
    connectedCallback(): void;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    disconnectedCallback(): void;
}
export declare const b3dCollisions: import("tosijs").ElementCreator<B3dCollisions>;
//# sourceMappingURL=b3d-collisions.d.ts.map