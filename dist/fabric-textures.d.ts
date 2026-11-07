import type { MaterialPreset, MaterialRecipe } from './material-recipe.js';
export interface FabricTexture {
    /** Poly Haven's id, and the pack's folder. */
    id: string;
    name: string;
    /** Metres one repeat covers. */
    tile: number;
    /** Without the roughness map (lite): how rough, flat. */
    roughness: number;
    /** How much the fibres catch light at a grazing angle. */
    sheen: number;
}
/** The pack, as fabrics.json lists it (tile from Poly Haven's dimensions). */
export declare const FABRIC_TEXTURES: FabricTexture[];
/** One fabric as a cloth recipe, in either quality. */
export declare function fabricTextureRecipe(f: FabricTexture, quality?: 'lite' | 'full'): MaterialRecipe;
/** Every fabric as a preset, in either quality. */
export declare function fabricTexturePresets(quality?: 'lite' | 'full'): MaterialPreset[];
//# sourceMappingURL=fabric-textures.d.ts.map