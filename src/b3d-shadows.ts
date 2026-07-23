/*#
# b3d-shadows

`B3dSun` — directional light + cascaded shadow generator. Add a `<tosi-b3d-sun>`
inside `<tosi-b3d>` and every registered mesh starts casting shadows onto every
registered surface. When `b3dSkybox` is present, the sun's direction, color, and
intensity are driven by the skybox's time-of-day; otherwise the static
`x`/`y`/`z`/`intensity` attributes apply.

Cascaded shadow maps (CSM) cover the camera's view frustum out to `shadowMaxZ`,
giving high-resolution shadows near the camera and graceful falloff at distance
— the right model for both close scenes and fast, far-ranging ones (see the
aircraft demo). `activeDistance` gates which meshes participate; out-of-range
meshes are skipped to keep the shadow map tight.

> **Tip.** A huge ground that *casts* shadows expands the shadow frustum to fit
> it, shrinking everything else to sub-pixel. Suffix big ground meshes with
> `_nocast` so they only receive.

## Demo

```js
import { b3d, b3dSun, b3dLight, b3dSkybox, b3dGround, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'demo-utils'
import { tosi } from 'tosijs'

const { sun } = tosi({ sun: { timeOfDay: 10 } })

preview.append(
  b3d(
    {
      scenePanel: () => [
        label3d({ text: 'Sun' }),
        slider3d({ label: 'time of day', value: sun.timeOfDay, min: 5, max: 19, step: 0.25 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2.5, beta: Math.PI / 3, radius: 8,
          target: [0, 1, 0], maxElevationDeg: 70,
        })
        camera.lowerRadiusLimit = 3
        camera.upperRadiusLimit = 24
      },
    },
    b3dLight({ intensity: 0.3 }),
    b3dSkybox({ timeOfDay: sun.timeOfDay, realtimeScale: 0 }),
    b3dSun({ shadowCascading: true, shadowTextureSize: 2048 }),
    b3dGround({ meshName: 'ground_nocast', width: 20, height: 20, color: '#7d9b6e' }),
    b3dSphere({ y: 1.2, diameter: 1.5, color: '#cc4422' }),
    b3dSphere({ y: 0.8, diameter: 1, x: 2, z: -1, color: '#4488cc' }),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Sun direction X (overridden by skybox when present) |
| `y` | `-1` | Sun direction Y |
| `z` | `-0.5` | Sun direction Z |
| `intensity` | `1` | Sun intensity (overridden by skybox when present) |
| `shadowTextureSize` | `auto` | Shadow map resolution (per cascade); `auto` = device tier |
| `shadowMaxZ` | `100` | Far plane of the cascaded shadow frustum |
| `shadowDarkness` | `0.1` | 0 = fully dark shadow, 1 = no shadow |
| `numCascades` | `auto` | Number of cascade splits (1–4); `auto` = device tier |
| `stabilizeCascades` | `'on'` | Reduce shadow-edge "swimming" under motion |
| `lambda` | `0.8` | Cascade split blend (0 = uniform, 1 = logarithmic) |
| `cascadeBlendPercentage` | `0.1` | Soft blend across cascade seams |
| `activeDistance` | `30` | Max camera-to-mesh distance a caster participates from |
| `updateIntervalMs` | `1000` | How often to re-evaluate active casters |

## Mesh suffix conventions

| Suffix | Effect |
|--------|--------|
| `_nocast` (or `-nocast`) | Mesh doesn't cast shadows (e.g. huge ground planes) |
| `_noshadow` (or `-noshadow`) | Mesh doesn't receive shadows |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { actualMeshes, B3dChild, isOff } from './b3d-utils'
import { resolveBudget } from './b3d-quality'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dSun extends B3dChild {
  static initAttributes = {
    shadowMaxZ: 100,
    shadowDarkness: 0.1,
    // 0 = auto: resolved from the device quality tier (see b3d-quality). Set an
    // explicit value to override. shadowTextureSize is fixed at generator creation.
    shadowTextureSize: 0,
    activeDistance: 30,
    // Cascaded shadow map (CSM) tuning. CSM covers the camera's view frustum
    // out to shadowMaxZ, which is why it works for both close scenes and fast,
    // far-ranging ones (e.g. aircraft) — see the aircraft demo. 0 = auto (tier).
    numCascades: 0,
    // stabilize reduces shadow-edge "swimming" as the camera moves quickly.
    stabilizeCascades: 'on' as 'on' | 'off',
    // lambda: 0 = uniform cascade splits, 1 = logarithmic (more resolution
    // near the camera). 0.8 is a good default; raise toward 1 for big depth.
    lambda: 0.8,
    // soft blend across cascade boundaries to hide the seams
    cascadeBlendPercentage: 0.1,
    x: 0,
    y: -1,
    z: -0.5,
    intensity: 1,
    updateIntervalMs: 1000,
  }

  owner: B3d | null = null
  light?: BABYLON.DirectionalLight
  shadowGenerator?: BABYLON.CascadedShadowGenerator
  shadowCasters: BABYLON.Mesh[] = []
  activeShadowCasters: BABYLON.Mesh[] = []

  private interval = 0
  private _callback?: SceneAdditionHandler
  private _update?: () => void

  private shadowCallback(additions: SceneAdditions): void {
    const { meshes } = additions
    if (meshes == null) return
    for (const mesh of actualMeshes(meshes)) {
      if (
        !mesh.name.includes('_nocast') &&
        !mesh.name.includes('-nocast') &&
        !this.shadowCasters.includes(mesh)
      ) {
        this.shadowCasters.push(mesh)
      }
      mesh.receiveShadows =
        !mesh.name.includes('_noshadow') && !mesh.name.includes('-noshadow')
    }
  }

  private baseIntensity = 1

  /**
   * Underwater dimming multiplier (1 above water). Owned by the sun, applied by
   * whoever writes the final intensity. A `b3dSkybox` reads this and multiplies
   * its day/night intensity by it, so the two never fight over `light.intensity`.
   */
  dimFactor = 1

  /**
   * Set true by a `b3dSkybox` that owns the day/night intensity cycle. While
   * set, the sun stops writing `light.intensity` itself (it only maintains
   * `dimFactor`), so the skybox's 100ms cycle isn't stomped by this 1s update.
   */
  externallyLit = false

  private update() {
    if (this.light == null || this.owner?.scene == null) return
    // Get the actual world-space position of the active camera
    const activeCamera = this.owner.scene.activeCamera
    if (activeCamera == null) return
    const target = activeCamera.globalPosition

    this.light.position.x = target.x
    this.light.position.y = target.y + 10
    this.light.position.z = target.z

    // Dim sun when camera is underwater. We only compute the factor here; the
    // final write happens below (or in b3dSkybox when it owns the cycle), so a
    // day/night skybox and this 1s update never stomp each other's intensity.
    const waterMesh = this.owner.scene.getMeshByName('water_nocast')
    let dimFactor = 1
    if (waterMesh && target.y < waterMesh.absolutePosition.y) {
      const depth = waterMesh.absolutePosition.y - target.y
      dimFactor = Math.max(0.05, 1 - depth * 0.5)
    }
    this.dimFactor = dimFactor
    // When a skybox owns the day/night cycle it writes the final intensity
    // (base * dimFactor) on its own faster cadence; don't double-write here.
    if (!this.externallyLit) {
      this.light.intensity = this.baseIntensity * dimFactor
    }

    const activeDistance = (this as any).activeDistance as number
    for (const mesh of this.shadowCasters) {
      const distance = mesh.getAbsolutePosition().subtract(target).length()
      if (distance < activeDistance) {
        if (!this.activeShadowCasters.includes(mesh)) {
          this.activeShadowCasters.push(mesh)
          this.shadowGenerator!.addShadowCaster(mesh)
        }
      } else {
        const idx = this.activeShadowCasters.indexOf(mesh)
        if (idx > -1) {
          this.activeShadowCasters.splice(idx, 1)
          this.shadowGenerator!.removeShadowCaster(mesh)
        }
      }
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner
    const attrs = this as any
    this._update = this.update.bind(this)
    this.interval = window.setInterval(this._update!, attrs.updateIntervalMs)

    const light = new BABYLON.DirectionalLight(
      'sun',
      new BABYLON.Vector3(attrs.x, attrs.y, attrs.z),
      scene
    )
    light.intensity = attrs.intensity
    this.baseIntensity = attrs.intensity
    this.light = light

    this.shadowGenerator = new BABYLON.CascadedShadowGenerator(
      resolveBudget(attrs.shadowTextureSize, 'shadowTextureSize'),
      light
    )

    this._callback = this.shadowCallback.bind(this)
    owner.addSceneListener(this._callback)

    // Apply shadow settings now. render() also calls this, but render() may
    // never fire again after the generator exists (e.g. a static sun with no
    // day/night cycle), so the generator would otherwise keep Babylon's
    // defaults — wrong filter, no shadowMaxZ — and cast no visible shadow.
    this.configureShadows()
  }

  private configureShadows() {
    const attrs = this as any
    if (this.light == null || this.shadowGenerator == null) return

    // Direction is intentionally NOT re-applied here. The DirectionalLight
    // constructor sets initial direction from attrs.x/y/z; thereafter b3dSkybox
    // (when present) owns light.direction via its day/night cycle. Re-writing
    // direction on every render() would stomp the skybox's writes whenever any
    // other sun attr changed.
    this.baseIntensity = attrs.intensity

    // Soften shadows when light is dim (moonlight)
    const darkness =
      attrs.intensity < 0.5
        ? attrs.shadowDarkness + (1 - attrs.shadowDarkness) * 0.6
        : attrs.shadowDarkness
    this.shadowGenerator.setDarkness(darkness)

    // Leave bias/normalBias at Babylon's CSM-tuned defaults — overriding them
    // tends to cause peter-panning (shadows detaching from their caster).
    this.shadowGenerator.numCascades = resolveBudget(
      attrs.numCascades,
      'numCascades'
    )
    this.shadowGenerator.shadowMaxZ = attrs.shadowMaxZ
    this.shadowGenerator.stabilizeCascades = !isOff(attrs.stabilizeCascades)
    this.shadowGenerator.lambda = attrs.lambda
    this.shadowGenerator.cascadeBlendPercentage = attrs.cascadeBlendPercentage
  }

  sceneDispose() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
    if (this.owner && this._callback) {
      this.owner.removeSceneListener(this._callback)
    }
    if (this.light != null) {
      this.light.dispose()
      this.light = undefined
      this.shadowGenerator = undefined
    }
    this.shadowCasters = []
    this.activeShadowCasters = []
    this.owner = null
  }

  render() {
    super.render()
    this.configureShadows()
  }
}

export const b3dSun = B3dSun.elementCreator({ tag: 'tosi-b3d-sun' })
