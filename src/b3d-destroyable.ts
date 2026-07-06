/*#
# b3d-destroyable

A thing that can take damage and be destroyed — the scene-side bridge to the pure
`CombatWorld` (see `destroyable.ts` / COMBAT-DESIGN.md). Drop it into a `<tosi-b3d>`
and it registers a Destroyable in the scene's combat world, drives a placeholder
cube mesh (real meshes/GLB later), and runs its death outcome when killed — whether
by a direct hit or a chain reaction resolved in the combat tick.

## Demo

**Click any cube** to damage it (1/click) — it flashes on a hit and dies at 0 hp. The
front grid are independent targets; the **back row is chain-linked**, so killing the
leftmost cascades the reaction down the line (chains are wired after mount, since they
reference combat ids that only exist once the targets have mounted).

```js
import { b3d, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'

const grid = []
for (let i = 0; i < 12; i++) {
  grid.push(b3dDestroyable({ x: (i % 4) * 1.6 - 2.4, y: 0.5, z: Math.floor(i / 4) * 1.6, capacity: 3, color: '#cc4444' }))
}
const chainRow = []
for (let i = 0; i < 6; i++) {
  chainRow.push(b3dDestroyable({ x: i * 1.6 - 4, y: 0.5, z: -3, capacity: 4, color: '#e0a020' }))
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, 15, new BABYLON.Vector3(0, 0.5, -0.5), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      // click a cube → damage it
      el.scene.onPointerDown = (_evt, pick) => {
        if (!pick.hit || !pick.pickedMesh) return
        const t = [...grid, ...chainRow].find((c) => c.mesh === pick.pickedMesh)
        if (t) t.damage(1)
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 24, height: 24, color: '#5a6b52' }),
  ...grid,
  ...chainRow,
)
preview.append(scene)

// Wire the chain row once every target has mounted (its combat id exists then).
const wireChain = () => {
  if (chainRow.some((c) => !c.combatId)) { requestAnimationFrame(wireChain); return }
  for (let i = 0; i < chainRow.length - 1; i++) {
    chainRow[i].setChain([{ target: chainRow[i + 1].combatId, amount: 99, delay: 0.15 }])
  }
}
wireChain()
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

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

  /** Hurt this target; returns the combat events from this hit (flashes on a hit). */
  damage(amount: number): CombatEvent[] {
    if (this.owner == null || this._dead) return []
    const events = this.owner.combat.applyDamage(this.combatId, amount)
    if (events.some((e) => e.type === 'damaged')) this._flash()
    return events
  }

  /**
   * Set on-destruction chain links AFTER mount — chains reference other targets'
   * combat ids, which only exist once those elements have mounted. Updates both this
   * element and the live Destroyable in the combat world.
   */
  setChain(links: ChainLink[]): void {
    this.chain = links
    const d = this.owner?.combat.get(this.combatId)
    if (d != null) d.chain = links
  }

  // Brief white emissive flash so a non-lethal hit reads visually.
  private _flash(): void {
    const mat = this.mesh?.material as BABYLON.StandardMaterial | null
    if (mat == null) return
    mat.emissiveColor = BABYLON.Color3.White()
    setTimeout(() => {
      if (this.mesh != null && !this._dead) mat.emissiveColor = BABYLON.Color3.Black()
    }, 90)
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
