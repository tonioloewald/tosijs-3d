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
export function actualMeshes(meshes) {
    return meshes.filter((mesh) => mesh.geometry != null);
}
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
/*{ "parent": "Core" }*/
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
| `sceneReady(owner, scene)` | Once, when **both** this element is connected (its attributes are drained and readable) **and** the scene's engine/scene exist. | Build your Babylon content, `owner.register({meshes, lights})`, subscribe to `owner.onSceneAddition(...)`. |
| `sceneDispose()` | On disconnect (element removed, or the whole scene torn down). | Dispose meshes/materials, unsubscribe, release references. |

Do **not** override `connectedCallback` / `disconnectedCallback` — the pull-model
plumbing is centralized in `B3dChild` so a lifecycle fix lands in exactly one spot.
(If you must, call `super` first and keep it side-effect-free.)

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
export const myThing = MyThing.elementCreator({ tag: 'my-thing' })
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
export class AbstractMesh extends B3dChild {
    static initAttributes = {
        x: 0,
        y: 0,
        z: 0,
        rx: 0,
        ry: 0,
        rz: 0,
    };
    mesh;
    // Generation counter for async asset loads. Bumped on every sceneReady and
    // sceneDispose; loadAssetContainer captures it and discards a callback whose
    // gen no longer matches. Prevents the "frozen clone" bug where a stale load
    // instantiates meshes into the scene after the component has been re-init'd
    // or disposed.
    loadGeneration = 0;
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
        if (this.mesh != null) {
            this.mesh.dispose();
            this.mesh = undefined;
        }
        this.owner = null;
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
    }
}
//# sourceMappingURL=b3d-utils.js.map