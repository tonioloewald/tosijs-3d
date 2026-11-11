import { type Widget3d } from './widgets3d.js';
import type { Grip } from './hand-socket.js';
import type { GarmentProxy } from './garment-proxy.js';
import { type RigNaming, type RigRestPose } from './rigged-body-glb.js';
import type { RiggedBody } from './rigged-body.js';
import type { RigRecipe } from './rig-recipe.js';
import type { ClipOut } from './rigged-body-glb.js';
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
    /**
     * What the right hand holds: a library model (`url`, its `model` node and
     * its `gripNode`, `_grip`), placed by `grip`; `extras` (its licence) go on
     * its mesh. See riggedBodyGlb's `held`.
     */
    /** Garments bound to `body` (a character's `wornGarments()`). */
    garments?: GarmentProxy[];
    held?: {
        grip: Grip;
        url: string;
        model: string;
        gripNode?: string;
        extras?: Record<string, unknown>;
    } | null;
    /** The clip playing, for **animation**: its file and its name there. */
    clip?: ExportClip | null;
    /** The eyes' picture (see riggedBodyGlb's `eyeTexture`). */
    eyeTexture?: {
        bytes: Uint8Array;
        mimeType: string;
    } | null;
}
/** A clip as its file: a GLB's animation by name, or a BVH capture. */
export interface ExportClip {
    /** Its name in the file (a BVH holds one, whatever it is called). */
    name: string;
    kind: 'glb' | 'bvh';
    /** The file's bytes, or where to fetch them. */
    bytes?: Uint8Array;
    url?: string;
    /** Spread the arms (the body's recipe's `armSpaceDeg`). */
    armSpaceDeg?: number;
    /** The animation's `extras`: its licence. */
    extras?: Record<string, unknown>;
}
/** How the file is written (the panel's choices). */
export interface BodyExportSettings {
    naming: RigNaming;
    restPose: RigRestPose;
    /** Metres, or 0 for the body's own height. */
    height: number;
    /** Whether the clip playing goes in (default not). */
    animation?: 'none' | 'playing';
}
/** A clip from its file, as riggedBodyGlb's `clips` takes it (null: not in the file). */
export declare function exportClip(c: ExportClip): Promise<ClipOut | null>;
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