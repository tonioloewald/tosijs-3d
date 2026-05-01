import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import { SvgTexture } from './svg-texture';
import type { B3d } from './tosi-b3d';
export declare class B3dSvgPlane extends AbstractMesh {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        width: number;
        height: number;
        resolution: number;
        url: string;
        updateInterval: number;
        materialChannel: string;
        cameraRelative: boolean;
        pointerEvents: boolean;
        doubleSided: boolean;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    width: number;
    height: number;
    resolution: number;
    url: string;
    updateInterval: number;
    materialChannel: string;
    cameraRelative: boolean;
    pointerEvents: boolean;
    doubleSided: boolean;
    /** Set to a live SVG element for dynamic mode. */
    svgElement: SVGSVGElement | null;
    private _svgTexture;
    private _material;
    private _pointerObserver;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
    /** Get the SvgTexture instance for programmatic access. */
    get svgTexture(): SvgTexture | null;
    private _applyChannel;
    private _attachPointerObserver;
    private _dispatchSyntheticEvent;
}
export declare const b3dSvgPlane: import("tosijs").ElementCreator<B3dSvgPlane>;
//# sourceMappingURL=b3d-svg-plane.d.ts.map