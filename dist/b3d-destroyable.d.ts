import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import type { CombatEvent, ChainLink } from './destroyable';
import { type Prefab } from './prefab';
export declare class B3dDestroyable extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        size: number;
        color: string;
        capacity: number;
        armor: number;
        regenRate: number;
        regenDelay: number;
        protectedBy: string;
        protection: number;
        remains: string;
        sound: string;
        soundVolume: number;
        explode: string;
        explodeForce: number;
        deathBlast: string;
        blastDamage: number;
        blastFullRadius: number;
        blastRadius: number;
        blastDelay: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    meshName: string;
    size: number;
    color: string;
    capacity: number;
    armor: number;
    regenRate: number;
    regenDelay: number;
    protectedBy: string;
    protection: number;
    explode: string;
    explodeForce: number;
    deathBlast: string;
    blastDamage: number;
    blastFullRadius: number;
    blastRadius: number;
    blastDelay: number;
    /**
     * On-destruction direct-transfer chain links (set in code; see destroyable.ts).
     * Distinct from `deathBlast`, which is an AOE explosion. Mirrored to the behavior.
     */
    chain: ChainLink[];
    private _behavior?;
    private _onShift?;
    /**
     * Optional code-set hook, run once when this target is destroyed (before the
     * visual outcome). The clean seam for putting a linked player/vehicle into a
     * 'dead' state, spawning loot/wreckage, swapping a model, etc. Also rides the
     * bubbling `destroyed` CustomEvent.
     */
    whenDestroyed?: (info: {
        id: string;
        position: BABYLON.Vector3;
    }) => void;
    /** A prefab FUNCTION, when a name won't do (a closure over game state). Takes precedence
     * over the `remains` attribute. Not `onRemains` — an `on*` prop would be bound as a DOM
     * event listener and never fire (see CLAUDE.md). */
    remainsPrefab: Prefab | null;
    /** Spawn `remains` (+ the death `sound`) at the death pose. Both optional; a destroyable
     * with neither just vanishes, as before. */
    private _leaveRemains;
    /** This entity's id in the scene combat world (also its mesh name). */
    get combatId(): string;
    /** True once destroyed (mesh gone / exploding). Lets others skip dead targets. */
    get dead(): boolean;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Hurt this target; returns the combat events from this hit (flashes on a hit). */
    damage(amount: number): CombatEvent[];
    /**
     * Set on-destruction chain links AFTER mount — chains reference other targets'
     * combat ids, which only exist once those elements have mounted.
     */
    setChain(links: ChainLink[]): void;
    sceneDispose(): void;
}
export declare const b3dDestroyable: import("tosijs").ElementCreator<B3dDestroyable>;
//# sourceMappingURL=b3d-destroyable.d.ts.map