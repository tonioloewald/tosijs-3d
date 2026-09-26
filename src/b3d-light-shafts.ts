/*#
# b3d-light-shafts

**Sunlight breaking through the cloud in shafts** (WEATHER-DESIGN stage 4,
board #1084). Put one in a scene with a
[`<tosi-b3d-cloud-deck>`](/b3d-cloud-deck/) and a sun; it finds the GAPS in
the cloud beside thicker cloud (the deck's `opacityAbove`) near you, and hangs
a soft shaft of light from each, slanted along the sun's direction down to the
ground.

They are brightest in a medium that scatters, so rain makes them (Tonio:
"rain is probably also useful for sun shafts"): the strength rises with the
precipitation where you are. That is also why the classic look is a storm's
edge, where the sun breaks through into falling rain.

Camera-facing quads, per MEDIUM-DESIGN §4: cheap, sheddable garnish that
reads well at a distance. `count` is the budget; `0` switches them off.

## Demo

A broken sky late in the afternoon, with a shower overhead. Shafts appear
where the sun finds a gap and fade as the gaps drift.

```js
import { b3d, b3dSun, b3dSkybox, b3dCloudDeck, b3dWeatherCell, b3dLightShafts, b3dGround } from 'tosijs-3d'

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 30, -500), el.scene)
        cam.setTarget(new BABYLON.Vector3(0, 250, 400))
        cam.maxZ = 20000
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
      },
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: 16.5, realtimeScale: 0 }),
    b3dGround({ width: 6000, height: 6000, color: '#4a5a44' }),
    b3dCloudDeck({ altitude: 420, coverage: 0.6 }),
    b3dWeatherCell({ x: 0, z: 0, radius: 1500, precipitation: 0.7 }),
    b3dLightShafts({}),
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `10` | How many shafts at most (the budget). `0` = off |
| `radius` | `900` | How far from you (m) to look for gaps |
| `width` | `90` | Shaft width (m) |
| `strength` | `0.2` | Brightness in clear air; rain adds to it |
| `rainBoost` | `1.5` | How much precipitation at the viewer multiplies the strength |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, sceneDelta } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'

type Deck = {
  opacityAbove?: (x: number, z: number) => number
  altitude?: number
}

interface Shaft {
  mesh: BABYLON.Mesh
  x: number
  z: number
  /** Current fade 0–1 and where it is heading. */
  level: number
  target: number
}

const UP = new BABYLON.Vector3(0, 1, 0)

export class B3dLightShafts extends B3dChild {
  static preferredTagName = 'tosi-b3d-light-shafts'

  static initAttributes = {
    count: 10,
    radius: 900,
    width: 90,
    strength: 0.2,
    rainBoost: 1.5,
  }

  declare count: number
  declare radius: number
  declare width: number
  declare strength: number
  declare rainBoost: number

