/*#
# b3d-decorator

**Rocks and trees on the terrain, by budget and by climate.** Drop it into a
scene with a `<tosi-b3d-terrain>`. It scatters a fixed NUMBER of things around
the camera, chosen by [scatter](/scatter/)'s climate rules (the same
temperature, moisture, altitude and slope axes the terrain's biome shader
paints with), so the pines stand where the ground is cold forest, and the
palms at a warm shoreline.

```javascript
b3dDecorator({ budget: 5000, radius: 900 })
```

## How it draws

Every model is drawn with **thin instances**: one draw call per model PART,
however many copies. A few dozen Nature Kit models make a few dozen draw
calls, whether the budget is 1,000 or 20,000. What grows with the budget is
vertices. The Perf Stats panel's `decorator` row shows the counts and the
build time.

The scatter is **world-anchored**, so when the camera moves far enough
(`radius / 4`) it re-scatters around it and only the edge changes. It follows
the terrain's floating origin and rebuilds when the terrain's shape or climate
changes.

## Collision, where it matters

A small POOL of invisible colliders follows the camera: trunks as thin
cylinders, boulders as boxes (see `ScatterRule.collider`), assigned to the
nearest placements within `colliderRange`. A fixed cost however big the
budget, and it exists exactly where something can bump into it. They collide
the way everything here does (`checkCollisions` + `moveWithCollisions`), so a
biped stops at a trunk and can stand on a boulder.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `budget` | `2000` | How many things to place. Performance cares about this, not density |
| `radius` | `900` | Metres around the camera to fill |
| `seed` | `1` | Same seed, same forest |
| `url` | `''` | The model library; empty = Kenney's Nature Kit on the CDN |
| `scale` | `1` | Multiplies every rule's scale range |
| `follow` | `'on'` | Re-scatter as the camera moves |
| `shadows` | `'off'` | Cast shadows (every copy is a caster — costly at high budgets) |
| `colliders` | `'on'` | The nearby collider pool |
| `colliderRange` | `60` | Metres around the camera that get colliders |
| `colliderPool` | `48` | How many colliders at most |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, isOff, publicName } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import { assetUrl } from './asset-url.js'
import { mantaAxes } from './biome-chart.js'
import {
  scatterPlacements,
  NATURE_KIT_RULES,
  type Placement,
  type ScatterRule,
} from './scatter.js'

interface Part {
  mesh: BABYLON.Mesh
  /** Part → model-root transform (the model's own offset removed). */
  rel: BABYLON.Matrix
}

interface ModelInfo {
  parts: Part[]
  /** Model-space bounds (min/max) — sizes the colliders. */
  min: BABYLON.Vector3
  max: BABYLON.Vector3
}

export class B3dDecorator extends B3dChild {
  static preferredTagName = 'tosi-b3d-decorator'
  static shadowStyleSpec = { ':host': { display: 'none' } }

  static initAttributes = {
    budget: 2000,
    radius: 900,
    seed: 1,
    url: '',
    scale: 1,
    follow: 'on' as 'on' | 'off',
    shadows: 'off' as 'on' | 'off',
    colliders: 'on' as 'on' | 'off',
    colliderRange: 60,
    colliderPool: 48,
  }

  declare budget: number
  declare radius: number
  declare seed: number
  declare url: string
  declare scale: number
  declare follow: 'on' | 'off'
  declare shadows: 'on' | 'off'
  declare colliders: 'on' | 'off'
  declare colliderRange: number
  declare colliderPool: number

  /** The rules. Replace before the first build (or call `rebuild()`). */
  rules: ScatterRule[] = NATURE_KIT_RULES
  /** What was placed last, in LOGICAL world coordinates. */
  placements: Placement[] = []
  /** Milliseconds the last build took (scatter + instance buffers). */
  lastBuildMs = 0

