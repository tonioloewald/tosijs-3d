/*#
# b3d-warhead

The **explosion** — the scene-side bridge to the pure AOE math in `warhead.ts` (see
COMBAT-DESIGN.md). On `detonate(center)` it gathers every [b3d-destroyable](?b3d-destroyable.ts)
in the scene, resolves the blast (full damage inside `fullRadius`, falling linearly to
1 at `blastRadius`, 0 beyond), **line-of-sight gates** each target with a raycast (a
wall between the blast and a target spares it), and applies the damage as an **outward
shockwave**: each target's hit lands on a short delay proportional to its distance, so
the effect ripples out (near things die first, far last) in step with the expanding
flash — cheap (amounts + delays computed instantly, only application is staggered), not
an all-at-once kill. Single-use — a projectile/bomb owns one and fires it on impact;
here you can also place one and detonate it directly.

## Demo

**Steer the reticle with A/D + W/S (left stick), pull the right trigger (or `F`) to
detonate there** — the [standard controller](?b3d-controller.ts). Cubes
inside the radius take falloff damage (they flash, and die at 0 hp); the **wall blocks
line of sight**, so parking the reticle behind it spares the cubes there. Tune the blast
in the ⚙ panel.

```js
import { b3d, b3dController, b3dWarhead, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'demo-utils'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { damage: 20, fullRadius: 1.5, blastRadius: 5, los: true } })
const warhead = b3dWarhead({ y: 0.4, damage: s.damage, fullRadius: s.fullRadius, blastRadius: s.blastRadius })

const targets = []
for (let i = 0; i < 24; i++) {
  targets.push(b3dDestroyable({ x: (i % 6) * 1.4 - 3.5, y: 0.4, z: Math.floor(i / 6) * 1.4 - 2, size: 0.8, capacity: 8, color: '#cc4444' }))
}

// Shared reticle position + shoot edge, reachable by both sceneCreated and drive.
const state = { rx: 0, rz: -3, shootWas: false }

const scene = b3d(
  {
    gamepad: 'left_stick,right_trigger',
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'Warhead', bold: true }),
      slider3d({ label: 'damage', value: s.damage, min: 1, max: 60, step: 1 }),
      slider3d({ label: 'full radius', value: s.fullRadius, min: 0, max: 5, step: 0.1 }),
      slider3d({ label: 'blast radius', value: s.blastRadius, min: 1, max: 12, step: 0.5 }),
      toggle3d({ label: 'line of sight', value: s.los }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2.3, beta: Math.PI / 3, radius: 16, target: [0, 0.5, 0] })
      // a wall for line-of-sight blocking
      const wall = BABYLON.MeshBuilder.CreateBox('wall', { width: 6, height: 2.5, depth: 0.4 }, el.scene)
      wall.position.set(0, 1.25, 3.2)
      const wm = new BABYLON.StandardMaterial('wm', el.scene)
      wm.diffuseColor = new BABYLON.Color3(0.4, 0.42, 0.48)
      wall.material = wm
      // a glowing reticle you steer across the ground
      const reticle = BABYLON.MeshBuilder.CreateTorus('reticle', { diameter: 1.3, thickness: 0.12 }, el.scene)
      reticle.isPickable = false
      const rmat = new BABYLON.StandardMaterial('rmat', el.scene)
      rmat.emissiveColor = new BABYLON.Color3(1, 0.85, 0.2)
      rmat.disableLighting = true
      reticle.material = rmat
      el.scene.onBeforeRenderObservable.add(() => reticle.position.set(state.rx, 0.05, state.rz))
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 30, height: 30, color: '#5a6b52' }),
  b3dController({
    mapping: 'biped',
    drive(input, dt) {
      state.rx = Math.max(-6, Math.min(6, state.rx + input.turn * 7 * dt)) // A/D
      state.rz = Math.max(-5, Math.min(6, state.rz + input.forward * 7 * dt)) // W/S
      const shoot = input.shoot > 0.5 || input.sprint > 0.5
      if (shoot && !state.shootWas) {
        warhead.damage = s.damage.value
        warhead.fullRadius = s.fullRadius.value
        warhead.blastRadius = s.blastRadius.value
        warhead.los = s.los.value ? 'on' : 'off'
        warhead.x = state.rx
        warhead.z = state.rz
        warhead.detonate() // blast at the reticle (F · glass button · XR trigger)
      }
      state.shootWas = shoot
    },
  }),
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
/*{ "parent": "Combat" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { resolveAoe, type WarheadSpec, type AoeTarget } from './warhead'
import type { B3dDestroyable } from './b3d-destroyable'

// Seconds for the blast to expand from the centre to its full radius — shared by the
// boom visual AND the outward-rippling damage in detonateWarhead so they stay in step.
const BOOM_DURATION = 0.35

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
    const c =
      center ??
      new BABYLON.Vector3((this as any).x, (this as any).y, (this as any).z)
    detonateWarhead(this.owner, c, this.spec, !isOff(this.los))
  }
}

export const b3dWarhead = B3dWarhead.elementCreator({
  tag: 'tosi-b3d-warhead',
}) as (...args: unknown[]) => B3dWarhead

/**
 * Resolve + apply an AOE blast over the scene's destroyables (LOS-gated when
 * `useLos`) and spawn a flash. Shared by `<tosi-b3d-warhead>` and by projectiles /
 * bombs, which fire a warhead on impact.
 */
