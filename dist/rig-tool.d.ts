import { type Role } from './retarget.js';
import { type Markers } from './rig-fit.js';
import type { Vec3 } from './spatial-transform.js';
import { type AppliedRig } from './rig-recipe-babylon.js';
import { type RigRecipe } from './rig-recipe.js';
/** A character the tool offers. */
export interface RigModel {
    label: string;
    url: string;
    /** In a library file of several characters, the one to use. */
    pick?: string;
    /** Shown this much bigger (a Kenney chibi is 0.6 m). */
    scale?: number;
    /** A recipe to start from. */
    recipe?: Partial<RigRecipe>;
    /**
     * A mesh with no skeleton (an OBJ, or a GLB's `mesh`): rig it from these
     * markers, as the auto-rig page does. `url` is the mesh file.
     */
    autorig?: {
        markers: Markers;
        /** Where a tail's tip is (from the side view), for a tail chain. */
        tail?: Vec3;
        /** An OBJ's objects to use. */
        objects?: string[];
        /** A GLB's mesh to use. */
        mesh?: string;
        color?: string;
    };
}
export declare function rigToolModels(): RigModel[];
/** `rigTool()`'s element carries this as `.rig`. */
export interface RigToolApi {
    /** A copy of the working recipe; set one to apply it. */
    recipe: RigRecipe;
    /** What is on the character now: the read skeleton and live springs. */
    readonly applied: AppliedRig | null;
    /** The status line: what was loaded, set or went wrong. */
    readonly status: string;
    /** The role being edited (a tap on its dot, or the panel, chooses it). */
    readonly role: Role;
    load(model: RigModel | File): Promise<void> | undefined;
}
/**
 * The rig tool: a `<tosi-b3d>` with its panel. `models` replaces the demo
 * characters (a URL the page can fetch, and the character to pick in it).
 */
export declare function rigTool(options?: {
    models?: RigModel[];
}): HTMLElement & {
    rig: RigToolApi;
};
//# sourceMappingURL=rig-tool.d.ts.map