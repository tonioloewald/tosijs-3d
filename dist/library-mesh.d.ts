import type * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
export interface LibraryMeshRequest {
    owner: B3d;
    /** `<tosi-b3d-library type="…">` to take the model from. */
    type: string;
    /** Model name within that library. */
    meshName: string;
    /** Placement, in the element's own attributes. Rotation is DEGREES. */
    transform: {
        x?: number;
        y?: number;
        z?: number;
        rx?: number;
        ry?: number;
        rz?: number;
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