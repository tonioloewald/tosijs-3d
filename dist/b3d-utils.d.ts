import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d, FrameInfo } from './tosi-b3d.js';
export declare function findB3dOwner(el: HTMLElement): B3d | null;
/**
 * The element's SEMANTIC parent — its nearest ancestor that isn't a tosijs slot
 * wrapper. tosijs mounts a component's light-DOM children inside a `<tosi-slot>`, so
 * a child's `parentElement` is that slot, not the component you nested it in. Any
 * child that wants to find "the thing I'm nested in" (a radar in an aircraft, a
 * radar-blip in a target) must skip the slot(s).
 */
export declare function semanticParent(el: HTMLElement): HTMLElement | null;
export declare function actualMeshes(meshes: BABYLON.AbstractMesh[]): BABYLON.Mesh[];
/**
 * Is an on-by-default toggle in its OFF state? Use for feature flags that should
 * default ON: declare them as a string `'on' | 'off'` attribute defaulting `'on'`
 * (a boolean attribute can't default true — an absent boolean reads false; see the
 * b3d-trigger `disabled` note). `isOff` also accepts the boolean `false` / string
 * `'false'` a UI toggle may bind, so a `toggle3d` still disables it.
 */
export declare const isOff: (v: unknown) => boolean;
/**
 * A node name with the `.model` EXPORT marker removed — what every naming-
 * convention suffix check (`_collideMesh`, `_noshadow`, `_mirror`, `-ignore`,
 * …) runs against. `.model` declares a library export (see b3d-library) and
 * is ORTHOGONAL to behaviour suffixes: `Hull_collideMesh.model` both exports
 * AND gets its collider. Stripping it here makes that a stated guarantee
 * rather than an accident of `includes()`-based matching (clone names like
 * `scout.model_instance_0` are covered too).
 */
/**
 * THE frame delta for anything ticking inside a scene observer (seconds).
 *
 * Babylon's `engine.getDeltaTime()` measures the engine's rAF TICK, but scene
 * observers only fire when `scene.render()` runs — and `<tosi-b3d>` throttles
 * rendering to its `frameRate`. Trusting getDeltaTime there advances too
 * little time per frame: at frameRate 60 on a 120Hz display everything runs
 * at HALF speed, at the default 30 a QUARTER. B3d publishes the real
 * inter-render delta on `scene.metadata.b3dFrameDelta`; this reads it, with
 * the raw engine delta as a fallback for scenes B3d doesn't drive (tests,
 * standalone Babylon).
 */
export declare const sceneDelta: (scene: BABYLON.Scene) => number;
/**
 * The whole per-frame package for a scene, for code with no `owner` to ask.
 *
 * `sceneDelta` answers "how much time passed" and every caller then has to
 * work out the rest for itself — which clock, is it paused, how long has this
 * been going. This hands over all of it, so the right choice is the one
 * already in your hand.
 *
 * Falls back to a sane package for scenes `<tosi-b3d>` does not drive (tests,
 * standalone Babylon), where `dt` and `realDt` are simply the same number.
 */
export declare const sceneFrame: (scene: BABYLON.Scene) => FrameInfo;
export declare const conventionName: (name: string) => string;
/**
 * The name a CONSUMER uses: `conventionName` (drop `.model`) with the
 * behaviour suffixes stripped too, so `Hull_collideMesh.model` is publicly
 * `Hull`.
 *
 * The suffixes are annotations telling the engine what to DO with a node —
 * collider shape, shadow participation, the CoG marker — not part of what the
 * thing IS. Leaking them into `getNames()` makes a consumer type engine
 * plumbing they never chose (`instantiate('Hull_collideMesh')`), and it breaks
 * the moment an author adds or changes a collider. Repeats, so a node carrying
 * two annotations (`Hull_collideMesh_noshadow`) still resolves to `Hull`.
 */
/**
 * Is this node FILTERED OUT at load? The convention is written `-ignore` in the
 * docs and `_ignore` by the underscore rule every other suffix follows, so both
 * are accepted — one matcher, used by the loader, the library and `publicName`.
 *
 * They used to disagree: the loader disposed only the hyphen form while
 * `publicName` stripped only the underscore one, so `Foo_ignore` survived the
 * load AND collapsed to `Foo` — colliding with a real `Foo`, which made
 * `instantiate('Foo')` resolve to whichever came first.
 */
