import * as BABYLON from '@babylonjs/core';
import type { EntityId, WorldEntity } from './world-contract';
import type { WorldStore } from './world-store';
/** Builds the Babylon mesh that represents one entity. */
export type MeshFactory = (entity: WorldEntity, scene: BABYLON.Scene) => BABYLON.AbstractMesh;
/**
 * Default visuals: a capsule for player/npc, a box for everything else, tinted
 * by kind. No assets required, so any store is immediately visible.
 */
export declare const defaultMeshFactory: MeshFactory;
/**
 * Reconciles a Babylon scene to a `WorldStore`. Construction does an initial
 * sync and then reconciles every frame via `onBeforeRenderObservable`; call
 * `reconcile()` directly for headless/manual stepping.
 */
export declare class WorldView {
    private scene;
    private store;
    private meshes;
    private factory;
    private observer;
    constructor(scene: BABYLON.Scene, store: WorldStore, options?: {
        factory?: MeshFactory;
    });
    /** One-way sync: create missing meshes, move existing ones, dispose gone ones. */
    reconcile(): void;
    /** The mesh currently representing an entity, if any. */
    getMesh(id: EntityId): BABYLON.AbstractMesh | undefined;
    dispose(): void;
}
//# sourceMappingURL=world-view.d.ts.map