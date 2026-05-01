import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import type { ControlInput, InputProvider } from './control-input';
import type { InputMapping } from './virtual-gamepad';
export declare class B3dControllable extends AbstractMesh {
    inputProvider: InputProvider | null;
    inputMapping?: InputMapping;
    protected lastUpdate: number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    applyInput(input: ControlInput, dt: number): void;
    getCameraTarget(): BABYLON.Node | null;
    onGainFocus(): void;
    onLoseFocus(): void;
    protected _update: () => void;
}
//# sourceMappingURL=b3d-controllable.d.ts.map