import * as BABYLON from '@babylonjs/core';
import { type Widget3d } from './widgets3d.js';
import { type InspectFace } from './inspect-view.js';
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
     * A mesh with no skeleton (an OBJ, or a GLB's `mesh`): bind it from these
     * markers (a recipe's `binding` takes their place). `url` is the mesh file.
     */
    autorig?: {
        markers: Markers;
        /** Where a tail's tip is (from the side view), for a tail chain. */
        tail?: Vec3;
        /** How many bones the tail chain has (default 5). */
        tailBones?: number;
        /** An OBJ's objects to use. */
        objects?: string[];
        /** A GLB's mesh to use. */
        mesh?: string;
        color?: string;
    };
}
export declare function rigToolModels(): RigModel[];
/**
 * Where the camera looks from: a face of the character, orthographic and
 * held (see `inspectView`), or `free` to orbit.
 */
export type RigView = InspectFace | 'free';
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
    /** Where the camera looks from: a face (orthographic, held) or `free`. */
    view: RigView;
    /** Play a clip (the current one if none is named); `null` stands it at rest. */
    play(clip?: string | null): void;
    load(model: RigModel | File): Promise<void> | undefined;
    /**
     * Add the clips in a GLB made on another rig (Mixamo, mocap, another
     * library) to the clip list, retargeted onto the character.
     */
    loadClips(file: File | string): Promise<void> | undefined;
}
export interface RigToolOptions {
    /** The characters to choose from (default: the demo characters). */
    models?: RigModel[];
    /** A recipe to start from, in place of the model's own (a host's document). */
    recipe?: RigRecipe;
    /**
     * `false`: no save, load or copy buttons and no working copy kept in this
     * browser. The host supplies the recipe and stores what `change` and
     * `commit` carry.
     */
    files?: boolean;
    /**
     * `false`: no floor and no key light; the character is judged in the
     * host's own lighting.
     */
    stage?: boolean;
    /**
     * The camera to drive (a host's view). Everything about it is put back on
     * unmount. Without one the tool brings its own and makes it active.
     */
    camera?: BABYLON.ArcRotateCamera;
    /**
     * Hosted: the panel is a system panel (a button on the system bar,
     * stacking with the host's), not the scene's settings panel. Default true;
     * the standalone `rigTool()` passes false.
     */
    hosted?: boolean;
}
/** A rig tool mounted in a scene: `change` and `commit` events, its API, unmount. */
export interface RigToolHandle extends EventTarget {
    api: RigToolApi;
    /** Done loading its first model (or failed, or was unmounted first). */
    ready: Promise<void>;
    /** The panel's widgets (what a scene panel shows). */
    widgets(): Widget3d[];
    /** Remove everything it added and put the host's camera back. Safe twice. */
    unmount(): void;
}
/** What `change` and `commit` carry: a copy of the recipe. */
export type RigToolEvent = CustomEvent<{
    recipe: RigRecipe;
}>;
/**
 * MOUNT THE RIG TOOL in an existing `<tosi-b3d>` (tosijs-3d#122): a host's
 * editor opens it on a character and stores the recipe itself. Every edit
 * fires `change` with a copy of the recipe; each finished gesture (a release
 * on the panel or the scene, a role assigned) fires one `commit`, an undo
 * step. `unmount()` removes what it added and restores the host's camera.
 * `rigTool()` is the standalone page: the same tool in a scene of its own.
 */
export declare function mountRigTool(owner: any, options?: RigToolOptions): RigToolHandle;
/**
 * The rig tool page: a `<tosi-b3d>` of its own with the tool mounted in it,
 * its panel the scene's settings panel. `models` replaces the demo
 * characters (a URL the page can fetch, and the character to pick in it).
 * `el.rig` is the API; `change` and `commit` are dispatched on the element.
 */
export declare function rigTool(options?: {
    models?: RigModel[];
}): HTMLElement & {
    rig: RigToolApi;
};
//# sourceMappingURL=rig-tool.d.ts.map