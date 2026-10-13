# world-store

A pure, Babylon-free, deterministic reference implementation of [[world-contract]].

It is the **systemic spine** of the simulation: it holds the serializable
`WorldState`, resolves systemic causality (interactions, pickups, damage) in
itself with no external blessing, emits best-effort events, and answers
queries. A Babylon scene is later a *view* reconciled from this state — the
store never imports a 3D engine, so it is fully unit-testable and can host a
headless driver.

**Queries return copies.** `getState()`, `getEntity()` and `query()` hand back
a deep copy every call, so nothing a driver does to a result can reach the
sim. Read once and keep the result, not once per entity. The engine's own
systems (the view, which reconciles every frame) read `store.liveState`, which
is the live object: never write to it, and never hand it to a driver.

## Demo

The store holds state; a [world-view](?world-view.ts) reconciles one mesh per entity from it every
frame — **data flows one way, `store → meshes`**. Here we spawn a few entities and move one in the
STORE; its cube follows. The render layer can never desync the sim.

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, WorldStore, WorldView, sceneDelta } from 'tosijs-3d'

const store = new WorldStore()              // a 'player' entity exists at the origin
store.spawn({ kind: 'npc', position: { x: -3, y: 0.9, z: 1 } })
const walker = store.spawn({ kind: 'npc', position: { x: 3, y: 0.9, z: -1 } })
store.spawn({ kind: 'item', position: { x: 0, y: 0.5, z: 3 } })

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, 16, new BABYLON.Vector3(0, 0.5, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      new WorldView(el.scene, store)         // capsules for characters, boxes for objects
      let t = 0
      el.scene.onBeforeRenderObservable.add(() => {
        t += sceneDelta(el.scene)
        store.moveEntity(walker, { x: Math.cos(t) * 3, y: 0.9, z: Math.sin(t) * 3 })
      })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 24, height: 24, texture: 'checker', textureTiles: 12 }),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

Two method groups make the boundary legible in code:

- **`WorldApi` methods** — what an external driver (e.g. a narrative engine)
  may call.
- **simulation methods** — what the engine's own gameplay systems (player
  input, an interaction system, combat) call. A driver must NOT call these;
  they represent the player and world acting.

Determinism: ids come from a counter and time advances only via `tick()` — no
`Date.now`/`Math.random` — so the same inputs always produce the same trace.