export declare const isIgnored: (name: string) => boolean;
export declare const publicName: (name: string) => string;
/** What a controllable needs to know from its owner to decide whether to run. */
export interface SimGateOwner {
    paused?: boolean;
    frozen?: boolean;
    inputSuppressed?: boolean;
    hasInputFocus?: boolean;
}
/**
 * Is the SIMULATION stopped for this owner? Then a controllable must **halt**,
 * not merely read empty input.
 *
 * The distinction has cost us twice. A controllable's clock is `Date.now`-based,
 * so a stopped scene does not slow it down, and an aircraft fed empty input
 * COASTS — indistinguishable from cruising ("I can background the tab, come back
 * and the game is continuing to run, I just can't steer", #30). `freeze()` then
 * repeated the mistake in miniature: it stopped everything on `sceneDelta`
 * (terrain, water, projectiles) while the piloted aircraft flew on, so raising
 * the re-seat prompt in flight could fly you into the ground while the modal was
 * up.
 *
 * Pure and exported so BOTH gates live in one place and a third state added
 * later lands in both. This is the predicate `B3dControllable._update` halts on.
 */
export declare function simHalted(owner: SimGateOwner | null | undefined): boolean;
/**
 * Should this controllable READ its input this frame? False also when input is
 * modally suppressed (a dialog borrowing a control you also play with) or when
 * another demo on the page holds scene focus.
 *
 * Distinct from `simHalted`: halted means "do not advance at all", not-live
 * means "advance, but with neutral input" — which is right for an unfocused
 * demo that should idle rather than freeze.
 */
export declare function controlsLive(owner: SimGateOwner | null | undefined): boolean;
/**
 * Mark a mesh as **UI**: pickable by pointers, invisible to COLLISION.
 *
 * These are different questions and we had only one answer for both. A spatial
 * panel MUST stay `isPickable` — that is how a controller ray, a gaze cursor or
 * a mouse targets it — and `isPickable` was also the only thing collision
 * predicates could filter on. So the aircraft's impact sweep, which crashes on
 * ANY hit above `crashSpeed`, treated the settings panel floating in front of
 * your face as terrain.
 *
 * That is the phantom collision (Tonio, VR pass 2 — `crashReport` named it:
 * `hit=frame-panel`). It only bit in cockpit view because that is where the
 * camera — and the panels riding its reference frames — sit close enough to the
 * airframe to fall inside a ~2m sweep, and it fired on BANK because banking
 * swings the velocity vector into the panel. Nothing to do with terrain, which
 * is why it reproduced in scenes that have none.
 *
 * The first of the collision GROUPS described in `COLLISION-DESIGN.md`. Written
 * on metadata rather than a name suffix because UI planes are built by us, not
 * authored in Blender.
 */
export declare function markUiMesh(mesh: BABYLON.AbstractMesh): void;
/**
 * Should a collision probe ignore this mesh? True for UI (see `markUiMesh`).
 *
 * Prefer `collidable()` over calling this directly — a rule every call site has
 * to remember is a rule that gets forgotten, which is exactly what happened.
 */
export declare function isNoCollide(mesh: BABYLON.AbstractMesh): boolean;
/**
 * THE collision predicate. Everything physical picks through this.
 *
 * Excludes UI **by default** — you opt IN to hitting it, never out. That
 * polarity is the whole point: `isNoCollide` shipped as an opt-out clause each
 * predicate had to remember, and within one release two of the four sites had
 * forgotten it, so a world-anchored panel stopped shells and acted as blast
 * cover. See `COLLISION-DESIGN.md` → "Default groups".
 *
 * It also re-checks `isPickable`/`isEnabled` centrally, because **passing a
 * predicate to `pickWithRay` makes Babylon skip its own filter** — the trap that
 * once had an aircraft pick a cloud blob as ground. Note that `isPickable` is
 * not the same as *visible*: a gaze-revealed panel hides with `visibility = 0`
 * and stays pickable, so without the UI exclusion an unrevealed panel is an
 * invisible bullet shield.
 *
 * `reject` is for the caller's OWN business — self-exclusion, `__root__`, water
 * for a submersible — never for the shared rules above.
 */
