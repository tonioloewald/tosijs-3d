import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
import type { CombatEvent, ChainLink } from './destroyable';
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
    /** On-destruction chain links (set in code; see destroyable.ts). */
    chain: ChainLink[];
    /** This entity's id in the scene combat world (also its mesh name). */
    combatId: string;
    private _dead;
    private _obs?;
    private _onShift?;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Hurt this target; returns the combat events from this hit. */
    damage(amount: number): CombatEvent[];
    private _die;
    sceneDispose(): void;
}
export declare const b3dDestroyable: import("tosijs").ElementCreator<B3dDestroyable>;
//# sourceMappingURL=b3d-destroyable.d.ts.map