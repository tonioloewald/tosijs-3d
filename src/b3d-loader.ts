/*#
# b3d-loader

Loads a GLB/glTF scene file into the 3D scene. Meshes named with `-ignore` are discarded.
Imported point/spot lights have their intensity scaled by `lightIntensityScale`.

[Material conventions](?b3d-utils.ts) are applied automatically to all loaded meshes.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | URL of the GLB/glTF file |
| `lightIntensityScale` | `0.05` | Scale factor for imported lights |
| `destroyable` | `'off'` | `'on'` gives the model hit points + a death outcome |
| `capacity` / `armor` / `regenRate` / `regenDelay` | `10` / `0` / `0` / `0.5` | Combat stats (when destroyable) |
| `explode` / `explodeForce` | `'off'` / `6` | Shatter on death (best for single-mesh models) |
| `deathBlast` + `blastDamage`/`blastFullRadius`/`blastRadius`/`blastDelay` | `'off'` … | Fire an AOE [warhead](?b3d-warhead.ts) on death (chain-reaction mechanism) |

Set `destroyable="on"` to make a loaded model take damage and die — the same
[DestroyableBehavior](?destroyable-behavior.ts) the standalone
[b3d-destroyable](?b3d-destroyable.ts) cube wraps, attached to the model's root. Call
`.damage(n)`, read `.combatId`/`.dead`, or set a `.whenDestroyed` hook. (Default death
hides the model — the loader owns the mesh hierarchy; use `explode` for a single-mesh
model, or remove the element to free it.)

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLoader, b3dReflections, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi, elements } from 'tosijs'
const { div, span } = elements

const { demo } = tosi({ demo: { time: 10 } })

const formatTime = (v) => {
  const h = Math.floor(v)
  const m = Math.round((v % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

preview.append(
  b3d(
    {
      scenePanel: () => [
        slider3d({ label: 'time of day', value: demo.time, min: 0, max: 24, step: 0.1 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 4, radius: 20, target: [0, 1, 0],
        })
        camera.lowerRadiusLimit = 3
        camera.upperRadiusLimit = 40
      },
    },
    b3dSun(),
    b3dSkybox({ timeOfDay: demo.time, realtimeScale: 0 }),
    b3dLoader({ url: '/materials.glb' }),
    b3dReflections(),
  ),
  div(
    { class: 'debug-panel' },
    span({
      bind: {
        value: demo.time,
        binding: (el, v) => { el.textContent = formatTime(v) },
      },
    })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.debug-panel { position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 16px; padding: 8px 20px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 6px; font-size: 14px; z-index: 10; }
.debug-panel label { display: flex; align-items: center; gap: 4px; }
```

## Usage

```javascript
import { b3d, b3dLoader } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dLoader({ url: '/scene.glb' })
  )
)
```
*/
/*{ "parent": "Core" }*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import {
  applyMaterialConventions,
  B3dChild,
  isOff,
  isIgnored,
} from './b3d-utils.js'
import { DestroyableBehavior } from './destroyable-behavior.js'
import type { CombatEvent, ChainLink } from './destroyable.js'

export class B3dLoader extends B3dChild {
  static preferredTagName = 'tosi-b3d-loader'

  static initAttributes = {
    url: '',
    lightIntensityScale: 0.05,
    // --- Make the loaded model destroyable (see destroyable-behavior). 'off' by
    // default; set 'on' to give it hit points + a death outcome. ---
    destroyable: 'off',
    capacity: 10, // hit points
    armor: 0,
    regenRate: 0,
    regenDelay: 0.5,
    explode: 'off', // shatter on death (best for single-mesh models)
    explodeForce: 6,
    deathBlast: 'off', // AOE warhead on death (chain-reaction mechanism)
    blastDamage: 20,
    blastFullRadius: 1,
    blastRadius: 4,
    blastDelay: 0.1,
  }

  owner: B3d | null = null
  meshes?: BABYLON.AbstractMesh[]
  lights?: BABYLON.Light[]
  private _behavior?: DestroyableBehavior
  /** Set in code to react to this model's destruction (see destroyable-behavior). */
  whenDestroyed?: (info: { id: string; position: BABYLON.Vector3 }) => void

  /** Combat id when `destroyable` is on ('' otherwise). */
  get combatId(): string {
    return this._behavior?.combatId ?? ''
  }

  /** True once a destroyable model has died. */
  get dead(): boolean {
    return this._behavior?.dead ?? false
  }

  /** Damage this model (no-op unless `destroyable` is on). */
  damage(amount: number): CombatEvent[] {
    return this._behavior?.damage(amount) ?? []
  }

  /** Set on-destruction direct-transfer chain links (see destroyable.ts). */
  setChain(links: ChainLink[]): void {
    this._behavior?.setChain(links)
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner
    const url = (this as any).url as string
    if (!url) return
    BABYLON.SceneLoader.ImportMeshAsync('', url, undefined, scene).then(
      (result) => {
        const { meshes, lights, transformNodes } = result
        this.meshes = meshes
        this.lights = lights

        for (const mesh of meshes) {
          if (isIgnored(mesh.name)) {
            mesh.dispose()
          }
        }
        for (const node of transformNodes) {
          if (isIgnored(node.name)) {
            node.dispose()
          }
        }
        for (const light of lights) {
          if (isIgnored(light.name)) {
            light.dispose()
          } else if (
            light instanceof BABYLON.PointLight ||
            light instanceof BABYLON.SpotLight
          ) {
            light.intensity *= (this as any).lightIntensityScale
          }
        }
        applyMaterialConventions(meshes)
        this.owner!.register({ lights, meshes })
        this._attachDestroyable(meshes)
      }
    )
  }

  // Make the loaded model destroyable by attaching a DestroyableBehavior to its root
  // mesh — the same behavior the standalone <tosi-b3d-destroyable> wraps around a cube.
  private _attachDestroyable(meshes: BABYLON.AbstractMesh[]) {
    const attrs = this as any
    if (isOff(attrs.destroyable) || this.owner == null || meshes.length === 0)
      return
    const root = meshes.find((m) => m.parent == null) ?? meshes[0]
    this._behavior = new DestroyableBehavior(
      this.owner,
      {
        get mesh() {
          return root
        },
        dispatchEvent: (e) => this.dispatchEvent(e),
      },
      {
        idBase:
          attrs.url
            ?.split('/')
            .pop()
            ?.replace(/\.[^.]+$/, '') || 'model',
        capacity: attrs.capacity,
        armor: attrs.armor,
        regenRate: attrs.regenRate,
        regenDelay: attrs.regenDelay,
      },
      {
        explode: !isOff(attrs.explode),
        explodeForce: attrs.explodeForce,
        deathBlast: !isOff(attrs.deathBlast),
        blastDamage: attrs.blastDamage,
        blastFullRadius: attrs.blastFullRadius,
        blastRadius: attrs.blastRadius,
        blastDelay: attrs.blastDelay,
        // The loader owns `this.meshes`; let the behavior hide the model and we free
        // the hierarchy in sceneDispose (avoids a double-dispose of the root).
        meshOnDeath: 'hide',
      }
    )
    this._behavior.whenDestroyed = (info) => this.whenDestroyed?.(info)
    this._behavior.attach()
    root.name = this.combatId // so warhead/aircraft lookups can find it
  }

  sceneDispose() {
    this._behavior?.dispose()
    this._behavior = undefined
    if (this.meshes != null) {
      for (const mesh of this.meshes) {
        mesh.dispose()
      }
      this.meshes = undefined
    }
    if (this.lights != null) {
      for (const light of this.lights) {
        light.dispose()
      }
      this.lights = undefined
    }
    this.owner = null
  }
}

export const b3dLoader = B3dLoader.elementCreator()
