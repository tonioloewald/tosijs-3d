/*
THE LAMP POOL: many lamps, a few real lights.

A city has hundreds of street lights and every car has headlights, but a
material lights itself from a handful of lights at most, and each one costs
every lit pixel. So a lamp is a VIRTUAL light: where it is, which way it
points, how bright and how far it reaches. Each frame the pool ranks them
(`poolScore`: strength, falling softly with distance, lamps ahead of the
viewer first) and gives the best `lampLights` (a device budget) real lights,
fading a light in or out over a sixth of a second rather than popping. Every
real light falls off linearly to nothing at its `range`, on Standard and PBR
materials alike.

Lit materials are raised to take the extra lights (Babylon's default is four,
and the sun and the sky's ambient are two of them).
*/

import * as BABYLON from '@babylonjs/core'
import { qualityBudgets } from './b3d-quality.js'
import { sceneDelta } from './b3d-utils.js'

export interface VirtualLight {
  /** World position, read every frame (keep it current, or give a getter). */
  position: BABYLON.Vector3
  /** A spot's direction (world). Absent: a point light. */
  direction?: BABYLON.Vector3
  /** A spot's cone, radians. */
  angle?: number
  color: BABYLON.Color3
  /** At full strength. */
  intensity: number
  /** Metres. */
  range: number
  /** 0..1, the owner's dimmer (night, a switch, a dying battery). */
  level: number
  /**
   * 0..1, a flicker on the output only: a flickering lamp keeps its place in
   * the ranking, or it would lose its light every time it went dark.
   */
  flicker?: number
  /** A spot's falloff across its cone (Babylon's `exponent`). Default 2. */
  exponent?: number
  /**
   * How much it matters, as a multiplier on its ranking (not its brightness).
   * Default 1. Lower it for many lights that would otherwise crowd the rest
   * out: two dozen passing cars' headlights left no street light lit.
   */
  weight?: number
}

/**
 * How much a lamp matters to what the viewer sees. Not how bright it is AT the
 * viewer: a street light lights the road you are looking at from fifty metres
 * away. So strength falls off softly with distance in ranges (no cutoff), and
 * lamps ahead count more than lamps behind (`ahead`, the cosine between the
 * view and the lamp).
 */
export function poolScore(l: {
  intensity: number
  range: number
  distance: number
  ahead: number
}): number {
  if (l.intensity <= 0 || l.range <= 0) return 0
  const r = l.distance / (l.range * 1.5)
  return (l.intensity * (0.35 + 0.65 * Math.max(0, l.ahead))) / (1 + r * r)
}

interface Slot {
  light: BABYLON.PointLight | BABYLON.SpotLight
  owner: VirtualLight | null
  fade: number
}

const POOLS = new WeakMap<BABYLON.Scene, LightPool>()

/** The scene's lamp pool, made on first use. */
export function lightPool(scene: BABYLON.Scene): LightPool {
  let pool = POOLS.get(scene)
  if (pool == null) {
    pool = new LightPool(scene)
    POOLS.set(scene, pool)
  }
  return pool
}

export class LightPool {
  private lights = new Set<VirtualLight>()
  private points: Slot[] = []
  private spots: Slot[] = []
  private observer: BABYLON.Observer<BABYLON.Scene> | null = null
  private lastObserver: BABYLON.Observer<BABYLON.Scene> | null = null
  private materialObserver: BABYLON.Observer<BABYLON.Material> | null = null
  /**
   * CLUSTERED: where the device has it (WebGL2 with float blending, or
   * WebGPU), every lamp is a real light in one `ClusteredLightContainer`, which
   * sorts them into screen tiles by their range, so a pixel pays only for the
   * lamps that reach it. There a lamp's falloff IS its cost, and a city's
   * hundred street lights are all lit. Elsewhere, the ranked pool below.
   */
  private cluster: BABYLON.ClusteredLightContainer | null = null
  private raise: ((m: BABYLON.Material) => void) | null = null
  private raised = new WeakSet<BABYLON.Material>()
  private sweep = 0
  private clustered = new Map<
    VirtualLight,
    BABYLON.PointLight | BABYLON.SpotLight
  >()

  constructor(private scene: BABYLON.Scene) {
    scene.onDisposeObservable.addOnce(() => this.dispose())
  }

  add(light: VirtualLight): () => void {
    this.lights.add(light)
    this.start()
    if (this.cluster) {
      const real = this.makeLight(
        `lamp-cluster-${this.clustered.size}`,
        light.direction != null
      )
      real.falloffType = BABYLON.Light.FALLOFF_DEFAULT
      this.clustered.set(light, real)
      this.cluster.addLight(real)
    }
    return () => {
      this.lights.delete(light)
      const real = this.clustered.get(light)
      if (real) {
        this.cluster?.removeLight(real)
        real.dispose()
        this.clustered.delete(light)
      }
    }
  }

