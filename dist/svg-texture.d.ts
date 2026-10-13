import * as BABYLON from '@babylonjs/core';
export type SvgTextureOptions = {
    /** The Babylon scene that owns this texture. */
    scene: BABYLON.Scene;
    /** Texture resolution in pixels (square). Default 512. */
    resolution?: number;
    /** Fetch SVG from this URL and render once. */
    url?: string;
    /** Live SVG element reference (dynamic mode). */
    element?: SVGSVGElement;
    /** Re-render interval in ms for dynamic mode. Default 30. */
    updateInterval?: number;
};
/**
 * What repainting SVG textures has cost on the main thread, across every
 * instance: `checks` are serialise-and-compare passes, `repaints` the ones
 * that changed and were redrawn, `ms` the time both took here. The browser's
 * own SVG rasterising happens off this thread and is NOT in it. Perf Stats
 * reads this once a second.
 */
export declare const svgTextureCost: {
    checks: number;
    repaints: number;
    ms: number;
};
export declare class SvgTexture {
    texture: BABYLON.DynamicTexture | BABYLON.Texture;
    private _resolution;
    private _interval;
    private _element;
    private _scene;
    private _rendering;
    private _img;
    private _lastXml;
    private _warnedFailure;
    constructor(options: SvgTextureOptions);
    /** Manually trigger a re-render from the live SVG element. */
    render(): void;
    /** Render an arbitrary SVG string to the texture. */
    renderString(svgString: string): void;
    dispose(): void;
}
//# sourceMappingURL=svg-texture.d.ts.map