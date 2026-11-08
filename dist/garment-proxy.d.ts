import { type GarmentFileContent, type GarmentMaterial, type GarmentMeta } from './garment-file.js';
import type { HumanProxy } from './human-pack.js';
import { type MaterialRecipe } from './material-recipe.js';
import { type MacroBody } from './human-morph.js';
/** A look as glTF factors: only the ones it has a plain reading for. */
export interface GarmentLookGltf {
    baseColorFactor?: [number, number, number, number];
    roughnessFactor?: number;
    metallicFactor?: number;
    /** KHR_materials_sheen, for cloth. */
    sheenColorFactor?: [number, number, number];
    sheenRoughnessFactor?: number;
}
/** A garment's material as data. */
export interface GarmentProxyMaterial extends Omit<GarmentMaterial, 'doubleSided'> {
    /** Drawn from both sides: a skirt, a draped garment, or as the file says. */
    twoSided: boolean;
    /** The material recipe it was worn with when saved, or null. */
    look: MaterialRecipe | null;
    /** `look` as glTF factors, where it has a plain reading; null with no look. */
    gltf: GarmentLookGltf | null;
}
/** A garment as MakeHuman's clothes are, its material as data. */
export type GarmentProxy = Omit<HumanProxy, 'material'> & {
    material: GarmentProxyMaterial;
};
/**
 * The look a garment was saved with, as a material recipe: the tailor's
 * (`look.material`), or the `{ fabric, colour, recolour }` of older files.
 */
export declare function garmentLook(meta: GarmentMeta | null | undefined): MaterialRecipe | null;
/**
 * MakeHuman's slider values a garment was made on, every slider filled in:
 * the shape to bind it to (`morphHuman`). Null for a garment made on a
 * mesh's body, or a file that does not say.
 */
export declare function garmentMadeOn(meta: GarmentMeta | null | undefined): MacroBody | null;
/** A look as glTF factors (see the page): `textured` when the garment has its own picture. */
export declare function lookGltf(recipe: MaterialRecipe, textured: boolean): GarmentLookGltf;
/**
 * A garment file's content bound to the body it was made on (`positions`
 * and `triangles` of that body), as a proxy. `name` and `slot` default to the
 * file's (and `top`).
 */
export declare function garmentProxy(content: GarmentFileContent, body: {
    positions: ArrayLike<number>;
    triangles: ArrayLike<number>;
}, options?: {
    name?: string;
    slot?: string;
}): GarmentProxy;
//# sourceMappingURL=garment-proxy.d.ts.map