import * as BABYLON from '@babylonjs/core';
import type { SpriteKind } from './effect-recipe.js';
/** The sprite's texture in `scene`, drawn the first time it is asked for. */
export declare function effectSprite(scene: BABYLON.Scene, kind: SpriteKind): BABYLON.Texture;
/**
 * A layer's own picture: an image URL (PNG, JPEG, SVG, data:) or SVG
 * markup. Made once per scene and picture, and shared, like the sprites.
 */
export declare function effectTexture(scene: BABYLON.Scene, source: string): BABYLON.Texture;
/**
 * Let go of `scene`'s sprites and pictures (its last effect is gone): they
 * are made again if another effect asks.
 */
export declare function releaseEffectSprites(scene: BABYLON.Scene): void;
//# sourceMappingURL=effect-sprites.d.ts.map