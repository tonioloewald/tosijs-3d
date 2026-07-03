/*#
# b3d-reflections

Auto-attaches a reflection probe to every mesh whose name contains `_mirror`
(or `-mirror`). PBR materials get the cube texture as their reflection, and
StandardMaterials get it plus a sensible Fresnel curve so they actually look
metallic instead of flat-white. Refraction-enabled PBR materials (glass) also
get the probe wired in as their refraction texture, with the glTF loader's
thin-surface overrides undone so the refraction ray actually bends.

Probe refresh is camera-aware: probes within `farDistance` refresh at
`refreshRate`; between `farDistance` and `maxDistance` the rate ramps linearly
to `farRefreshRate`; beyond `maxDistance` they freeze at render-once. Distance
re-checks run every `distanceCheckInterval` frames, staggered per-probe so the
work doesn't all pile onto one frame.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dSphere, b3dReflections } from 'tosijs-3d'

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 2.8, 6,
          new BABYLON.Vector3(0, 1, 0), el.scene
        )
        // Keep the camera >=5deg above the horizon and out of the scene: a bare
        // ArcRotateCamera tilts under the ground and zooms through everything.
        camera.lowerBetaLimit = (20 * Math.PI) / 180
        camera.upperBetaLimit = (85 * Math.PI) / 180
        camera.lowerRadiusLimit = 2.5
        camera.upperRadiusLimit = 18
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dSkybox({ timeOfDay: 11, realtimeScale: 0 }),
    b3dSun({ shadowCascading: true }),
    b3dGround({ meshName: 'ground_nocast', width: 20, height: 20, color: '#7d9b6e' }),
    // The `mirror: true` flag adds the `_mirror` suffix to the mesh name,
    // which b3dReflections picks up and probes automatically. The non-mirror
    // sphere is what the mirror reflects.
    b3dSphere({ y: 1.2, diameter: 1.5, mirror: true, color: '#ffffff' }),
    b3dSphere({ y: 0.8, diameter: 1, x: 2.2, z: -0.5, color: '#cc4422' }),
    b3dReflections(),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `probeSize` | `auto` | Cubemap resolution per face; `auto` = device tier |
| `refreshRate` | `5` | Frames between probe refreshes inside `farDistance` |
| `farDistance` | `30` | Distance at which the rate starts ramping toward `farRefreshRate` |
| `maxDistance` | `100` | Distance beyond which probes freeze entirely |
| `farRefreshRate` | `30` | Probe refresh rate at `maxDistance` |
| `distanceCheckInterval` | `13` | Frames between camera-distance re-checks |

## Mesh suffix conventions

| Suffix | Effect |
|--------|--------|
| `_mirror` (or `-mirror`) | Mesh gets a reflection probe attached |
*/
/*{ "parent": "Effects" }*/