export declare function collidable(reject?: (m: BABYLON.AbstractMesh) => boolean, opts?: {
    ignoreGroups?: readonly string[];
}): (m: BABYLON.AbstractMesh) => boolean;
/**
 * Tag a mesh as belonging to one or more collision GROUPS.
 *
 * The single `b3dNoCollide` boolean answers "does anything hit this", which is
 * one answer for every asker — and a sea needs two. tosijs-3d-ensemble put it
 * exactly: *"the aircraft should not treat water as ground" and "shells should
 * splash on water" are the same switch*, so a flying submarine had to choose
 * between crashing on the surface and having ordnance that passes through it
 * invisibly (#44). Their workaround was clearing `isPickable` on the sea, which
 * buys the first and loses the second for every consumer of the predicate.
 *
 * Groups move the answer to the ASKER. The mesh says what it is; each mover
 * says what it treats as solid:
 *
 * ```js
 * markCollisionGroup(waterMesh, 'water')
 *
 * // an aircraft that must not land on the sea
 * scene.pickWithRay(ray, collidable(skip, { ignoreGroups: ['water'] }))
 * // a shell that must splash on it — unchanged, so it still hits
 * scene.pickWithRay(ray, collidable(skip))
 * ```
 *
 * Additive, and it has to be: a mesh can be several things at once (a hull is
 * `vehicle` and, to a torpedo, a `target`), and a scene with a seaplane and a
 * submarine in it needs one sea to give two answers on the same frame. No
 * per-element attribute can do that, which is why this is per-QUERY.
 */
export declare function markCollisionGroup(mesh: BABYLON.AbstractMesh, ...groups: string[]): void;
/** The groups a mesh has been tagged with. Empty when it has none. */
export declare function collisionGroups(mesh: BABYLON.AbstractMesh): readonly string[];
/** Is this mesh in ANY of `groups`? */
export declare function inCollisionGroup(mesh: BABYLON.AbstractMesh, groups: readonly string[]): boolean;
/**
 * Vertical gap, in world units, between a node's origin and the bottom of its
 * geometry. Handy as a ground clearance so a model rests on a surface instead
 * of its origin sinking into it (origins are rarely at the model's feet).
 */
export declare function boundingBottomOffset(node: BABYLON.TransformNode): number;
/**
 * Place `node` so the bottom of its geometry rests on a surface, leaving a
 * small `separation` gap. `surface` is either a world Y height (default 0, the
 * ground plane) or a mesh to sit on top of (uses the top of its bounding box).
 * Works regardless of where the model's origin sits within its mesh.
 */
export declare function placeOnSurface(node: BABYLON.TransformNode, surface?: number | BABYLON.AbstractMesh, separation?: number): void;
export type AsyncVoidFunction = () => Promise<void>;
export type XRParams = {
    cameraName?: string;
    mode?: XRSessionMode;
};
export type XRStuff = {
    camera: BABYLON.FreeCamera;
    xr: BABYLON.WebXRDefaultExperience;
    exitXR: AsyncVoidFunction;
};
export declare function enterXR(scene: BABYLON.Scene, options?: XRParams): Promise<XRStuff>;
/**
 * Dispose a mesh AND the materials/textures nothing else is still using.
 *
 * `mesh.dispose()` leaves its material behind — Babylon's
 * `disposeMaterialAndTextures` defaults to false — so a child that builds its
 * own material leaks it on every teardown. That includes every RE-PARENT,
 * because a move disconnects and reconnects the child while `B3d` deliberately
 * keeps the scene alive: the mesh goes, a fresh material is built, and the old
 * one stays in `scene.materials` for the life of the page.
 *
 * Measured, not theorised. Re-parenting one `<tosi-b3d>` holding a skybox and
 * water six times, with the scene surviving each move as designed:
 *
 * ```
 *   meshes     2   2   2   2   2   2   2      correctly disposed
 *   materials  3   5   7   9  11  13  15      +2 every move
 *   textures   3   6   9  12  15  18  21      +3 every move
 * ```
 *
 * That is also the diagnostic `tosijs-3d-ensemble` reported against #56 —
 * `gl.isProgram(program) === false` while every uniform reads correct — and the
 * attribution matters: it is an ORPHANED material holding a dead program, not
 * the live one, so that signature is not by itself evidence of a second WebGL
 * context.
 *
 * ## Why it checks rather than just disposing
 *
 * A glTF file routinely shares one material across many meshes, so disposing a
 * material because THIS mesh referenced it would leave its siblings black —
 * silently, since a disposed material still answers `isReady()`. So a material
 * goes only when no mesh left in the scene refers to it, and a texture only
 * when no material left refers to it.
 *
 * Textures get three extra exemptions, each of which is a thing that holds a
 * texture without any material mentioning it: the scene's environment texture,
 * anything in `customRenderTargets` (water's reflection/refraction), and a
 * light's `projectionTexture` (a lamp's gel).
 */
