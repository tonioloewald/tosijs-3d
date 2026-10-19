import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import { EffectPlayer } from './effect-player.js';
import { type EffectRecipe } from './effect-recipe.js';
export declare class B3dEffect extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        preset: string;
        activity: number;
        autoplay: string;
        scale: number;
        ground: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    preset: string;
    activity: number;
    autoplay: 'on' | 'off';
    scale: number;
    ground: 'on' | 'off';
    /** Plays this instead of a preset. */
    recipe: EffectRecipe | null;
    /** Called when a one-shot has finished. */
    whenDone: (() => void) | null;
    /** The live player (null until the scene is up). */
    player: EffectPlayer | null;
    private _playing;
    /** The ground under it, when `ground` is on (found by a downward pick). */
    private _groundY;
    private _groundTimer;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    /** Start again from the beginning. */
    play(): void;
    /** Stop emitting; what is alive dies out, sound and light fade. */
    stop(): void;
    private _key;
    private _heightFn;
    private _findGround;
    private _recipe;
    private _start;
}
export declare const b3dEffect: import("tosijs").ElementCreator<B3dEffect>;
//# sourceMappingURL=b3d-effect.d.ts.map