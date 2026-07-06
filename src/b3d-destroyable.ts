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

## Death outcomes

What happens when it dies is configurable — the default just removes the mesh, but
you can compose:

- **`explode="on"`** — shatter the mesh into flying fragments ([b3d-exploder](?b3d-exploder.ts); `explodeForce` tunes it).
- **`deathBlast="on"`** — detonate a real AOE [warhead](?b3d-warhead.ts) at the death
  point after `blastDelay` (default 100 ms). This is a **second, distinct** chain
  mechanism from `chain`: `chain` is direct HP transfer to named targets; `deathBlast`
  is a falloff + line-of-sight **explosion** that ripples out and can set off *any*
  nearby destroyable — which may blast *its* neighbours, cascading. (`blastDamage` /
  `blastFullRadius` / `blastRadius`.)
- **`onDeath` callback** (set in code) + the bubbling **`destroyed`** event — the seam
  for putting a linked player/vehicle into a *dead* state, spawning loot, or swapping
  in a wreck model.

### Demo — a field of fuel drums that chain-explode

**Click any drum** — it explodes, and the blast sets off its neighbours in a spreading
chain reaction (each drum both `explode`s and fires a `deathBlast`).

```js
import { b3d, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'

const drums = []
for (let i = 0; i < 48; i++) {
  drums.push(b3dDestroyable({
    x: (i % 8) * 1.5 - 5.25, y: 0.5, z: Math.floor(i / 8) * 1.5 - 3.75,
    size: 0.9, capacity: 6, color: '#d06020',
    explode: 'on', explodeForce: 7,
    deathBlast: 'on', blastDamage: 30, blastFullRadius: 1.2, blastRadius: 2.4,
  }))
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 18, new BABYLON.Vector3(0, 0.5, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      el.scene.onPointerDown = (_evt, pick) => {
        if (!pick.hit || !pick.pickedMesh) return
        const t = drums.find((d) => d.mesh === pick.pickedMesh)
        if (t) t.damage(99)
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 30, height: 30, color: '#5a6b52' }),
  ...drums,
)
preview.append(scene)
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
`protection`, the death-outcome knobs (`explode`/`explodeForce`, `deathBlast` +
`blastDamage`/`blastFullRadius`/`blastRadius`/`blastDelay`), plus `size`/`color` for
the placeholder cube and the usual `x/y/z`/`meshName`. Set `.chain` (a `ChainLink[]`)
in code for direct-transfer chain reactions, or `onDeath` for a death hook. Call
`.damage(n)` to hurt it (a warhead will do this on contact).
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import type { CombatEvent, ChainLink } from './destroyable'
import { detonateWarhead } from './b3d-warhead'
import { explodeMesh } from './b3d-exploder'

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
    // --- Death outcome (all optional; default is just "remove the mesh") ---
    explode: 'off', // on death, shatter the mesh into fragments (see b3d-exploder)
    explodeForce: 6, // outward fragment force when exploding
    deathBlast: 'off', // on death, detonate an AOE warhead (chain-reaction mechanism)
    blastDamage: 20, // death-warhead full damage
    blastFullRadius: 1, // death-warhead full-damage radius
    blastRadius: 4, // death-warhead falloff radius
    blastDelay: 0.1, // seconds after death before the warhead fires (default 100ms)
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
  declare explode: string
  declare explodeForce: number
  declare deathBlast: string
  declare blastDamage: number
  declare blastFullRadius: number
  declare blastRadius: number
  declare blastDelay: number

  /** On-destruction chain links (set in code; see destroyable.ts). */
  chain: ChainLink[] = []
  /** This entity's id in the scene combat world (also its mesh name). */
  combatId = ''
  /**
   * Optional code-set hook, run once when this target is destroyed (before the
   * visual outcome). This is the clean seam for putting a linked player/vehicle
   * into a 'dead' state, spawning loot/wreckage, swapping a model, etc. The same
   * info also rides the bubbling `destroyed` CustomEvent.
   */
  onDeath?: (info: { id: string; position: BABYLON.Vector3 }) => void

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

  /** True once destroyed (mesh gone / exploding). Lets others skip dead targets. */
  get dead(): boolean {
    return this._dead
  }

  private _die(): void {
    this._dead = true
    const attrs = this as any
    const scene = this.owner?.scene
    const position =
      this.mesh?.absolutePosition.clone() ??
      new BABYLON.Vector3(attrs.x, attrs.y, attrs.z)
    const info = { id: this.combatId, position }

    // Notify: the bubbling event + the code hook (e.g. flip a player to 'dead').
    this.dispatchEvent(new CustomEvent('destroyed', { bubbles: true, detail: info }))
    this.onDeath?.(info)

    // Chain-reaction blast — a SECONDARY mechanism, distinct from `chain`'s direct
    // HP transfer: a real AOE warhead (falloff + line-of-sight) fired after a short
    // delay, so a destroyed drum ripples out and sets off its neighbours (which may
    // in turn blast theirs). This target is already dead, so it never damages itself.
    if (!isOff(attrs.deathBlast) && this.owner != null) {
      const owner = this.owner
      const spec = {
        damage: attrs.blastDamage,
        fullRadius: attrs.blastFullRadius,
        blastRadius: attrs.blastRadius,
      }
      const at = position.clone()
      setTimeout(
        () => {
          if (owner.scene != null && !owner.scene.isDisposed)
            detonateWarhead(owner, at, spec, true)
        },
        Math.max(0, attrs.blastDelay) * 1000
      )
    }

    // Visual outcome: shatter into fragments, or just remove the mesh.
    if (this.mesh != null) {
      if (!isOff(attrs.explode) && scene != null) {
        explodeMesh(this.mesh, scene, {
          force: attrs.explodeForce,
          disposeOriginal: true,
        })
      } else {
        this.mesh.dispose()
      }
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
