import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
const DEG_TO_RAD = Math.PI / 180;
export function findB3dOwner(el) {
    let node = el.parentElement;
    while (node != null) {
        if ('scene' in node &&
            'register' in node &&
            typeof node.register === 'function') {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}
/**
 * The element's SEMANTIC parent — its nearest ancestor that isn't a tosijs slot
 * wrapper. tosijs mounts a component's light-DOM children inside a `<tosi-slot>`, so
 * a child's `parentElement` is that slot, not the component you nested it in. Any
 * child that wants to find "the thing I'm nested in" (a radar in an aircraft, a
 * radar-blip in a target) must skip the slot(s).
 */
export function semanticParent(el) {
    let node = el.parentElement;
    while (node != null && node.tagName === 'TOSI-SLOT') {
        node = node.parentElement;
    }
    return node;
}
export function actualMeshes(meshes) {
    return meshes.filter((mesh) => mesh.geometry != null);
}
/**
 * Is an on-by-default toggle in its OFF state? Use for feature flags that should
 * default ON: declare them as a string `'on' | 'off'` attribute defaulting `'on'`
 * (a boolean attribute can't default true — an absent boolean reads false; see the
 * b3d-trigger `disabled` note). `isOff` also accepts the boolean `false` / string
 * `'false'` a UI toggle may bind, so a `toggle3d` still disables it.
 */
export const isOff = (v) => v === 'off' || v === false || v === 'false';
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
export const sceneDelta = (scene) => {
    const published = scene.metadata?.b3dFrameDelta;
    // `>= 0`, not `> 0`: a published ZERO is <tosi-b3d> saying TIME IS STOPPED,
    // and it has to be honoured or every simulation on the render observable keeps
    // advancing through a pause. The engine-delta fallback is for scenes that
    // never publish at all, not for a scene that published a deliberate zero.
    // (tosijs-3d#30 — paused, the world ran on at full speed and only the stick
    // stopped working: 66m of travel over a 3-second pause.)
    if (typeof published === 'number' && published >= 0)
        return published;
    return Math.min(0.1, (scene.getEngine().getDeltaTime() || 16) / 1000);
};
export const conventionName = (name) => name.split('.model').join('');
/**
 * The BEHAVIOUR suffixes, longest-first so `_collideMesh` is matched before
 * `_collide`. Lower-case; matching is case-insensitive.
 */
const BEHAVIOUR_SUFFIXES = [
    // hyphen forms too: the framework documents `-ignore`, and authors mix
    // separators (the collision code already matches both).
    'centerofgravity',
    'center_of_gravity',
    'collidemesh',
    'collide_mesh',
    'collidesphere',
    'collide_sphere',
    'collidecylinder',
    'collide_cylinder',
    'collidebox',
    'collide_box',
    'collide',
    'noshadow',
    'nocast',
    'mirror',
    'ignore',
];
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
export const isIgnored = (name) => {
    const n = conventionName(name).toLowerCase();
    return n.includes('-ignore') || n.includes('_ignore');
};
export const publicName = (name) => {
    /*
    `_primitive0` is not authored — it is the glTF loader SPLITTING one mesh that
    uses several materials into one Babylon mesh per material. It is an artifact
    of how the file was imported, and a consumer has no way to know it exists, so
    it has no business in a name they have to type or read. Stripped FIRST,
    because it sits outside the behaviour suffix: `building_collideCylinder_primitive0`
    only cleans to `building` if the primitive tag comes off before the loop.
  
    Tonio, looking at the library picker: "should show names like building, not
    building_collideCylinder".
    */
    let n = conventionName(name).replace(/_primitive\d+$/i, '');
    /*
    Blender's DUPLICATE marker (`.001`) lands after the behaviour suffix, so
    `tree_collideCylinder.001` matched no suffix and leaked the annotation whole.
    Held aside and put back rather than dropped: `.001` is a genuinely different
    object from `tree`, and collapsing the two would silently merge them in a name
    list that dedupes.
    */
    const dup = n.match(/\.\d+$/);
    if (dup != null)
        n = n.slice(0, -dup[0].length);
    for (;;) {
        const lower = n.toLowerCase();
        const hit = BEHAVIOUR_SUFFIXES.find((s) => lower.endsWith(`_${s}`));
        if (hit == null)
            return dup != null ? n + dup[0] : n;
        n = n.slice(0, -(hit.length + 1));
    }
};
/**
 * World-space Y of the bottom of a node's combined geometry (the node itself
 * plus every descendant mesh). Returns null if there's no renderable geometry.
 */
function hierarchyMinWorldY(node) {
    node.computeWorldMatrix(true);
    const meshes = [
        ...(node instanceof BABYLON.AbstractMesh ? [node] : []),
        ...node.getChildMeshes(false),
    ].filter((m) => m.getTotalVertices() > 0);
    if (meshes.length === 0)
        return null;
    let minY = Infinity;
    for (const mesh of meshes) {
        mesh.computeWorldMatrix(true);
        const y = mesh.getBoundingInfo().boundingBox.minimumWorld.y;
        if (y < minY)
            minY = y;
    }
    return minY;
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
export function simHalted(owner) {
    return owner?.paused === true || owner?.frozen === true;
}
/**
 * Should this controllable READ its input this frame? False also when input is
 * modally suppressed (a dialog borrowing a control you also play with) or when
 * another demo on the page holds scene focus.
 *
 * Distinct from `simHalted`: halted means "do not advance at all", not-live
 * means "advance, but with neutral input" — which is right for an unfocused
 * demo that should idle rather than freeze.
 */
export function controlsLive(owner) {
    if (simHalted(owner))
        return false;
    if (owner?.inputSuppressed === true)
        return false;
    return owner?.hasInputFocus ?? true;
}
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
export function markUiMesh(mesh) {
    mesh.metadata = { ...(mesh.metadata ?? {}), b3dNoCollide: true };
}
/**
 * Should a collision probe ignore this mesh? True for UI (see `markUiMesh`).
 *
 * Prefer `collidable()` over calling this directly — a rule every call site has
 * to remember is a rule that gets forgotten, which is exactly what happened.
 */
export function isNoCollide(mesh) {
    return (mesh.metadata?.b3dNoCollide === true);
}
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
export function collidable(reject) {
    return (m) => m.isPickable && m.isEnabled() && !isNoCollide(m) && !(reject?.(m) ?? false);
}
/**
 * Vertical gap, in world units, between a node's origin and the bottom of its
 * geometry. Handy as a ground clearance so a model rests on a surface instead
 * of its origin sinking into it (origins are rarely at the model's feet).
 */
export function boundingBottomOffset(node) {
    const minY = hierarchyMinWorldY(node);
    if (minY == null)
        return 0;
    return node.getAbsolutePosition().y - minY;
}
/**
 * Place `node` so the bottom of its geometry rests on a surface, leaving a
 * small `separation` gap. `surface` is either a world Y height (default 0, the
 * ground plane) or a mesh to sit on top of (uses the top of its bounding box).
 * Works regardless of where the model's origin sits within its mesh.
 */
export function placeOnSurface(node, surface = 0, separation = 0.02) {
    const surfaceY = typeof surface === 'number'
        ? surface
        : surface.getBoundingInfo().boundingBox.maximumWorld.y;
    const minY = hierarchyMinWorldY(node);
    if (minY == null)
        return;
    node.position.y += surfaceY + separation - minY;
}
export async function enterXR(scene, options = {}) {
    const { cameraName = 'xr-camera', mode = 'immersive-vr' } = options;
    if (navigator.xr == null) {
        throw new Error('xr is not available');
    }
    if (!(await navigator.xr.isSessionSupported(mode))) {
        throw new Error(`navigator.xr does not support requested mode "${mode}"`);
    }
    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: { sessionMode: mode },
    });
    const { baseExperience } = xr;
    const { camera } = baseExperience;
    camera.name = cameraName;
    await baseExperience.enterXRAsync(mode, 'local-floor');
    return {
        camera,
        xr,
        async exitXR() {
            await baseExperience.exitXRAsync();
        },
    };
}
/*#
# Material Conventions

These conventions apply to all meshes entering the scene — via
[b3d-loader](?b3d-loader.ts), [b3d-library](?b3d-library.ts), or any
component that calls `register()`.

## Example — behaviour from names

Material *appearance* (metallic, roughness, alpha, emissive) comes through glTF automatically.
*Behaviour* that can't be inferred from a material is driven by **name suffixes** on the mesh
(set in Blender, by a loader, or in code):

```javascript
// glass_mirror        → gets a dynamic reflection probe
// floor_noshadow      → does not receive shadows
// lamp_nocast         → does not cast shadows
// crate_collideBox    → box collider (also _collide / _collideSphere / _collideCylinder / _collideMesh)
// debug-ignore        → disposed on load (filtered out)
```

## Property-Based (automatic from Blender materials)

| Property | Threshold | Effect |
|----------|-----------|--------|
| `alpha` > 0.95 | snapped to 1.0 | Treated as fully opaque (avoids blend cost) |
| `alpha` ≤ 0.95 | — | Alpha blend, depth pre-pass, double-sided, excluded from shadow casting |
| `unlit` (glTF KHR_materials_unlit) | — | Respected as-is |
| Transmission > 0 + `_mirror` | — | Cubemap-based refraction with proper IOR (replaces glTF screen-space) |

## Name Suffixes (behavioral overrides, not material appearance)

| Suffix | Effect |
|--------|--------|
| `_noshadow` / `-noshadow` | Mesh doesn't receive shadows |
| `_nocast` / `-nocast` | Mesh doesn't cast shadows |
| `_mirror` / `-mirror` | Dynamic reflection probe (+ refraction if transmissive) |
| `-ignore` | Node is disposed on load |
| `_collide*` | Physics collider (sphere/box/cylinder/mesh) |
*/
/*{ "parent": "Core", "order": 900 }*/
// Thresholds for property-based material inference
const ALPHA_OPAQUE_THRESHOLD = 0.95;
/**
 * Apply material conventions based on PBR material properties.
 *
 * Reads actual material data (alpha, metallic, etc.) rather than relying
 * on name suffixes for appearance. Near-opaque alpha is snapped to 1.0
 * to avoid unnecessary blend cost. Translucent materials get depth
 * pre-pass and shadow exclusion automatically.
 */
export function applyMaterialConventions(meshes) {
    for (const mesh of meshes) {
        const mat = mesh.material;
        if (mat == null)
            continue;
        // Snap near-opaque alpha to 1.0 — avoids blend pipeline for no visual benefit
        if (mat.alpha > ALPHA_OPAQUE_THRESHOLD && mat.alpha < 1) {
            mat.alpha = 1;
        }
        // Translucent materials: correct sorting + perf optimizations
        // backFaceCulling is left as-is — driven by glTF doubleSided / Blender's setting
        if (mat.alpha <= ALPHA_OPAQUE_THRESHOLD) {
            mat.needDepthPrePass = true;
            mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
            // Tag for shadow exclusion (read by b3d-shadows / dynamic-shadows)
            if (!mesh.name.includes('_transparent')) {
                mesh.name += '_transparent';
            }
        }
    }
}
/*#
# B3dChild

`B3dChild` is the base class for **any custom element you write that lives inside a
`<tosi-b3d>` scene**. It owns the whole scene-attach lifecycle in one place so you
never have to reason about component-vs-scene timing yourself.

Extend it (or [AbstractMesh](?b3d-utils.ts), which extends `B3dChild` and adds
position/rotation syncing) and override two hooks:

| Hook | When it runs | What to do |
|------|--------------|------------|
| `sceneReady(owner, scene)` | Once, when **both** this element is connected (its attributes are drained and readable) **and** the scene's engine/scene exist. | Build your Babylon content, `owner.register({meshes, lights})`, subscribe to `owner.addSceneListener(...)`. |
| `sceneDispose()` | On disconnect (element removed, or the whole scene torn down). | Dispose meshes/materials, unsubscribe, release references. |

Do **not** override `connectedCallback` / `disconnectedCallback` — the pull-model
plumbing is centralized in `B3dChild` so a lifecycle fix lands in exactly one spot.
(If you must, call `super` first and keep it side-effect-free.)

## Moved is not removed

Re-parenting an element fires `disconnectedCallback` then `connectedCallback` in
the **same task**, and it need not touch your element at all — moving any
*ancestor* disconnects and reconnects everything beneath it. So the scene treats
a same-task reconnect as a move and keeps the engine; anything else is a genuine
removal and the engine is disposed outright. There is no pooling and nothing
kept warm: **disconnected means gone.**

That makes the two owner-level hooks trustworthy enough to build on, under one
rule — **subscriptions are durable, scene state is not**:

| Call | Guarantee |
|------|-----------|
| `owner.whenReady(cb)` | Runs now if the scene is up, else the instant it is. A callback still waiting when a scene is torn down is **not dropped** — it fires against the next scene, or never runs at all because the element never came back. |
| `owner.whenDisposed(cb)` | Runs when the scene is genuinely disposed, **not** on a move. Returns an unsubscribe. Survives a rebuild, so register once. |

Reach for `whenDisposed` for anything holding a reference *into* the scene
that `sceneDispose()` does not already cover — a timer closing over a mesh, a
cache of materials, an observer on a node. After disposal those point at a dead
scene, and Babylon's failure there is a black material that still reports
`isReady()`: silent, not loud.

Why a base class rather than parent orchestration? On connect the child discovers its
owner via [findB3dOwner](?b3d-utils.ts) and asks to attach: `owner.whenReady(cb)` runs
`cb` immediately if the scene is already up, otherwise the instant it becomes ready.
The parent never *pushes* `sceneReady` at a guessed moment, so `sceneReady` fires only
when the child is genuinely ready AND the scene exists — no races against tosijs's
deferred attribute application.

```javascript
import { B3dChild } from 'tosijs-3d'
import * as BABYLON from '@babylonjs/core'

class MyThing extends B3dChild {
  static preferredTagName = 'my-thing'
  static initAttributes = { color: '#ff8800' }
  declare color: string
  mesh?: BABYLON.Mesh

  sceneReady(owner, scene) {
    this.mesh = BABYLON.MeshBuilder.CreateBox('mything', {}, scene)
    owner.register({ meshes: [this.mesh] })
  }

  sceneDispose() {
    this.mesh?.dispose()
    this.mesh = undefined
  }
}
export const myThing = MyThing.elementCreator()
```
*/
/*{ "parent": "Core" }*/
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
export class B3dChild extends Component {
    owner = null;
    connectedCallback() {
        super.connectedCallback();
        const owner = findB3dOwner(this);
        if (owner != null) {
            owner.whenReady(() => {
                this.owner = owner;
                this.sceneReady(owner, owner.scene);
            });
        }
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
    // Overridden by subclasses. Defaults are no-ops so a bare B3dChild is inert.
    sceneReady(_owner, _scene) { }
    sceneDispose() { }
}
/**
 * Build a programmatic XYZ axis gizmo (no asset) for reference/debugging: a medium
 * grey origin ball, and an R/G/B shaft-plus-arrowhead for +X/+Y/+Z. All materials
 * are emissive + unlit ("glow, not lit"), so a scene glow layer makes them bloom.
 * Returned as one `TransformNode` — parent it to any node to pin axes on it, or
 * flip the `axes` attribute on any AbstractMesh geometry (b3dBox/b3dSphere/…).
 */
export function buildAxes(scene) {
    const root = new BABYLON.TransformNode('axes', scene);
    const glow = (name, hex) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.emissiveColor = BABYLON.Color3.FromHexString(hex);
        m.disableLighting = true;
        m.diffuseColor = new BABYLON.Color3(0, 0, 0);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        return m;
    };
    const ball = BABYLON.MeshBuilder.CreateSphere('axes-origin', { diameter: 0.25, segments: 12 }, scene);
    ball.material = glow('axes-origin-mat', '#808080');
    ball.isPickable = false;
    ball.parent = root;
    const axes = [
        ['x', '#ff2a2a', new BABYLON.Vector3(1, 0, 0)],
        ['y', '#2aff2a', new BABYLON.Vector3(0, 1, 0)],
        ['z', '#2a6aff', new BABYLON.Vector3(0, 0, 1)],
    ];
    for (const [key, hex, dir] of axes) {
        const mat = glow(`axes-${key}-mat`, hex);
        // Shaft: 0.75 long along the axis, 0.0625 square cross-section, centred at 0.5.
        const shaft = BABYLON.MeshBuilder.CreateBox(`axes-${key}-shaft`, {
            width: key === 'x' ? 0.75 : 0.0625,
            height: key === 'y' ? 0.75 : 0.0625,
            depth: key === 'z' ? 0.75 : 0.0625,
        }, scene);
        shaft.position = dir.scale(0.5);
        shaft.material = mat;
        shaft.isPickable = false;
        shaft.parent = root;
        // 4-sided cone (arrowhead) at 1.0, pointing along +axis (cone defaults to +Y).
        const cone = BABYLON.MeshBuilder.CreateCylinder(`axes-${key}-cone`, { diameterTop: 0, diameterBottom: 0.15, height: 0.25, tessellation: 4 }, scene);
        cone.position = dir.scale(1);
        if (key === 'x')
            cone.rotation.z = -Math.PI / 2;
        if (key === 'z')
            cone.rotation.x = Math.PI / 2;
        cone.material = mat;
        cone.isPickable = false;
        cone.parent = root;
    }
    return root;
}
export class AbstractMesh extends B3dChild {
    static initAttributes = {
        x: 0,
        y: 0,
        z: 0,
        // ROTATION IS IN DEGREES — `render()` multiplies by DEG_TO_RAD. Stated
        // here because nothing else did, and a plain `ry` reads as radians to
        // anyone who has just been working in Babylon (where it is). The b3d pause
        // demo added radians per second to `ry` for its whole life and turned at
        // roughly one revolution per ten minutes, which read as "the cube doesn't
        // spin" rather than as a unit bug.
        rx: 0,
        ry: 0,
        rz: 0,
        // Show a debug XYZ axis gizmo pinned to this geometry (see buildAxes). The
        // host fades to translucent while on, so the gizmo reads through it.
        axes: false,
    };
    mesh;
    // Generation counter for async asset loads. Bumped on every sceneReady and
    // sceneDispose; loadAssetContainer captures it and discards a callback whose
    // gen no longer matches. Prevents the "frozen clone" bug where a stale load
    // instantiates meshes into the scene after the component has been re-init'd
    // or disposed.
    loadGeneration = 0;
    _axesNode;
    get roll() {
        return this.rz;
    }
    set roll(v) {
        ;
        this.rz = v;
    }
    get pitch() {
        return this.rx;
    }
    set pitch(v) {
        ;
        this.rx = v;
    }
    get yaw() {
        return this.ry;
    }
    set yaw(v) {
        ;
        this.ry = v;
    }
    sceneReady(owner, _scene) {
        this.owner = owner;
    }
    sceneDispose() {
        // Invalidate any in-flight loadAssetContainer callbacks.
        this.loadGeneration++;
        // Dispose the axis gizmo explicitly (it's parented to the mesh, but clear our
        // ref so it rebuilds cleanly on re-init).
        this._axesNode?.dispose();
        this._axesNode = undefined;
        if (this.mesh != null) {
            this.mesh.dispose();
            this.mesh = undefined;
        }
        this.owner = null;
    }
    /** Attach/detach the debug axis gizmo to track the `axes` attribute. */
    _updateAxes() {
        const wantAxes = !!this.axes;
        if (wantAxes && this.mesh && this._axesNode == null && this.owner) {
            // Fade the host (mesh-level `visibility`, non-destructive) BEFORE parenting
            // the gizmo, so you can see the axes THROUGH the object while the gizmo
            // itself stays fully opaque (it's added after, at visibility 1).
            this._setHostVisibility(0.3);
            this._axesNode = buildAxes(this.owner.scene);
            this._axesNode.parent = this.mesh;
        }
        else if (!wantAxes && this._axesNode != null) {
            this._axesNode.dispose();
            this._axesNode = undefined;
            this._setHostVisibility(1); // restore now the gizmo is gone
        }
    }
    _setHostVisibility(v) {
        if (!this.mesh)
            return;
        this.mesh.visibility = v;
        for (const child of this.mesh.getChildMeshes())
            child.visibility = v;
    }
    /**
     * Load a glTF/glb into an AssetContainer, with race-safe gen tracking.
     * The onLoaded callback is only invoked if the component hasn't been
     * disposed or had a newer load supersede it. Subclasses use this from
     * their sceneReady to safely resolve async asset loads.
     */
    loadAssetContainer(scene, url, onLoaded) {
        const gen = ++this.loadGeneration;
        BABYLON.SceneLoader.LoadAssetContainer(url, undefined, scene, (container) => {
            if (gen !== this.loadGeneration)
                return;
            onLoaded(container);
        });
    }
    render() {
        super.render();
        if (this.mesh?.position) {
            const { x, y, z } = this;
            this.mesh.position.x = x;
            this.mesh.position.y = y;
            this.mesh.position.z = z;
            this.mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(this.yaw * DEG_TO_RAD, this.pitch * DEG_TO_RAD, this.roll * DEG_TO_RAD);
        }
        this._updateAxes();
    }
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
export const cameraIsAttached = (cam) => cam?.inputs?.attachedToElement === true;
//# sourceMappingURL=b3d-utils.js.map