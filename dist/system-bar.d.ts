export declare const BAR_BUTTON = 40;
export declare const BAR_GAP = 3;
export declare const BAR_PAD: number;
/** The bar's height in its own units (a CSS pixel each, flat). */
export declare const BAR_HEIGHT: number;
/** How long a press is held before it is a `systemhold` instead of a click (ms). */
export declare const HOLD_MS = 600;
/**
 * A button asking to be looked at: its `data-attention` attribute (the scene
 * blinks it for `panel.attention()`), drawn in this fill on both bars.
 */
export declare const ATTENTION_FILL = "rgba(255,190,60,0.8)";
export interface SystemBar {
    /** The toolbar's SVG, with `handlePointer` for a frame panel to route to. */
    svg: SVGSVGElement;
    /** How many buttons it is showing (0: nothing to show). */
    readonly count: number;
    dispose: () => void;
}
/** Mirror `buttons` as an SVG toolbar: what shows, what is enabled, and a press is their click. */
export declare function systemBar(buttons: HTMLButtonElement[]): SystemBar;
//# sourceMappingURL=system-bar.d.ts.map