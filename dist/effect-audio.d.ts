import * as BABYLON from '@babylonjs/core';
import type { VoiceKind } from './effect-recipe.js';
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