  /** How many lamps are registered, how many have a real light now, and whether they are clustered. */
  get stats(): { lamps: number; lit: number; clustered: boolean } {
    const lit = this.cluster
      ? [...this.clustered.values()].filter((l) => l.intensity > 0).length
      : [...this.points, ...this.spots].filter((s) => s.owner && s.fade > 0.01)
          .length
    return { lamps: this.lights.size, lit, clustered: this.cluster != null }
  }

  private makeLight(
    name: string,
    spot: boolean
  ): BABYLON.PointLight | BABYLON.SpotLight {
    return spot
      ? new BABYLON.SpotLight(
          name,
          BABYLON.Vector3.Zero(),
          BABYLON.Vector3.Down(),
          1,
          1,
          this.scene
        )
      : new BABYLON.PointLight(name, BABYLON.Vector3.Zero(), this.scene)
  }

  /** Clustered lighting, if this device has it (and is not on the lowest budget). */
  private tryCluster() {
    if (qualityBudgets().lampLights < 4) return
    const probe = new BABYLON.PointLight(
      'lamp-cluster-probe',
      BABYLON.Vector3.Zero(),
      this.scene
    )
    const ok = BABYLON.ClusteredLightContainer.IsLightSupported(probe)
    probe.dispose()
    if (!ok) return
    this.cluster = new BABYLON.ClusteredLightContainer(
      'lamp-cluster',
      [],
      this.scene
    )
  }

  private start() {
    if (this.observer != null) return
    this.tryCluster()
    const want = qualityBudgets().lampLights + 3
    const raise = (m: BABYLON.Material) => {
      const lit = m as BABYLON.Material & { maxSimultaneousLights?: number }
      if (
        typeof lit.maxSimultaneousLights === 'number' &&
        lit.maxSimultaneousLights < want
      ) {
        lit.maxSimultaneousLights = want
      }
      // Clustered lights take the material's falloff (they must keep the
      // default): linear to nothing at their range, as the pool's are.
      if (this.cluster && m instanceof BABYLON.PBRMaterial) {
        m.usePhysicalLightFalloff = false
        m.useGLTFLightFalloff = false
      }
    }
    this.raise = raise
    this.scene.materials.forEach(raise)
    // Babylon announces a new material on the next tick, once it is built.
    this.materialObserver = this.scene.onNewMaterialAddedObservable.add(raise)
    /*
    LAST of the frame's before-render work, every frame: lamps are moved by
    observers added after this one (a vehicle's own step), and a pool that ran
    first lit where they were a frame ago. Seen from above, a car's headlight
    pool trailed the car.
    */
    // Moved from another observable: reordering the one being notified skips
    // whichever observer comes next.
    const obs = this.scene.onBeforeRenderObservable
    this.observer = obs.add(() => this.update())
    this.lastObserver = this.scene.onBeforeAnimationsObservable.add(() => {
      if (this.observer != null) obs.makeObserverBottomPriority(this.observer)
    })
  }

  private slot(spot: boolean): Slot {
    const list = spot ? this.spots : this.points
    const free = list.find((s) => s.owner == null && s.fade <= 0.01)
    if (free) return free
    const name = `lamp-pool-${spot ? 'spot' : 'point'}-${list.length}`
    const light = this.makeLight(name, spot)
    // Linear to nothing at its range, on every material: PBR's default is the
    // inverse square, which put a headlight's 6 at a tenth of that ten metres off.
    light.falloffType = BABYLON.Light.FALLOFF_STANDARD
    light.setEnabled(false)
    const s: Slot = { light, owner: null, fade: 0 }
    list.push(s)
    return s
  }

  /*
  A library's models come from an asset container, whose materials never pass
  through the scene's new-material event (and are not in `scene.materials`):
  so once a second, the materials of what is actually drawn.
  */
  private sweepMaterials() {
    const raise = this.raise
    if (raise == null || this.sweep-- > 0) return
    this.sweep = 60
    for (const mesh of this.scene.meshes) {
      const m = mesh.material
      if (m == null || this.raised.has(m)) continue
      this.raised.add(m)
      raise(m)
    }
  }

