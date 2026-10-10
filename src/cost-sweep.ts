/*#
# Cost sweep

Where a frame goes, **measured on the device it runs on**. The sweep switches
one thing off at a time (a group of meshes, the render targets, the shadows),
or turns a resolution lever (foveation and viewport scale in a headset,
hardware scaling flat), holds it for a couple of seconds, and records the frame
time. What comes back is a ranked list: the things whose absence bought the
most.

It exists because a headset has no GPU timer and no profiler, and guesses about
its fill cost made on a desktop are wrong in both directions. It is a button in
the Perf Stats panel (**Cost sweep**), so it runs inside the session.

```javascript
const rows = await document.querySelector('tosi-b3d').costSweep()
// [{ name: 'baseline', ms: 71.4, p95: 83.3, saved: 0 }, { name: '- water', ms: 55.6, saved: 15.8 }, …]
```

## Reading it

- **`ms`** is the median interval between frames; **`saved`** is the baseline
  minus that.
- **A headset's frame time moves in steps.** The compositor shows a frame on a
  refresh or the one after, so at 72 Hz the readings are 13.9, 27.8, 41.7,
  55.6 ms and so on. A saving smaller than a step can read as zero, and two
  small savings can add up to a step that neither shows alone.
- **`- everything`** is the floor: what the session costs with nothing drawn.
  If it is close to the baseline, the scene is not the problem.
- **`baseline again`** is the first measurement repeated at the end. If it
  differs from the first, the device drifted during the sweep (heat, a
  background task) and the rows are that much in doubt: run it again.
- Groups are meshes sharing a material, named after it. The sweep takes the
  twelve that could cover most of the view and lumps the rest as `other`.

Each experiment is restored before the next. A sweep changes nothing for good.

## If it hangs the device

The first run on a Quest did. The sweep writes what it has measured, and the
name of the experiment it is about to start, to `localStorage` before each
one. Reload the page and Perf Stats shows the rows it got and **stopped at:**
the experiment that never finished. The two headset levers run last for that
reason: they are the part no emulator can exercise.
*/
/*{ "parent": "performance", "order": 15 }*/
import type * as BABYLON from '@babylonjs/core'

export interface SweepRow {
  name: string
  /** Median interval between frames, ms. */
  ms: number
  p95: number
  /** Baseline `ms` minus this row's. Positive: switching it off was faster. */
  saved: number
  frames: number
}

/** Median and 95th percentile of a list of frame intervals. */
export function summarise(intervals: number[]): { ms: number; p95: number } {
  if (intervals.length === 0) return { ms: 0, p95: 0 }
  const sorted = [...intervals].sort((a, b) => a - b)
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
  return { ms: at(0.5), p95: at(0.95) }
}

/**
 * The group a mesh belongs to: its material's name, or its own, with instance
 * numbers dropped so `tile_12` and `tile_7` are one group, and cut at the
 * first hyphen so a family of materials is one group too.
 */
export function groupKey(meshName: string, materialName?: string): string {
  const raw =
    materialName != null && materialName !== '' ? materialName : meshName
  const key = raw
    // A family of materials (`deco-leaf-Green`, `deco-bark-Wood`) is one group.
    .replace(/^((?:b3d|tosi)-[^-]+|[^-]+).*$/, '$1')
    .replace(/[_\-. ]*\d+$/g, '')
    .replace(/[_\-. ]+$/g, '')
    .trim()
  return key === '' ? 'unnamed' : key
}

/** Keep the `keep` heaviest groups; the rest become one group called `other`. */
export function topGroups<T>(
  groups: Map<string, { weight: number; items: T[] }>,
  keep = 12
): Array<{ name: string; items: T[] }> {
  const ranked = [...groups.entries()].sort((a, b) => b[1].weight - a[1].weight)
  const out = ranked
    .slice(0, keep)
    .map(([name, g]) => ({ name, items: g.items }))
  const rest = ranked.slice(keep).flatMap(([, g]) => g.items)
  if (rest.length > 0) out.push({ name: 'other', items: rest })
  return out
}

/** The baseline first, then the rest by what they saved, as panel lines. */
export function formatSweep(rows: SweepRow[]): string[] {
  if (rows.length === 0) return []
  const [base, ...rest] = rows
  const sorted = [...rest].sort((a, b) => b.saved - a.saved)
  const fps = (ms: number) => (ms > 0 ? Math.round(1000 / ms) : 0)
  return [
    `${base.name}  ${base.ms.toFixed(1)}ms  ${fps(
      base.ms
    )}fps  p95 ${base.p95.toFixed(0)}`,
    ...sorted.map(
      (r) =>
        `${r.saved >= 0 ? '-' : '+'}${Math.abs(r.saved).toFixed(1)}  ${
          r.name
        }  (${r.ms.toFixed(1)}ms ${fps(r.ms)}fps)`
    ),
  ]
}

export interface SweepOptions {
  /** Seconds sampled per experiment. */
  seconds?: number
  /** Seconds to let each change settle before sampling. */
  settle?: number
  /** The XR helper, when a session may be running. */
  xr?: BABYLON.WebXRDefaultExperience | null
  /** Called as each experiment starts, and with `null` at the end. */
  progress?: (name: string | null, done: number, total: number) => void
  /** Called before sampling starts and after it ends (lift a frame cap here). */
  unthrottle?: (on: boolean) => void
  /** Meshes the sweep must leave alone (the panel it is run from, the hands). */
  skip?: (mesh: BABYLON.AbstractMesh) => boolean
  /**
   * Called before each experiment with the rows so far and the one about to
   * start, and with `null` when the sweep finishes. Write it somewhere that
   * survives a crash: an experiment that hangs the device is then named.
   */
  journal?: (rows: SweepRow[], starting: string | null) => void
  /**
   * More experiments, run after the closing baseline. `apply` makes the
   * change and returns the way back.
   */
  extra?: Array<{ name: string; apply: () => () => void }>
}

