import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dProp extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        library: string;
        libraryUrl: string;
        meshName: string;
        scale: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    library: string;
    libraryUrl: string;
    meshName: string;
    scale: number;
    private _stopLoad;
    sceneReady(owner: B3d): void;
    /** The library `type` to load from, mounting one for `libraryUrl` if needed. */
    private _resolveLibrary;
    private _applyScale;
    render(): void;
    sceneDispose(): void;
}
export declare const b3dProp: import("tosijs").ElementCreator<B3dProp>;
//# sourceMappingURL=b3d-prop.d.ts.map