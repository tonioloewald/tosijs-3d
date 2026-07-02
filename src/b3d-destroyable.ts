/*#
# b3d-destroyable

A thing that can take damage and be destroyed — the scene-side bridge to the pure
`CombatWorld` (see `destroyable.ts` / COMBAT-DESIGN.md). Drop it into a `<tosi-b3d>`
and it registers a Destroyable in the scene's combat world, drives a placeholder
cube mesh (real meshes/GLB later), and runs its death outcome when killed — whether
by a direct hit or a chain reaction resolved in the combat tick.

It participates in the **floating origin**: because `AbstractMesh` treats the
`x/y/z` attributes as the source of truth for the mesh position, this uses
`onOriginShift` to shift BOTH the mesh node and its `x/z` attributes on a rebase
(NOT `registerWorldRoot`, which would leave the attributes stale so a later render
would un-shift the mesh).

Attributes: `capacity`, `armor`, `regenRate`, `regenDelay`, `protectedBy`,
`protection`, plus `size`/`color` for the placeholder cube and the usual
`x/y/z`/`meshName`. Set `.chain` (a `ChainLink[]`) in code for chain reactions.
Call `.damage(n)` to hurt it (a warhead will do this on contact).
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import type { CombatEvent, ChainLink } from './destroyable'

// Monotonic suffix so every Destroyable gets a unique combat id (also the mesh
// name). Not reset — ids only need to be unique within a run.
let _destroyableCount = 0

export class B3dDestroyable extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'target',
    size: 1, // placeholder cube edge length
    color: '#cc3333',
    capacity: 10, // hit points
    armor: 0, // flat damage shrugged off per hit
    regenRate: 0, // hp/sec (0 = no regen)
    regenDelay: 0.5, // seconds of no damage before regen resumes
    protectedBy: '', // combat id of a protector ('' = none)
    protection: 0, // flat reduction while the protector is intact
  }

  declare meshName: string
  declare size: number
  declare color: string
  declare capacity: number
  declare armor: number
  declare regenRate: number
  declare regenDelay: number
  declare protectedBy: string
  declare protection: number

  /** On-destruction chain links (set in code; see destroyable.ts). */
  chain: ChainLink[] = []
  /** This entity's id in the scene combat world (also its mesh name). */
  combatId = ''

  private _dead = false
  private _obs?: BABYLON.Observer<BABYLON.Scene>
  private _onShift?: (dx: number, dz: number) => void

  connectedCallback(): void {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    this.combatId = `${attrs.meshName}#${++_destroyableCount}`

    // Placeholder cube (swap for real meshes/GLB later).
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      this.combatId,
      { size: attrs.size },
      scene
    )
    const mat = new BABYLON.StandardMaterial(`${this.combatId}-mat`, scene)
    mat.diffuseColor = BABYLON.Color3.FromHexString(attrs.color)
    this.mesh.material = mat
    this.mesh.position.set(attrs.x, attrs.y, attrs.z)

    owner.combat.add(this.combatId, {
      capacity: attrs.capacity,
      regenRate: attrs.regenRate,
      regenDelay: attrs.regenDelay,
      armor: attrs.armor,
      protectedBy: attrs.protectedBy || undefined,
      protection: attrs.protection,
      chain: this.chain.length ? this.chain : undefined,
    })
    owner.register({ meshes: [this.mesh] })

    // Floating origin: shift node AND the x/z attributes (see file header).
    this._onShift = (dx, dz) => {
      if (this.mesh == null) return
      this.mesh.position.x -= dx
      this.mesh.position.z -= dz
      attrs.x -= dx
      attrs.z -= dz
    }
    owner.onOriginShift(this._onShift)

    // Notice destruction from ANY cause (direct hit or a chain reaction resolved
    // in combat.tick) and run the death outcome once.
    this._obs = scene.onBeforeRenderObservable.add(() => {
      if (this._dead) return
      if (owner.combat.get(this.combatId)?.destroyed) this._die()
    })
  }

  /** Hurt this target; returns the combat events from this hit. */
  damage(amount: number): CombatEvent[] {
    if (this.owner == null || this._dead) return []
    return this.owner.combat.applyDamage(this.combatId, amount)
  }

  private _die(): void {
    this._dead = true
    this.dispatchEvent(
      new CustomEvent('destroyed', {
        bubbles: true,
        detail: { id: this.combatId },
      })
    )
    // MVP death outcome: remove the cube. (corpse / wreck / explosion later —
    // an on-death Warhead handles "blow up and hurt everything nearby".)
    if (this.mesh != null) {
      this.mesh.dispose()
      this.mesh = undefined
    }
  }

  sceneDispose(): void {
    if (this._obs != null) {
      this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
      this._obs = undefined
    }
    if (this._onShift != null) {
      this.owner?.offOriginShift(this._onShift)
      this._onShift = undefined
    }
    this.owner?.combat.remove(this.combatId)
    super.sceneDispose()
  }
}

export const b3dDestroyable = B3dDestroyable.elementCreator({
  tag: 'tosi-b3d-destroyable',
})
