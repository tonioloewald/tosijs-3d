import { B3dChild } from './b3d-utils.js';
import { type Prefab } from './prefab.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dSpawner extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        prefab: string;
        maxAlive: number;
        interval: number;
        minDistance: number;
        maxDistance: number;
        /**
         * Where a group appears: on a ring around the PLAYER, or at an authored
         * PLACE (`x`/`y`/`z` + `facingDeg`).
         *
         * Default `'player'`, so nothing existing changes. The two are mutually
         * exclusive by construction rather than by warning — in `'place'` mode the
         * distances are simply not read.
         *
         * The gap this closes, from tosijs-3d-ensemble (#40): their format has a
         * `launchpad` capability — *craft launch from THIS pad on this rig* — which
         * is a fact about a place in the arrangement. A spawner that can only say
         * "somewhere near the player" cannot express a carrier deck, a hangar door
         * or a dungeon entrance, so the capability was registered `editorOnly`:
         * authorable, and honestly marked as something the runtime would not build.
         */
        anchor: "player" | "place";
        x: number;
        y: number;
        z: number;
        /** Facing for a placed spawn, in DEGREES about Y. Ignored when player-anchored. */
        facingDeg: number;
        seed: number;
        disabled: boolean;
    };
    prefab: string;
    maxAlive: number;
    interval: number;
    minDistance: number;
    maxDistance: number;
    anchor: 'player' | 'place';
    x: number;
    y: number;
    z: number;
    facingDeg: number;
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