import { B3dChild } from './b3d-utils'
import * as BABYLON from '@babylonjs/core'
import { resolveBudget } from './b3d-quality'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dReflections extends B3dChild {
  static initAttributes = {
    refreshRate: 5,
    // 0 = auto: resolved from the device quality tier (see b3d-quality). Set an
    // explicit value to override.
    probeSize: 0,
    /** Distance beyond which probes stop updating entirely */
    maxDistance: 100,
    /** Distance at which probes switch from near to far refresh rate */
    farDistance: 30,
    /** Refresh rate for distant probes (higher = less frequent) */
    farRefreshRate: 30,
    /** How often (in frames) to re-check distances */
    distanceCheckInterval: 13,
  }

  owner: B3d | null = null
  probes: {
    probe: BABYLON.ReflectionProbe
    mesh: BABYLON.AbstractMesh
    frameOffset: number
  }[] = []
  nonMirrorMeshes: BABYLON.AbstractMesh[] = []
  private _callback?: SceneAdditionHandler
  private _observer?: BABYLON.Observer<BABYLON.Scene>
  private _frameCount = 0

  private addMeshesToProbes() {
    for (const { probe, mesh } of this.probes) {
      if (probe.renderList == null) continue
      for (const m of this.nonMirrorMeshes) {
        if (m !== mesh && !probe.renderList.includes(m)) {
          probe.renderList.push(m)
        }
      }
    }
  }

  private createProbe(mesh: BABYLON.AbstractMesh) {
    if (this.owner == null) return
    const material = mesh.material
    if (material == null) return

    const attrs = this as any
    const probe = new BABYLON.ReflectionProbe(
      mesh.name.replace(/[_-]mirror/g, '_probe'),
      resolveBudget(attrs.probeSize, 'reflectionSize'),
      this.owner.scene
    )
    try {
      probe.attachToMesh(mesh)
      probe.refreshRate = attrs.refreshRate

      if (material instanceof BABYLON.PBRMaterial) {
        material.reflectionTexture = probe.cubeTexture
        // If the material is transmissive (glass, etc.), replace the glTF
        // screen-space refraction with the probe cubemap. The glTF loader's
        // configureTransmission() sets volumeIndexOfRefraction=1 and
        // thickness=0 (thin-surface mode), which kills visible refraction.
        // We restore proper IOR so the refraction ray actually bends.
        if (material.subSurface.isRefractionEnabled) {
          material.subSurface.refractionTexture = probe.cubeTexture
          // Undo thin-surface overrides from glTF's configureTransmission()
          material.subSurface.volumeIndexOfRefraction =
            material.indexOfRefraction
          material.subSurface.useAlbedoToTintRefraction = true
        }
      } else if (material instanceof BABYLON.StandardMaterial) {
        material.backFaceCulling = true
        material.reflectionTexture = probe.cubeTexture
        material.reflectionFresnelParameters = new BABYLON.FresnelParameters()
        material.reflectionFresnelParameters.bias = 0.02
      }

      const frameOffset = Math.floor(
        Math.random() * attrs.distanceCheckInterval
      )
      this.probes.push({ probe, mesh, frameOffset })
      this.addMeshesToProbes()
    } catch (e) {
      console.error(`Failed to make "${mesh.name}" reflective:`, e)
      probe.dispose()
    }
  }

  private makeReflectiveCallback(additions: SceneAdditions): void {
    if (this.owner == null) return
    const { meshes } = additions
    if (meshes == null) return

    for (const mesh of meshes) {
      if (mesh.name.includes('_mirror') || mesh.name.includes('-mirror')) {
        this.createProbe(mesh)
      } else {
        this.nonMirrorMeshes.push(mesh)
      }
    }
    // update all probes with any new non-mirror meshes
    this.addMeshesToProbes()
  }

  private updateProbeRate(
    probe: BABYLON.ReflectionProbe,
    mesh: BABYLON.AbstractMesh,
    camPos: BABYLON.Vector3
  ) {
    const attrs = this as any
    const dist = BABYLON.Vector3.Distance(camPos, mesh.absolutePosition)

    if (dist > attrs.maxDistance) {
      probe.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE
    } else if (dist <= attrs.farDistance) {
      probe.refreshRate = attrs.refreshRate
    } else {
      const t =
        (dist - attrs.farDistance) / (attrs.maxDistance - attrs.farDistance)
      probe.refreshRate = Math.round(
        attrs.refreshRate + t * (attrs.farRefreshRate - attrs.refreshRate)
      )
    }
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
    this._callback = this.makeReflectiveCallback.bind(this)
    owner.onSceneAddition(this._callback)

    const attrs = this as any
    this._observer = owner.scene.onBeforeRenderObservable.add(() => {
      const frame = this._frameCount++
      const interval = attrs.distanceCheckInterval
      const camera = owner.scene.activeCamera
      if (camera == null) return
      const camPos = camera.globalPosition
      for (const { probe, mesh, frameOffset } of this.probes) {
        if ((frame + frameOffset) % interval === 0) {
          this.updateProbeRate(probe, mesh, camPos)
        }
      }
    })
  }

  sceneDispose() {
    if (this.owner != null) {
      if (this._callback) {
        this.owner.offSceneAddition(this._callback)
      }
      if (this._observer) {
        this.owner.scene.onBeforeRenderObservable.remove(this._observer)
        this._observer = undefined
      }
    }
    for (const { probe } of this.probes) {
      probe.dispose()
    }
    this.probes = []
    this.nonMirrorMeshes = []
    this.owner = null
  }
}

export const b3dReflections = B3dReflections.elementCreator({
  tag: 'tosi-b3d-reflections',
})
