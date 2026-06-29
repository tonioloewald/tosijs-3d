import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { B3dControllable } from './b3d-controllable';
import type { ControlInput } from './control-input';
export declare class B3dAircraft extends B3dControllable {
    inputMapping: import("./virtual-gamepad").InputMapping;
    static initAttributes: {
        url: string;
        library: string;
        meshName: string;
        player: boolean;
        enterable: boolean;
        maxSpeed: number;
        acceleration: number;
        friction: number;
        pitchRate: number;
        turnRate: number;
        vtolSpeed: number;
        stallSpeed: number;
        groundY: number;
        crashSpeed: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    airspeed: number;
    altitude: number;
    throttleLevel: number;
    vtolActive: boolean;
    stalling: boolean;
    pullUp: boolean;
    grounded: boolean;
    crashed: boolean;
    /** Active camera mode — toggled by the `view` button. Also read by the XR
     * chase rig to sit in the cockpit vs. behind the aircraft. */
    cameraView: 'chase' | 'cockpit';
    private viewWasPressed;
    private velocity;
    private rollAngle;
    private meshNode;
    private meshesToDispose;
    private groundClearance;
    private libraryNode;
    getCameraTarget(): BABYLON.Node | null;
    applyInput(input: ControlInput, dt: number): void;
    /** Distance from the aircraft origin down to the nearest ground: the lower of
     * any terrain collider the raycast hits and the configured ground plane. */
    private groundDistance;
    /** Transition to the crashed/wrecked state: stop, lock out control, notify. */
    private crash;
    /** Raycast downward to find distance to ground. Returns Infinity if no hit. */
    private raycastGround;
    private updatePullUp;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private loadFromUrl;
    private loadFromLibrary;
    private setupMesh;
    private chaseCamera;
    private cockpitCamera;
    setupFollowCamera(): void;
    /** Switch the camera between chase and cockpit. In VR the XR rig reads
     * cameraView and owns the viewpoint, so we must NOT swap the active scene
     * camera (that would steal it from the WebXR camera and break the headset). */
    setCameraView(view: 'chase' | 'cockpit'): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
}
export declare const b3dAircraft: import("tosijs").ElementCreator<B3dAircraft>;
//# sourceMappingURL=b3d-aircraft.d.ts.map