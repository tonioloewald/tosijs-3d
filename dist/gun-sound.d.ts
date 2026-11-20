import * as BABYLON from '@babylonjs/core';
export type GunSound = 'pistol' | 'rifle' | 'heavy' | 'bow';
/** Play one shot of `kind` at `at` (world space). Silent before a user gesture. */
export declare function gunshot(scene: BABYLON.Scene, at: {
    x: number;
    y: number;
    z: number;
}, kind: GunSound): void;
//# sourceMappingURL=gun-sound.d.ts.map