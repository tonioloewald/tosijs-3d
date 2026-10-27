import * as BABYLON from '@babylonjs/core';
import type { HumanPack } from './human-pack.js';
import { type SkinShadingPlugin } from './skin-shading.js';
import type { HumanSkin } from './human-rig.js';
export interface HumanBody {
    /** Move, turn and scale the body by this. */
    root: BABYLON.TransformNode;
    mesh: BABYLON.Mesh;
    /** Reshape the body from new positions (xyz per vertex, the pack's frame). */
    update(positions: Float32Array): void;
    dispose(): void;
}
export declare function humanBody(scene: BABYLON.Scene, pack: HumanPack, name?: string): HumanBody;
export interface SkinMaterial extends BABYLON.PBRMaterial {
    /** Re-colour: tone 0 (very fair) to 1 (very dark), redness 0.5 neutral. */
    setSkin(tone: number, redness?: number): void;
    /** Its [skin-shading](/skin-shading/) (scatter, rim, back-light), unless turned off. */
    shading: SkinShadingPlugin | null;
}
/**
 * A skin material from [skin-tone](/skin-tone/)'s dials: dielectric, fairly
 * rough, the albedo the tone gives. One flat colour for now: lips, nails and
 * a texture's detail need the mesh's UVs, which the pack does not carry yet.
 */
export declare function skinMaterial(scene: BABYLON.Scene, options?: {
    tone?: number;
    redness?: number;
    name?: string;
    /** `false` for plain PBR, without skin-shading's scatter, rim and back-light. */
    shading?: boolean;
}): SkinMaterial;
/**
 * Per-vertex colours (RGBA, the skin's vertices) that turn a skin material's
 * colour into the lips' where `lips` (a pack region, every vertex) says so.
 * They multiply the material's albedo, so they are the ratio lip / skin.
 * Their alpha carries `thin` (per skin vertex, from `skinThinness`), which
 * skin-shading's back-light reads; without it, alpha is 0 (nothing glows).
 */
export declare function lipTint(skin: HumanSkin, lips: Float32Array, tone: number, redness?: number, into?: Float32Array, thin?: ArrayLike<number>): Float32Array;
/**
 * Stubble: multiply `colours` (RGBA per skin vertex, from `lipTint`) toward
 * a hair colour where `mask` (0..1 per skin vertex) says the beard grows,
 * by `amount` (0 clean-shaven, 1 a few days' growth). `skinRgb` and `hairRgb`
 * are linear; the result stays a ratio over the skin's own colour.
 */
export declare function stubbleTint(colours: Float32Array, mask: ArrayLike<number>, amount: number, skinRgb: {
    r: number;
    g: number;
    b: number;
}, hairRgb: {
    r: number;
    g: number;
    b: number;
}): Float32Array;
//# sourceMappingURL=character-builder.d.ts.map