/*#
# b3d-clouds

A cloud layer you can **fly into** — and lose the world inside.

Not a skybox texture and not a shader: a few dozen **opaque** blobs at an altitude, plus a
**fog whiteout** that goes total *before* you reach one. Fly into a cloud and the world is
already gone; you're in white until you come out the far side.

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
const clouds = b3dClouds({ altitude: 140, thickness: 40, count: 40, size: 70, castShadows: true, seed: 7 })
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
- **Lit, not flat.** The blobs are lit by the scene's sun, so their tops catch light and their
  undersides fall dark — which is most of what reads as *cloud* rather than a decal. `selfIllum`
  keeps a thin cloud glowing a little (the old fully-emissive look is `selfIllum: 1`); a
  thunderhead wants it near 0 so the underbelly goes properly dark.
- **The whiteout darkens as you sink.** Inside a cloud the fog colour isn't a flat white — it's
  white near the top of the layer and murkier the deeper you go, and a thick/heavy (`coverage`)
  cloud goes properly dark while a thin one barely dims. That's the difference between flying
  through a fair-weather puff and the gloom inside a thunderhead.
- **One dial from clear sky to thunderheads.** `coverage` (0…1) is the weather knob — it gates how
  many blobs are in the sky, how opaque and dark they are, and how much they self-illuminate.
  Bind it to a slider and fly from wisps to overcast. (Blob *size* is fixed at build, so that one
  needs a reload; everything else moves live.)
- **Clouds are never pickable; shadows are a projected texture.** A cloud between your controller
  and a panel — or between a missile and its target — would silently break picking and swept
  collision, so `isPickable` is always off. Shadow *casting* is `castShadows` (default off) and
  goes through neither the shadow map (a cloud at altitude is out of cascade range) nor decals (a
  flat quad can't conform to terrain): the whole field is painted top-down into **one small
  texture** ([cloud-shadows](?cloud-shadows.ts)) that every shadow-receiving material samples by
  world position — so the shadows drape over hills and valleys per-pixel, offset along the sun,
  darkened by `shadowStrength` × `coverage`, repainted only when the sky actually changes.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `36` | Blob POOL size (fixed — they recycle, they don't grow). `coverage` decides how many are active |
| `altitude` | `140` | Centre height of the layer |
| `thickness` | `36` | Vertical spread of the layer |
| `spread` | `1200` | Radius of the disc of cloud around you |
| `size` | `70` | Blob radius — also the distance at which whiteout is total. Set at build |
| `color` | `'#ffffff'` | Cloud (and whiteout) colour |
| `opacity` | `1` | Blob alpha. Default OPAQUE — translucent clouds read badly. Set < 1 only for deliberate wisps |
| `fogDensity` | `1.0` | Whiteout density (EXP2, the scene's mode). HIGH on purpose — inside a cloud you should see nothing but white within a few metres |
| `approach` | `0.5` | Where the whiteout BEGINS, × `size` outside the blob. It's TOTAL well before the surface (you never see the geometry edge) and stays total until you leave |
| `selfIllum` | `0.35` | Self-illumination 0…1 — `1` ≈ fully self-lit (old look), `0` = only sun-lit (dark undersides) |
| `coverage` | `0.5` | Weather dial 0…1: wisps → overcast/thunderheads. LIVE. Gates active count + opacity + darkness + self-illum |
| `castShadows` | `false` | Opt-in: project the field's shadows onto every shadow-receiving surface ([cloud-shadows](?cloud-shadows.ts)) |
| `shadowStrength` | `0.65` | Darkness of those shadows 0…1, scaled further by `coverage` (≈50% darkening at typical coverage) |
| `seed` | `1` | Deterministic layout — same seed, same sky |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild } from './b3d-utils'
import { MersenneTwister } from './mersenne-twister'
import { band } from './atmosphere'
import {
  CloudShadowMap,
  projectShadowXZ,
  type CloudShadowBlob,
} from './cloud-shadows'
import type { B3d } from './tosi-b3d'

const DOWN = { x: 0, y: -1, z: 0 }

export class B3dClouds extends B3dChild {
  static initAttributes = {
    count: 36,
    altitude: 140,
    thickness: 36,
    spread: 1200,
    size: 70,
    color: '#ffffff',
    // OPAQUE by default. Translucent blobs read badly — you see through them and overlapping
    // alpha muddies. A cloud is solid; the fog is what softens the approach, not see-through
    // geometry. (You *can* set < 1 for wisps, but the default is a solid cloud.)
    opacity: 1,
    // EXP2 fog (the scene's only mode), so this is the whiteout density and it has to be HIGH
    // to be BLINDING: you shouldn't see your own aircraft from the chase cam inside a cloud.
    // ~1.0 whites out the world within ~2-3 m.
    fogDensity: 1.0,
    // How far OUTSIDE a blob the whiteout BEGINS, as a fraction of `size`. It reaches FULL well
    // before the surface (see _update) so the cloud is completely white BEFORE you'd see the
    // geometry edge — which is the real experience: fluffy from afar, blinding as you reach it.
    approach: 0.8,
    // 0…1 self-illumination. Clouds are LIT now (darker underneath, sun from above), but a thin
    // cloud glows a little on its own — this is that floor. 1 ≈ the old fully-emissive look;
    // a thunderhead wants it near 0 so its underbelly goes properly dark.
    selfIllum: 0.35,
    // 0…1 the master weather dial: virtually-no-cloud → overcast/thunderheads. Drives how many
    // blobs are active, their opacity, and how dark+un-self-lit they get. LIVE (bind it to a
    // slider). Blob SIZE is set at build, so a size change needs a reload; everything else
    // responds immediately.
    coverage: 0.5,
    // Opt-in: project the field's shadows onto every shadow-receiving surface via ONE top-down
    // texture (cloud-shadows.ts) sampled by world position. NOT the cascaded shadow map — a
    // cloud at altitude is out of CSM range — and not decals, which can't conform to terrain.
    // Off by default (it wants a ground to fall on).
    castShadows: false,
    // Darkness of those shadows, 0…1. Scaled further by `coverage` (an overcast sky shadows
    // harder than a few wisps). 0 ⇒ invisible even with castShadows on.
    shadowStrength: 0.65,
    seed: 1,
    // Drift (m/s): the layer slides across the sky so clouds aren't a static backdrop. Gentle by
    // default so it reads as WEATHER, not a frozen image — recycled blobs wrap in from upwind and
    // fade up. (A future global wind system will drive these; for now they're the local dial.)
    windX: 4,
    windZ: 1.5,
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
  declare selfIllum: number
  declare coverage: number
  declare castShadows: boolean
  declare shadowStrength: number
  declare seed: number
  declare windX: number
  declare windZ: number

  /**
   * How deep in a cloud you are, 0…1. **Gameplay reads this** — break a lock, hide a ship,
   * make the enemy lose you. It's why the component exists.
   */
  get insideCloud(): number {
    return this._immersion
  }

  private _blobs: BABYLON.Mesh[] = []
  /** Projected cloud-shadow texture (cloud-shadows.ts), when castShadows is on. */
  private _shadowMap: CloudShadowMap | null = null
  /** Something moved (recycle, coverage, sun, window) — repaint on the next throttled beat. */
  private _shadowDirty = true
  private _shadowRepaintAge = 0
  private _lastSweptMeshCount = -1
  private _lastSunDir = new BABYLON.Vector3(0, -1, 0)
  private _sun: BABYLON.DirectionalLight | null = null
  private _removeDebug: (() => void) | null = null
  private _immersion = 0
  private _removeFogLayer: (() => void) | null = null
  private _mat: BABYLON.StandardMaterial | null = null
  private _baseColor = new BABYLON.Color3(1, 1, 1)
  /** Whiteout colour, recomputed each frame — white at the cloud top, murk deeper down. */
  private _fogColor = new BABYLON.Color3(1, 1, 1)
  /** The skybox, so the whiteout can blot the SKY too (scene fog alone can't — it opts out). */
  private _sky: BABYLON.AbstractMesh | null = null
  private _lastCoverage = -1
  private _tick = () => this._update()
  private _onShift = (dx: number, dz: number) => {
    for (const b of this._blobs) {
      b.position.x += dx
      b.position.z += dz
    }
    this._shadowDirty = true
  }
  /** New meshes join the scene (terrain tiles, loaded GLBs) → attach the shadow hook to any
   * that declare themselves receivers. */
  private _onAddition = (additions: { meshes?: BABYLON.AbstractMesh[] }) => {
    const map = this._shadowMap
    if (map == null || additions.meshes == null) return
    for (const m of additions.meshes) {
      if (m.receiveShadows && m.material) map.attachTo(m.material)
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    const rng = new MersenneTwister(this.seed)
    this._baseColor = BABYLON.Color3.FromHexString(this.color)
    const mat = new BABYLON.StandardMaterial('cloud-mat', scene)
    // FLAT by default — deliberate, not lazy. A cloud is a CLUMP of overlapping opaque blobs; the
    // moment they're LIT, adjacent blobs shade differently, so wherever two surfaces coincide in
    // depth the z-fight becomes VISIBLE and flickers like crazy as you tilt (worse once they
    // drift). Flat, every blob is the SAME colour, so the z-fight is invisible — no flicker, ever.
    // Form comes from the projected shadow + the fog whiteout + the silhouette, not per-blob
    // shading. (A lit-but-stable version needs a single merged mesh or a deterministic opaque
    // sort so ties don't flip — tracked in TODO. `backFaceCulling` ON for the same reason: a
    // blob's dark interior must not compete with a neighbour's exterior in the depth buffer.)
    mat.diffuseColor = this._baseColor
    mat.emissiveColor = this._baseColor.clone() // fully self-lit → flat lit blob, not a grey rock
    mat.specularColor = BABYLON.Color3.Black()
    mat.disableLighting = true
    mat.alpha = this.opacity
    mat.backFaceCulling = true
    this._mat = mat

    const sizeMul = 0.7 + this.coverage * 0.6 // denser sky → bigger, more-overlapping blobs
    for (let i = 0; i < this.count; i++) {
      const blob = BABYLON.MeshBuilder.CreateSphere(
        `cloud-${i}`,
        { diameter: 2, segments: 6 }, // low-poly: it's a blob behind alpha, nobody counts facets
        scene
      )
      blob.material = mat
      // ⚠️ NOT pickable. A cloud between the controller and a panel — or between a missile and
      // its target — silently breaks picking and swept collision. (Shadow CASTING is opt-in
      // below; picking must stay off regardless.)
      blob.isPickable = false
      blob.receiveShadows = false
      this._placeRandom(blob, rng, { x: 0, z: 0 }, sizeMul)
      this._blobs.push(blob)
    }

    // Shadow casting is opt-in and does NOT go through the shadow map (a cloud at altitude is
    // out of CSM range) — nor decals (a flat quad can't conform to terrain). The whole field is
    // painted top-down into ONE texture (cloud-shadows.ts) that shadow-receiving materials
    // sample by world position, so the shadows drape over any topology. See _updateShadows.
    if (this.castShadows) {
      this._sun =
        (scene.lights.find(
          (l) => l instanceof BABYLON.DirectionalLight
        ) as BABYLON.DirectionalLight) ?? null
      // Window: the blob disc plus room for the sun to throw shadows sideways off a high cloud.
      this._shadowMap = new CloudShadowMap(
        scene,
        (this.spread + this.altitude * 1.5) * 2
      )
      for (const m of scene.meshes) {
        if (m.receiveShadows && m.material) this._shadowMap.attachTo(m.material)
      }
      owner.addSceneListener(this._onAddition)
      // The Perf Stats panel is the one debug readout that exists everywhere (incl. VR).
      this._removeDebug = owner.addDebugSource({
        name: 'cloud-shadows',
        lines: () => {
          const map = this._shadowMap
          if (map == null) return ['off']
          return [
            `receivers ${map.attachedCount}  painted ${map.lastPaintCount}`,
            `window ${map.worldSize.toFixed(0)}m @ (${map.centerX.toFixed(
              0
            )}, ${map.centerZ.toFixed(0)})`,
          ]
        },
      })
    }

    // Floating origin: blob positions are WORLD coordinates held in JS, so on a terrain rebase
    // they must shift with everything else or the whole sky would jump. (The per-frame recycle
    // would eventually mask it, but not without a visible lurch.)
    owner.addOriginListener(this._onShift)

    scene.onBeforeCameraRenderObservable.add(this._tick)

    // The whiteout is a fog LAYER — the scene composites and smooths it, so it can't fight
    // b3d-fog or the sea, and nothing ever switches fogMode (see atmosphere.ts). The colour is
    // computed each frame (`_fogColor`) — white near the top, darkening as you sink into a
    // thick cloud.
    this._removeFogLayer = owner.addFogLayer(() =>
      this._immersion <= 0
        ? null
        : {
            weight: this._immersion,
            color: {
              r: this._fogColor.r,
              g: this._fogColor.g,
              b: this._fogColor.b,
            },
            density: this.fogDensity,
            // The scene's fog is usually LINEAR (b3d-fog defaults to it), so DENSITY above is
            // ignored and it's `end` that decides opacity — and a big end is never opaque
            // close-up (that was the "fog never reaches full white" bug). Pull `end` right in
            // to a few metres: at full immersion the linear ramp is total within arm's reach,
            // so you cannot see your own aircraft. At partial immersion the composite lerps end
            // back out toward the base fog, which is the approach haze. Density still covers the
            // EXP2 case for scenes with no b3d-fog.
            start: 0,
            end: Math.max(4, this.size * 0.06),
          }
    )
  }

  sceneDispose() {
    this.owner?.scene.onBeforeCameraRenderObservable.removeCallback(this._tick)
    this.owner?.removeOriginListener(this._onShift)
    this._removeFogLayer?.()
    this._removeFogLayer = null
    for (const b of this._blobs) b.dispose()
    this._blobs = []
    this.owner?.removeSceneListener(this._onAddition)
    this._removeDebug?.()
    this._removeDebug = null
    this._shadowMap?.dispose()
    this._shadowMap = null
    this._sun = null
  }

  private _placeRandom(
    blob: BABYLON.Mesh,
    rng: MersenneTwister,
    centre: { x: number; z: number },
    sizeMul = 1
  ): void {
    const a = rng.random() * Math.PI * 2
    const r = Math.sqrt(rng.random()) * this.spread // sqrt → even area density, not a clump
    const s = this.size * (0.6 + rng.random() * 0.8) * sizeMul
    blob.position.set(
      centre.x + Math.cos(a) * r,
      this.altitude + (rng.random() - 0.5) * this.thickness,
      centre.z + Math.sin(a) * r
    )
    // Squash them: clouds are wider than they are tall, and a sphere reads as a balloon.
    blob.scaling.set(s, s * 0.45, s)
  }

  /** Apply the `coverage` weather dial: how many blobs are active, how opaque, how dark, and
   * how much they still self-illuminate. Live — cheap enough to run when coverage moves. */
  private _applyCoverage(): number {
    const cov = Math.min(1, Math.max(0, this.coverage))
    const active = Math.max(1, Math.round(this.count * (0.25 + 0.75 * cov)))
    if (cov !== this._lastCoverage && this._mat != null) {
      this._lastCoverage = cov
      this._shadowDirty = true
      // Thicker sky ⇒ darker (storm grey). Opacity is NOT touched — the blobs are solid; coverage
      // changes how MANY and how DARK, not how see-through. Flat model: emissive IS what shows.
      const dark = 1 - 0.5 * cov
      this._mat.diffuseColor = this._baseColor.scale(dark)
      this._mat.emissiveColor = this._baseColor.scale(dark)
    }
    return active
  }

  /** Repaint the projected shadow texture when something changed (a blob recycled, coverage or
   * the sun moved, the window drifted off the camera) — throttled, so the steady state costs
   * nothing but the per-pixel sample the receiving materials already do. */
  private _updateShadows(eye: BABYLON.Vector3, active: number): void {
    const map = this._shadowMap
    const scene = this.owner?.scene
    if (map == null || scene == null) return
    if (this._shadowRepaintAge-- > 0) return
    this._shadowRepaintAge = 10 // frames between checks — shadows are slow-moving
    // Lazy attach sweep: receivers arrive on their own schedule (terrain builds its tile pool
    // whenever it's ready, GLBs load async) and registration order isn't guaranteed. addSceneListener
    // catches registered arrivals; this is the backstop for anything else — but only when the mesh
    // COUNT changed, so the steady state costs one length compare, not an O(meshes) sweep forever.
    if (scene.meshes.length !== this._lastSweptMeshCount) {
      this._lastSweptMeshCount = scene.meshes.length
      for (const m of scene.meshes) {
        if (m.receiveShadows && m.material) map.attachTo(m.material)
      }
    }
    // Window drift: recentre once the camera strays a decent fraction of the window.
    const drift = Math.hypot(eye.x - map.centerX, eye.z - map.centerZ)
    if (drift > map.worldSize * 0.1) this._shadowDirty = true
    // Sun swing (time-of-day): repaint when the direction has moved meaningfully.
    const dir = this._sun?.direction
    if (dir && BABYLON.Vector3.Dot(dir, this._lastSunDir) < 0.9995) {
      this._lastSunDir.copyFrom(dir)
      this._shadowDirty = true
    }
    if (!this._shadowDirty) return
    this._shadowDirty = false
    map.setCenter(eye.x, eye.z)
    // A thicker sky shadows harder, but even a few wisps throw a readable shadow — so the
    // coverage term has a high floor (0.6) rather than fading the shadow away with the cloud count.
    const strength =
      Math.min(1, Math.max(0, this.shadowStrength)) *
      (0.6 + 0.4 * Math.min(1, Math.max(0, this.coverage)))
    const sun = dir ?? DOWN
    // Tell the shader the same sun + ground plane the blobs are projected to, so a receiver at
    // altitude (the aircraft) projects itself down the sun and gets shaded by the cloud overhead.
    // layerTop stops a receiver flying ABOVE the clouds from being falsely shadowed.
    map.setSun(sun, 0)
    map.layerTop = this.altitude + this.thickness / 2
    const blobs: CloudShadowBlob[] = []
    for (let i = 0; i < active && i < this._blobs.length; i++) {
      const b = this._blobs[i]
      const at = projectShadowXZ(b.position.x, b.position.y, b.position.z, sun)
      // Footprint a touch wider than the blob — a shadow spreads.
      blobs.push({
        x: at.x,
        z: at.z,
        rx: b.scaling.x * 1.2,
        rz: b.scaling.z * 1.2,
        strength,
      })
    }
    map.paint(blobs)
  }

  private _update(): void {
    const scene = this.owner?.scene
    const cam = scene?.activeCamera
    if (scene == null || cam == null) return
    const eye = cam.globalPosition
    const active = this._applyCoverage()
    const dt = Math.min(0.1, (scene.getEngine().getDeltaTime() || 16) / 1000)
    const drifting = this.windX !== 0 || this.windZ !== 0

    // Recycle: a blob that falls behind wraps to the far side, so an endless cloudscape
    // costs a FIXED number of meshes. No allocation, no growth.
    let nearest = Infinity
    for (let i = 0; i < this._blobs.length; i++) {
      const blob = this._blobs[i]
      // `coverage` gates how many of the pool are in the sky — the rest sit disabled (no draw,
      // no whiteout contribution) so "virtually no clouds" really is a near-empty sky.
      const on = i < active
      if (blob.isEnabled() !== on) blob.setEnabled(on)
      if (!on) continue
      // Drift with the wind so the sky is alive, not a still image. The recycle below wraps a blob
      // once it drifts off-field, and the edge fade hides the wrap. Shadows follow (dirty flag).
      if (drifting) {
        blob.position.x += this.windX * dt
        blob.position.z += this.windZ * dt
        this._shadowDirty = true
      }
      // Recycle with HYSTERESIS: only wrap a blob once it's well PAST the edge, and drop it back to
      // just INSIDE the opposite edge — never right at the boundary.
      //
      // ⚠️ The old code reflected across the eye (`eye - dx`), which keeps the SAME distance from
      // it — so a blob just past `spread` landed just past it on the far side and re-triggered EVERY
      // frame: a per-frame ping-pong that teleported the handful of boundary blobs back and forth.
      // Static it looked fine (no blob was past `spread`); the moment the camera moved, a few blobs
      // crossed the ring and "flickered like crazy". The gap between the wrap threshold (`s + pad`)
      // and the landing point (`s - inset`) is the hysteresis band that stops any boundary thrash —
      // and landing at a fixed inset (not a same-distance reflection or a modulo) means even a
      // camera that jumps far in one frame lands cleanly inside.
      const s = this.spread
      const pad = s * 0.08 // must be this far PAST the edge before it recycles
      const inset = s * 0.05 // and reappears this far INSIDE the opposite edge
      const wrapAxis = (p: number, e: number): number => {
        const r = p - e
        if (r > s + pad) return e - (s - inset) // off the far edge → reappear just inside the near
        if (r < -(s + pad)) return e + (s - inset)
        return p
      }
      const nx = wrapAxis(blob.position.x, eye.x)
      const nz = wrapAxis(blob.position.z, eye.z)
      if (nx !== blob.position.x || nz !== blob.position.z) {
        blob.position.x = nx
        blob.position.z = nz
        this._shadowDirty = true
      }
      const dx = blob.position.x - eye.x
      const dz = blob.position.z - eye.z
      // Fade near the field edge so a recycled blob doesn't POP: it's already nearly invisible by
      // the time it reaches the boundary, wraps while unseen, then fades back up as it drifts inward.
      // (`visibility` is per-mesh, so it composes with the shared material's `opacity`.)
      const edgeDist = s - Math.max(Math.abs(dx), Math.abs(dz))
      blob.visibility = Math.min(1, Math.max(0, edgeDist / (s * 0.35)))
      const dy = blob.position.y - eye.y
      // True WORLD distance to the squashed-ellipsoid surface along the view ray — so the whiteout
      // builds over the same real distance from any direction. The old `hypot(dx, dy/0.45, dz) -
      // rx` put the surface in the right place but measured the APPROACH in stretched units
      // vertically, so coming at a flat cloud from above/below the fog only arrived at the last
      // moment. `nd` is the normalized ellipsoid distance (1 at the skin); dc·(nd-1)/nd is how far
      // that skin is in real metres.
      const sx = blob.scaling.x
      const sy = blob.scaling.y
      const dc = Math.hypot(dx, dy, dz)
      const nd = Math.hypot(dx / sx, dy / sy, dz / sx)
      const d = nd > 0 ? (dc * (nd - 1)) / nd : -sx
      if (d < nearest) nearest = d
    }

    this._updateShadows(eye, active)

    // WHITEOUT ON APPROACH — and TOTAL BEFORE ENTRY.
    //
    // `nearest` is the distance to the blob's SURFACE. The fog begins closing in `approach`
    // metres outside the cloud and reaches FULL at `fullDist` — still OUTSIDE the geometry — so
    // you go completely white before you'd ever see the crude blob edge, and (because `band`
    // clamps to 1 for anything nearer, including negative = inside) you STAY white the whole
    // time you're in the cloud, until you come out the far side.
    const startDist = Math.max(1, this.size * this.approach)
    // Reach FULL immersion well before the surface (0.6·startDist, was 0.3): the scene fog is
    // temporally smoothed (~0.25s), so at 60 m/s the *visible* whiteout lags the immersion ramp by
    // ~15 m. Ramping to full earlier means the density has time to build to opaque BEFORE you enter
    // — otherwise the fog reads as "snapping on right at entry" and, on a fast pass, never fully
    // settles (distant geometry/shadows show through). Total whiteout is still comfortably close.
    const fullDist = startDist * 0.6
    this._immersion = band(nearest, startDist, fullDist)

    // Whiteout COLOUR by vertical depth: white near the cloud top, darkening as you sink. The
    // top of the layer is `altitude + thickness/2`; how far below it you sit (0…thickness) sets
    // the murk, and a thick/heavy (high-`coverage`) cloud goes properly dark while a thin one
    // barely dims — the difference between a fair-weather puff and the inside of a thunderhead.
    if (this._immersion > 0) {
      const top = this.altitude + this.thickness / 2
      const frac =
        this.thickness > 0
          ? Math.min(1, Math.max(0, (top - eye.y) / this.thickness))
          : 0
      const cov = Math.min(1, Math.max(0, this.coverage))
      const shade = 1 - 0.8 * frac * (0.35 + 0.65 * cov)
      this._fogColor.copyFrom(this._baseColor).scaleInPlace(shade)
    }

    // Blot the SKY too. The whiteout is scene fog, but the skybox is infinite-distance and opts
    // OUT of fog (applyFog=false — obey it and the sky would be white ALWAYS), so without this the
    // sky shows straight through the whiteout. Fade the skybox by immersion; the fading sky reveals
    // the scene clear colour, which we tint to the fog colour so what's behind it is white, not
    // black. (Geometry is already whited out by the scene fog itself.)
    if (this._sky == null)
      this._sky = scene.meshes.find((m) => /sky/i.test(m.name)) ?? null
    if (this._sky != null) {
      this._sky.visibility = 1 - this._immersion
      if (this._immersion > 0)
        scene.clearColor.set(
          this._fogColor.r,
          this._fogColor.g,
          this._fogColor.b,
          1
        )
    }
  }
}

export const b3dClouds = B3dClouds.elementCreator({
  tag: 'tosi-b3d-clouds',
}) as (...args: unknown[]) => B3dClouds
