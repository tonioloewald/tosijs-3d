export interface Rgb {
    r: number;
    g: number;
    b: number;
}
/** The Monk Skin Tone Scale, tones 1 to 10, as sRGB hex. */
export declare const MONK_TONES: readonly string[];
/**
 * The swatch for a tone (0 = very fair, 1 = very dark) and a redness (0.5 is
 * the scale's own; up is ruddier, down sallower), in LINEAR light.
 */
export declare function skinLinear(tone: number, redness?: number): Rgb;
/** The swatch as sRGB, 0..1 per channel (for UI, or a sRGB colour input). */
export declare function skinColor(tone: number, redness?: number): Rgb;
/**
 * The LIPS' colour, linear, for a tone: the skin's, deeper and redder at the
 * fair end (blood shows through thin skin), browner and more muted toward the
 * dark end, where lips carry melanin too.
 */
export declare function lipAlbedo(tone: number, redness?: number): Rgb;
/**
 * What the skin reflects, linear, for a material: the tone's lightness at a
 * diffuse reflectance, with skin's warmth. `redness` 0.5 is neutral.
 */
export declare function skinAlbedo(tone: number, redness?: number): Rgb;
/** Iris colours from most melanin to least: dark brown to grey, sRGB. */
export declare const IRIS_TONES: readonly string[];
/** An iris colour for a dial, 0 (dark brown) to 1 (grey), sRGB 0..1. */
export declare function irisColor(t: number): Rgb;
/** A hair colour: `light` 0 (black) to 1 (platinum), `red` 0 to 1 (copper). Linear. */
export declare function hairColor(light: number, red?: number): Rgb;
/**
 * Dye over a natural hair colour (linear): `hue` 0 to 1 round the colour
 * wheel, `saturation` 0 (no dye, the natural colour) to 1 (the hue at full
 * strength). The dye keeps the hair's lightness, as dye over hair does: over
 * dark hair blue is blue-black, over bleached hair a little pink is pastel.
 */
export declare function hairDye(natural: Rgb, hue: number, saturation: number): Rgb;
//# sourceMappingURL=skin-tone.d.ts.map