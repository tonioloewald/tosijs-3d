import type { B3d } from './tosi-b3d';
/** Plain vector — matches the pure modules; no Babylon in this file. */
export type PrefabVec3 = {
    x: number;
    y: number;
    z: number;
};
/** Where and how the thing happened. */
export type PrefabContext = {
    /** The scene to spawn into. */
    owner: B3d;
    /** World position of the event (a death, a spawn point). */
    position: PrefabVec3;
    /** Orientation of what died/spawned, as euler degrees — the library's own convention. */
    rotation?: PrefabVec3;
    /** Velocity of what died. Debris that ignores this drops like a stone and looks wrong. */
    velocity?: PrefabVec3;
    /** The element that died or spawned this, if any. */
    source?: Element | null;
    /** Faction of the source, for prefabs that care (whose wreck is this?). */
    faction?: string;
};
/** Returns the elements to add to the scene. Returning nothing is fine (pure side-effect). */
export type Prefab = (ctx: PrefabContext) => Element | Element[] | null | void;
/**
 * Register a prefab under a name. Names are how a prefab survives being written in an
 * attribute, saved in a level, or requested by a driver across a worker boundary.
 * Re-registering a name replaces it (hot-reload friendly).
 */
export declare function definePrefab(name: string, prefab: Prefab): void;
/** Look up a prefab by name. */
export declare function getPrefab(name: string): Prefab | null;
/** Every registered name (for editors, debug panels, a driver's vocabulary). */
export declare function prefabNames(): string[];
/**
 * Instantiate a prefab (by name or directly) and add whatever it produces to the scene.
 * Returns the elements added — so a caller that wants to clear them later (a wreck that
 * burns only until you respawn) can keep the handle.
 *
 * An unknown NAME is a no-op with a warning rather than a throw: a missing bit of set
 * dressing must never take the game down mid-fight.
 */
export declare function spawnPrefab(nameOrPrefab: string | Prefab | null | undefined, ctx: PrefabContext): Element[];
//# sourceMappingURL=prefab.d.ts.map