import type { ControlPoint } from './gradient-filter.js';
export declare const EFFECT_RECIPE_VERSION = 1;
/** A curve over `[0,1]`, or the flat curve at a number. */
export type EffectCurve = ControlPoint[] | number;
/** A value picked between two, per particle. */
export type Range = [number, number];
export type SpriteKind = 'puff' | 'smoke' | 'spark' | 'ember' | 'glow' | 'drop' | 'bubble';
export declare const SPRITES: readonly SpriteKind[];
export type VoiceKind = 'rumble' | 'roar' | 'hiss' | 'boom' | 'crackle' | 'whoosh' | 'buzz' | 'splash' | 'bubble';
export declare const VOICES: readonly VoiceKind[];
interface LayerBase {
    /** For people: "ash column", "flash". */
    name?: string;
    /** Seconds after the effect starts. Default 0. */
    start?: number;
    /** Seconds, or omitted to last as long as the effect. */
    duration?: number;
    /** Start again when it ends (a geyser's period). Needs a `duration`. */
    repeat?: boolean;
    /** Effect activity → multiplier on the layer's main channel. Default linear. */
    activity?: EffectCurve;
}
export interface ParticleLayer extends LayerBase {
    kind: 'particles';
    sprite: SpriteKind;
    /**
     * Your own picture instead of the sprite: an image URL (PNG, JPEG, SVG,
     * a data: URL) or SVG markup (`<svg …>…</svg>`). White on transparent
     * takes the layer's colours, as the sprites do; a coloured picture is
     * tinted by them.
     */
    texture?: string;
    /** `add` glows (fire, sparks); `alpha` covers (smoke, water). */
    blend: 'add' | 'alpha';
    emitter: {
        shape: 'point' | 'sphere' | 'cone' | 'ring' | 'disc';
        /** Metres. */
        radius?: number;
        /** A cone's half-angle, or how far a ring/disc's particles lean out. */
        angleDeg?: number;
    };
    /** Metres above the effect it is emitted from. */
    height?: number;
    /** Particles a second at full activity. */
    rate: number;
    /** Particles all at once when the layer starts. */
    burst?: number;
    /** Seconds a particle lives. */
    life: Range;
    /** Metres a second as it leaves. */
    speed: Range;
    /** Metres across. */
    size: Range;
    /** Metres a second², down. Negative rises (hot smoke). */
    gravity?: number;
    /** Velocity lost per second, 0 to 1. */
    drag?: number;
    /** How much the wind carries it, 0 to 1. */
    wind?: number;
    /** Colours over a particle's life, start to end: `#rrggbb` or `#rrggbbaa`. */
    colors: string[];
    /** Size over a particle's life (a multiplier). */
    grow?: EffectCurve;
    /** Stretch along its velocity (sparks, streaks). */
    stretch?: boolean;
    /** Settle on the ground where it lands (lava bombs, sparks). */
    land?: boolean;
    /** Ends where it reaches the water's surface (bubbles pop there). */
    surface?: boolean;
    /** Metres a second of sideways zigzag (a rising bubble's wobble). */
    wobble?: number;
    channels?: {
        rate?: EffectCurve;
        size?: EffectCurve;
        speed?: EffectCurve;
    };
}
export interface LightLayer extends LayerBase {
    kind: 'light';
    color: string;
    /** At full activity and channel. */
    intensity: number;
    /** Metres. */
    range: number;
    /** Metres above the effect. */
    height?: number;
    /** Random flicker, 0 to 1 (sparks, fire). */
    flicker?: number;
    channels?: {
        intensity?: EffectCurve;
        range?: EffectCurve;
    };
}
export interface SoundLayer extends LayerBase {
    kind: 'sound';
    voice: VoiceKind;
    /** A sample instead of the synthesised voice. */
    url?: string;
    /** 0 to 1 at full activity and channel. */
    gain: number;
    /** Playback rate / pitch multiplier. Default 1. */
    pitch?: number;
    /** Metres at which it is at full gain; it falls off beyond. Default 10. */
    refDistance?: number;
    channels?: {
        gain?: EffectCurve;
        pitch?: EffectCurve;
        cutoff?: EffectCurve;
    };
}
export type EffectLayer = ParticleLayer | LightLayer | SoundLayer;
export interface EffectRecipe {
    version: number;
    name?: string;
    /** Seconds for a one-shot; omitted, it loops until stopped. */
    duration?: number;
    /** Default activity, 0 to 1. Default 1. */
    activity?: number;
    layers: EffectLayer[];
}
/** Sample a curve at `t` (clamped); a number is flat. */
export declare function sampleCurve(c: EffectCurve | undefined, t: number, flat?: number): number;
/** What a layer is doing at one moment. */
export interface LayerState {
    /** It is running (inside its start and duration). */
    on: boolean;
    /** Its own clock: seconds since it (last) started. */
    age: number;
    /** Fraction of its life, 0 to 1 (0 for a layer with no duration). */
    life: number;
    /** The activity multiplier on its main channel. */
    level: number;
    /** Channel values at this moment, multipliers (1 = as declared). */
    channel: Record<string, number>;
    /** It started since the previous sample (a burst fires). */
    started: boolean;
}
/**
 * A layer at effect time `t` (seconds since `play`), with the effect's
 * `activity`. `prev` is the previous sample's time, so a burst fires once
 * per start (and once per repeat) however the frames fall.
 */
export declare function layerAt(layer: EffectLayer, effect: EffectRecipe, t: number, activity: number, prev?: number): LayerState;
export interface LightCandidate {
    intensity: number;
    range: number;
    /** Metres from the viewer. */
    distance: number;
}
/** How much a light matters to the viewer. Zero beyond its range. */
export declare function lightScore(l: LightCandidate): number;
/** The indices of the `slots` lights that win, best first. */
export declare function rankLights(lights: readonly LightCandidate[], slots: number): number[];
export declare const SPEED_OF_SOUND = 343;
export declare function soundDelay(distance: number): number;
/** Gain at the listener: full inside `ref`, then inverse distance. */
export declare function soundGain(distance: number, ref?: number): number;
/** Low-pass cutoff (Hz) for a sound this far away. */
export declare function distanceCutoff(distance: number): number;
/** What is wrong with `doc` as an effect recipe, as sentences; empty if nothing. */
export declare function validateEffectRecipe(doc: unknown): string[];
export declare function effectRecipeSchema(): Record<string, unknown>;
export {};
//# sourceMappingURL=effect-recipe.d.ts.map