  private _root: BABYLON.TransformNode | null = null
  private _container: BABYLON.AssetContainer | null = null
  private _models = new Map<string, ModelInfo | null>()
  private _drawn: BABYLON.Mesh[] = []
  private _center: { x: number; z: number } | null = null
  private _key = ''
  private _observer: BABYLON.Observer<BABYLON.Scene> | null = null
  private _loadGen = 0
  private _pool: BABYLON.Mesh[] = []
  private _poolKind: Array<'trunk' | 'box'> = []
  private _nextColliderCheck = 0
  private _debugOff: (() => void) | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    this._root = new BABYLON.TransformNode('decorator', scene)
    owner.registerWorldRoot(this._root)
    const gen = ++this._loadGen
    const url = this.url || assetUrl('kenney/libraries/nature-kit.glb')
    BABYLON.SceneLoader.LoadAssetContainerAsync(url, '', scene)
      .then((c) => {
        if (gen !== this._loadGen) {
          c.dispose()
          return
        }
        this._container = c
        c.addAllToScene()
        // The library's own nodes are the SOURCES, never drawn themselves.
        for (const n of c.rootNodes) n.setEnabled(false)
        this._key = ''
      })
      .catch((err) => console.warn('b3d-decorator: library failed', err))
    this._observer = scene.onBeforeRenderObservable.add(() => this._tick())
    this._debugOff =
      (owner as any).addDebugSource?.({
        name: 'decorator',
        lines: () => [
          `placed ${this.placements.length} / ${this.budget}`,
          `parts ${this._drawn.length} (≈ draw calls)`,
          `build ${this.lastBuildMs.toFixed(0)} ms`,
          `colliders ${this._pool.filter((m) => m.isEnabled()).length}`,
        ],
      }) ?? null
  }

  sceneDispose() {
    this._loadGen++
    if (this._observer != null)
      this.owner?.scene.onBeforeRenderObservable.remove(this._observer)
    this._observer = null
    this._debugOff?.()
    this._debugOff = null
    this._clearParts()
    for (const m of this._pool) m.dispose()
    this._pool = []
    this._poolKind = []
    if (this._root != null) {
      this.owner?.unregisterWorldRoot?.(this._root)
      this._root.dispose()
    }
    this._root = null
    this._container?.dispose()
    this._container = null
    this._models.clear()
    this.placements = []
    this._center = null
    this._key = ''
    super.sceneDispose()
  }

  /** Throw away the current scatter and build again on the next frame. */
  rebuild(): void {
    this._key = ''
  }

  private _terrain(): any {
    return this.owner?.querySelector('tosi-b3d-terrain') ?? null
  }

  /** Everything the placements depend on, as one string. */
  private _currentKey(terrain: any): string {
    const p = terrain?.biomePlugin?.params
    return [
      this.budget,
      this.radius,
      this.seed,
      this.scale,
      terrain?.generationKey ?? '',
      terrain?.provinceField != null ? 'province' : '',
      p
        ? [p.seaLevel, p.baseTemperature, p.lapseRate, p.mapMoisture].join(',')
        : '',
    ].join('|')
  }

  private _tick(): void {
    const scene = this.owner?.scene
    const cam = scene?.activeCamera
    const terrain = this._terrain()
    if (
      scene == null ||
      cam == null ||
      this._container == null ||
      terrain == null
    )
      return
    if (typeof terrain.heightSampler !== 'function') return
    const off = terrain.originOffset ?? { x: 0, z: 0 }
    const here = {
      x: cam.globalPosition.x + off.x,
      z: cam.globalPosition.z + off.z,
    }
    const key = this._currentKey(terrain)
    const moved =
      !isOff(this.follow) &&
      this._center != null &&
      Math.hypot(here.x - this._center.x, here.z - this._center.z) >
        this.radius * 0.25
    if (key !== this._key || moved) {
      this._key = key
      this._build(terrain, here, off)
    }
    if (
      !isOff(this.colliders) &&
      performance.now() >= this._nextColliderCheck
    ) {
      this._nextColliderCheck = performance.now() + 250
      this._placeColliders(here, off)
    }
  }

  private _model(name: string): ModelInfo | null {
    if (this._models.has(name)) return this._models.get(name)!
    const c = this._container!
    const node = [...c.transformNodes, ...c.meshes].find(
      (n) => publicName(n.name) === name
    )
    let info: ModelInfo | null = null
    if (node != null) {
      node.computeWorldMatrix(true)
      const origin = node.getAbsolutePosition().clone()
      const unshift = BABYLON.Matrix.Translation(
        -origin.x,
        -origin.y,
        -origin.z
      )
      const parts: Part[] = []
      const min = new BABYLON.Vector3(Infinity, Infinity, Infinity)
      const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity)
      const meshes = [
        ...(node instanceof BABYLON.Mesh ? [node] : []),
        ...node.getChildMeshes(false),
      ].filter(
        (m): m is BABYLON.Mesh =>
          m instanceof BABYLON.Mesh && m.getTotalVertices() > 0
      )
      for (const m of meshes) {
        /*
        THE PART'S FRAME: its world matrix with only the model's position in
        the library removed. The handedness mirror on `__root__` stays IN,
        which keeps the winding exactly as a normal load renders it.
        */
        const rel = m.computeWorldMatrix(true).multiply(unshift)
        const part = m.clone(`deco-${name}`, this._root, true) as BABYLON.Mesh
        part.position.setAll(0)
        part.rotationQuaternion = BABYLON.Quaternion.Identity()
        part.scaling.setAll(1)
        part.setEnabled(true)
        part.isPickable = false
        part.checkCollisions = false
        parts.push({ mesh: part, rel })
        const bb = m.getBoundingInfo().boundingBox
        for (const v of bb.vectorsWorld) {
          const p = BABYLON.Vector3.TransformCoordinates(v, unshift)
          min.minimizeInPlace(p)
          max.maximizeInPlace(p)
        }
      }
      if (parts.length > 0) info = { parts, min, max }
    }
    this._models.set(name, info)
    return info
  }

  private _clearParts(): void {
    for (const info of this._models.values())
      for (const p of info?.parts ?? []) {
        p.mesh.thinInstanceCount = 0
      }
    this._drawn = []
  }

  private _build(
    terrain: any,
    here: { x: number; z: number },
    off: { x: number; z: number }
  ): void {
    const t0 = performance.now()
    const height = terrain.heightSampler()
    const cfg = terrain.biomePlugin?.params ?? {
      seaLevel: 0,
      baseTemperature: 0.6,
      lapseRate: 0.004,
      mapMoisture: 0.5,
    }
    const rules = this.rules.map((r) => ({
      ...r,
      scale: [r.scale[0] * this.scale, r.scale[1] * this.scale] as [
        number,
        number
      ],
    }))
    this.placements = scatterPlacements({
      budget: Math.max(0, Math.floor(this.budget)),
      seed: this.seed,
      center: here,
      radius: this.radius,
      height,
      climate: (_x, _z, y) => {
        const { temperature, moisture } = mantaAxes(y, cfg)
        return { temperature, moisture, altitude: y - cfg.seaLevel }
      },
      rules,
      /*
      THE PROVINCE SAYS WHAT GROWS: volcanism suppresses plants (rocks are
      at home on a lava field), with the same thresholds the biome shader
      uses to paint lava and basalt, so nothing grows where the ground reads
      as rock. Nothing is suppressed without a province.
      */
      suppress:
        typeof terrain.provinceField === 'function'
          ? (x, z, kind) => {
              if (kind === 'rock' || kind === 'boulder') return 1
              const v = terrain.provinceField(x, z)
              const t = Math.max(0, Math.min(1, (v - 0.02) / 0.1))
              return 1 - t * t * (3 - 2 * t)
            }
          : undefined,
    })
    this._center = here
    // The root is where render space starts: reset it, and place in render
    // coordinates for the CURRENT origin. Later shifts move the root.
    if (this._root != null) this._root.position.setAll(0)

    const byModel = new Map<string, Placement[]>()
    for (const p of this.placements) {
      const list = byModel.get(p.model)
      if (list) list.push(p)
      else byModel.set(p.model, [p])
    }
    this._clearParts()
    const up = BABYLON.Vector3.Up()
    const q = new BABYLON.Quaternion()
    const tilt = new BABYLON.Quaternion()
    const yawQ = new BABYLON.Quaternion()
    const n = new BABYLON.Vector3()
    const srt = new BABYLON.Matrix()
    const scl = new BABYLON.Vector3()
    const pos = new BABYLON.Vector3()
    const out = new BABYLON.Matrix()
    for (const [name, list] of byModel) {
      const info = this._model(name)
      if (info == null) continue
      const align = this.rules[list[0].rule]?.alignToSlope ?? 0
      for (const part of info.parts) {
        const buf = new Float32Array(list.length * 16)
        list.forEach((p, i) => {
          BABYLON.Quaternion.RotationYawPitchRollToRef(p.yaw, 0, 0, yawQ)
          n.set(p.normal.x, p.normal.y, p.normal.z)
          BABYLON.Vector3.LerpToRef(up, n, align, n)
          n.normalize()
          BABYLON.Quaternion.FromUnitVectorsToRef(up, n, tilt)
          yawQ.multiplyToRef(tilt, q) // yaw first, then lean to the ground
          scl.setAll(p.scale)
          pos.set(p.x - off.x, p.y, p.z - off.z)
          BABYLON.Matrix.ComposeToRef(scl, q, pos, srt)
          part.rel.multiplyToRef(srt, out)
          out.copyToArray(buf, i * 16)
        })
        part.mesh.thinInstanceSetBuffer('matrix', buf, 16, true)
        part.mesh.thinInstanceRefreshBoundingInfo(false)
        this._drawn.push(part.mesh)
      }
    }
    if (!isOff(this.shadows) === true)
      this.owner?.register({ meshes: this._drawn })
    this.lastBuildMs = performance.now() - t0
  }

  /*
  THE COLLIDER POOL — invisible primitives on the NEAREST placements that have
  a collider, within colliderRange. Recycled every quarter second.
  */
  private _placeColliders(
    here: { x: number; z: number },
    off: { x: number; z: number }
  ): void {
    const scene = this.owner?.scene
    if (scene == null || this._root == null) return
    const range = this.colliderRange
    const near: Array<{ p: Placement; d: number; kind: 'trunk' | 'box' }> = []
    for (const p of this.placements) {
      const kind = this.rules[p.rule]?.collider
      if (kind == null) continue
      const d = Math.hypot(p.x - here.x, p.z - here.z)
      if (d <= range) near.push({ p, d, kind })
    }
    near.sort((a, b) => a.d - b.d)
    const want = near.slice(0, Math.max(0, Math.floor(this.colliderPool)))
    // Grow the pool as needed; primitives are unit-sized and scaled per use.
    while (this._pool.length < want.length) {
      const i = this._pool.length
      const m = BABYLON.MeshBuilder.CreateBox(
        `deco-collider-${i}`,
        { size: 1 },
        scene
      )
      m.parent = this._root
      m.isVisible = false
      m.isPickable = true
      m.checkCollisions = true
      m.rotationQuaternion = new BABYLON.Quaternion()
      this._pool.push(m)
      this._poolKind.push('box')
    }
    const rootPos = this._root.position
    this._pool.forEach((m, i) => {
      const w = want[i]
      if (w == null) {
        m.setEnabled(false)
        return
      }
      const info = this._model(w.p.model)
      if (info == null) {
        m.setEnabled(false)
        return
      }
      const s = w.p.scale
      const size = info.max.subtract(info.min).scale(s)
      const base = new BABYLON.Vector3(
        w.p.x - off.x,
        w.p.y,
        w.p.z - off.z
      ).subtract(rootPos)
      if (w.kind === 'trunk') {
        // A thin post up the middle: the trunk, not the canopy.
        const r = Math.max(0.15, Math.min(size.x, size.z) * 0.12)
        m.scaling.set(r * 2, size.y * 0.7, r * 2)
        m.position.set(base.x, base.y + size.y * 0.35, base.z)
      } else {
        m.scaling.set(size.x * 0.9, size.y * 0.9, size.z * 0.9)
        m.position.set(base.x, base.y + size.y * 0.45, base.z)
      }
      BABYLON.Quaternion.RotationYawPitchRollToRef(
        w.p.yaw,
        0,
        0,
        m.rotationQuaternion!
      )
      m.setEnabled(true)
    })
  }

  /**
   * WHAT IT COSTS, measured in the browser it runs in. Steps through budgets,
   * lets each build and settle, then samples frames. Restores the budget.
   *
   *   await document.querySelector('tosi-b3d-decorator').measureCost()
   *
   * Frame time is capped by the display's refresh, so when it reads flat the
   * GPU line is the one that shows the cost — where the browser exposes GPU
   * timer queries (often only behind a flag); otherwise watch where the
   * frame time first leaves the refresh interval.
   */
  async measureCost(
    budgets = [0, 1000, 5000, 10000, 20000],
    seconds = 3
  ): Promise<
    Array<{
      budget: number
      placed: number
      buildMs: number
      frameMs: number
      frameP95Ms: number
      gpuMs: number | null
      drawCalls: number
      activeIndices: number
    }>
  > {
    const scene = this.owner?.scene
    if (scene == null) return []
    const engine = scene.getEngine()
    const sceneI = new BABYLON.SceneInstrumentation(scene)
    sceneI.captureFrameTime = true
    const engineI = new BABYLON.EngineInstrumentation(engine as BABYLON.Engine)
    engineI.captureGPUFrameTime = true
    const original = this.budget
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const results = []
    try {
      for (const budget of budgets) {
        this.budget = budget
        this.rebuild()
        await wait(1500)
        const frames: number[] = []
        const gpu: number[] = []
        let last = performance.now()
        const obs = scene.onAfterRenderObservable.add(() => {
          const now = performance.now()
          frames.push(now - last)
          last = now
          const g = engineI.gpuFrameTimeCounter.lastSecAverage
          if (g > 0) gpu.push(g * 1e-6)
        })
        await wait(seconds * 1000)
        scene.onAfterRenderObservable.remove(obs)
        frames.sort((a, b) => a - b)
        const mean =
          frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length)
        results.push({
          budget,
          placed: this.placements.length,
          buildMs: Math.round(this.lastBuildMs),
          frameMs: Number(mean.toFixed(2)),
          frameP95Ms: Number(
            (frames[Math.floor(frames.length * 0.95)] ?? 0).toFixed(2)
          ),
          // 0 means the timer query is unavailable, not a free frame.
          gpuMs:
            gpu.length && gpu[gpu.length - 1] > 0
              ? Number(gpu[gpu.length - 1].toFixed(2))
              : null,
          drawCalls: Math.round(sceneI.drawCallsCounter.lastSecAverage),
          activeIndices: scene.getActiveIndices(),
        })
      }
    } finally {
      this.budget = original
      this.rebuild()
      sceneI.dispose()
      engineI.dispose()
    }
    return results
  }

  render() {
    super.render()
    // Budget, radius, seed and scale are in the key; changing one rebuilds.
  }
}

export const b3dDecorator = B3dDecorator.elementCreator()
