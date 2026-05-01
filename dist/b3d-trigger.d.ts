import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dTrigger extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        radius: number;
        active: boolean;
        target: string;
        debug: boolean;
        once: boolean;
    };
    x: number;
    y: number;
    z: number;
    radius: number;
    active: boolean;
    target: string;
    debug: boolean;
    once: boolean;
    owner: B3d | null;
    onEnter: ((trigger: B3dTrigger) => void) | null;
    onExit: ((trigger: B3dTrigger) => void) | null;
    private _inside;
    private _beforeRender;
    private debugMesh;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
    /** Whether the target is currently inside the trigger */
    get inside(): boolean;
    private checkProximity;
    private resolveTargetPosition;
    private updateDebugMesh;
    private disposeDebugMesh;
}
export declare const b3dTrigger: import("tosijs").ElementCreator<B3dTrigger>;
//# sourceMappingURL=b3d-trigger.d.ts.map