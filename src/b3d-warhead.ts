/*#
# b3d-warhead

The **explosion** — the scene-side bridge to the pure AOE math in `warhead.ts` (see
COMBAT-DESIGN.md). On `detonate(center)` it gathers every [b3d-destroyable](?b3d-destroyable.ts)
in the scene, resolves the blast (full damage inside `fullRadius`, falling linearly to
1 at `blastRadius`, 0 beyond), **line-of-sight gates** each target with a raycast (a
wall between the blast and a target spares it), applies the damage, and spawns a quick
expanding flash. Single-use — a projectile/bomb owns one and fires it on impact; here
you can also place one and detonate it directly.

## Demo

**Click the ground** to set off a blast there. Cubes inside the radius take falloff
damage (they flash, and die at 0 hp); the **wall blocks line of sight**, so cubes
behind it are spared. Tune the blast in the ⚙ panel.

```js
import { b3d, b3dWarhead, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, toggle3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { damage: 20, fullRadius: 1.5, blastRadius: 5, los: true } })
const warhead = b3dWarhead({ damage: s.damage, fullRadius: s.fullRadius, blastRadius: s.blastRadius })

const targets = []
for (let i = 0; i < 24; i++) {
  targets.push(b3dDestroyable({ x: (i % 6) * 1.4 - 3.5, y: 0.4, z: Math.floor(i / 6) * 1.4 - 2, size: 0.8, capacity: 8, color: '#cc4444' }))
}

const scene = b3d(
  {
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'Warhead', bold: true }),
      slider3d({ label: 'damage', value: s.damage, min: 1, max: 60, step: 1 }),
      slider3d({ label: 'full radius', value: s.fullRadius, min: 0, max: 5, step: 0.1 }),
      slider3d({ label: 'blast radius', value: s.blastRadius, min: 1, max: 12, step: 0.5 }),
      toggle3d({ label: 'line of sight', value: s.los }),
    ],
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2.3, Math.PI / 3, 16, new BABYLON.Vector3(0, 0.5, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      // a wall for line-of-sight blocking
      const wall = BABYLON.MeshBuilder.CreateBox('wall', { width: 6, height: 2.5, depth: 0.4 }, el.scene)
      wall.position.set(0, 1.25, 3.2)
      const wm = new BABYLON.StandardMaterial('wm', el.scene)
      wm.diffuseColor = new BABYLON.Color3(0.4, 0.42, 0.48)
      wall.material = wm
      el.scene.onPointerDown = (_e, pick) => {
        if (pick.hit && pick.pickedPoint) {
          warhead.damage = s.damage.value
          warhead.fullRadius = s.fullRadius.value
          warhead.blastRadius = s.blastRadius.value
          warhead.los = s.los.value ? 'on' : 'off'
          warhead.detonate(pick.pickedPoint)
        }
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 30, height: 30, color: '#5a6b52' }),
  warhead,
  ...targets,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `damage` | `20` | Full damage `D` (direct hit + within `fullRadius`) |
| `fullRadius` | `1.5` | Within this distance the blast deals full `D` |
| `blastRadius` | `5` | Falloff from `D` (at `fullRadius`) to 1 here; 0 beyond |
| `los` | `'on'` | Line-of-sight occlusion (a wall between blast + target spares it) |
| `x`,`y`,`z` | `0` | Detonation point when `detonate()` is called with no argument |
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { resolveAoe, type WarheadSpec, type AoeTarget } from './warhead'
import type { B3dDestroyable } from './b3d-destroyable'

export class B3dWarhead extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    damage: 20,
    fullRadius: 1.5,
    blastRadius: 5,
    los: 'on', // line-of-sight occlusion; 'off' to ignore cover
  }

  declare damage: number
  declare fullRadius: number
  declare blastRadius: number
  declare los: string

  get spec(): WarheadSpec {
    return {
      damage: this.damage,
      fullRadius: this.fullRadius,
      blastRadius: this.blastRadius,
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    // No persistent mesh — a warhead is a payload; it shows only its blast.
  }

  /**
   * Detonate at `center` (default: this element's `x/y/z`). Resolves the AOE over
   * every b3d-destroyable in the scene (LOS-gated when `los` is on), applies the
   * falloff damage, and spawns an expanding flash.
   */
  detonate(center?: BABYLON.Vector3): void {
    if (this.owner == null) return
    const scene = this.owner.scene
    const c =
      center ??
      new BABYLON.Vector3((this as any).x, (this as any).y, (this as any).z)

    // Live destroyables (their mesh is named by combatId; a dead one has none).
    const dests = Array.from(
      this.owner.querySelectorAll('tosi-b3d-destroyable')
    ) as B3dDestroyable[]
    const live = dests
      .map((el) => ({ el, mesh: scene.getMeshByName(el.combatId) }))
      .filter((e) => e.mesh != null) as Array<{
      el: B3dDestroyable
      mesh: BABYLON.AbstractMesh
    }>
    const meshes = live.map((e) => e.mesh)
    const useLos = !isOff(this.los)

    const targets: AoeTarget[] = live.map((e) => {
      const p = e.mesh.absolutePosition
      return {
        id: e.el.combatId,
        position: { x: p.x, y: p.y, z: p.z },
        visible: useLos ? this._hasLos(c, e.mesh, meshes) : true,
      }
    })

    for (const hit of resolveAoe(this.spec, { x: c.x, y: c.y, z: c.z }, targets)) {
      live.find((e) => e.el.combatId === hit.id)?.el.damage(hit.amount)
    }
    this._boom(c)
  }

  // A target is visible unless a NON-destroyable pickable mesh (a wall/cover) sits
  // between the blast center and the target — cubes don't shadow each other.
  private _hasLos(
    from: BABYLON.Vector3,
    targetMesh: BABYLON.AbstractMesh,
    destroyableMeshes: BABYLON.AbstractMesh[]
  ): boolean {
    const to = targetMesh.absolutePosition
    const dir = to.subtract(from)
    const dist = dir.length()
    if (dist < 0.1) return true
    const ray = new BABYLON.Ray(from, dir.normalize(), dist - 0.1)
    const hit = this.owner!.scene.pickWithRay(
      ray,
      (m) => m.isPickable && m.name !== 'ground' && !destroyableMeshes.includes(m)
    )
    return !(hit != null && hit.hit)
  }

  private _boom(center: BABYLON.Vector3): void {
    const scene = this.owner!.scene
    const s = BABYLON.MeshBuilder.CreateSphere('boom', { diameter: 1 }, scene)
    s.position.copyFrom(center)
    s.isPickable = false
    const m = new BABYLON.StandardMaterial('boom-mat', scene)
    m.emissiveColor = new BABYLON.Color3(1, 0.55, 0.1)
    m.disableLighting = true
    m.alpha = 0.85
    s.material = m
    const peak = Math.max(1, this.blastRadius)
    let t = 0
    const obs = scene.onBeforeRenderObservable.add(() => {
      t += scene.getEngine().getDeltaTime() / 1000
      const k = t / 0.35 // 0.35s flash
      if (k >= 1) {
        s.dispose()
        m.dispose()
        scene.onBeforeRenderObservable.remove(obs)
        return
      }
      s.scaling.setAll(0.3 + k * peak) // expand toward the blast radius
      m.alpha = 0.85 * (1 - k)
    })
  }
}

export const b3dWarhead = B3dWarhead.elementCreator({
  tag: 'tosi-b3d-warhead',
}) as (...args: unknown[]) => B3dWarhead
