import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { B3dChild } from './b3d-utils';
import type { CombatEvent, ChainLink } from './destroyable';
export declare class B3dLoader extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        url: string;
        lightIntensityScale: number;
        destroyable: string;
        capacity: number;
        armor: number;
        regenRate: number;
        regenDelay: number;
        explode: string;
        explodeForce: number;
        deathBlast: string;
        blastDamage: number;
        blastFullRadius: number;
        blastRadius: number;
        blastDelay: number;
    };
    owner: B3d | null;
    meshes?: BABYLON.AbstractMesh[];
    lights?: BABYLON.Light[];
    private _behavior?;
    /** Set in code to react to this model's destruction (see destroyable-behavior). */
    whenDestroyed?: (info: {
        id: string;
        position: BABYLON.Vector3;
    }) => void;
    /** Combat id when `destroyable` is on ('' otherwise). */
    get combatId(): string;
    /** True once a destroyable model has died. */
    get dead(): boolean;
    /** Damage this model (no-op unless `destroyable` is on). */
    damage(amount: number): CombatEvent[];
    /** Set on-destruction direct-transfer chain links (see destroyable.ts). */
    setChain(links: ChainLink[]): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private _attachDestroyable;
    sceneDispose(): void;
}
export declare const b3dLoader: import("tosijs").ElementCreator<B3dLoader>;
//# sourceMappingURL=b3d-loader.d.ts.map