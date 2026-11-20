import * as BABYLON from '@babylonjs/core';
import { B3dOpenable, type Opener } from './b3d-door.js';
export declare class B3dChest extends B3dOpenable {
    static preferredTagName: string;
    static initAttributes: {
        width: number;
        depth: number;
        height: number;
        reach: number;
        color: string;
        trim: string;
        seconds: number;
        open: boolean;
        lock: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    width: number;
    depth: number;
    height: number;
    /** Item kinds inside. Handed over (and emptied) when it opens. */
    contents: string[];
    protected build(scene: BABYLON.Scene): void;
    protected beginOpen(by: Opener | null): number;
    protected pose(t: number): void;
    protected openDetail(): {
        contents: string[];
    };
}
export declare const b3dChest: import("tosijs").ElementCreator<B3dChest>;
//# sourceMappingURL=b3d-chest.d.ts.map