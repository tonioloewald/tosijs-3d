import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dReflections extends Component {
    static initAttributes: {
        refreshRate: number;
        probeSize: number;
        /** Distance beyond which probes stop updating entirely */
        maxDistance: number;
        /** Distance at which probes switch from near to far refresh rate */
        farDistance: number;
        /** Refresh rate for distant probes (higher = less frequent) */
        farRefreshRate: number;
        /** How often (in frames) to re-check distances */
        distanceCheckInterval: number;
    };
    owner: B3d | null;
    probes: {
        probe: BABYLON.ReflectionProbe;
        mesh: BABYLON.AbstractMesh;
        frameOffset: number;
    }[];
    nonMirrorMeshes: BABYLON.AbstractMesh[];
    private _callback?;
    private _observer?;
    private _frameCount;
    private addMeshesToProbes;
    private createProbe;
    private makeReflectiveCallback;
    connectedCallback(): void;
    private updateProbeRate;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
}
export declare const b3dReflections: import("tosijs").ElementCreator<B3dReflections>;
//# sourceMappingURL=b3d-reflections.d.ts.map