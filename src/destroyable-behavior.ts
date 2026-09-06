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

## Example

For a ready-to-click live demo, see [b3d-destroyable](?b3d-destroyable.ts) (a field of cubes you
shoot). This is the reusable behavior *underneath* it — attach damage to any existing mesh:

```javascript
import { DestroyableBehavior } from 'tosijs-3d'
// Give a loaded GLB / biped / vehicle a health pool + death outcome without wrapping it in a
// <tosi-b3d-destroyable> cube; at 0 hp it runs the same explode / wreck / loot outcomes.
```
*/
/*{ "parent": "Combat", "order": 900 }*/
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import type {
  DestroyableSpec,
  ChainLink,
  CombatEvent,
  Cause,
} from './destroyable.js'
import { detonateWarhead } from './b3d-warhead.js'
import { explodeMesh } from './b3d-exploder.js'

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
  readonly mesh?: BABYLON.AbstractMesh | BABYLON.TransformNode
  /** Dispatch the bubbling `destroyed` event (usually the host Component). */
  dispatchEvent(ev: Event): boolean
}

/*
EVERY ATTACHED, LIVE DESTROYABLE IN A SCENE.

A blast used to find its targets with `querySelectorAll('tosi-b3d-destroyable')`,
which is not what "destroyable" means: `b3d-loader` and `b3d-aircraft` attach
the SAME behaviour and were invisible to every warhead in the scene — a
destroyable aircraft that could not be blown up, failing by doing nothing.

The registry is the behaviour's own, so anything that attaches one is a target
by construction and nothing has to remember to be enumerable. Same shape as
`interactive-behavior`'s pool.
*/
const registry = new WeakMap<BABYLON.Scene, Set<DestroyableBehavior>>()

const sceneSet = (scene: BABYLON.Scene): Set<DestroyableBehavior> => {
  let set = registry.get(scene)
  if (!set) {
    set = new Set()
    registry.set(scene, set)
  }
  return set
}

/** Every live destroyable in this scene, with the node that stands for it. */
export function liveDestroyables(
  scene: BABYLON.Scene
): Array<{ behavior: DestroyableBehavior; mesh: BABYLON.AbstractMesh }> {
  const out: Array<{
    behavior: DestroyableBehavior
    mesh: BABYLON.AbstractMesh
  }> = []
  for (const behavior of sceneSet(scene)) {
    const mesh = behavior.host.mesh as BABYLON.AbstractMesh | undefined
    // `.mesh` is cleared on death, so this still skips the already-dead.
    if (mesh != null && !behavior.dead) out.push({ behavior, mesh })
  }
  return out
}

/**
 * The destroyable a picked mesh belongs to — by ANCESTRY, not by identity.
 *
 * A library model instantiates asynchronously beneath a root, so a shell hits a
 * WING and the registered node is the root three levels up. Matching on the
 * picked mesh alone found nothing and every shot missed, silently — which is
 * the trap manta-recon spent a debugging cycle on (#23).
 *
 * Walks up rather than snapshotting the descendants, because the descendants
 * arrive late: a registry built when the target registered itself captures an
 * empty root and never notices the model landing in it.
 */
export function destroyableAt(
  mesh: BABYLON.AbstractMesh | null | undefined
): DestroyableBehavior | null {
  if (mesh == null) return null
  const scene = mesh.getScene()
  const set = registry.get(scene)
  if (set == null || set.size === 0) return null
  const roots = new Map<unknown, DestroyableBehavior>()
  for (const behavior of set) {
    const node = behavior.host.mesh
    if (node != null && !behavior.dead) roots.set(node, behavior)
  }
  let node: unknown = mesh
  while (node != null) {
    const found = roots.get(node)
    if (found != null) return found
    node = (node as { parent?: unknown }).parent
  }
  return null
}

export class DestroyableBehavior {
  /** This entity's id in the scene combat world (also its combat mesh name). */
  readonly combatId: string
  /** On-destruction direct-transfer chain links (see destroyable.ts). */
  chain: ChainLink[]
  /** Code hook run once on death, before the visual outcome. */
  whenDestroyed?: (info: {
    id: string
    position: BABYLON.Vector3
    /** Who killed it and through what chain — see [[destroyable|Cause]]. */
    cause?: Cause
  }) => void