export declare function disposeMeshTree(mesh: BABYLON.AbstractMesh): void;
/**
 * Apply material conventions based on PBR material properties.
 *
 * Reads actual material data (alpha, metallic, etc.) rather than relying
 * on name suffixes for appearance. Near-opaque alpha is snapped to 1.0
 * to avoid unnecessary blend cost. Translucent materials get depth
 * pre-pass and shadow exclusion automatically.
 */
export declare function applyMaterialConventions(meshes: BABYLON.AbstractMesh[]): void;
/**
 * Base for every element that lives INSIDE a `<tosi-b3d>` scene. The whole
 * pull-model lifecycle lives here, in ONE place. On connect (by which point tosijs
 * has drained this element's attributes), the child finds its b3d owner and asks to
 * insert itself once the scene is ready: `owner.whenReady(cb)` runs `cb` now if the
 * scene is already up, else when it becomes ready. b3d never *pushes* `sceneReady`
 * at a guessed time — so a child's `sceneReady` only ever runs when the child is
 * genuinely ready AND the scene is ready. On disconnect it removes itself.
 *
 * Subclasses override `sceneReady(owner, scene)` (build/insert into the scene) and
 * `sceneDispose()` (tear down + release). They should NOT touch
 * connected/disconnectedCallback — that plumbing is centralized here so a lifecycle
 * fix lands in exactly one spot.
 */
export declare class B3dChild extends Component {
    owner: B3d | null;
    connectedCallback(): void;
    disconnectedCallback(): void;
    sceneReady(_owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
/**
 * Build a programmatic XYZ axis gizmo (no asset) for reference/debugging: a medium
 * grey origin ball, and an R/G/B shaft-plus-arrowhead for +X/+Y/+Z. All materials
 * are emissive + unlit ("glow, not lit"), so a scene glow layer makes them bloom.
 * Returned as one `TransformNode` — parent it to any node to pin axes on it, or
 * flip the `axes` attribute on any AbstractMesh geometry (b3dBox/b3dSphere/…).
 */
export declare function buildAxes(scene: BABYLON.Scene): BABYLON.TransformNode;
export declare class AbstractMesh extends B3dChild {
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    mesh?: BABYLON.Mesh;
    protected loadGeneration: number;
    private _axesNode?;
    get roll(): number;
    set roll(v: number);
    get pitch(): number;
    set pitch(v: number);
    get yaw(): number;
    set yaw(v: number);
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /** Attach/detach the debug axis gizmo to track the `axes` attribute. */
    private _updateAxes;
    private _setHostVisibility;
    /**
     * Load a glTF/glb into an AssetContainer, with race-safe gen tracking.
     * The onLoaded callback is only invoked if the component hasn't been
     * disposed or had a newer load supersede it. Subclasses use this from
     * their sceneReady to safely resolve async asset loads.
     */
    protected loadAssetContainer(scene: BABYLON.Scene, url: string, onLoaded: (container: BABYLON.AssetContainer) => void): void;
    render(): void;
}
/**
 * Is this camera actually listening to the canvas right now?
 *
 * Ground truth from Babylon's own input manager rather than a flag we keep,
 * because several components attach or detach a camera directly instead of
 * going through `setActiveCamera` (b3d-galaxy, b3d-svg-plane, the XR restore)
 * — a remembered flag goes stale behind them.
 *
 * Written defensively (optional chaining all the way down) because it is used
 * on the RESUME path: guessing "attached" wrongly hands the canvas to a camera
 * that was deliberately never given it, and guessing "not attached" wrongly
 * only costs the user a click.
 */
export declare const cameraIsAttached: (cam: {
    inputs?: {
        attachedToElement?: boolean;
    };
} | null | undefined) => boolean;
//# sourceMappingURL=b3d-utils.d.ts.map