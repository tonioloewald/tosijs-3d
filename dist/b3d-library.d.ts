import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import { type LibraryManifest } from './glb-manifest.js';
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
    /**
     * Rotation in DEGREES — matching `AbstractMesh`'s rx/ry/rz and `make-mesh`'s.
     *
     * ⚠️ These were RADIANS until 0.7.0, which made the library the only surface
     * in the framework that disagreed. That is precisely the kind of divergence
     * nobody catches by reading: a bare number is valid in either unit, so a
     * value meant as degrees just silently produces some other orientation. It
     * got past me in this repo's own collision demo (`ry: 140`, intended as
     * degrees, actually 140 radians).
     */
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
    static preferredTagName: string;
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
    /**
     * **The library's own catalogue**, or `null` if the glb does not carry one.
     *
     * Built from `metadata.gltf.extras` on the loaded nodes, which Babylon's
     * `ExtrasAsMetadata` extension populates for free. Note it does NOT come from
     * `scenes[0].extras.library`, even though the pipeline writes a fuller index
     * there: Babylon surfaces extras for nodes, cameras, materials and animations
     * and drops them for SCENES. Verified by loading a real library headlessly —
     * every item node arrives with its extras, and nothing anywhere carries the
     * scene block. (three.js does hand that one back as `gltf.scene.userData`,
     * so it is not dead weight upstream, just invisible here.)
     */
    getManifest(): LibraryManifest | null;
    /**
     * What the library says about ONE item — `{category, tags, clips, size}` —
     * without instantiating it.
     *
     * `clips` is the point: it answers "what animations does this model have"
     * before anything is placed, which is what a clip picker in a property panel
     * needs and what `instance.metadata.animationGroups` cannot provide (it
     * requires an instance to exist first).
     */
    getInfo(name: string): Record<string, any> | null;
    /**
     * Public names of the things an author may ask for.
     *
     * **A declared catalogue wins.** When the glb's nodes carry library extras,
     * those items ARE the export list — the data-driven twin of the `.model`
     * naming convention, and it narrows for the same reason. Without it a packed
     * kit over-reports: measured on `pirate-kit.glb`, 80 names for 72 declared
     * items, the extras being a stray Blender `Group` plus sub-parts (a chest's
     * `lid`, a ship's `sail-a`, `paddles`). Those are real subsystem targets and
     * useless as palette entries — an author offered "lid" has been shown an
     * implementation detail.
     *
     * `getRootNames()`/`getHierarchy()` still expose everything, so the sub-part
     * cases keep working. Reported by the ensemble pipeline as #45.
     */
    getNames(): string[];
    getRootNames(): string[];
    getHierarchy(): {
        name: string;
        label: string;
        children: any[];
        isMesh: boolean;
    }[];
    clearInstances(): void;
    /**
     * The library's contents as CALLABLE NAMES: `lib.make.scout({ y: 1 })`
     * instead of `lib.instantiate('scout', { y: 1 })`.
     *
     * Same call, minus the quotes — which matters more than it looks. A string
     * argument is invisible to the editor: no completion, no go-to-definition,
     * and a typo is a runtime `console.error` rather than something you notice
     * while typing. A property access at least reads like the thing it makes.
     *
     * Deliberately a SUB-OBJECT rather than methods on the element itself. This
     * is an HTMLElement, and a GLB is free to contain a node called `title`,
     * `id`, `children` or `remove` — putting arbitrary content names in that
     * namespace means a model can silently shadow the DOM.
     *
     * It is `make` and not `parts` because `parts` is tosijs's own part registry
     * (`this.parts.canvas`) — the first cut used it and the compiler caught the
     * clash, which is the same class of collision one level up.
     *
     * Unknown names behave exactly as `instantiate` does: log and return null,
     * never throw. A missing prop is a content problem, and taking the scene down
     * over it helps nobody.
     *
     * Mirrors `svgIcons.<name>()` and `<tosi-b3d>`'s own `el.make.box()`, so the
     * codebase has ONE idea of what a name-keyed factory looks like — and the
     * same option vocabulary (`x/y/z`, `rx/ry/rz` in degrees) whether the thing
     * you are making is a primitive or a model.
     */
    get make(): Record<string, (options?: InstantiateOptions) => BABYLON.Node | null>;
    instantiate(name: string, options?: InstantiateOptions): BABYLON.Node | null;
    sceneDispose(): void;
}
export declare const b3dLibrary: import("tosijs").ElementCreator<B3dLibrary>;
//# sourceMappingURL=b3d-library.d.ts.map