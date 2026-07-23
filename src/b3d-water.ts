/*#
# b3d-water

Water plane with reflections, waves, and underwater fog effect.

## Demo

**A lake with a few crates on the shore.** The sun rakes across the surface; the water reflects the
sky and the crates. Drag to orbit — dip the camera below the surface and the world tints and dims.

```js
import { b3d, b3dSkybox, b3dWater, b3dReflections, b3dGround } from 'tosijs-3d'
import { demoSun, orbitCam, spinner } from 'demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 24, beta: Math.PI / 2.8, target: [0, 0.4, 0] })
      // crates floating ON the surface (bottom at the water line), bobbing on the swell
      const a = spinner(el, { x: -5, y: 1.0, z: -3, size: 2, spin: 0.12 })
      const b = spinner(el, { x: 4.5, y: 0.7, z: 4, size: 1.4, spin: -0.18 })
      let t = 0
      el.scene.registerBeforeRender(() => {
        t += el.scene.getEngine().getDeltaTime() / 1000
        a.position.y = 1.0 + Math.sin(t * 1.1) * 0.14
        b.position.y = 0.7 + Math.sin(t * 1.5 + 1) * 0.14
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 9 }),
  // a textured seafloor, visible through the translucent water — gives the surface real depth
  b3dGround({ y: -1.2, width: 60, height: 60, texture: 'checker', textureTiles: 20, color: '#3a5f6b' }),
  b3dWater({ waterSize: 60, waveHeight: 0.4, windForce: -4, twoSided: true }),
  b3dReflections(),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `waterSize` | `128` | Size of the water plane |
| `subdivisions` | `32` | Mesh subdivisions |
| `twoSided` | `false` | Render both sides |
| `follow` | `false` | Ride the camera in x/z (endless sea): the plane snaps to a coarse grid under you, ripples stay anchored in world space |
| `windForce` | `-5` | Wind strength |
| `waveHeight` | `0` | Wave amplitude |
| `bumpHeight` | `0.1` | Normal map bump intensity |
| `waterColor` | `'#0066cc'` | Water tint color |
| `colorBlendFactor` | `0.1` | How much color tints the water |
| `spherical` | `false` | Use a sphere instead of a plane |

## Underwater Effect

When the camera goes below the water surface, a blue fog is automatically applied.
The sun (if present via `b3dSun`) is also dimmed based on depth.

```javascript
import { b3d, b3dWater, b3dSun, b3dSkybox } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dSun({}),
    b3dSkybox({ timeOfDay: 12 }),
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024, normalMap: '/waterbump.png' })
  )
)
```
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { WaterMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils'
import { band } from './atmosphere'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

export class B3dWater extends AbstractMesh {
  static initAttributes = {
    // Underwater fog: how thick, and how sharply it takes over as you cross the surface.
    // The transition is deliberately TIGHT (see the fog layer below): killing the "thunk"
    // meant killing the discontinuity, not the contrast.
    underwaterFog: 0.12, // density the moment you're under
    underwaterMurk: 0.08, // extra density at 30m down (the sea thickens with depth)
    fogTransition: 0.2, // metres below the surface to reach FULL underwater fog
    ...AbstractMesh.initAttributes,
    spherical: false,
    waterSize: 128,
    subdivisions: 32,
    textureSize: 1024,
    twoSided: false,
    // Follow the camera in x/z so a finite plane reads as an ENDLESS sea. The mesh rides with
    // you but the ripple pattern is offset back into WORLD space (so the surface looks fixed, not
    // dragged along), and the reflection map refreshes every few frames instead of every one
    // (a moving sea doesn't need a perfect mirror). Off by default (a small pond doesn't need it).
    follow: false,
    // Root-absolute, NOT './waterbump.png': doc pages are served at /{slug}/, so a
    // relative path resolves to /{slug}/waterbump.png (404). Root-absolute loads
    // the same everywhere (matches the "root-absolute asset paths" convention).
    normalMap: '/waterbump.png',
    windForce: -5,
    waveHeight: 0,
    bumpHeight: 0.1,
    waveLength: 0.1,
    waterColor: '#0066cc',
    colorBlendFactor: 0.1,
    windDirectionX: 0.6,
    windDirectionY: 0.8,
  }

  waterMaterial?: WaterMaterial
  private _callback?: SceneAdditionHandler
  private _underwaterUpdate?: () => void
  private _removeFogLayer?: () => void
  private _followTick?: () => void
  private _wasUnderwater = false

  private waterCallback(additions: SceneAdditions) {
    const { meshes } = additions
    if (meshes == null) return
    for (const mesh of meshes) {
      if (!mesh.name.includes('water')) {
        this.waterMaterial!.addToRenderList(mesh)
      }
    }
  }

  private updateWater() {
    if (this.waterMaterial == null || this.owner == null) return
    const attrs = this as any
    this.waterMaterial.backFaceCulling = !attrs.twoSided
    this.waterMaterial.windForce = attrs.windForce
    this.waterMaterial.windDirection = new BABYLON.Vector2(
      attrs.windDirectionX,
      attrs.windDirectionY
    )
    this.waterMaterial.waveHeight = attrs.waveHeight
    this.waterMaterial.waveLength = attrs.waveLength
    this.waterMaterial.bumpHeight = attrs.bumpHeight
    if (attrs.colorBlendFactor > 0) {
      const hex = attrs.waterColor as string
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      this.waterMaterial.waterColor = new BABYLON.Color3(r, g, b)
    }
    this.waterMaterial.colorBlendFactor = attrs.colorBlendFactor
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any

    if (attrs.spherical) {
      this.mesh = BABYLON.MeshBuilder.CreateSphere(
        'water_nocast',
        { segments: attrs.subdivisions, diameter: attrs.waterSize },
        scene
      )
    } else {
      this.mesh = BABYLON.MeshBuilder.CreateGround(
        'water_nocast',
        {
          width: attrs.waterSize,
          height: attrs.waterSize,
          subdivisions: attrs.subdivisions,
        },
        scene
      )
    }
    this.mesh.checkCollisions = false

    this.waterMaterial = new WaterMaterial(
      'water',
      scene,
      new BABYLON.Vector2(attrs.textureSize, attrs.textureSize)
    )
    this.waterMaterial.bumpTexture = new BABYLON.Texture(attrs.normalMap, scene)
    this.updateWater()
    this.mesh.material = this.waterMaterial

    this._callback = this.waterCallback.bind(this)
    owner.onSceneAddition(this._callback)

    // FOLLOW: ride the camera in x/z so the finite plane always surrounds you (an endless sea),
    // while the bump pattern is scrolled back into WORLD space so the ripples stay put instead
    // of sliding along with the mesh. The plane's y stays where the attr puts it (sea level).
    if (attrs.follow) {
      // Run it on beforeRender (authoritative, right before the scene draws) AND re-run it from
      // render() below — because AbstractMesh.render() rewrites the mesh position from the x/z
      // attrs, which would yank a followed plane back to the origin for a frame.
      this._followTick = () => this._applyFollow()
      scene.registerBeforeRender(this._followTick)
    }

    // UNDERWATER — a fog LAYER, not a switch.
    //
    // This used to snap: `if (underwater && !wasUnderwater) { fogMode = EXP2; … }`. Two
    // discontinuities in one line — fogMode is a shader DEFINE (so every material recompiled:
    // that's the hitch), and colour/density jumped at the exact plane of the surface. The
    // "thunk".
    //
    // Now the weight RAMPS over a band around the waterline (so passing through reads as
    // *entering the water* rather than teleporting into it) and keeps deepening as you go
    // down. The scene composites and smooths it; nothing toggles. See atmosphere.ts.
    this._removeFogLayer = owner.addFogLayer(() => {
      const cam = scene.activeCamera
      if (!cam || !this.mesh) return null
      const depth = this.mesh.absolutePosition.y - cam.globalPosition.y
      // A TIGHT band across the surface — full underwater within ~20cm of crossing.
      //
      // Killing the "thunk" meant killing the DISCONTINUITY (the shader recompile from
      // switching fogMode, and the instant jump at a plane), NOT the contrast. A wide band
      // reads as mush: at the waterline you'd be only ~10% submerged and the sea would fade
      // in over metres. Being underwater should be OBVIOUS the moment you are — and being out
      // should be obvious the moment you're out. Fast, but continuous.
      const attrs = this as any
      const w = band(depth, -0.05, Math.max(0.02, attrs.fogTransition))
      if (w <= 0) return null
      // Full sea-fog immediately on entry, then keep thickening as you go deeper (murk with
      // depth is both true and useful — it hides what's below you).
      const deeper = Math.min(1, Math.max(0, depth / 30))
      const density = attrs.underwaterFog + attrs.underwaterMurk * deeper
      return {
        weight: w,
        color: { r: 0, g: 0.15, b: 0.3 },
        density,
        // b3d-fog defaults to LINEAR, which IGNORES density and uses start/end — so contribute a
        // short `end` too (as clouds do), else underwater tints but never thickens. Visibility
        // shrinks as the sea deepens (~25m near the surface, ~15m in the murk).
        start: 0,
        end: Math.max(6, 3 / density),
      }
    })
  }

  sceneDispose(): void {
    if (this.owner && this._callback) {
      this.owner.offSceneAddition(this._callback)
    }
    if (this._followTick) {
      this.owner?.scene.unregisterBeforeRender(this._followTick)
      this._followTick = undefined
    }
    if (this._removeFogLayer) {
      this._removeFogLayer() // the scene composites fog; nothing to restore, nothing to snap
      this._removeFogLayer = undefined
    }
    this.waterMaterial = undefined
    super.sceneDispose()
  }

  /** Reposition the plane under the camera — but SNAPPED to a coarse grid, so it moves
   * occasionally (once per cell crossed), not every frame. Per-frame movement was the flicker.
   * The waves are world-anchored (procedural + the bump UV offset), so a snap is seamless: the
   * same sea, a differently-centred mesh. `follow` only. */
  private _applyFollow(): void {
    const cam = this.owner?.scene.activeCamera
    if (!cam || !this.mesh) return
    const size = Math.max(1, (this as any).waterSize)
    const step = size / 16 // snap cell — small vs the plane, so its edge is never near the view
    const p = cam.globalPosition
    const sx = Math.round(p.x / step) * step
    const sz = Math.round(p.z / step) * step
    if (this.mesh.position.x === sx && this.mesh.position.z === sz) return
    this.mesh.position.x = sx
    this.mesh.position.z = sz
    // Re-anchor the ripple to WORLD space at the new centre, so the surface detail stays put.
    const bump = this.waterMaterial?.bumpTexture as BABYLON.Texture | undefined
    if (bump) {
      bump.uOffset = (sx / size) * (bump.uScale ?? 1)
      bump.vOffset = (sz / size) * (bump.vScale ?? 1)
    }
  }

  render() {
    super.render()
    this.updateWater()
    // super.render() just wrote the plane back to its x/z attrs — put it back under the camera.
    if (this._followTick) this._applyFollow()
  }
}

export const b3dWater = B3dWater.elementCreator({ tag: 'tosi-b3d-water' })
