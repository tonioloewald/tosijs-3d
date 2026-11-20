import { type Noise, type Sensorium } from './sensorium.js';
export interface NpcBrainOptions {
    /** Where it stands or wanders around, and goes back to. */
    home: {
        x: number;
        z: number;
    };
    /** The seed for its wandering: the same seed, the same walk. */
    seed?: number;
    /** 0..1. Dumb (0) is the default. */
    skill?: number;
    /** What it can perceive (see sensorium). */
    senses?: Partial<Sensorium>;
    /** Metres it wanders from home; 0 (default) stands guard there. */
    wanderRadius?: number;
    /**
     * A route it walks, in a loop, pausing a moment at each point. Takes the
     * place of standing guard or wandering; after an alarm it rejoins the
     * route at the nearest point.
     */
    patrol?: Array<{
        x: number;
        z: number;
    }>;
    /** It attacks from this close, metres. */
    attackRange?: number;
    /** Seconds between attacks. */
    attackCooldown?: number;
    /** Seconds it remembers where you were after losing you. */
    memory?: number;
}
export type NpcMode = 'idle' | 'wander' | 'investigate' | 'chase' | 'attack' | 'search' | 'return' | 'patrol';
export interface NpcPercept {
    self: {
        x: number;
        z: number;
        heading: number;
    };
    /**
     * What it is after, if anything: where, whether a clear line from its eyes
     * reaches it (the caller casts the ray), and how conspicuous it is (1
     * standing, `STEALTH` crouching).
     */
    target?: {
        x: number;
        z: number;
        clearLine: boolean;
        conspicuity?: number;
    } | null;
    /** Noises made since the last step (it hears those that carry to it). */
    noises?: Noise[];
}
export interface NpcIntent {
    mode: NpcMode;
    /** Where it is going (null: nowhere). */
    moveTo: {
        x: number;
        z: number;
    } | null;
    pace: 'stop' | 'walk' | 'run';
    /** Attack now: true for the one step an attack starts on. */
    attack: boolean;
    /** 0..1. */
    alertness: number;
    /** It sees its target (in front), senses it (close behind), or heard a noise this step. */
    sees: boolean;
    senses: boolean;
    heard: boolean;
}
/** An NPC's mind. `step` each frame with what it perceives; it says what to do. */
export declare function npcBrain(options: NpcBrainOptions): {
    step: (p: NpcPercept, dt: number) => NpcIntent;
    /** Something hurt it: it is wide awake and knows where you are. */
    hurt(from?: {
        x: number;
        z: number;
    }): void;
    readonly mode: NpcMode;
    readonly alertness: number;
};
export type NpcBrain = ReturnType<typeof npcBrain>;
//# sourceMappingURL=npc-brain.d.ts.map