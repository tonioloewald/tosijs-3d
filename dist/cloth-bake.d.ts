import type { RgbaImage } from './png.js';
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
//# sourceMappingURL=cloth-bake.d.ts.map