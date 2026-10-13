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
