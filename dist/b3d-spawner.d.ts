import { B3dChild } from './b3d-utils';
import { type Prefab } from './prefab';
import type { B3d } from './tosi-b3d';
export declare class B3dSpawner extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        prefab: string;
        maxAlive: number;
        interval: number;
        minDistance: number;
        maxDistance: number;
        y: number;
        seed: number;
        disabled: boolean;
    };
    prefab: string;
    maxAlive: number;
    interval: number;
    minDistance: number;
    maxDistance: number;
    y: number;
    seed: number;
    disabled: boolean;
    /** A prefab FUNCTION instead of a name (a closure over game state). Not `onSpawn` — an
     * `on*` prop would be bound as a DOM event listener and never fire. */
    prefabFn: Prefab | null;
    /** Live groups (a group is one spawned encounter). */
    get alive(): number;
    private _groups;
    private _rng;
    private _since;
    private _tick;
    sceneReady(owner: B3d): void;
    sceneDispose(): void;
    private _update;
    /** Drop groups whose every member is gone or dead. The slot frees, and the next group can
     * come. A group with ONE survivor is still a group — you haven't cleared it yet. */
    private _prune;
    /** Spawn one group now, wherever the rules say. Public so a driver (or a demo) can force
     * one without waiting for the interval. */
    spawnOne(): Element[];
    private _playerPosition;
}
export declare const b3dSpawner: (...args: unknown[]) => B3dSpawner;
//# sourceMappingURL=b3d-spawner.d.ts.map