/**
 * Run the sweep on a live scene. One at a time: a second call while one is
 * running rejects, because two interleaved sweeps measure each other.
 */
let running = false
export async function costSweep(
  scene: BABYLON.Scene,
  options: SweepOptions = {}
): Promise<SweepRow[]> {
  if (running) throw new Error('costSweep is already running')
  running = true
  const seconds = options.seconds ?? 2
  const settle = options.settle ?? 0.7
  const engine = scene.getEngine()
  const session = options.xr?.baseExperience?.sessionManager
  const inXr = session?.inXRSession === true
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const groups = new Map<
    string,
    { weight: number; items: BABYLON.AbstractMesh[] }
  >()
  const drawn: BABYLON.AbstractMesh[] = []
  for (const m of scene.meshes) {
    if (!m.isEnabled() || !m.isVisible || m.getTotalVertices() === 0) continue
    if (options.skip?.(m) === true) continue
    drawn.push(m)
    const key = groupKey(m.name, m.material?.name)
    const g = groups.get(key) ?? { weight: 0, items: [] }
    const copies = Math.max(
      1,
      (m as unknown as { thinInstanceCount?: number }).thinInstanceCount ?? 1
    )
    // Ranked by how much of the view a group could cover, not by triangles:
    // on a headset the cost is pixels, and the sky is twelve triangles.
    const radius = m.getBoundingInfo().boundingSphere.radiusWorld
    g.weight += radius * radius * copies
    g.items.push(m)
    groups.set(key, g)
  }
  const hide = (items: BABYLON.AbstractMesh[]) => () => {
    for (const m of items) m.isVisible = false
    return () => {
      for (const m of items) m.isVisible = true
    }
  }

  type Experiment = { name: string; apply: () => () => void }
  const experiments: Experiment[] = [
    { name: 'baseline', apply: () => () => {} },
  ]
  if (!inXr) {
    experiments.push({
      name: 'half the pixels',
      apply: () => {
        const was = engine.getHardwareScalingLevel()
        engine.setHardwareScalingLevel(was * Math.SQRT2)
        return () => engine.setHardwareScalingLevel(was)
      },
    })
  }
  experiments.push({
    name: '- render targets',
    apply: () => {
      const was = scene.renderTargetsEnabled
      scene.renderTargetsEnabled = false
      return () => {
        scene.renderTargetsEnabled = was
      }
    },
  })
  experiments.push({
    name: '- shadows',
    apply: () => {
      const was = scene.shadowsEnabled
      scene.shadowsEnabled = false
      return () => {
        scene.shadowsEnabled = was
      }
    },
  })
  for (const g of topGroups(groups))
    experiments.push({ name: `- ${g.name}`, apply: hide(g.items) })
  experiments.push({ name: '- everything', apply: hide(drawn) })
  // Again at the end: if this differs from the first, the device drifted
  // (heat, a background task) and the rows between are that much in doubt.
  experiments.push({ name: 'baseline again', apply: () => () => {} })
  /*
  LAST, and after the closing baseline, on purpose. These two go through the
  headset's own compositor, the one part an emulator cannot exercise, and the
  first sweep run on a Quest hung it. Whatever they do, the scene rows are
  already measured and journalled by the time they start.
  */
  for (const e of options.extra ?? []) experiments.push(e)
  if (inXr && session != null) {
    experiments.push({
      name: 'foveation 1',
      apply: () => {
        const was = session.fixedFoveation
        session.fixedFoveation = 1
        return () => {
          session.fixedFoveation = was ?? 0
        }
      },
    })
    experiments.push({
      name: 'viewport x0.7',
      apply: () => {
        // A view can only be asked inside the frame that produced it, so the
        // way back is one more frame asking for the full viewport.
        const ask = (scale: number) => (frame: XRFrame) => {
          const pose = frame.getViewerPose(session.referenceSpace)
          for (const v of pose?.views ?? [])
            (
              v as unknown as { requestViewportScale?: (s: number) => void }
            ).requestViewportScale?.(scale)
        }
        const obs = session.onXRFrameObservable.add(ask(0.7))
        return () => {
          session.onXRFrameObservable.remove(obs)
          session.onXRFrameObservable.addOnce(ask(1))
        }
      },
    })
  }

  const rows: SweepRow[] = []
  options.unthrottle?.(true)
  try {
    for (let i = 0; i < experiments.length; i++) {
      const e = experiments[i]
      options.progress?.(e.name, i, experiments.length)
      options.journal?.(rows, e.name)
      const restore = e.apply()
      try {
        await wait(settle * 1000)
        const intervals: number[] = []
        let last = 0
        const obs = scene.onAfterRenderObservable.add(() => {
          const now = performance.now()
          if (last > 0) intervals.push(now - last)
          last = now
        })
        await wait(seconds * 1000)
        scene.onAfterRenderObservable.remove(obs)
        const s = summarise(intervals)
        rows.push({
          name: e.name,
          ms: s.ms,
          p95: s.p95,
          saved: rows.length > 0 ? rows[0].ms - s.ms : 0,
          frames: intervals.length,
        })
      } finally {
        restore()
      }
    }
  } finally {
    options.unthrottle?.(false)
    options.progress?.(null, experiments.length, experiments.length)
    running = false
  }
  options.journal?.(rows, null)
  return rows
}
