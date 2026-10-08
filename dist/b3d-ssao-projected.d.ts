import * as BABYLON from '@babylonjs/core';
export interface ProjectedAoParams {
    active: boolean;
    /** How dark a fully occluded crease gets. */
    strength: number;
    /** Metres a surface looks for occluders. */
    radius: number;
    samples: number;
    /** Resolution as a fraction of the frame. */
    ratio: number;
    /** Redraws per second. 0 = every frame. */
    rate: number;
}
/**
 * Owns the projected-occlusion textures for one scene and the hook on every
 * material that reads them. `<tosi-b3d>` drives it.
 */
export declare class ProjectedAoController {
    private _scene;
    private _camera;
    private _depth;
    private _ao;
    private _blur;
    private _plugins;
    private _frameObs;
    private _materialObs;
    private _built;
    private _params;
    private _lastDraw;
    private _warmUp;
    private _drawing;
    private _tan;
    /** The view-projection the textures were last drawn with. */
    readonly viewProjection: BABYLON.Matrix;
    /** Debug: how many times the occlusion has been redrawn. */
    draws: number;
    constructor(_scene: BABYLON.Scene);
    get running(): boolean;
    get texture(): BABYLON.Nullable<BABYLON.BaseTexture>;
    get depthTexture(): BABYLON.Nullable<BABYLON.BaseTexture>;
    get attachedCount(): number;
    private _blank;
    /** A 1x1 stand-in for a sampler that must not point at the depth texture. */
    get blank(): BABYLON.BaseTexture;
    /** True while the scene is drawing this controller's depth picture. */
    get drawingDepth(): boolean;
    update(p: ProjectedAoParams): void;
    dispose(): void;
    private _disposeTextures;
    private _attach;
    /**
     * Point the middle camera where the viewer is looking, with a frustum that
     * covers everything either eye can see. Returns false if there is no viewer.
     */
    private _aim;
    private _build;
    private _frame;
}
//# sourceMappingURL=b3d-ssao-projected.d.ts.map