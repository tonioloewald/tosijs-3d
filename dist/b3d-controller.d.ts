import * as BABYLON from '@babylonjs/core';
import { B3dControllable } from './b3d-controllable.js';
import type { B3d } from './tosi-b3d.js';
import { type ControlInput } from './control-input.js';
import { MappedInputProvider } from './virtual-gamepad.js';
export declare class B3dController extends B3dControllable {
    static preferredTagName: string;
    static initAttributes: {
        mapping: string;
        player: boolean;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    mapping: string;
    player: boolean;
    /**
     * Called every frame with the merged `ControlInput` and `dt` — THE seam. Set in
     * code or via the element creator. Read `input.forward/turn/shoot/…` and drive
     * anything (a launcher, a custom rig, an experiment).
     *
     * NOTE: deliberately NOT named `onInput` — the element creator treats `on*` props as
     * DOM event listeners, so an `onInput` prop would silently become an `input`-event
     * handler and never be called here.
     */
    drive: ((input: ControlInput, dt: number) => void) | null;
    /** The merged input provider — exposed so the XR rig can add its controller source. */
    inputMappedProvider: MappedInputProvider | null;
    private _gc;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    applyInput(input: ControlInput, dt: number): void;
    sceneDispose(): void;
}
export declare const b3dController: (...args: unknown[]) => B3dController;
//# sourceMappingURL=b3d-controller.d.ts.map