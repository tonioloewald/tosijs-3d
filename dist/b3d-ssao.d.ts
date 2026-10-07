import * as BABYLON from '@babylonjs/core';
export type SsaoSetting = 'off' | 'auto' | 'on' | 'always';
/**
 * Should SSAO be running? Pure, so the rule is testable without an engine.
 *
 * `auto` and `on` are flat-only: a headset pays for the effect twice at a high
 * per-eye resolution. `always` is the explicit "also in XR".
 */
export declare function ssaoActive(setting: SsaoSetting | boolean | string | null | undefined, opts: {
    xr: boolean;
    budgetAllows: boolean;
}): boolean;
export interface SsaoParams {
    active: boolean;
    /** How dark a fully occluded crease gets. */
    strength: number;
    /** Metres a surface looks for occluders. */
    radius: number;
    samples: number;
    /** Resolution as a fraction of the frame. */
    ratio: number;
}
/**
 * Owns the SSAO pipeline for one scene: builds it on demand, follows the
 * active camera, tears it down when off. `<tosi-b3d>` drives it; nothing else
 * should need to.
 */
export declare class SsaoController {
    private _scene;
    private _pipeline;
    private _camera;
    private _built;
    private _name;
    constructor(_scene: BABYLON.Scene);
    get running(): boolean;
    update(p: SsaoParams): void;
    dispose(): void;
}
//# sourceMappingURL=b3d-ssao.d.ts.map