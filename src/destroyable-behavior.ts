/*#
# destroyable-behavior

The **attachable** destroyable — the reusable bridge that makes *any* modeled element
(a loaded GLB, a biped, a vehicle) take damage and die, without being a separate
`<tosi-b3d-destroyable>` cube. It's the scene-side glue over the pure `CombatWorld`
(see `destroyable.ts` / COMBAT-DESIGN.md): it registers the host in the scene combat
world, flashes + reacts to hits, watches for destruction from *any* cause (a direct
hit or a chain reaction resolved in the combat tick), and runs the configurable death
outcome on the host's own mesh.

A host supplies its `mesh` (for the flash / explosion / blast origin) and an event
target; the behavior owns everything combat. `B3dDestroyable` is a thin wrapper of
this around a placeholder cube — attach one to a loader/biped/car the same way.

Death outcome (all optional; default just removes/hides the mesh):
- `explode` — shatter the host mesh into fragments (`b3d-exploder`).
- `deathBlast` — detonate an AOE warhead at the death point after `blastDelay`
  (default 100 ms): a **second** chain mechanism distinct from `chain`'s direct HP
  transfer — a falloff + line-of-sight explosion that ripples through neighbours.
- `whenDestroyed` callback + a bubbling `destroyed` event — the seam for flipping a linked
  player/vehicle into a *dead* state, spawning loot, swapping a wreck model, etc.
*/
/*{ "parent": "Combat" }*/
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import type { DestroyableSpec, ChainLink, CombatEvent } from './destroyable'
import { detonateWarhead } from './b3d-warhead'
import { explodeMesh } from './b3d-exploder'

// Monotonic suffix so every attached Destroyable gets a unique combat id / mesh name.
let _behaviorCount = 0

export interface DeathOutcome {
  /** Shatter the host mesh into fragments on death. */
  explode?: boolean
  /** Outward fragment force when exploding (default 6). */
  explodeForce?: number
  /** Detonate an AOE warhead at the death point (the chain-reaction mechanism). */
  deathBlast?: boolean
  blastDamage?: number
  blastFullRadius?: number
  blastRadius?: number
  /** Seconds after death before the blast fires (default 0.1 = 100 ms). */
  blastDelay?: number
  /**
   * What to do with the mesh visually. `'dispose'` (default) frees it; `'hide'`
   * disables it (a host that swaps in a wreck model in `whenDestroyed` wants `'hide'` or
   * `'keep'` so it can manage the mesh itself). Ignored when `explode` fires.
   */
  meshOnDeath?: 'dispose' | 'hide' | 'keep'
}

export interface DestroyableHost {
  /**
   * Mesh to flash / explode / locate the death blast (may gain one after attach).
   * For a multi-mesh GLB this is the root — flash covers all children; `explode`
   * needs real geometry, so it suits single-mesh targets (multi-mesh → `dispose`).
   */
  readonly mesh?: BABYLON.AbstractMesh
  /** Dispatch the bubbling `destroyed` event (usually the host Component). */
  dispatchEvent(ev: Event): boolean
}

export class DestroyableBehavior {
  /** This entity's id in the scene combat world (also its combat mesh name). */
  readonly combatId: string
  /** On-destruction direct-transfer chain links (see destroyable.ts). */
  chain: ChainLink[]
  /** Code hook run once on death, before the visual outcome. */
  whenDestroyed?: (info: { id: string; position: BABYLON.Vector3 }) => void

  private _dead = false
  private _obs?: BABYLON.Observer<BABYLON.Scene>
  private _capacity: number

  constructor(
    private owner: B3d,
    private host: DestroyableHost,
    private spec: DestroyableSpec & { idBase?: string },
    private death: DeathOutcome = {}
  ) {
    this.chain = spec.chain ?? []
    this._capacity = spec.capacity
    this.combatId = `${spec.idBase ?? 'destroyable'}#${++_behaviorCount}`
  }

