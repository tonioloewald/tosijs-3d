/*
THE LAMP POOL: many lamps, a few real lights.

A city has hundreds of street lights and every car has headlights, but a
material lights itself from a handful of lights at most, and each one costs
every lit pixel. So a lamp is a VIRTUAL light: where it is, which way it
points, how bright and how far it reaches. Each frame the pool ranks them by
strength × locality (`lightScore`, the effect pool's rule: how bright the
light is at the viewer, intensity falling over its range) and gives the best
`lampLights` (a device budget) real lights, fading a light in or out over a
sixth of a second rather than popping. The rest are seen by their glowing
bulbs, which their owners draw.

Lit materials are raised to take the extra lights (Babylon's default is four,
and the sun and the sky's ambient are two of them).
*/

import * as BABYLON from '@babylonjs/core'
import { lightScore } from './effect-recipe.js'
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
  private materialObserver: BABYLON.Observer<BABYLON.Material> | null = null

  constructor(private scene: BABYLON.Scene) {
    scene.onDisposeObservable.addOnce(() => this.dispose())
  }

  add(light: VirtualLight): () => void {
    this.lights.add(light)
    this.start()
    return () => this.lights.delete(light)
  }

  /** How many lamps are registered, and how many have a real light now. */
  get stats(): { lamps: number; lit: number } {
    const lit = [...this.points, ...this.spots].filter((s) => s.owner && s.fade > 0.01).length
    return { lamps: this.lights.size, lit }
  }

  private start() {
    if (this.observer != null) return
    const want = qualityBudgets().lampLights + 3
    const raise = (m: BABYLON.Material) => {
      const lit = m as BABYLON.Material & { maxSimultaneousLights?: number }
      if (typeof lit.maxSimultaneousLights === 'number' && lit.maxSimultaneousLights < want) {
        lit.maxSimultaneousLights = want
      }
    }
    this.scene.materials.forEach(raise)
    // Babylon announces a new material on the next tick, once it is built.
    this.materialObserver = this.scene.onNewMaterialAddedObservable.add(raise)
    this.observer = this.scene.onBeforeRenderObservable.add(() => this.update())
  }

  private slot(spot: boolean): Slot {
    const list = spot ? this.spots : this.points
    const free = list.find((s) => s.owner == null && s.fade <= 0.01)
    if (free) return free
    const name = `lamp-pool-${spot ? 'spot' : 'point'}-${list.length}`
    const light = spot
      ? new BABYLON.SpotLight(name, BABYLON.Vector3.Zero(), BABYLON.Vector3.Down(), 1, 1, this.scene)
      : new BABYLON.PointLight(name, BABYLON.Vector3.Zero(), this.scene)
    light.setEnabled(false)
    const s: Slot = { light, owner: null, fade: 0 }
    list.push(s)
    return s
  }

  private update() {
    const scene = this.scene
    const eye = scene.activeCamera?.globalPosition
    if (eye == null) return
    const dt = Math.min(0.1, sceneDelta(scene))
    const budget = qualityBudgets().lampLights
    const ranked = [...this.lights]
      .map((l) => ({
        l,
        s: lightScore({
          intensity: l.intensity * l.level,
          range: l.range,
          distance: BABYLON.Vector3.Distance(eye, l.position),
        }),
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, budget)
      .map((x) => x.l)
    const winners = new Set(ranked)

    // Losers fade out; their slots are freed when dark.
    for (const s of [...this.points, ...this.spots]) {
      if (s.owner != null && !winners.has(s.owner)) s.owner = s.fade > 0.01 ? s.owner : null
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
      s.fade += Math.sign(target - s.fade) * Math.min(Math.abs(target - s.fade), dt * 6)
      if (l == null || s.fade <= 0.01) {
        s.light.setEnabled(false)
        if (target === 0) s.owner = null
        continue
      }
      s.light.position.copyFrom(l.position)
      s.light.diffuse.copyFrom(l.color)
      s.light.specular.copyFrom(l.color)
      s.light.intensity = l.intensity * l.level * s.fade
      s.light.range = l.range
      if (s.light instanceof BABYLON.SpotLight && l.direction) {
        s.light.direction.copyFrom(l.direction)
        s.light.angle = l.angle ?? Math.PI / 3
        s.light.exponent = 2
      }
      s.light.setEnabled(true)
    }
  }

  dispose() {
    if (this.observer) this.scene.onBeforeRenderObservable.remove(this.observer)
    if (this.materialObserver) this.scene.onNewMaterialAddedObservable.remove(this.materialObserver)
    for (const s of [...this.points, ...this.spots]) s.light.dispose()
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
  const sky = owner?.querySelector('tosi-b3d-skybox') as { daylight?: number } | null
  return typeof sky?.daylight === 'number' ? sky.daylight : 1
}

/** A lamp's level for the daylight: off by day, up through dusk, full at night. */
export function lampLevel(daylight: number): number {
  return Math.max(0, Math.min(1, (0.5 - daylight) / 0.35))
}
