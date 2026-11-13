import * as BABYLON from '@babylonjs/core';
import type { VoiceKind } from './effect-recipe.js';
/**
 * Silence the effect voices until the release is called: a scene holds them
 * while its loading spinner is up, so nothing is heard before anything is
 * seen. Voices are not started while held, and the context is suspended.
 */
export declare function holdEffectAudio(): () => void;
/**
 * A page-wide mute shared by everyone who holds it: the volume is read when
 * the first hold is taken and put back when the last is released, unless
 * something else changed it meanwhile. Pure; `<tosi-b3d>` uses it for
 * Babylon's own sounds while a scene is behind its spinner.
 */
export declare function sharedMute(get: () => number, set: (volume: number) => void): () => () => void;
/** The shared audio context, running, or null (no audio yet, or none). */
export declare function effectAudio(): AudioContext | null;
export interface Voice {
    /** Gain 0 to 1 (before distance), pitch multiplier, filter 0 to 1. */
    set(gain: number, pitch: number, cutoff: number, distanceCutoffHz: number): void;
    /** Where it is, in the world. */
    place(p: BABYLON.Vector3): void;
    stop(): void;
    /** The level it was last set to, for the pool. */
    readonly level: number;
}
/** A voice, or null when audio cannot play yet. `url` plays a sample. */
export declare function startVoice(kind: VoiceKind, options?: {
    refDistance?: number;
    url?: string;
}): Voice | null;
/** Put the listener where the camera is, looking where it looks. */
export declare function placeListener(camera: BABYLON.Camera): void;
//# sourceMappingURL=effect-audio.d.ts.map