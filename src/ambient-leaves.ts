/*#
# ambient-leaves

The one ambient effect that is **not a sprite**.

Motes, rain and bubbles are camera-facing dots — a billboard always turns its face to you, which
is exactly what you want for something round. A leaf is not round. Its whole read is that it
**tumbles**: it flashes broadside, thins to an invisible edge, flips, shows its back. A billboard
can never do that (it has no back to show), so leaves are real two-sided quads with per-particle
3-D rotation — a Babylon `SolidParticleSystem`, not a `ParticleSystem`.

Everything else is shared with [b3d-ambient](?b3d-ambient.ts): the emitter box rides the camera so
the cost is fixed no matter how big the world is, the population is what the budget grants, and the
field DRAINS rather than being switched off. `B3dAmbient` owns all of that and drives this renderer;
this file owns only the tumble.

> **Wind is a placeholder here.** Each leaf carries its own drift + sway + tumble, which reads fine
> in isolation but doesn't AGREE with the rain or the smoke. The shared `wind(x,y,z,t)` field
> (TODO) is what makes them all blow the same way — when it lands, drift/sway come from it and this
> per-leaf randomness becomes just the flutter on top.
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'

const TAU = Math.PI * 2
/** Fade a leaf in/out over seconds, so it drifts into view instead of blinking on. */
const FADE_IN = 0.6
const FADE_OUT = 1.2

/** Per-leaf state we hang off each solid particle. */
type LeafProps = {
  axis: BABYLON.Vector3
  tumble: number
  fall: number
  swayAmp: number
  swayFreq: number
  phase: number
  baseScale: number
  scale: number
  age: number
  wasOn: boolean
}

export interface LeafFieldOptions {
  /** Max leaves — the SPS buffer is sized once to this; the grant governs how many are live. */
  capacity: number
  /** Half-size of the camera-following box (metres). */
  radius: number
  /** Nothing spawns inside this radius of the eye — a leaf born on the lens is a smudge. */
  near: number
  /** Quad size (metres): [min, max]. */
  size: [number, number]
}

/**
 * A soft leaf shape on a canvas — a pointed blade with a hint of a midrib. Cheap, and enough to
 * read as a leaf when it's tumbling; the authorable-texture TODO replaces this with real art.
 */
function leafTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const existing = scene.getTextureByName?.('ambient-leaf')
  if (existing) return existing as BABYLON.DynamicTexture
  const s = 64
  const tex = new BABYLON.DynamicTexture(
    'ambient-leaf',
    { width: s, height: s },
    scene,
    false
  )
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, s, s)
  // A pointed blade (two quadratic curves meeting at tip and base).
  ctx.beginPath()
  ctx.moveTo(s * 0.5, s * 0.06)
  ctx.quadraticCurveTo(s * 0.98, s * 0.5, s * 0.5, s * 0.94)
  ctx.quadraticCurveTo(s * 0.02, s * 0.5, s * 0.5, s * 0.06)
  const g = ctx.createLinearGradient(0, 0, s, s)
  g.addColorStop(0, '#8fbf5a')
  g.addColorStop(1, '#4f7a2e')
  ctx.fillStyle = g
  ctx.fill()
  // Midrib.
  ctx.strokeStyle = 'rgba(40,60,25,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(s * 0.5, s * 0.1)
  ctx.lineTo(s * 0.5, s * 0.9)
  ctx.stroke()
  tex.update()
  tex.hasAlpha = true
  return tex
}

/**
 * A field of tumbling two-sided leaf quads, boxed to the camera.
 *
 * `B3dAmbient` builds one of these for a `leaves` preset and drives it: `setEmitter` each frame to
 * follow the eye, then `update(dt, target)` where `target` is the live population the budget×gaze
 * allows. Leaves ease toward that count — turning on ⇒ spawn distributed through the box (so a
 * ramp-in fills immediately, not as a sheet dropping from the ceiling); turning off ⇒ fade out and
 * park. So the field drains and fills, and is never snatched away.
 */
export class LeafField {
  private _sps: BABYLON.SolidParticleSystem
  private _mesh: BABYLON.Mesh
  private _radius: number
  private _near: number
  private _ex = 0
  private _ey = 0
  private _ez = 0
  private _dt = 0
  private _driftX = 0
  private _driftZ = 0
  private _targetOn = 0
  private _live = 0
  private _dq = new BABYLON.Quaternion()

  constructor(scene: BABYLON.Scene, opts: LeafFieldOptions) {
    this._radius = opts.radius
    this._near = opts.near
    const cap = Math.max(1, opts.capacity)

    const tmpl = BABYLON.MeshBuilder.CreatePlane(
      'leaf-template',
      { size: 1, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      scene
    )
    const sps = new BABYLON.SolidParticleSystem('ambient-leaves', scene, {
      updatable: true,
    })
    sps.addShape(tmpl, cap)
    tmpl.dispose()
    this._mesh = sps.buildMesh()
    // The box surrounds the camera, so a per-mesh frustum test will cull it at the wrong moments —
    // keep it always active.
    this._mesh.alwaysSelectAsActiveMesh = true

    const mat = new BABYLON.StandardMaterial('ambient-leaf-mat', scene)
    const tex = leafTexture(scene)
    mat.diffuseTexture = tex
    mat.diffuseTexture.hasAlpha = true
    mat.useAlphaFromDiffuseTexture = true
    mat.backFaceCulling = false // TWO-SIDED — the point of the whole exercise
    // A SMALL emissive floor so a leaf isn't pure black in shade — the visibility comes from the
    // lit diffuse texture, not from making the whole thing glow. (Earlier it was set high, and
    // in a scene with a glow layer that read as leaves GLOWING; the real fix is the glow
    // exclusion below, and keeping emissive modest.)
    mat.emissiveColor = new BABYLON.Color3(0.08, 0.1, 0.05)
    mat.specularColor = BABYLON.Color3.Black()
    this._mesh.material = mat
    // A leaf is not a light source. Any glow layer in the scene would otherwise harvest the
    // emissive and bloom every leaf — exactly the "glowing pretty hard" report.
    for (const layer of scene.effectLayers ?? []) {
      if (layer.getClassName() === 'GlowLayer') {
        ;(layer as BABYLON.GlowLayer).addExcludedMesh(this._mesh)
      }
    }

    // We vary position/rotation/scale, never colour or uv — skip those to save work.
    sps.computeParticleColor = false
    sps.computeParticleTexture = false

    const sizes = opts.size
    sps.initParticles = () => {
      for (const p of sps.particles) {
        p.props = this._freshProps(sizes)
        p.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
          Math.random() * TAU,
          Math.random() * TAU,
          Math.random() * TAU
        )
        ;(p.props as LeafProps).scale = 0
        p.scaling.setAll(0)
        this._place(p, true)
      }
    }
    sps.updateParticle = (p) => this._updateParticle(p)

    sps.initParticles()
    sps.setParticles()
    this._sps = sps
  }

