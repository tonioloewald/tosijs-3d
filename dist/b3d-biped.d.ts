import * as BABYLON from '@babylonjs/core';
import { XRStuff } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import type { GameController } from './game-controller';
import { B3dControllable } from './b3d-controllable';
import type { ControlInput } from './control-input';
export type AnimStateSpec = {
    animation: string;
    name?: string;
    loop?: boolean;
    additive?: boolean;
    backwards?: boolean;
};
export declare class AnimState {
    animation: string;
    name: string;
    loop: boolean;
    additive: boolean;
    backwards: boolean;
    constructor(spec: AnimStateSpec);
    static buildList(...specs: AnimStateSpec[]): AnimState[];
}
export declare class B3dBiped extends B3dControllable {
    static initAttributes: {
        url: string;
        player: boolean;
        cameraType: string;
        animation: string;
        animationSpeed: number;
        initialState: string;
        turnSpeed: number;
        forwardSpeed: number;
        runSpeed: number;
        backwardSpeed: number;
        cameraHeightOffset: number;
        cameraTargetHeight: number;
        cameraMinFollowDistance: number;
        cameraMaxFollowDistance: number;
        eyeHeight: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    entries?: BABYLON.InstantiatedEntries;
    camera?: BABYLON.Camera;
    /** Camera mode, toggled by the view button: third-person over-the-shoulder
     * ('chase') or first-person ('fpv', positioned at the head with the head mesh
     * hidden). Read by the XR rig too. */
    cameraView: 'chase' | 'fpv';
    private fpvCamera;
    private headNode;
    private viewWasPressed;
    private hiddenHead;
    /** XR/chase camera params, computed from the model bounds in render(). The
     * chase rig interpolates height (eyeHeight→chaseHeight) and distance with the
     * zoom intent, so zooming in drops to head height and out pulls back/up. */
    chaseHeight: number;
    chaseDistance: number;
    private _eyePos;
    /** Eye position for first-person: the head bone (or eyeHeight fallback) nudged
     * up + forward to roughly the eyes, so the camera sits at the eyes rather than
     * the neck / head-bone base — which would leave the head & neck in front of the
     * view. Forward is body-facing (root-aligned), since the camera ignores the
     * head's own animation. Returns a cached vector — read it now, don't retain. */
    getHeadPosition(): BABYLON.Vector3 | null;
    xrStuff?: XRStuff;
    private xrInputProvider?;
    animationState?: AnimState;
    animationGroup?: BABYLON.AnimationGroup;
    gameController?: GameController;
    private xrCamZoom;
    animationStates: AnimState[];
    setAnimationState(name: string, speed?: number): void;
    getCameraTarget(): BABYLON.Node | null;
    applyInput(input: ControlInput, dt: number): void;
    private setupXRInput;
    setupXRCamera(): Promise<void>;
    setupFollowCamera(): Promise<void>;
    /** Toggle third-person ('chase') vs first-person ('fpv'). In VR the rig reads
     * cameraView; on flat we switch the active camera. Either way the head mesh is
     * hidden in first-person so the camera isn't looking through your own skull. */
    setCameraView(view: 'chase' | 'fpv'): void;
    private setHeadHidden;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3dBiped: import("tosijs").ElementCreator<B3dBiped>;
//# sourceMappingURL=b3d-biped.d.ts.map