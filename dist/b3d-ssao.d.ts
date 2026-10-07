import * as BABYLON from '@babylonjs/core';
/** `always` is deprecated: it means `on`. SSAO does not run in XR. */
export type SsaoSetting = 'off' | 'auto' | 'on' | 'always';
/**
 * Should SSAO be running? Pure, so the rule is testable without an engine.
 *
 * Never in XR, whatever the setting: a post-process pipeline on a WebXR camera
 * draws one image across both eyes (see "Flat only" in the page above). `xr` must be true for
 * the WHOLE session including entering and exiting, because the headset camera
 * becomes the active camera before the session reports itself entered.
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