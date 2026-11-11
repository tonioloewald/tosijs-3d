import { type GarmentFileContent, type GarmentImage, type GarmentMaterial, type GarmentMeta } from './garment-file.js';
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
    /** A joint the whole piece follows rigidly (hair on `Head`), instead of the skin under it. */
    follows?: string;
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
/** A garment file's material as data, with the look it was saved with. */
export declare function garmentFileMaterial(content: GarmentFileContent): GarmentProxyMaterial;
/**
 * A piece bound to MakeHuman's pack bound instead to the skin a MakeHuman
 * body draws: `drawn` is the piece as worn (`drawnPositions` of its fit on
 * the body's every vertex), bound as a garment file is; `skin.vertices` is
 * the pack vertex each skin vertex leans on (human-rig's `HumanSkin`), which
 * carries what the piece deletes across. The rest of the proxy (name, slot,
 * triangles, uvs) is kept.
 */
export declare function onSkin<P extends Omit<HumanProxy, 'material'>>(proxy: P, drawn: ArrayLike<number>, skin: {
    positions: ArrayLike<number>;
    triangles: ArrayLike<number>;
    vertices: ArrayLike<number>;
}): P;
/**
 * A pack proxy's material as data: its `pictures` (the diffuse and normal
 * maps, fetched by the caller: MakeHuman's are PNG or JPEG) and the look it
 * is worn in, as the builder draws it (cloth matte, hair softer, glasses
 * blended, other cut-outs at 0.4).
 */
export declare function packGarmentMaterial(proxy: Pick<HumanProxy, 'category' | 'slot' | 'material'>, pictures: {
    diffuse?: GarmentImage | null;
    normal?: GarmentImage | null;
}, look?: MaterialRecipe | null): GarmentProxyMaterial;
//# sourceMappingURL=garment-proxy.d.ts.map