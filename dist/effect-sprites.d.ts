import * as BABYLON from '@babylonjs/core';
import type { SpriteKind } from './effect-recipe.js';
/** The sprite's texture in `scene`, drawn the first time it is asked for. */
export declare function effectSprite(scene: BABYLON.Scene, kind: SpriteKind): BABYLON.Texture;
/**
 * A layer's own picture: an image URL (PNG, JPEG, SVG, data:) or SVG
 * markup. Made once per scene and picture, and shared, like the sprites.
 */
export declare function effectTexture(scene: BABYLON.Scene, source: string): BABYLON.Texture;
//# sourceMappingURL=effect-sprites.d.ts.map