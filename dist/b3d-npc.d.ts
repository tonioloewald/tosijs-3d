import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dNpc extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        target: string;
        skill: number;
        sightRange: number;
        sightDeg: number;
        nearRange: number;
        stealth: number;
        hearing: number;
        wanderRadius: number;
        memory: number;
        attackRange: number;
        attackDamage: number;
        attackCooldown: number;
        attackState: string;
        walkPace: number;
        runPace: number;
        seed: number;
    };
    target: string;
    skill: number;
    sightRange: number;
    sightDeg: number;
    nearRange: number;
    stealth: number;
    hearing: number;
    wanderRadius: number;
    memory: number;
    attackRange: number;
    attackDamage: number;
    attackCooldown: number;
    attackState: string;
    walkPace: number;
    runPace: number;
    seed: number;
    /** A route it walks in a loop (world x/z points), in place of standing guard. */
    patrol: Array<{
        x: number;
        z: number;
    }> | null;
    private _body;
    private _brain;
    private _intent;
    private _visible;
    private _lookIn;
    private _heardTo;
    private _blow;
    private _onHurt;
    /** What it is doing, for a readout. */
    get debugState(): {
        mode: import("./npc-brain.js").NpcMode;
        alertness: number;
        sees: boolean;
        senses: boolean;
        heard: boolean;
    };
    sceneReady(owner: B3d): void;
    sceneDispose(): void;
    /** The target: the player biped, while there is one. */
    private _target;
    private _poll;
    /** A clear line from its chest to the target's: nothing solid in between. */
    private _clearLine;
    /** Play the attack; when the blow lands, hurt the target if it is still in reach and in front. */
    private _strike;
}
export declare const b3dNpc: import("tosijs").ElementCreator<B3dNpc>;
//# sourceMappingURL=b3d-npc.d.ts.map