  /** Register in the combat world and start watching for destruction. */
  attach(): void {
    this.owner.combat.add(this.combatId, {
      capacity: this.spec.capacity,
      regenRate: this.spec.regenRate,
      regenDelay: this.spec.regenDelay,
      armor: this.spec.armor,
      protectedBy: this.spec.protectedBy || undefined,
      protection: this.spec.protection,
      chain: this.chain.length ? this.chain : undefined,
    })
    // Notice destruction from ANY cause (direct hit or a chain reaction resolved in
    // combat.tick) and run the death outcome exactly once.
    this._obs = this.owner.scene.onBeforeRenderObservable.add(() => {
      if (this._dead) return
      if (this.owner.combat.get(this.combatId)?.destroyed) this._die()
    })
  }

  /** True once destroyed (mesh gone/exploding). Lets others skip dead targets. */
  get dead(): boolean {
    return this._dead
  }

  /** Hurt this target; returns the combat events from this hit (flashes + shows the
   * accumulated-damage glow so you can read how close it is to dying). */
  damage(amount: number): CombatEvent[] {
    if (this._dead) return []
    const events = this.owner.combat.applyDamage(this.combatId, amount)
    const hit = events.find((e) => e.type === 'damaged') as
      | { hp: number }
      | undefined
    if (hit != null) this._flash(hit.hp)
    return events
  }

  /** Set on-destruction chain links AFTER attach (they reference other combat ids). */
  setChain(links: ChainLink[]): void {
    this.chain = links
    const d = this.owner.combat.get(this.combatId)
    if (d != null) d.chain = links
  }

  dispose(): void {
    if (this._obs != null) {
      this.owner.scene.onBeforeRenderObservable.remove(this._obs)
      this._obs = undefined
    }
    this.owner.combat.remove(this.combatId)
  }

  // Damage feedback: a brief white flash, then settle to a red glow that grows as hp
  // falls — so you can SEE how close a target is to dying (full hp → no glow, near
  // death → bright red). Applied to every material on the mesh and its children (a
  // GLB has many); the emissive channel is used as the damage indicator.
  private _flash(hp: number): void {
    const mesh = this.host.mesh
    if (mesh == null) return
    const frac =
      this._capacity > 0 ? Math.max(0, Math.min(1, hp / this._capacity)) : 1
    const glow = 1 - frac // 0 at full hp, 1 at death
    const damage = new BABYLON.Color3(0.65 * glow, 0.04 * glow, 0.04 * glow)
    const mats = new Set<BABYLON.Material>()
    if (mesh.material != null) mats.add(mesh.material)
    for (const c of mesh.getChildMeshes())
      if (c.material != null) mats.add(c.material)
    for (const m of mats) {
      if ((m as any).emissiveColor == null) continue
      ;(m as any).emissiveColor = BABYLON.Color3.White()
    }
    setTimeout(() => {
      if (this._dead) return
      for (const m of mats)
        if ((m as any).emissiveColor != null)
          (m as any).emissiveColor = damage
    }, 90)
  }

  private _die(): void {
    this._dead = true
    const scene = this.owner.scene
    const mesh = this.host.mesh
    const position =
      mesh?.absolutePosition.clone() ?? BABYLON.Vector3.Zero()
    const info = { id: this.combatId, position }

    // Notify: the bubbling event + the code hook (e.g. flip a player to 'dead').
    this.host.dispatchEvent(
      new CustomEvent('destroyed', { bubbles: true, detail: info })
    )
    this.whenDestroyed?.(info)

    // Chain-reaction blast (a real AOE warhead) after a short delay so cascades
    // ripple outward. Already dead → never damages itself.
    const d = this.death
    if (d.deathBlast) {
      const owner = this.owner
      const spec = {
        damage: d.blastDamage ?? 20,
        fullRadius: d.blastFullRadius ?? 1,
        blastRadius: d.blastRadius ?? 4,
      }
      const at = position.clone()
      setTimeout(
        () => {
          if (owner.scene != null && !owner.scene.isDisposed)
            detonateWarhead(owner, at, spec, true)
        },
        Math.max(0, d.blastDelay ?? 0.1) * 1000
      )
    }

    // Visual outcome.
    if (mesh != null) {
      if (d.explode) {
        explodeMesh(mesh as BABYLON.Mesh, scene, {
          force: d.explodeForce ?? 6,
          disposeOriginal: true,
        })
      } else if (d.meshOnDeath === 'hide') {
        mesh.setEnabled(false)
      } else if (d.meshOnDeath !== 'keep') {
        mesh.dispose()
      }
    }
  }
}
