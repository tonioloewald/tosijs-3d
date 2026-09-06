import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Rendering/outlineRenderer.js';
import type { B3d } from './tosi-b3d.js';
import { type ActivationVeto } from './interaction.js';
/** What happened, and where. Carried by every event this behaviour raises. */
export interface InteractionInfo {
    /** The mesh actually under the pointer (a sub-mesh — the knob, not the door). */
    mesh: BABYLON.AbstractMesh | null;
    /** World point of the hit, when there was one. */
    point: BABYLON.Vector3 | null;
    /** Distance along the picking ray — from the eye when flat, from the hand in XR. */
    distance: number;
    /** Set on `refused`: the veto that said no. */
    reason?: string;
    /**
     * How this activation arrived.
     *
     * A veto needs it: a lock you can REACH is not a lock you can merely SEE, so
     * the same door may answer differently to a hand at 0.4 m and a ray at 8 m.
     */
    source?: 'pointer' | 'near' | 'api';
    /**
     * Who is doing it. Opaque on purpose.
     *
     * The simulation knows what an actor is and this layer does not — carrying
     * anything more specific would make an interactive care whether a door is
     * being opened by a player, an NPC or a test. A veto that needs to know casts
     * it; one that does not, ignores it.
     */
    actor?: unknown;
}
export interface InteractiveHost {
    /** Usually the host Component — events bubble from it. */
    dispatchEvent(ev: Event): boolean;
}
export interface InteractiveConfig {
    /**
     * Which meshes count as "this thing". Called on each pointer event rather
     * than captured, so a target that loads late (a GLB) starts working when it
     * arrives instead of never.
     */
    meshes: () => BABYLON.AbstractMesh[];
    /** Max picking distance in world units; `0` (default) means no limit. */
    reach?: () => number;
    /** `false` refuses hover AND drops a press already in flight. */
    enabled?: () => boolean;
    /** Hover outline colour; `''` or `'none'` for no highlight. */
    highlight?: () => string;
}
export declare class InteractiveBehavior {
    private owner;
    private host;
    private config;
    /** Other features' "not while I say so" — consulted at activation only. */
    vetoes: Array<ActivationVeto<InteractionInfo>>;
    whenActivated?: (info: InteractionInfo) => void;
    whenHovered?: (info: InteractionInfo) => void;
    whenUnhovered?: (info: InteractionInfo) => void;
    whenRefused?: (info: InteractionInfo) => void;
    private _state;
    private _down;
    private _obs?;
    private _outlined;
    private _last;
    constructor(owner: B3d, host: InteractiveHost, config: InteractiveConfig);
    attach(): void;
    dispose(): void;
    /** Is the pointer on it right now? */
    get hovered(): boolean;
    /** True when nothing refuses an activation — i.e. it would actually work. */
    get operable(): boolean;
    /**
     * Use it without pointing at it — a keyboard `interact`, an NPC, a test.
     *
     * Runs the SAME veto pass as a pointer activation, so a locked door is locked
     * however you reach it. Returns `true` if it fired.
     */
    activate(info?: Partial<InteractionInfo>): boolean;
    private _apiInfo;
    /** Tuned state for the console / `hj eval` / a Perf-panel debug source. */
    get debugState(): {
        enabled: boolean;
        phase: import("./interaction.js").InteractPhase;
        armed: boolean;
        meshes: string[];
        reach: number;
        vetoes: string[];
    };
    /** World centre of the target meshes — what `useNearest` measures against. */
    center(): BABYLON.Vector3 | null;
    /** Max usable distance, or `Infinity` when unlimited. */
    get reach(): number;
    private _enabled;
    private _onPointer;
    /** The one place an activation is decided — pointer and `activate()` share it. */
    private _fire;
    private _emit;
    private _applyOutline;
    private _clearOutline;
}
/**
 * The nearest usable thing, for a "walk up and press E" control.
 *
 * Pointing at something is the ray interaction; this is the other one — the
 * `interact` button every controller already has (see `ControlInput`). It
 * considers only interactives that are enabled and inside their own reach of
 * `from`, and returns the closest, or `null` when nothing is in range.
 *
 * It deliberately does NOT consult vetoes: a locked door is still the thing you
 * are standing at, and activating it is how you learn it is locked.
 */
export declare function nearestInteractive(scene: BABYLON.Scene, from: BABYLON.Vector3): InteractiveBehavior | null;
/**
 * The nearest usable thing AND how far away it is.
 *
 * The distance is the whole reason this exists beside `nearestInteractive`:
 * the search computes it to pick a winner, and throwing it away left every
 * downstream reach veto reading a stale hover distance. `nearestInteractive`
 * keeps its shape for anyone already calling it.
 */
export declare function nearestTo(scene: BABYLON.Scene, from: BABYLON.Vector3): {
    it: InteractiveBehavior;
    distance: number;
} | null;
/**
 * Activate the nearest usable thing. Returns `true` if something fired.
 *
 * Wire it to `input.interact` and a scene full of doors becomes operable
 * without a single per-door key handler.
 */
export declare function useNearest(scene: BABYLON.Scene, from: BABYLON.Vector3): boolean;
//# sourceMappingURL=interactive-behavior.d.ts.map