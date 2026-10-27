import * as BABYLON from '@babylonjs/core';
export interface StudioEnvironmentOptions {
    /** The colour overhead. */
    sky?: string;
    /** The bright band at the horizon. */
    horizon?: string;
    /** The colour below. */
    ground?: string;
    /** `scene.environmentIntensity`. Default 0.6. */
    intensity?: number;
    /** The cube's face size in pixels. Default 128. */
    size?: number;
}
/** Draw the studio as an equirectangular image and make it the scene's environment. */
export declare function studioEnvironment(scene: BABYLON.Scene, options?: StudioEnvironmentOptions): BABYLON.BaseTexture;
//# sourceMappingURL=environment.d.ts.map