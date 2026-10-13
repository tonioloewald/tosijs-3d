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
import { b3d, b3dSun, b3dSkybox, b3dLoader, b3dReflections, slider3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi, elements } from 'tosijs'
const { div, span } = elements

const { demo } = tosi({ demo: { time: 10, shadows: true, glow: false, ssao: false } })

// Three effects that change how every material in the file reads.
let host = null
function applyEffects() {
  if (host == null || host.scene == null) return
  host.scene.shadowsEnabled = demo.shadows.value
  host.glowLayerIntensity = demo.glow.value ? 1 : 0
  host.ssao = demo.ssao.value ? 'on' : 'off'
}
demo.shadows.observe(applyEffects)
demo.glow.observe(applyEffects)
demo.ssao.observe(applyEffects)

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
        toggle3d({ label: 'shadows', value: demo.shadows }),
        toggle3d({ label: 'glow', value: demo.glow }),
        toggle3d({ label: 'ssao', value: demo.ssao }),
      ],
      sceneCreated(el, BABYLON) {
        host = el
        applyEffects()
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
