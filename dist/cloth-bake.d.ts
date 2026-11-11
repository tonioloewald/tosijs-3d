import { type RgbaImage } from './png.js';
import { type MaterialRecipe } from './material-recipe.js';
/** A texture's mean brightness (linear luminance), sampled as the material measures it. */
export declare function textureMean(image: RgbaImage): number;
/**
 * The texture recoloured toward `colour` (sRGB: anything `parseColor` reads)
 * by `amount`, as cloth-shading draws it. `mean` defaults to the texture's
 * own. Alpha is kept. An unreadable colour returns a copy unchanged.
 */
export declare function recolourCloth(image: RgbaImage, colour: string, amount: number, mean?: number): RgbaImage;
/** The sheen colour cloth-shading gives a recoloured fabric: a lighter version of it. */
export declare function clothSheenColour(colour: string): [number, number, number] | null;
/**
 * A garment's picture as its cloth look draws it: recoloured toward the
 * look's colour by its recolour, as a PNG. Null when there is nothing to bake
 * (not a cloth look, no recolour, no colour) or the picture cannot be read.
 */
export declare function bakeClothLook(picture: {
    bytes: Uint8Array;
    mimeType: string;
}, look: MaterialRecipe | null | undefined): {
    bytes: Uint8Array;
    mimeType: 'image/png';
} | null;
/** A hair texture's mean brightness where there is hair (alpha past half), as hair-shading measures it. */
export declare function hairMean(image: RgbaImage): number;
/**
 * A hair texture coloured as hair-shading draws it: the texture read as
 * grey, each pixel's brightness over `mean` times `base`, leaning to
 * `highlight` (both sRGB, anything `parseColor` reads) on the brightest
 * strands by `strength`. Alpha is kept. An unreadable colour returns a copy.
 */
export declare function recolourHair(image: RgbaImage, base: string, highlight: string, strength?: number, mean?: number): RgbaImage;
//# sourceMappingURL=cloth-bake.d.ts.map