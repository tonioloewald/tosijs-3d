import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import type { DestroyableSpec, ChainLink, CombatEvent, Cause } from './destroyable.js';
export interface DeathOutcome {
    /** Shatter the host mesh into fragments on death. */
    explode?: boolean;
    /** Outward fragment force when exploding (default 6). */
    explodeForce?: number;
    /** Detonate an AOE warhead at the death point (the chain-reaction mechanism). */
    deathBlast?: boolean;
    blastDamage?: number;
    blastFullRadius?: number;
    blastRadius?: number;
    /** Seconds after death before the blast fires (default 0.1 = 100 ms). */
    blastDelay?: number;
    /**
     * What to do with the mesh visually. `'dispose'` (default) frees it; `'hide'`
     * disables it (a host that swaps in a wreck model in `whenDestroyed` wants `'hide'` or
     * `'keep'` so it can manage the mesh itself). Ignored when `explode` fires.
     */
    meshOnDeath?: 'dispose' | 'hide' | 'keep';
}
export interface DestroyableHost {
    /**
     * Mesh to flash / explode / locate the death blast (may gain one after attach).
     * For a multi-mesh GLB this is the root — flash covers all children; `explode`
     * needs real geometry, so it suits single-mesh targets (multi-mesh → `dispose`).
     */
    readonly mesh?: BABYLON.AbstractMesh | BABYLON.TransformNode;
    /** Dispatch the bubbling `destroyed` event (usually the host Component). */
    dispatchEvent(ev: Event): boolean;
}
/** Every live destroyable in this scene, with the node that stands for it. */
export declare function liveDestroyables(scene: BABYLON.Scene): Array<{
    behavior: DestroyableBehavior;
    mesh: BABYLON.AbstractMesh;
}>;
/**
 * The destroyable a picked mesh belongs to — by ANCESTRY, not by identity.
 *
 * A library model instantiates asynchronously beneath a root, so a shell hits a
 * WING and the registered node is the root three levels up. Matching on the
 * picked mesh alone found nothing and every shot missed, silently — which is
 * the trap manta-recon spent a debugging cycle on (#23).
 *
 * Walks up rather than snapshotting the descendants, because the descendants
 * arrive late: a registry built when the target registered itself captures an
 * empty root and never notices the model landing in it.
 */
export declare function destroyableAt(mesh: BABYLON.AbstractMesh | null | undefined): DestroyableBehavior | null;
export declare class DestroyableBehavior {
    private owner;
    readonly host: DestroyableHost;
    private spec;
    private death;
    /** This entity's id in the scene combat world (also its combat mesh name). */
    readonly combatId: string;
    /** On-destruction direct-transfer chain links (see destroyable.ts). */
    chain: ChainLink[];
    /** Code hook run once on death, before the visual outcome. */
    whenDestroyed?: (info: {
        id: string;
        position: BABYLON.Vector3;
        /** Who killed it and through what chain — see [[destroyable|Cause]]. */
        cause?: Cause;
    }) => void;
    private _dead;
    private _obs?;
    private _capacity;
    constructor(owner: B3d, host: DestroyableHost, spec: DestroyableSpec & {
        idBase?: string;
    }, death?: DeathOutcome);
    /** Register in the combat world and start watching for destruction. */
    attach(): void;
    /** True once destroyed (mesh gone/exploding). Lets others skip dead targets. */
    get dead(): boolean;
    /** Hurt this target; returns the combat events from this hit (flashes + shows the
     * accumulated-damage glow so you can read how close it is to dying). */
    damage(amount: number, cause?: Cause): CombatEvent[];
    /** Set on-destruction chain links AFTER attach (they reference other combat ids). */
    setChain(links: ChainLink[]): void;
    dispose(): void;
    private _flash;
    private _die;
}
//# sourceMappingURL=destroyable-behavior.d.ts.map