export function detonateWarhead(
  owner: B3d,
  center: BABYLON.Vector3,
  spec: WarheadSpec,
  useLos = true
): void {
  const scene = owner.scene
  // Live destroyables (their mesh is named by combatId; a dead one has none).
  const dests = Array.from(
    owner.querySelectorAll('tosi-b3d-destroyable')
  ) as B3dDestroyable[]
  const live = dests
    .map((el) => ({ el, mesh: scene.getMeshByName(el.combatId) }))
    .filter((e) => e.mesh != null) as Array<{
    el: B3dDestroyable
    mesh: BABYLON.AbstractMesh
  }>
  const meshes = live.map((e) => e.mesh)
  const targets: AoeTarget[] = live.map((e) => {
    const p = e.mesh.absolutePosition
    return {
      id: e.el.combatId,
      position: { x: p.x, y: p.y, z: p.z },
      visible: useLos ? hasLos(owner, center, e.mesh, meshes) : true,
    }
  })
  // Shockwave: apply each target's damage on a delay proportional to its distance
  // from the blast, so the effect ripples OUTWARD (near things die first, far last) in
  // step with the expanding boom — rather than everything dying at once. Cheap: the
  // amounts + delays are computed instantly here; only the application is staggered.
  const blastRadius = spec.blastRadius ?? 5
  const shockSpeed = blastRadius / BOOM_DURATION // reaches the edge as the shell does
  for (const hit of resolveAoe(
    spec,
    { x: center.x, y: center.y, z: center.z },
    targets
  )) {
    const e = live.find((x) => x.el.combatId === hit.id)
    if (e == null) continue
    const p = e.mesh.absolutePosition
    const d = Math.sqrt(
      (p.x - center.x) ** 2 + (p.y - center.y) ** 2 + (p.z - center.z) ** 2
    )
    const delayMs = Math.min(BOOM_DURATION, d / shockSpeed) * 1000
    const el = e.el
    const amount = hit.amount
    if (delayMs < 16) el.damage(amount)
    else setTimeout(() => el.damage(amount), delayMs)
  }
  explosionFx(scene, center, blastRadius)
}

// A target is visible unless a NON-destroyable pickable mesh (a wall/cover) sits
// between the blast center and it — cubes don't shadow each other from a blast.
function hasLos(
  owner: B3d,
  from: BABYLON.Vector3,
  targetMesh: BABYLON.AbstractMesh,
  destroyableMeshes: BABYLON.AbstractMesh[]
): boolean {
  const to = targetMesh.absolutePosition
  const dir = to.subtract(from)
  const dist = dir.length()
  if (dist < 0.1) return true
  const ray = new BABYLON.Ray(from, dir.normalize(), dist - 0.1)
  const hit = owner.scene.pickWithRay(
    ray,
    (m) => m.isPickable && m.name !== 'ground' && !destroyableMeshes.includes(m)
  )
  return !(hit != null && hit.hit)
}

// Expanding, fading flash at the blast center.
/**
 * The fireball, on its own — an expanding, fading emissive sphere. Exported because a
 * detonation isn't the only thing that explodes: an aircraft flying into a hill wants the
 * same visual without any of the AOE damage machinery behind it (see `b3d-death`).
 */
export function explosionFx(
  scene: BABYLON.Scene,
  center: BABYLON.Vector3,
  blastRadius: number
): void {
  const s = BABYLON.MeshBuilder.CreateSphere('boom', { diameter: 1 }, scene)
  s.position.copyFrom(center)
  s.isPickable = false
  const m = new BABYLON.StandardMaterial('boom-mat', scene)
  m.emissiveColor = new BABYLON.Color3(1, 0.55, 0.1)
  m.disableLighting = true
  m.alpha = 0.85
  s.material = m
  const peak = Math.max(1, blastRadius)
  let t = 0
  const obs = scene.onBeforeRenderObservable.add(() => {
    t += scene.getEngine().getDeltaTime() / 1000
    const k = t / BOOM_DURATION
    if (k >= 1) {
      s.dispose()
      m.dispose()
      scene.onBeforeRenderObservable.remove(obs)
      return
    }
    s.scaling.setAll(0.3 + k * peak)
    m.alpha = 0.85 * (1 - k)
  })
}
