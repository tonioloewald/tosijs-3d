import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import '@babylonjs/loaders';
export type SceneAdditionHandler = (additions: SceneAdditions) => void;
export type SceneAdditions = {
    meshes?: BABYLON.AbstractMesh[];
    lights?: BABYLON.Light[];
};
type B3dCallback = ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => void) | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => Promise<void>);
export declare class B3d extends Component {
    static initAttributes: {
        glowLayerIntensity: number;
        frameRate: number;
    };
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
            overflow: string;
            background: string;
            height: string;
            maxHeight: string;
        };
        ':host .spinner': {
            position: string;
            top: string;
            left: string;
            width: string;
            height: string;
            marginTop: string;
            marginLeft: string;
            border: string;
            borderTopColor: string;
            borderRadius: string;
            animation: string;
            transition: string;
        };
        ':host .spinner.hidden': {
            opacity: string;
            pointerEvents: string;
        };
        '@keyframes tosi-spin': {
            to: {
                transform: string;
            };
        };
        ':host canvas': {
            position: string;
            top: string;
            left: string;
            width: string;
            height: string;
            opacity: string;
            transition: string;
        };
        ':host canvas.ready': {
            opacity: string;
        };
        ':host .babylonVRicon': {
            height: number;
            width: number;
            backgroundColor: string;
            filter: string;
            backgroundPosition: string;
            backgroundRepeat: string;
            border: string;
            borderRadius: number;
            borderStyle: string;
            outline: string;
            transition: string;
        };
        ':host .babylonVRicon:hover': {
            transform: string;
        };
    };
    content: (HTMLCanvasElement | HTMLDivElement | HTMLSlotElement)[];
    engine: BABYLON.Engine;
    scene: BABYLON.Scene;
    camera?: BABYLON.Camera;
    gui?: GUI.GUI3DManager;
    glowLayer?: BABYLON.GlowLayer;
    xrActive: boolean;
    BABYLON: typeof BABYLON;
    sceneCreated: B3dCallback;
    update: B3dCallback;
    private lastRender;
    private sceneListeners;
    private pastAdditions;
    private _sceneReady;
    private _childObserver?;
    private _notifiedNodes;
    private _libraries;
    onSceneAddition(callback: SceneAdditionHandler): void;
    offSceneAddition(callback: SceneAdditionHandler): void;
    register(additions: SceneAdditions): void;
    registerLibrary(type: string, library: any): void;
    unregisterLibrary(type: string, library: any): void;
    getLibrary(type: string): any | null;
    getLibraries(type: string): any[];
    setActiveCamera(camera: BABYLON.Camera, options?: {
        attach?: boolean;
        preventDefault?: boolean;
    }): void;
    private _update;
    private _resizing;
    onResize(): void;
    loadScene: (path: string, file: string, processCallback?: (scene: BABYLON.Scene) => void) => Promise<void>;
    private _notifyNode;
    private _disposeNode;
    private _notifySubtree;
    private _disposeSubtree;
    private _notifyAllDescendants;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3d: import("tosijs").ElementCreator<B3d>;
export {};
//# sourceMappingURL=tosi-b3d.d.ts.map