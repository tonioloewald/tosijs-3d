import * as BABYLON from '@babylonjs/core';
import { type EffectRecipe } from './effect-recipe.js';
import { type Voice } from './effect-audio.js';
export interface EffectPlayerOptions {
    /** The wind at a point, metres a second (the scene's `weatherAt`). */
    windAt?: (x: number, z: number) => {
        x: number;
        z: number;
    };
    /** Called when a one-shot has finished (its particles gone too). */
    whenDone?: () => void;
    /** The water's surface height, for `surface` particles (bubbles); null if none. */
    waterLevel?: () => number | null;
    /**
     * How big. FROUDE SCALING, as for a model ship: sizes, radii, heights,
     * light range and sound reach multiply by `scale`, speeds and particle
     * lives by its square root, and gravity stays as it is. An arc keeps its
     * shape, and a big effect moves more slowly for its size, as big things
     * do, so a real wind still bends a mountain's plume. (Speeds times 12
     * sent ash up at 150 m/s and a 10 m/s wind leaned it 1°.) Default 1.
     */
    scale?: number;
}
interface SceneEffects {
    players: Set<EffectPlayer>;
    lights: Array<{
        light: BABYLON.PointLight;
        want: number;
        range: number;
        fade: number;
    }>;
    voices: Set<{
        voice: Voice;
        audible: number;
    }>;
    observer: BABYLON.Observer<BABYLON.Scene>;
    effectLights: Set<BABYLON.Light>;
}
export declare class EffectPlayer {
    readonly scene: BABYLON.Scene;
    readonly node: BABYLON.TransformNode;
    recipe: EffectRecipe;
    /** 0 to 1: the effect's activity dial. */
    activity: number;
    /** Silence its sound layers (the tool's mute). */
    muted: boolean;
    private t;
    private prev;
    private playing;
    private finished;
    private runtimes;
    private options;
    private shared;
    constructor(scene: BABYLON.Scene, node: BABYLON.TransformNode, recipe: EffectRecipe, options?: EffectPlayerOptions);
    /** Seconds since `play`. */
    get time(): number;
    get isPlaying(): boolean;
    /** Start from the beginning. */
    play(): void;
    /** Stop: no more emission, sound and light fade; what is alive dies out. */
    stop(): void;
    /** Swap the recipe (the tool editing it): rebuilt, playing on from now. */
    setRecipe(recipe: EffectRecipe): void;
    dispose(): void;
    /** Particles alive now, for the scene's budget. */
    particlesAlive(): number;
    /** One frame. Called by the scene's effect observer. */
    step(dt: number, throttle: number, s: SceneEffects): void;
    private build;
    private particles;
    private light;
    private sound;
}
export {};
//# sourceMappingURL=effect-player.d.ts.map