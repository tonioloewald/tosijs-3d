import * as BABYLON from '@babylonjs/core';
import { type Widget3d } from './widgets3d.js';
import { EffectPlayer } from './effect-player.js';
import { type EffectRecipe } from './effect-recipe.js';
/** `effectTool()`'s element carries this as `.effect`. */
export interface EffectToolApi {
    /** A copy of the working recipe; set one to play it. */
    recipe: EffectRecipe;
    readonly player: EffectPlayer | null;
}
export interface EffectToolOptions {
    /** A recipe to start from, in place of the volcano (a host's document). */
    recipe?: EffectRecipe;
    /** `false`: no save, load or copy, nothing kept in this browser. */
    files?: boolean;
    /** `false`: no ground or backdrop; the effect is seen in the host's scene. */
    stage?: boolean;
    /** The camera to drive; put back exactly as found on unmount. */
    camera?: BABYLON.ArcRotateCamera;
    /** Where the effect plays (a host's piece); default a node at the origin. */
    target?: BABYLON.TransformNode;
    /** Hosted: the panel is a system panel. Default true; `effectTool()` passes false. */
    hosted?: boolean;
}
/** An effect tool mounted in a scene: `change` and `commit`, its API, unmount. */
export interface EffectToolHandle extends EventTarget {
    api: EffectToolApi;
    widgets(): Widget3d[];
    unmount(): void;
}
/**
 * MOUNT THE EFFECT TOOL in an existing `<tosi-b3d>` (tosijs-3d#122), on the
 * same contract as `mountRigTool`: `change` per edit and `commit` per
 * finished gesture with a copy of the recipe, `files`, `stage`, a camera put
 * back on unmount, and a system panel when hosted.
 */
export declare function mountEffectTool(owner: any, options?: EffectToolOptions): EffectToolHandle;
/**
 * The effect tool page: a `<tosi-b3d>` of its own with the tool mounted in
 * it, its panel the scene's settings panel. `el.effect` is the API;
 * `change` and `commit` are dispatched on the element.
 */
export declare function effectTool(): HTMLElement & {
    effect: EffectToolApi;
};
//# sourceMappingURL=effect-tool.d.ts.map