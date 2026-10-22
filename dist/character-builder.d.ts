import * as BABYLON from '@babylonjs/core';
import type { HumanPack } from './human-pack.js';
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
}): SkinMaterial;
/**
 * Per-vertex colours (RGBA, the skin's vertices) that turn a skin material's
 * colour into the lips' where `lips` (a pack region, every vertex) says so.
 * They multiply the material's albedo, so they are the ratio lip / skin.
 */
export declare function lipTint(skin: HumanSkin, lips: Float32Array, tone: number, redness?: number, into?: Float32Array): Float32Array;
//# sourceMappingURL=character-builder.d.ts.map