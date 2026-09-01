/** A resolved face, ready to inline. */
export interface EmbeddedFont {
    family: string;
    /** A complete `@font-face` rule with the payload inlined. */
    css: string;
    /** Encoded size in bytes — worth logging before shipping a large face. */
    bytes: number;
}
/** Base64 without blowing the stack on a 100 KB file. */
export declare function base64OfBytes(bytes: Uint8Array): string;
/**
 * Build the `@font-face` rule for a font file, caching per URL.
 *
 * `weight` and `style` are passed through rather than guessed: a face fetched
 * as "the bold one" must say so, or the browser synthesises a bold from it and
 * you get double-emboldening.
 */
export declare function fontFaceCss(family: string, url: string, opts?: {
    weight?: string;
    style?: string;
}): Promise<EmbeddedFont>;
/**
 * Register a face so in-scene panels can render it.
 *
 * ```js
 * await registerSvgFont('Rosario', '/fonts/rosario.woff2')
 * setW3dTheme({ fontFamily: 'Rosario, serif' })
 * ```
 *
 * Resolves once the bytes are in hand; panels rasterised before that render the
 * fallback, which is why this is awaited rather than fired and forgotten.
 */
export declare function registerSvgFont(family: string, url: string, opts?: {
    weight?: string;
    style?: string;
}): Promise<EmbeddedFont>;
/** Forget a registered face. */
export declare function unregisterSvgFont(family: string): void;
/**
 * The `<style>` block to inject, or `''` when nothing is registered.
 *
 * Returns only the faces the markup actually **mentions**. A panel in one
 * family should not carry the bytes of three others — and since the payload is
 * re-parsed per rasterisation, that is the difference between one font and
 * every font on every texture.
 */
export declare function svgFontStyle(markup: string): string;
//# sourceMappingURL=embed-font.d.ts.map