import type { Role } from './retarget.js';
import type { Vec3 } from './spatial-transform.js';
export declare const RIG_RECIPE_VERSION = 1;
/** A sphere a chain stays out of, on a bone. */
export interface ColliderRecipe {
    bone: string;
    radius: number;
    /** Metres from the bone, in the character's frame. */
    offset?: Vec3;
}
export interface SpringParamsRecipe {
    /** 0 hangs free, 1 holds its rest shape. */
    stiffness?: number;
    /** Velocity lost per second, 0 to 1. */
    damping?: number;
    /** Metres per second², down. Default 9.8. */
    gravity?: number;
}
interface SpringCommon {
    /** What it is, for people: "ponytail", "tail". */
    name?: string;
    params?: SpringParamsRecipe;
    /** `auto` (default): the head, chest and shoulders, sized to the body. */
    colliders?: 'auto' | 'none' | ColliderRecipe[];
}
export interface BoneSpringRecipe extends SpringCommon {
    kind: 'bones';
    /** The chain's first bone (its parent is what it hangs from). */
    root: string;
}
export interface StrandSpringRecipe extends SpringCommon {
    kind: 'strand';
    /** The bone it hangs from. */
    anchor: string;
    /** Where it starts, from the anchor bone, in metres. */
    offset: Vec3;
    /** Which way it hangs: 0 is backward (-Z), positive turns to the left. */
    yawDeg: number;
    /** 0 is level, -90 straight down. */
    pitchDeg: number;
    length: number;
    segments: number;
    /** The tube's radius at the root and the tip. */
    radius: number;
    tipRadius?: number;
    /** `#rrggbb`. */
    color?: string;
}
export type SpringRecipe = BoneSpringRecipe | StrandSpringRecipe;
export interface RigRecipe {
    version: number;
    /** The model it was made for: a URL, or a file name. */
    model?: {
        url?: string;
        name?: string;
    };
    /** Roles where the names guessed wrong: role → bone name ('' leaves it out). */
    roles?: Partial<Record<Role, string>>;
    /** See `RetargetOptions.armSpaceDeg`. */
    armSpaceDeg?: number;
    springs?: SpringRecipe[];
}
export declare const STRAND_DEFAULTS: Omit<StrandSpringRecipe, 'anchor'>;
/** A strand's direction as a unit vector, in the character's frame. */
export declare function strandDirection(yawDeg: number, pitchDeg: number): Vec3;
/**
 * What is wrong with `doc` as a recipe, as sentences; empty when nothing is.
 * Bone names are not checked against a model (there may not be one yet).
 */
export declare function validateRigRecipe(doc: unknown): string[];
export declare function rigRecipeSchema(): Record<string, unknown>;
export {};
//# sourceMappingURL=rig-recipe.d.ts.map