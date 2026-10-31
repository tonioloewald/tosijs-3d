import type { RiggedBody } from './rigged-body.js';
import type { BuiltRig } from './rig-build.js';
import { type ViewPoint } from './garment-cut.js';
import { type GarmentMesh } from './garment-file.js';
import type { MaterialRecipe } from './material-recipe.js';
/** What the tailor is making: enough to open it again. */
export interface TailorCut {
    /** Half outlines, [x, y] in metres on the character's left. */
    shapes: ViewPoint[][];
    /** Metres. */
    thickness: number;
    skirt: boolean;
}
/** The work in progress, as `handleChange` hears it. */
export interface TailorState {
    cut: TailorCut;
    look: MaterialRecipe;
    name: string;
    slot: string;
}
/** What `handleDone` is handed. */
export interface TailoredGarment extends TailorState {
    /** The garment at rest on the body it was cut from, unwrapped. */
    garment: GarmentMesh;
}
export interface TailorToolOptions {
    /** What it cuts from. */
    body: RiggedBody;
    /** The body on screen (built from `body`): the cut is shown on it. */
    built: BuiltRig;
    /** Where to start: a cut to open again, its material, name and slot. */
    cut?: Partial<TailorCut>;
    look?: MaterialRecipe;
    name?: string;
    slot?: string;
    /** The slots to choose from (none: no slot choice). */
    slots?: string[];
    /** Given: a "hide other clothes" toggle that calls this. */
    handleHideOthers?: (hide: boolean) => void;
    hideOthers?: boolean;
    /** Every edit. */
    handleChange?: (state: TailorState) => void;
    /** Done: the tool unmounts and hands this the garment. */
    handleDone?: (garment: TailoredGarment) => void;
    /** Cancelled: the tool unmounts and this is called. */
    handleCancel?: () => void;
}
export interface TailorTool {
    readonly state: TailorState;
    /** The garment as it is now (null with no closed outline). */
    garment(): GarmentMesh | null;
    /** The body was reshaped (or rebuilt): cut and show on this one. */
    setBody(body: RiggedBody, built: BuiltRig): void;
    done(): void;
    cancel(): void;
    unmount(): void;
}
/**
 * Open the tailor in a `<tosi-b3d>`: a system panel, a preview on `built`,
 * and the garment handed to `handleDone`.
 */
export declare function mountTailorTool(owner: any, options: TailorToolOptions): TailorTool;
//# sourceMappingURL=tailor-tool.d.ts.map