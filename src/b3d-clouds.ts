/*#
# b3d-clouds

A cloud layer you can **fly into** — and lose the world inside.

Not a skybox texture and not a shader: a few dozen soft blobs at an altitude, plus a **fog
whiteout** that ramps up as you penetrate one. Fly into a cloud and the world dissolves;
come out the other side and it snaps back.

## It's a TACTIC, not a texture

`insideCloud` (0…1) is exposed, so a cloud is something the game can *use*: break a radar
lock, shake a pursuer, hide a mothership until you're on top of it. That is the whole point
— **behavioural richness, not photorealism** (see AI-DESIGN.md). A cloud you can hide in is
worth more than a cloud that merely looks convincing.

## Demo

**Climb into the cloud layer** (R to throttle up, W/S pitch). Watch the world white out as
you enter, and the readout climb. Then dive back out.

```js
import { b3d, b3dAircraft, b3dClouds, b3dFog, b3dLibrary, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 40, vtolSpeed: 6, maxSpeed: 60,
})
const clouds = b3dClouds({ altitude: 140, thickness: 40, count: 40, size: 70, seed: 7 })
const readout = div({ class: 'readout' })

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.6 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dFog({ start: 400, end: 3000, color: '#bfd9f2' }),
  b3dGround({ meshName: 'ground_nocast', width: 4000, height: 4000, color: '#6b7f5e' }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  clouds,
  inputFocus(gameController(), aircraft),
)

setInterval(() => {
  const t = clouds.insideCloud
  readout.textContent = `altitude ${aircraft.altitude.toFixed(0)}   in cloud ${(t * 100).toFixed(0)}%`
  readout.style.color = t > 0.5 ? '#fff' : '#9fb'
}, 100)

preview.append(scene, readout)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.readout {
  position: absolute; bottom: 12px; left: 12px;
  padding: 6px 12px; border-radius: 6px;
  background: rgba(0,0,0,0.55); color: #9fb;
  font: 13px ui-monospace, monospace; z-index: 10;
}
```

## How it works

- **A fixed number of blobs, recycled.** `count` soft spheres are scattered (seeded) in a
  disc around you. Fly far enough and a blob that falls behind **wraps to the far side** —
  so an endless cloudscape costs a fixed, tier-friendly number of meshes and never
  allocates. (Same discipline as the terrain tile pool.)
- **The whiteout is FOG, not a post-process.** Post-processes are expensive in XR and
  awkward in stereo; fog is per-pixel and effectively free. Immersion ramps `fogDensity` up
  and `fogColor` toward the cloud's colour, then **restores whatever `b3d-fog` had set** on
  the way out — so the two compose instead of fighting.
- **Clouds are not pickable and cast no shadows.** A cloud between your controller and a
  panel — or between a missile and its target — would silently break picking and swept
  collision, and that is a bug you would chase for an hour. (We have.)

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `36` | Number of blobs (fixed — they recycle, they don't grow) |
| `altitude` | `140` | Centre height of the layer |
| `thickness` | `36` | Vertical spread of the layer |
| `spread` | `1200` | Radius of the disc of cloud around you |
| `size` | `70` | Blob radius — also the distance at which whiteout is total |
| `color` | `'#ffffff'` | Cloud (and whiteout) colour |
| `opacity` | `0.5` | Blob alpha |
| `fogDensity` | `0.05` | Fog density at full immersion (the whiteout) |
| `approach` | `0.8` | How far OUTSIDE a blob the whiteout starts (× `size`). You go white BEFORE you touch the geometry — which is what stops a crude blob from looking like a crude blob |
| `seed` | `1` | Deterministic layout — same seed, same sky |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild } from './b3d-utils'
import { MersenneTwister } from './mersenne-twister'
import { band } from './atmosphere'
import type { B3d } from './tosi-b3d'

export class B3dClouds extends B3dChild {
  static initAttributes = {
    count: 36,
    altitude: 140,
    thickness: 36,
    spread: 1200,
    size: 70,
    color: '#ffffff',
    opacity: 0.5,
    fogDensity: 0.05,
    // How far OUTSIDE a blob the whiteout begins, as a fraction of `size`. The point is to be
    // fully white before you'd ever touch the geometry — see _update().
    approach: 0.8,
    seed: 1,
  }

  declare count: number
  declare altitude: number
  declare thickness: number
  declare spread: number
  declare size: number
  declare color: string
  declare opacity: number
  declare fogDensity: number
  declare approach: number
  declare seed: number

  /**
   * How deep in a cloud you are, 0…1. **Gameplay reads this** — break a lock, hide a ship,
   * make the enemy lose you. It's why the component exists.
   */
  get insideCloud(): number {
    return this._immersion
  }

  private _blobs: BABYLON.Mesh[] = []
  private _immersion = 0
  private _removeFogLayer: (() => void) | null = null
  private _tick = () => this._update()

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    const rng = new MersenneTwister(this.seed)
    const mat = new BABYLON.StandardMaterial('cloud-mat', scene)
    mat.emissiveColor = BABYLON.Color3.FromHexString(this.color)
    mat.disableLighting = true // a lit cloud reads as a grey rock
    mat.alpha = this.opacity
    mat.backFaceCulling = false

    for (let i = 0; i < this.count; i++) {
      const blob = BABYLON.MeshBuilder.CreateSphere(
        `cloud-${i}`,
        { diameter: 2, segments: 6 }, // low-poly: it's a blob behind alpha, nobody counts facets
        scene
      )
      blob.material = mat
      // ⚠️ NOT pickable, NO shadows. A cloud between the controller and a panel — or between
      // a missile and its target — silently breaks picking and swept collision.
      blob.isPickable = false
      blob.receiveShadows = false
      // Deliberately NOT owner.register()'d: registering would enlist it as a shadow caster.
      this._placeRandom(blob, rng, { x: 0, z: 0 })
      this._blobs.push(blob)
    }

    scene.onBeforeCameraRenderObservable.add(this._tick)

    // The whiteout is a fog LAYER — the scene composites and smooths it, so it can't fight
    // b3d-fog or the sea, and nothing ever switches fogMode (see atmosphere.ts).
    const cloudColor = BABYLON.Color3.FromHexString(this.color)
    this._removeFogLayer = owner.addFogLayer(() =>
      this._immersion <= 0
        ? null
        : {
            weight: this._immersion,
            color: { r: cloudColor.r, g: cloudColor.g, b: cloudColor.b },
            density: this.fogDensity,
            // Pull the linear-fog distances in too, so the whiteout works whichever mode the
            // scene's b3d-fog chose.
            start: 0,
            end: this.size * 0.6,
          }
    )
  }

  sceneDispose() {
    this.owner?.scene.onBeforeCameraRenderObservable.removeCallback(this._tick)
    this._removeFogLayer?.()
    this._removeFogLayer = null
    for (const b of this._blobs) b.dispose()
    this._blobs = []
  }

  private _placeRandom(
    blob: BABYLON.Mesh,
    rng: MersenneTwister,
    centre: { x: number; z: number }
  ): void {
    const a = rng.random() * Math.PI * 2
    const r = Math.sqrt(rng.random()) * this.spread // sqrt → even area density, not a clump
    const s = this.size * (0.6 + rng.random() * 0.8)
    blob.position.set(
      centre.x + Math.cos(a) * r,
      this.altitude + (rng.random() - 0.5) * this.thickness,
      centre.z + Math.sin(a) * r
    )
    // Squash them: clouds are wider than they are tall, and a sphere reads as a balloon.
    blob.scaling.set(s, s * 0.45, s)
  }

  private _update(): void {
    const scene = this.owner?.scene
    const cam = scene?.activeCamera
    if (scene == null || cam == null) return
    const eye = cam.globalPosition

    // Recycle: a blob that falls behind wraps to the far side, so an endless cloudscape
    // costs a FIXED number of meshes. No allocation, no growth.
    let nearest = Infinity
    for (const blob of this._blobs) {
      const dx = blob.position.x - eye.x
      const dz = blob.position.z - eye.z
      const flat = Math.hypot(dx, dz)
      if (flat > this.spread) {
        blob.position.x = eye.x - dx
        blob.position.z = eye.z - dz
      }
      const dy = blob.position.y - eye.y
      // Distance to the blob's SURFACE, roughly — its x/z radius is scaling.x.
      const d = Math.hypot(dx, dy / 0.45, dz) - blob.scaling.x
      if (d < nearest) nearest = d
    }

    // WHITEOUT ON APPROACH — not on entry.
    //
    // `nearest` is the distance to the blob's SURFACE. If the whiteout only began once you
    // were inside (nearest < 0), you'd watch yourself fly THROUGH a polygon — and these blobs
    // are crude on purpose. Instead the fog closes in over `approach` metres *outside* the
    // cloud and is total by the time you reach the skin, so you never see the geometry you're
    // entering. That's what makes cheap clouds look like weather.
    const approach = Math.max(1, this.size * this.approach)
    this._immersion = band(nearest, approach, 0)
  }
}

export const b3dClouds = B3dClouds.elementCreator({
  tag: 'tosi-b3d-clouds',
}) as (...args: unknown[]) => B3dClouds
