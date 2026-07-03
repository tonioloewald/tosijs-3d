/*#
# world-view

The Babylon **view** of a [[world-store]]. The store is the authoritative,
serializable truth; the view is a disposable projection of it. `WorldView`
watches the store and reconciles one mesh per entity every frame: entities that
appeared get a mesh, entities that moved get their mesh repositioned, entities
that were forgotten get their mesh disposed. Data flows one way —
`store → meshes` — so the rendering layer can never desync the simulation.

This keeps the architecture honest: the view imports Babylon, the store does
not. You can run the store headlessly (tests, a server, a driver developing
against the contract) and attach a view only where there's something to draw.

The default factory draws primitives (capsule for characters, box for objects)
so a scene is visible with zero assets; pass your own `factory` to swap in
`b3dBiped`, library instances, or GLB meshes per entity kind.

```js
import {
  b3d, b3dSun, b3dSkybox, b3dGround, WorldStore, WorldView,
} from 'tosijs-3d'

// A stand-in "director" sets up a scene by writing to the store.
const store = new WorldStore()
const witness = store.spawn({
  kind: 'npc',
  position: { x: 4, y: 0.8, z: 3 },
  components: { interactable: { promptId: 'talk', locked: false } },
})
store.spawn({ kind: 'item', position: { x: -2, y: 0.25, z: 1 } })
store.spawn({ kind: 'container', position: { x: 0, y: 0.4, z: -4 } })

// The driver only ever observes events + queries; it never blocks the sim.
store.subscribe((event) => console.log('event:', event))
const FORGET_AFTER = 15 // seconds; a real driver would use minutes/hours

const keys = new Set()
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))

preview.append(
  b3d(
    {
      sceneCreated(el) {
        // Bridge the headless store to the live scene.
        new WorldView(el.scene, store)
      },
      update(el) {
        const dt = el.scene.getEngine().getDeltaTime() / 1000
        store.tick(dt)
        // WASD writes the player's position back into the store.
        const p = { ...store.getState().entities.player.position }
        const speed = 4 * dt
        if (keys.has('w')) p.z += speed
        if (keys.has('s')) p.z -= speed
        if (keys.has('a')) p.x -= speed
        if (keys.has('d')) p.x += speed
        store.moveEntity('player', p)
        // E engages the nearest interactable — a commitment, not a fly-by.
        if (keys.has('e')) {
          const near = store
            .query((entity) => !!entity.components.interactable)
            .find((entity) => {
              const d = entity.position
              return (d.x - p.x) ** 2 + (d.z - p.z) ** 2 < 4
            })
          if (near) store.interact('player', near.id)
        }
        // Driver work: drop a witness the player has ignored for too long.
        const w = store.getEntity(witness)
        if (w && w.lastInteractedAt === undefined && store.getState().now > FORGET_AFTER) {
          store.forget(witness)
        }
      },
    },
    b3dSun(),
    b3dSkybox({ timeOfDay: 11 }),
    b3dGround({ width: 24, height: 24, color: '#4a7a4a' })
  )
)
```
*/
/*{ "parent": "World Sim" }*/

import * as BABYLON from '@babylonjs/core'
import type { EntityId, WorldEntity } from './world-contract'
import type { WorldStore } from './world-store'

/** Builds the Babylon mesh that represents one entity. */
export type MeshFactory = (
  entity: WorldEntity,
  scene: BABYLON.Scene
) => BABYLON.AbstractMesh

const KIND_COLORS: Record<string, string> = {
  player: '#39c5ff',
  npc: '#ffcc33',
  item: '#7cff6b',
  container: '#c08457',
  prop: '#bbbbbb',
}

/**
 * Default visuals: a capsule for player/npc, a box for everything else, tinted
 * by kind. No assets required, so any store is immediately visible.
 */
export const defaultMeshFactory: MeshFactory = (entity, scene) => {
  const name = `world:${entity.id}`
  const isCharacter = entity.kind === 'player' || entity.kind === 'npc'
  const mesh = isCharacter
    ? BABYLON.MeshBuilder.CreateCapsule(
        name,
        { height: 1.6, radius: 0.4 },
        scene
      )
    : BABYLON.MeshBuilder.CreateBox(name, { size: 0.5 }, scene)
  const material = new BABYLON.StandardMaterial(`${name}-mat`, scene)
  material.diffuseColor = BABYLON.Color3.FromHexString(
    KIND_COLORS[entity.kind] ?? '#ffffff'
  )
  mesh.material = material
  return mesh
}

/**
 * Reconciles a Babylon scene to a `WorldStore`. Construction does an initial
 * sync and then reconciles every frame via `onBeforeRenderObservable`; call
 * `reconcile()` directly for headless/manual stepping.
 */
export class WorldView {
  private meshes = new Map<EntityId, BABYLON.AbstractMesh>()
  private factory: MeshFactory
  private observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>

  constructor(
    private scene: BABYLON.Scene,
    private store: WorldStore,
    options: { factory?: MeshFactory } = {}
  ) {
    this.factory = options.factory ?? defaultMeshFactory
    this.reconcile()
    this.observer = scene.onBeforeRenderObservable.add(() => this.reconcile())
  }

  /** One-way sync: create missing meshes, move existing ones, dispose gone ones. */
  reconcile(): void {
    const { entities } = this.store.getState()
    for (const id in entities) {
      const entity = entities[id]
      let mesh = this.meshes.get(id)
      if (!mesh) {
        mesh = this.factory(entity, this.scene)
        this.meshes.set(id, mesh)
      }
      mesh.position.set(entity.position.x, entity.position.y, entity.position.z)
    }
    for (const [id, mesh] of this.meshes) {
      if (!(id in entities)) {
        mesh.dispose()
        this.meshes.delete(id)
      }
    }
  }

  /** The mesh currently representing an entity, if any. */
  getMesh(id: EntityId): BABYLON.AbstractMesh | undefined {
    return this.meshes.get(id)
  }

  dispose(): void {
    if (this.observer) this.scene.onBeforeRenderObservable.remove(this.observer)
    this.observer = null
    for (const mesh of this.meshes.values()) mesh.dispose()
    this.meshes.clear()
  }
}
