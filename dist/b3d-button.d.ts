import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { B3d } from './tosi-b3d';
export declare class B3dButton extends Component {
    static initAttributes: {
        caption: string;
        textColor: string;
        fontSize: number;
        x: number;
        y: number;
        z: number;
    };
    owner: B3d | null;
    button?: GUI.Button3D;
    action: (data: any, state: BABYLON.EventState) => void;
    connectedCallback(): void;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3dButton: import("tosijs").ElementCreator<B3dButton>;
//# sourceMappingURL=b3d-button.d.ts.map