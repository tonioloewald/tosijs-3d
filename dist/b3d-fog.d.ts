import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dFog extends Component {
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
    connectedCallback(): void;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
    private applyFog;
    private syncFromSkybox;
}
export declare const b3dFog: import("tosijs").ElementCreator<B3dFog>;
//# sourceMappingURL=b3d-fog.d.ts.map