  private _dead = false
  private _obs?: BABYLON.Observer<BABYLON.Scene>
  private _capacity: number

  constructor(
    private owner: B3d,
    readonly host: DestroyableHost,
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
    sceneSet(this.owner.scene).add(this)
  }

  /** True once destroyed (mesh gone/exploding). Lets others skip dead targets. */
  get dead(): boolean {
    return this._dead
  }

  /** Hurt this target; returns the combat events from this hit (flashes + shows the
   * accumulated-damage glow so you can read how close it is to dying). */
  damage(amount: number, cause?: Cause): CombatEvent[] {
    if (this._dead) return []
    const events = this.owner.combat.applyDamage(
      this.combatId,
      amount,
      [],
      cause
    )
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
    sceneSet(this.owner.scene).delete(this)
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
    // A library instance's root is a TransformNode with no material of its own —
    // the geometry hangs beneath it, which getChildMeshes() below covers.
    const own = (mesh as BABYLON.AbstractMesh).material
    if (own != null) mats.add(own)
    for (const c of mesh.getChildMeshes())
      if (c.material != null) mats.add(c.material)
    for (const m of mats) {
      if ((m as any).emissiveColor == null) continue
      ;(m as any).emissiveColor = BABYLON.Color3.White()
    }
    setTimeout(() => {
      if (this._dead) return
      for (const m of mats)
        if ((m as any).emissiveColor != null) (m as any).emissiveColor = damage
    }, 90)
  }

  private _die(): void {
    this._dead = true
    const scene = this.owner.scene
    const mesh = this.host.mesh
    const position = mesh?.absolutePosition.clone() ?? BABYLON.Vector3.Zero()
    /*
    The cause comes off the WORLD, not off the call that killed it. A chain
    reaction resolves inside `combat.tick` and is noticed here a frame later by
    polling `destroyed`, so the event that carried the cause is long consumed.
    */
    const cause = this.owner.combat.get(this.combatId)?.cause
    const info: { id: string; position: BABYLON.Vector3; cause?: Cause } =
      cause == null
        ? { id: this.combatId, position }
        : { id: this.combatId, position, cause }

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
      /*
      THE CREDIT SURVIVES A deathBlast, which is the case #8 was actually about.

      A chain LINK carries its cause through `CombatWorld` because the world
      schedules it. A deathBlast does not go through the world at all — it
      detonates a fresh warhead from here — so without this the cascade silently
      re-attributed itself to nobody at the first hop, and a player who set off
      a 48-drum chain got credit for exactly the one drum they hit.

      Measured before the fix: six destroyed, all `hops: 0`, all directly
      credited — which LOOKS right until you notice the chain is invisible.
      */
      /*
      One more hop, and this drum is the link.

      `by` alone was not enough: a deathBlast leaves the combat world, so
      without `via`/`hops` every victim came back at `hops: 0` and a chain read
      as things the player hit personally. Measured that way before the fix.
      */
      const onward: Cause | undefined =
        cause == null
          ? undefined
          : {
              by: cause.by,
              kind: 'blast',
              via: this.combatId,
              hops: (cause.hops ?? 0) + 1,
            }
      setTimeout(() => {
        if (owner.scene != null && !owner.scene.isDisposed)
          detonateWarhead(owner, at, spec, true, onward)
      }, Math.max(0, d.blastDelay ?? 0.1) * 1000)
    }

    // Visual outcome.
    if (mesh != null) {
      if (d.explode) {
        // `mesh` may be a library instance's transform ROOT (no geometry of its
        // own) — explodeMesh handles the hierarchy. Wrapped anyway because this
        // runs inside a render observer: a throw here skips every observer
        // registered after it, so the scene stops advancing while input keeps
        // being read and the game appears to seize (tosijs-3d#24). Cosmetics
        // must not be able to do that.
        try {
          explodeMesh(mesh as BABYLON.Mesh, scene, {
            force: d.explodeForce ?? 6,
            disposeOriginal: true,
          })
        } catch (err) {
          console.warn(
            'destroyable: explode failed; removing the mesh instead',
            err
          )
          mesh.dispose()
        }
      } else if (d.meshOnDeath === 'hide') {
        mesh.setEnabled(false)
      } else if (d.meshOnDeath !== 'keep') {
        mesh.dispose()
      }
    }
  }
}
