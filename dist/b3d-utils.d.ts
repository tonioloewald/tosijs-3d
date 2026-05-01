import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare function findB3dOwner(el: HTMLElement): B3d | null;
export declare function actualMeshes(meshes: BABYLON.AbstractMesh[]): BABYLON.Mesh[];
export type AsyncVoidFunction = () => Promise<void>;
export type XRParams = {
    cameraName?: string;
    mode?: XRSessionMode;
};
export type XRStuff = {
    camera: BABYLON.FreeCamera;
    xr: BABYLON.WebXRDefaultExperience;
    exitXR: AsyncVoidFunction;
};
export declare function enterXR(scene: BABYLON.Scene, options?: XRParams): Promise<XRStuff>;
/**
 * Apply material conventions based on PBR material properties.
 *
 * Reads actual material data (alpha, metallic, etc.) rather than relying
 * on name suffixes for appearance. Near-opaque alpha is snapped to 1.0
 * to avoid unnecessary blend cost. Translucent materials get depth
 * pre-pass and shadow exclusion automatically.
 */
export declare function applyMaterialConventions(meshes: BABYLON.AbstractMesh[]): void;
export declare class AbstractMesh extends Component {
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    owner: B3d | null;
    mesh?: BABYLON.Mesh;
    protected loadGeneration: number;
    get roll(): number;
    set roll(v: number);
    get pitch(): number;
    set pitch(v: number);
    get yaw(): number;
    set yaw(v: number);
    connectedCallback(): void;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /**
     * Load a glTF/glb into an AssetContainer, with race-safe gen tracking.
     * The onLoaded callback is only invoked if the component hasn't been
     * disposed or had a newer load supersede it. Subclasses use this from
     * their sceneReady to safely resolve async asset loads.
     */
    protected loadAssetContainer(scene: BABYLON.Scene, url: string, onLoaded: (container: BABYLON.AssetContainer) => void): void;
    disconnectedCallback(): void;
    render(): void;
}
//# sourceMappingURL=b3d-utils.d.ts.map