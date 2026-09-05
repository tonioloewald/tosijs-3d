/** Red, green, blue and alpha, each `0..1`. */
export interface Rgba {
    r: number;
    g: number;
    b: number;
    /** `0..1`, where 1 is opaque. */
    a: number;
}
/** Hue `0..360`, saturation and value `0..1`, alpha `0..1`. */
export interface Hsva {
    h: number;
    s: number;
    v: number;
    a: number;
}
/** Wrap a hue into `[0, 360)` — a hue is a circle, so 370 is 10. */
export declare function wrapHue(h: number): number;
/**
 * Parse a colour string. Returns `null` rather than guessing.
 *
 * Null, not black: an unparseable colour that becomes black is indistinguishable
 * from a colour someone chose, and that is precisely how a themed surface ends
 * up mysteriously dark (see `w3d-theme`).
 */
export declare function parseColor(input: string): Rgba | null;
/**
 * Canonical hex. `#rrggbb`, or `#rrggbbaa` when alpha is not fully opaque.
 *
 * One shape out, whatever went in — so an editor that opens and saves a
 * document without touching a colour does not rewrite it.
 */
export declare function formatColor(c: Rgba): string;
/** RGB → HSV, preserving alpha. Hue is 0 for greys rather than undefined. */
export declare function rgbToHsv(c: Rgba): Hsva;
/** HSV → RGB, preserving alpha. */
export declare function hsvToRgb(c: Hsva): Rgba;
/**
 * Perceived brightness, `0..1` — for deciding what to draw ON a swatch.
 *
 * Rec. 601 coefficients rather than a plain average: green carries most of the
 * perceived light, so an average puts readable text on pure blue and unreadable
 * text on pure green. Alpha is ignored — the caller knows what is behind.
 */
export declare function luminance(c: Rgba): number;
/** Black or white, whichever will be legible on this colour. */
export declare function contrastInk(c: Rgba): string;
//# sourceMappingURL=color.d.ts.map