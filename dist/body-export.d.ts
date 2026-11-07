import { type Widget3d } from './widgets3d.js';
import { type RigNaming, type RigRestPose } from './rigged-body-glb.js';
import type { RiggedBody } from './rigged-body.js';
import type { RigRecipe } from './rig-recipe.js';
/** What an export writes: the body, its recipe, and the model it came from. */
export interface BodyExportTarget {
    body: RiggedBody;
    recipe?: RigRecipe | null;
    /** The model file, for its materials: a URL or a File, and the node picked. */
    source?: {
        url?: string;
        file?: File;
        pick?: string;
    } | null;
    /** The file's name, without `.glb`. */
    name: string;
}
/** How the file is written (the panel's choices). */
export interface BodyExportSettings {
    naming: RigNaming;
    restPose: RigRestPose;
    /** Metres, or 0 for the body's own height. */
    height: number;
}
/**
 * The body as GLB bytes, with the model's own materials where its file is a
 * GLB of the same mesh. `note` says what was left out.
 */
export declare function exportBody(target: BodyExportTarget, settings: BodyExportSettings): Promise<{
    bytes: Uint8Array;
    note: string;
}>;
/** Save bytes as a file. */
export declare function downloadBytes(name: string, bytes: Uint8Array, type?: string): void;
/**
 * An Export section: names, rest pose, height and the button. `target`
 * gives what to write when pressed (null: nothing to export, and why);
 * `say` reports what happened.
 */
export declare function exportBodyRows(target: () => Promise<BodyExportTarget | string> | BodyExportTarget | string, say: (message: string) => void): Widget3d[];
//# sourceMappingURL=body-export.d.ts.map