  private update() {
    this.sweepMaterials()
    /*
    Not in a headset. The container bins its lamps into tiles of ONE camera's
    screen, and a headset draws two eyes: lamps flickered and street lights
    vanished in VR while the same Quest lit the city flat. In a session the
    ranked pool takes over, and hands back on exit.
    */
    const xr = this.scene.activeCamera instanceof BABYLON.WebXRCamera
    if (this.cluster) this.cluster.setEnabled(!xr)
    if (this.cluster && !xr) {
      for (const s of [...this.points, ...this.spots]) {
        s.light.setEnabled(false)
        s.owner = null
        s.fade = 0
      }
      for (const [l, real] of this.clustered) {
        const on = l.intensity * l.level * (l.flicker ?? 1)
        real.position.copyFrom(l.position)
        real.diffuse.copyFrom(l.color)
        real.specular.copyFrom(l.color)
        real.intensity = on
        // A dark lamp costs nothing: no reach, no tiles.
        real.range = on > 0 ? l.range : 0.01
        if (real instanceof BABYLON.SpotLight && l.direction) {
          real.direction.copyFrom(l.direction)
          real.angle = l.angle ?? Math.PI / 3
          real.exponent = l.exponent ?? 2
        }
      }
      return
    }
    const scene = this.scene
    const camera = scene.activeCamera
    if (camera == null) return
    const eye = camera.globalPosition
    const view = camera.getDirection(BABYLON.Axis.Z)
    const dt = Math.min(0.1, sceneDelta(scene))
    const budget = qualityBudgets().lampLights
    const to = new BABYLON.Vector3()
    const holding = new Set(
      [...this.points, ...this.spots]
        .filter((s) => s.fade > 0.5)
        .map((s) => s.owner)
    )
    const ranked = [...this.lights]
      .map((l) => {
        l.position.subtractToRef(eye, to)
        const distance = to.length()
        return {
          l,
          s: poolScore({
            // A lamp that has a light keeps it unless another is clearly better,
            // or two near-equal lamps trade it back and forth.
            intensity:
              l.intensity *
              l.level *
              (l.weight ?? 1) *
              (holding.has(l) ? 1.5 : 1),
            range: l.range,
            distance,
            ahead: distance > 0 ? BABYLON.Vector3.Dot(to, view) / distance : 1,
          }),
        }
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, budget)
      .map((x) => x.l)
    const winners = new Set(ranked)

    // Losers fade out; their slots are freed when dark.
    for (const s of [...this.points, ...this.spots]) {
      if (s.owner != null && !winners.has(s.owner))
        s.owner = s.fade > 0.01 ? s.owner : null
    }
    // Winners keep their slot, or take a free one.
    const held = new Set([...this.points, ...this.spots].map((s) => s.owner))
    for (const l of ranked) {
      if (held.has(l)) continue
      const s = this.slot(l.direction != null)
      s.owner = l
      s.fade = 0
    }
    for (const s of [...this.points, ...this.spots]) {
      const l = s.owner
      const target = l != null && winners.has(l) ? 1 : 0
      s.fade +=
        Math.sign(target - s.fade) * Math.min(Math.abs(target - s.fade), dt * 6)
      if (l == null || s.fade <= 0.01) {
        s.light.setEnabled(false)
        if (target === 0) s.owner = null
        continue
      }
      s.light.position.copyFrom(l.position)
      s.light.diffuse.copyFrom(l.color)
      s.light.specular.copyFrom(l.color)
      s.light.intensity = l.intensity * l.level * (l.flicker ?? 1) * s.fade
      s.light.range = l.range
      if (s.light instanceof BABYLON.SpotLight && l.direction) {
        s.light.direction.copyFrom(l.direction)
        s.light.angle = l.angle ?? Math.PI / 3
        s.light.exponent = l.exponent ?? 2
      }
      s.light.setEnabled(true)
    }
  }

  dispose() {
    if (this.observer) this.scene.onBeforeRenderObservable.remove(this.observer)
    if (this.lastObserver)
      this.scene.onBeforeAnimationsObservable.remove(this.lastObserver)
    if (this.materialObserver)
      this.scene.onNewMaterialAddedObservable.remove(this.materialObserver)
    for (const s of [...this.points, ...this.spots]) s.light.dispose()
    for (const real of this.clustered.values()) real.dispose()
    this.clustered.clear()
    this.cluster?.dispose()
    this.cluster = null
    this.points = []
    this.spots = []
    this.lights.clear()
    POOLS.delete(this.scene)
  }
}

/**
 * How much daylight the scene has, 0 to 1: its sky's `daylight`, or full day
 * when it has no sky.
 */
export function sceneDaylight(owner: Element | null | undefined): number {
  const sky = owner?.querySelector('tosi-b3d-skybox') as {
    daylight?: number
  } | null
  return typeof sky?.daylight === 'number' ? sky.daylight : 1
}

/**
 * How fast the scene's sky runs against real time: its skybox's
 * `realtimeScale`, never less than 1. Weather drifts and evolves at this rate,
 * so a sky sped up to a time-lapse carries its clouds with it; a stopped sky
 * (`realtimeScale` 0, the default) leaves the weather in real time.
 */
export function skyRate(owner: Element | null | undefined): number {
  const sky = owner?.querySelector('tosi-b3d-skybox') as {
    realtimeScale?: number
  } | null
  const r = Number(sky?.realtimeScale)
  return Number.isFinite(r) && r > 1 ? r : 1
}

/** A lamp's level for the daylight: off by day, up through dusk, full at night. */
export function lampLevel(daylight: number): number {
  return Math.max(0, Math.min(1, (0.5 - daylight) / 0.35))
}

function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * A failing lamp's flicker at `seconds`, 0..1: steady most of the time, then
 * a spell of stutter (a couple of seconds in five), each lamp to its own
 * `seed`. Pure, so the same lamp stutters the same way in a replay.
 */
export function lampFlicker(seconds: number, seed: number): number {
  const spell = Math.floor(seconds / 1.7)
  if (hash(seed, spell) > 0.4) return 1
  return hash(seed + 7919, Math.floor(seconds * 14)) < 0.45 ? 0.1 : 1
}
