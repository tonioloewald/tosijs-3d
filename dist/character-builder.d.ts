import * as BABYLON from '@babylonjs/core';
import type { HumanPack } from './human-pack.js';
import { type SkinShadingPlugin } from './skin-shading.js';
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
export { lipTint, stubbleTint } from './skin-paint.js';
//# sourceMappingURL=character-builder.d.ts.map