  private _shafts: Shaft[] = []
  private _mat: BABYLON.StandardMaterial | null = null
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _since = 1e9
  private _seq = 0

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this._obs = scene.onBeforeRenderObservable.add(() => {
      try {
        this._tick(owner, scene)
      } catch {
        /* garnish must never break the frame */
      }
    })
  }

  private _material(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    if (this._mat != null) return this._mat
    /*
    ONE soft texture for every shaft: brightest at the top where the light
    comes through, fading down its length, feathered at both edges so a quad
    never shows its outline.
    */
    const w = 64
    const h = 256
    const tex = new BABYLON.DynamicTexture(
      'shaft',
      { width: w, height: h },
      scene,
      false
    )
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      const down = y / (h - 1)
      const along = Math.pow(1 - down, 1.6) * Math.min(1, down * 12 + 0.2)
      for (let x = 0; x < w; x++) {
        const across = 1 - Math.abs((x + 0.5) / w - 0.5) * 2
        const soft = across * across * (3 - 2 * across)
        const v = Math.round(255 * along * soft)
        const i = (y * w + x) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = v
      }
    }
    ctx.putImageData(img, 0, 0)
    tex.update()
    const m = new BABYLON.StandardMaterial('shaft-mat', scene)
    m.disableLighting = true
    m.emissiveTexture = tex
    m.opacityTexture = tex
    m.diffuseColor = BABYLON.Color3.Black()
    m.alphaMode = BABYLON.Constants.ALPHA_ADD
    m.disableDepthWrite = true
    m.backFaceCulling = false
    this._mat = m
    return m
  }

  private _tick(owner: B3d, scene: BABYLON.Scene): void {
    const deck = owner.querySelector(
      'tosi-b3d-cloud-deck'
    ) as unknown as Deck | null
    const cam = scene.activeCamera
    const sun = scene.lights.find(
      (l) => l instanceof BABYLON.DirectionalLight
    ) as BABYLON.DirectionalLight | undefined
    const want = Math.max(0, Math.floor(this.count))
    // The light's TRAVEL direction; shafts need it pointing down.
    const dir = sun?.direction.clone().normalize()
    const sunUp = dir != null && dir.y < -0.08 && (sun?.intensity ?? 0) > 0.05
    if (deck?.opacityAbove == null || cam == null || !sunUp || want === 0) {
      for (const s of this._shafts) s.target = 0
    } else {
      this._since += sceneDelta(scene)
      if (this._since > 0.5) {
        this._since = 0
        this._place(deck, cam.globalPosition, want, scene)
      }
    }
    const dt = sceneDelta(scene)
    const w = owner.weatherHere()
    // Rain scatters light: that is what makes a shaft visible at all.
    const scatter =
      Math.max(0, this.strength) *
      (1 + Math.max(0, this.rainBoost) * w.precipitation)
    const color = sun
      ? sun.diffuse.scale(Math.min(1.5, sun.intensity))
      : BABYLON.Color3.White()
    if (this._mat) this._mat.emissiveColor = color.scale(scatter)
    const base = deck?.altitude ?? 400
    for (const s of this._shafts) {
      s.level += Math.max(-1, Math.min(1, (s.target - s.level) * dt * 1.5))
      s.level = Math.max(0, Math.min(1, s.level))
      s.mesh.visibility = s.level
      s.mesh.isVisible = s.level > 0.01
      if (!s.mesh.isVisible || dir == null || cam == null) continue
      this._orient(s, dir, base, cam.globalPosition)
    }
    // Drop shafts that have faded out and are no longer wanted.
    this._shafts = this._shafts.filter((s) => {
      if (s.target === 0 && s.level <= 0.001) {
        s.mesh.dispose()
        return false
      }
      return true
    })
  }

  /**
   * Score candidate points around the viewer: a GAP (low opacity above)
   * beside CLOUD (high opacity nearby) is where the sun breaks through.
   * Keep the best `want`; existing shafts that still score stay put, so they
   * fade rather than jump.
   */
  private _place(
    deck: Deck,
    eye: BABYLON.Vector3,
    want: number,
    scene: BABYLON.Scene
  ): void {
    // BOUND: detached, `this` is undefined inside it, it throws, and the
    // tick's try/catch swallows it, so no shaft ever appeared (first run).
    const op = deck.opacityAbove!.bind(deck)
    const r = Math.max(50, this.radius)
    const step = r / 7
    const scored: Array<{ x: number; z: number; score: number }> = []
    // A world-anchored grid, so the same gap scores the same as you move.
    const gx0 = Math.floor((eye.x - r) / step)
    const gz0 = Math.floor((eye.z - r) / step)
    for (let i = 0; i <= 14; i++) {
      for (let j = 0; j <= 14; j++) {
        const x = (gx0 + i) * step
        const z = (gz0 + j) * step
        const away = Math.hypot(x - eye.x, z - eye.z)
        // Not on top of you: a shaft you are standing in is a white wall, not
        // a ray. Rays are seen from the side, at a distance.
        if (away > r || away < Math.min(250, r * 0.3)) continue
        const here = op(x, z)
        if (here > 0.35) continue // not a gap
        const d = step * 0.6
        const around = Math.max(
          op(x + d, z),
          op(x - d, z),
          op(x, z + d),
          op(x, z - d)
        )
        const score = (1 - here) * around
        if (score > 0.25) scored.push({ x, z, score })
      }
    }
    scored.sort((a, b) => b.score - a.score)
    const chosen = scored.slice(0, want)
    const key = (p: { x: number; z: number }) =>
      `${Math.round(p.x)},${Math.round(p.z)}`
    const keep = new Set(chosen.map(key))
    for (const s of this._shafts) s.target = keep.has(key(s)) ? 1 : 0
    const have = new Set(this._shafts.filter((s) => s.target > 0).map(key))
    for (const c of chosen) {
      if (have.has(key(c))) continue
      const mesh = BABYLON.MeshBuilder.CreatePlane(
        `shaft-${this._seq++}`,
        { width: 1, height: 1 },
        scene
      )
      mesh.material = this._material(scene)
      mesh.isPickable = false
      mesh.visibility = 0
      this._shafts.push({ mesh, x: c.x, z: c.z, level: 0, target: 1 })
    }
  }

  /** Hang the shaft from the cloud base along the sun, facing the camera
   * about its own axis (a plane's long side stays on the light's path). */
  private _orient(
    s: Shaft,
    dir: BABYLON.Vector3,
    base: number,
    eye: BABYLON.Vector3
  ): void {
    const len = base / Math.max(0.1, -dir.y)
    const top = new BABYLON.Vector3(s.x, base, s.z)
    const centre = top.add(dir.scale(len / 2))
    // Plane Y (its height) runs UP the shaft, toward the gap.
    const axis = dir.scale(-1)
    const toCam = eye.subtract(centre)
    let right = BABYLON.Vector3.Cross(axis, toCam)
    if (right.lengthSquared() < 1e-6) right = BABYLON.Vector3.Cross(axis, UP)
    right.normalize()
    const normal = BABYLON.Vector3.Cross(right, axis).normalize()
    s.mesh.rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(
      right,
      axis,
      normal
    )
    s.mesh.position.copyFrom(centre)
    s.mesh.scaling.set(Math.max(1, this.width), len, 1)
  }

  sceneDispose() {
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
    for (const s of this._shafts) s.mesh.dispose()
    this._shafts = []
    this._mat?.dispose(true, true)
    this._mat = null
  }
}

export const b3dLightShafts = B3dLightShafts.elementCreator()
