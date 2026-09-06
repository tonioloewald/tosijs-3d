import type * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
export interface LibraryMeshRequest {
    owner: B3d;
    /** `<tosi-b3d-library type="…">` to take the model from. */
    type: string;
    /** Model name within that library. */
    meshName: string;
    /**
     * Placement, in the element's own attributes. Rotation is DEGREES.
     *
     * ⚠️ EVERY FIELD IS REQUIRED, and that is the point. They were optional, and
     * the optionality is the seam #48 re-entered through: `b3d-turret` and
     * `b3d-launcher` both passed `{x, y, z}` and silently dropped rotation, so
     * `b3dLauncher({library:'weapons', ry:180})` fired its shells backwards while
     * the same element WITHOUT `library` aimed correctly.
     *
     * `AbstractMesh` syncs rotation only in `render()`, which has already run by
     * the time an async load assigns the mesh — so nothing downstream recovers
     * it. Making the fields required means a call site cannot omit them by
     * accident; it has to say `rx: 0` and mean it.
     */
    transform: {
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    /** The generation this load belongs to; a mismatch discards it. */
    generation: () => number;
    /** What generation the load STARTED at. */
    started: number;
    /** Called with the instantiated root. */
    onLoaded: (node: BABYLON.TransformNode) => void;
    /** Which element is asking, for the error messages. */
    label: string;
}
/**
 * Instantiate `meshName` from library `type`, retrying until the library exists.
 *
 * Returns a disposer that stops the retry — call it from `sceneDispose` so a
 * removed element does not hold a timer past its own life.
 */
export declare function loadLibraryMesh(req: LibraryMeshRequest): () => void;
//# sourceMappingURL=library-mesh.d.ts.map