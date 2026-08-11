import { B3dChild } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dFog extends B3dChild {
    static initAttributes: {
        mode: string;
        color: string;
        start: number;
        end: number;
        density: number;
        syncSkybox: boolean;
    };
    owner: B3d | null;
    private skyboxEl;
    private _beforeRender;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    private applyFog;
    /** Hand the scene our fog as the BASE everything else blends from. */
    private publishBase;
    private skybox;
    private syncFromSkybox;
}
export declare const b3dFog: import("tosijs").ElementCreator<B3dFog>;
//# sourceMappingURL=b3d-fog.d.ts.map