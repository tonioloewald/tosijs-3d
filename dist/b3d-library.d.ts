import { B3dChild } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
/**
 * The `.model` naming convention, pure (unit-tested): a node named
 * `<name>.model` declares itself an INTENDED EXPORT of the library file.
 *
 * A working Blender file is full of things that are not deliverables —
 * collections, rig helpers, boolean cutters, reference geometry — and a
 * library that lists everything makes the consumer (and the library demo)
 * wade through construction junk. Appending `.model` to the things you MEAN
 * to publish makes the export list an authoring decision:
 *
 * - when a file declares ANY `.model` nodes, only those are listed — under
 *   their clean names (`scout.model` lists as `scout`);
 * - a file with none keeps the legacy behaviour (everything listed) so
 *   existing content doesn't go dark;
 * - `instantiate('scout')` resolves to `scout.model` (exact match wins).
 */
export declare function modelExportNames(names: string[]): string[];
/** Resolve a requested name against the `.model` convention: exact match
 * first, then `<name>.model`. Returns the node name to look up. */
export declare function resolveModelName(names: string[], requested: string): string;
/**
 * Retarget a container's AnimationGroups onto a CLONED subtree.
 *
 * `node.clone()` copies the hierarchy but NOT the animation groups — those
 * live on the AssetContainer, targeting the ORIGINAL nodes, so a library-
 * instantiated model's animations play silently against meshes nobody can
 * see. This walks the source and clone trees in parallel (clone preserves
 * child order and names), builds the source→clone map, and clones every
 * group whose targets ALL live inside the subtree — the scout's "Cockpit
 * Open" travels with a scout instance; the scene's ambient animations don't.
 *
 * Exported for reuse (and tested against the real test-3.glb).
 */
export declare function cloneNodeAnimations(container: BABYLON.AssetContainer, source: BABYLON.Node, clone: BABYLON.Node, instanceName: string): BABYLON.AnimationGroup[];
export interface InstantiateOptions {
    /** Clone the model's AnimationGroups onto the instance (default true).
     * The clones land on `instance.metadata.animationGroups` — e.g.
     * `node.metadata.animationGroups.find(g => g.name.startsWith('Cockpit'))
     * .start()`. Disposed with the instance by `clearInstances`. */
    animations?: boolean;
    x?: number;
    y?: number;
    z?: number;
    rx?: number;
    ry?: number;
    rz?: number;
    parent?: BABYLON.Node;
    /** Collapse the model's frame: bake its SCALE into the geometry so the returned
     * node has unit scale (its orientation — the nose direction — is preserved).
     * Vehicles want this: a clean unit-scale control node means forward/up come out
     * unit and the camera can parent to the hull without per-use scale fixes. */
    canonical?: boolean;
}
export declare class B3dLibrary extends B3dChild {
    static initAttributes: {
        url: string;
        type: string;
    };
    owner: B3d | null;
    private container;
    private instances;
    private _readyResolve;
    ready: Promise<void>;
    private loadGeneration;
    constructor();
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Every node (meshes AND transform nodes — a multi-part model's top node is
     * usually a TransformNode) eligible for listing. */
    private _allNodes;
    getNames(): string[];
    getRootNames(): string[];
    getHierarchy(): {
        name: string;
        children: any[];
        isMesh: boolean;
    }[];
    clearInstances(): void;
    instantiate(name: string, options?: InstantiateOptions): BABYLON.Node | null;
    sceneDispose(): void;
}
export declare const b3dLibrary: import("tosijs").ElementCreator<B3dLibrary>;
//# sourceMappingURL=b3d-library.d.ts.map