  /** How many leaves are currently visible (for the drain/fill bookkeeping upstream). */
  get liveCount(): number {
    return this._live
  }

  setEmitter(x: number, y: number, z: number): void {
    this._ex = x
    this._ey = y
    this._ez = z
  }

  /** Optional world wind (rain slants, leaves stream downwind). */
  setWind(x: number, z: number): void {
    this._driftX = x
    this._driftZ = z
  }

  /** `target` = population the budget/gaze allow right now. Eases toward it. */
  update(dt: number, target: number): void {
    this._dt = Math.min(0.05, Math.max(0, dt))
    this._targetOn = Math.round(
      Math.min(this._sps.nbParticles, Math.max(0, target))
    )
    this._live = 0
    this._sps.setParticles()
  }

  dispose(): void {
    this._sps.dispose()
    this._mesh.material?.dispose()
  }

  private _freshProps(size: [number, number]): LeafProps {
    return {
      axis: new BABYLON.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize(),
      // Slower tumble than instinct says: a fast spin is edge-on (invisible) half the time and
      // reads as a flicker. A lazy tumble lingers broadside, which is where you actually see it.
      tumble: 0.4 + Math.random() * 1.1, // rad/s
      fall: 0.3 + Math.random() * 0.5, // m/s — drifting down, not dropping
      swayAmp: 0.3 + Math.random() * 0.6,
      swayFreq: 0.6 + Math.random() * 1.2,
      phase: Math.random() * TAU,
      baseScale: size[0] + Math.random() * (size[1] - size[0]),
      scale: 0,
      age: 0,
      wasOn: false,
    }
  }

  /** Reposition a leaf inside the box. `fresh` = anywhere in the column (so a ramp-in looks full
   * at once); otherwise from the top (a recycled leaf re-enters from above and falls through). */
  private _place(p: BABYLON.SolidParticle, fresh: boolean): void {
    const r = this._radius
    const a = Math.random() * TAU
    const rad = this._near + Math.random() * (r - this._near)
    p.position.x = this._ex + Math.cos(a) * rad
    p.position.z = this._ez + Math.sin(a) * rad
    p.position.y = this._ey + (fresh ? (Math.random() * 2 - 1) * r : r * 0.9)
  }

  private _updateParticle(p: BABYLON.SolidParticle): BABYLON.SolidParticle {
    const pr = p.props as LeafProps
    const dt = this._dt
    const on = p.idx < this._targetOn

    // Ease scale toward on/off — fade in, fade out, never pop.
    const goal = on ? pr.baseScale : 0
    pr.scale += (goal - pr.scale) * Math.min(1, dt / (on ? FADE_IN : FADE_OUT))
    p.scaling.setAll(pr.scale)

    if (!on && pr.scale < 0.02) {
      pr.wasOn = false
      return p // parked and invisible — skip the motion + tumble cost entirely
    }
    if (pr.scale > 0.05) this._live++

    // Just turned on: give it a fresh identity and a distributed position so it doesn't stream in
    // from a stale spot.
    if (on && !pr.wasOn) {
      const size: [number, number] = [pr.baseScale, pr.baseScale]
      Object.assign(pr, this._freshProps(size), {
        scale: pr.scale,
        wasOn: true,
      })
      this._place(p, true)
    }

    pr.age += dt
    // Fall + drift + a sinusoidal sway that makes it wander rather than drop on rails.
    const sway = Math.sin(pr.age * pr.swayFreq + pr.phase) * pr.swayAmp
    const swayZ = Math.cos(pr.age * pr.swayFreq + pr.phase) * pr.swayAmp
    p.position.x += (this._driftX + sway) * dt
    p.position.z += (this._driftZ + swayZ) * dt
    p.position.y -= pr.fall * dt

    // Tumble: pre-multiply the current orientation by a small rotation about the leaf's own axis.
    if (p.rotationQuaternion != null) {
      BABYLON.Quaternion.RotationAxisToRef(pr.axis, pr.tumble * dt, this._dq)
      this._dq.multiplyToRef(p.rotationQuaternion, p.rotationQuaternion)
      p.rotationQuaternion.normalize()
    }

    // Recycle when it falls out the bottom or drifts past the box edge.
    const dx = p.position.x - this._ex
    const dz = p.position.z - this._ez
    const r = this._radius
    if (p.position.y < this._ey - r * 0.95 || dx * dx + dz * dz > r * r * 1.6) {
      this._place(p, false)
    }
    return p
  }
}
