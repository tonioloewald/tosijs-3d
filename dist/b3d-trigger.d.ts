import { B3dChild } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dTrigger extends B3dChild {
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
        disabled: boolean;
        target: string;
        debug: boolean;
        once: boolean;
    };
    x: number;
    y: number;
    z: number;
    radius: number;
    disabled: boolean;
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
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    /** Whether the target is currently inside the trigger */
    get inside(): boolean;
    /**
     * Tuned state for debugging — read `el.debugState` from the console or via
     * `hj eval`. Surfaces exactly why a trigger is (not) firing: whether its target
     * name resolves, the live distance, and the radius it's tested against.
     */
    get debugState(): {
        disabled: any;
        target: any;
        targetResolved: boolean;
        distance: number | null;
        radius: any;
        inside: boolean;
        position: any[];
    };
    private checkProximity;
    private resolveTargetPosition;
    private updateDebugMesh;
    private disposeDebugMesh;
}
export declare const b3dTrigger: import("tosijs").ElementCreator<B3dTrigger>;
//# sourceMappingURL=b3d-trigger.d.ts.map