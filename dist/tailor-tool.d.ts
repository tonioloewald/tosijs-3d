import type { RiggedBody } from './rigged-body.js';
import type { BuiltRig } from './rig-build.js';
import { type ViewPoint } from './garment-cut.js';
import { type GarmentMesh } from './garment-file.js';
import type { MaterialRecipe } from './material-recipe.js';
import { type Widget3d } from './widgets3d.js';
/** What the tailor is making: enough to open it again. */
export interface TailorCut {
    /** Half outlines, [x, y] in metres on the character's left. */
    shapes: ViewPoint[][];
    /** Metres. */
    thickness: number;
    skirt: boolean;
    /** Draped cloth ([cloth-drape](/cloth-drape/)) in place of a cut from the skin. Ignored with `skirt`. */
    drape?: boolean;
    /** What the cloth is cut from: an even surface at this density, or the body's own triangles. Default `medium`. */
    mesh?: TailorMesh;
}
/** The cloth mesh's density, or `body` for the body's own triangles. */
export type TailorMesh = 'coarse' | 'medium' | 'fine' | 'body';
/** The edge length each density aims for, metres. */
export declare const TAILOR_MESH_EDGE: Record<Exclude<TailorMesh, 'body'>, number>;
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
    /**
     * A system panel of the host's (a `<tosi-b3d-panel>` with an icon) to draw
     * in, instead of one of its own. The host keeps it: unmounting leaves it
     * in place for the host to fill, and leaves hiding other clothes to the
     * host too.
     */
    panel?: HTMLElement & {
        svg: SVGSVGElement | null;
    };
    /**
     * No cancel or done: the host keeps the garment as it goes (when the
     * person switches garment or closes the panel). Undo and redo stay.
     */
    persistent?: boolean;
    /** The host's own rows: above the outline, and at the end. */
    rows?: {
        top?: () => Widget3d[];
        bottom?: () => Widget3d[];
    };
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
    /** Draw the panel again (the host's rows changed). */
    refresh(): void;
    /** Step back through the edits made since it opened. */
    undo(): void;
    redo(): void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}
/**
 * Open the tailor in a `<tosi-b3d>`: a system panel, a preview on `built`,
 * and the garment handed to `handleDone`.
 */
export declare function mountTailorTool(owner: any, options: TailorToolOptions): TailorTool;
//# sourceMappingURL=tailor-tool.d.ts.map