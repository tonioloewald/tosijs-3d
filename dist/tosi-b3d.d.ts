import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import '@babylonjs/loaders';
import { type Widget3d } from './widgets3d';
import { XrFrames } from './xr-frames';
import { type FramePanelSpec } from './frame-panel';
import { type QualitySetting } from './b3d-quality';
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
        minElevation: number;
        maxElevation: number;
        minDistance: number;
        maxDistance: number;
        noXr: boolean;
        gamepad: boolean | string;
        gamepadScale: number;
        quality: QualitySetting;
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
        ':host .enter-vr-button': {
            position: string;
            top: string;
            left: string;
            zIndex: string;
            display: string;
            alignItems: string;
            gap: string;
            padding: string;
            background: string;
            color: string;
            border: string;
            borderRadius: string;
            font: string;
            cursor: string;
            transition: string;
        };
        ':host .enter-vr-button[hidden]': {
            display: string;
        };
        ':host .enter-vr-button:hover': {
            background: string;
            transform: string;
        };
        ':host .scene-panel-gear': {
            position: string;
            top: string;
            right: string;
            zIndex: string;
            width: string;
            height: string;
            display: string;
            alignItems: string;
            justifyContent: string;
            background: string;
            color: string;
            border: string;
            borderRadius: string;
            font: string;
            cursor: string;
            transition: string;
        };
        ':host .scene-panel-gear[hidden]': {
            display: string;
        };
        ':host .scene-panel-gear:hover': {
            background: string;
            transform: string;
        };
        ':host .scene-panel-overlay': {
            position: string;
            top: string;
            right: string;
            zIndex: string;
            filter: string;
        };
        ':host .scene-panel-overlay[hidden]': {
            display: string;
        };
    };
    content: (HTMLCanvasElement | HTMLButtonElement | HTMLDivElement | HTMLSlotElement)[];
    engine: BABYLON.Engine;
    scene: BABYLON.Scene;
    camera?: BABYLON.Camera;
    gui?: GUI.GUI3DManager;
    glowLayer?: BABYLON.GlowLayer;
    xrHelper?: BABYLON.WebXRDefaultExperience;
    xrActive: boolean;
    /** Reference frames (world/rig/body/neck/face) for spatial UI, live only while
     * an XR session is running. Parent in-scene UI to `xrFrames.body` etc. */
    xrFrames: XrFrames | null;
    BABYLON: typeof BABYLON;
    minElevation: number;
    maxElevation: number;
    minDistance: number;
    maxDistance: number;
    noXr: boolean;
    sceneCreated: B3dCallback;
    update: B3dCallback;
    setupXr: B3dCallback;
    scenePanel: (host: B3d) => Widget3d[];
    bodyPanels: (host: B3d) => FramePanelSpec[];
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
    private _qualityOff;
    private static _probeStarted;
    private _setupQuality;
    private _applyHardwareScaling;
    private _installXrRafPump;
    connectedCallback(): void;
    private _setupXR;
    private _startDefaultXrExperience;
    private _makePanel;
    private _setupScenePanel;
    /** Rebuild the flat scene panel from the current `scenePanel` hook, if it's open.
     * Call after async state the panel reflects has changed (e.g. a library loaded)
     * so an already-open panel updates without reopening. */
    refreshScenePanel(): void;
    private _setupGamepad;
    private _attachXrPanel;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3d: import("tosijs").ElementCreator<B3d>;
export {};
//# sourceMappingURL=tosi-b3d.d.ts.map