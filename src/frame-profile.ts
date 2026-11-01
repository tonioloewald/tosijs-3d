/*
WHERE A FRAME GOES, by callback, on the device. Every observer on the scene's
and engine's per-frame observables is timed (wrapped the first time it is seen,
so ones added later are caught too), next to Babylon's own split (active
meshes, render targets, render) and the time OUTSIDE the frame (timers, GC,
anything not drawn). Each `every` seconds `report` gets the heaviest callbacks
in ms per frame. Debug only: the wrapping stays until the page goes.
*/

import * as BABYLON from '@babylonjs/core'
import { realNow } from './clock.js'

const timed = Symbol('b3dTimed')

export interface FrameProfileSample {
  /** Seconds since the profile started. */
  at: number
  /** Frame interval, ms. */
  frame: number
  /** Inside the engine frame, ms. */
  inFrame: number
  activeMeshes: number
  renderTargets: number
  render: number
  draws: number
  /** The heaviest callbacks, `name ms` per frame, heaviest first. */
  top: string
}

function label(where: string, cb: (...a: any[]) => unknown): string {
  const src = cb.name || String(cb).replace(/\s+/g, ' ').slice(0, 70)
  return `${where}: ${src}`
}

export function frameProfile(
  scene: BABYLON.Scene,
  options: {
    seconds: number
    every: number
    report: (s: FrameProfileSample) => void
  }
): () => void {
  const engine = scene.getEngine()
  const watched: [string, BABYLON.Observable<any>][] = [
    ['beforeRender', scene.onBeforeRenderObservable],
    ['afterRender', scene.onAfterRenderObservable],
    ['beforeAnimations', scene.onBeforeAnimationsObservable],
    ['afterAnimations', scene.onAfterAnimationsObservable],
    ['beforeActive', scene.onBeforeActiveMeshesEvaluationObservable],
    ['afterActive', scene.onAfterActiveMeshesEvaluationObservable],
    ['beforeCamera', scene.onBeforeCameraRenderObservable],
    ['afterCamera', scene.onAfterCameraRenderObservable],
    ['beforeRTT', scene.onBeforeRenderTargetsRenderObservable],
    ['beginFrame', engine.onBeginFrameObservable],
    ['endFrame', engine.onEndFrameObservable],
  ]
  const totals = new Map<string, number>()
  const wrap = () => {
    for (const [where, obs] of watched) {
      for (const o of (obs as any)._observers as BABYLON.Observer<any>[]) {
        if (o == null || (o as any)[timed]) continue
        ;(o as any)[timed] = true
        const cb = o.callback
        const name = label(where, cb)
        o.callback = function (this: unknown, ...args: any[]) {
          const t = realNow()
          try {
            return (cb as any).apply(this, args)
          } finally {
            totals.set(name, (totals.get(name) ?? 0) + realNow() - t)
          }
        } as any
      }
    }
  }
  const inst = new BABYLON.SceneInstrumentation(scene)
  inst.captureActiveMeshesEvaluationTime = true
  inst.captureRenderTargetsRenderTime = true
  inst.captureRenderTime = true
  const start = realNow()
  let frames = 0
  let inFrame = 0
  let began = 0
  let windowStart = start
  let draws = 0
  let active = 0
  let rtt = 0
  let render = 0
  const begin = engine.onBeginFrameObservable.add(() => {
    began = realNow()
  })
  const end = engine.onEndFrameObservable.add(() => {
    if (began > 0) inFrame += realNow() - began
    frames++
    draws += inst.drawCallsCounter.current
    active += inst.activeMeshesEvaluationTimeCounter.current
    rtt += inst.renderTargetsRenderTimeCounter.current
    render += inst.renderTimeCounter.current
    const now = realNow()
    if (now - windowStart < options.every * 1000) return
    wrap()
    const n = Math.max(1, frames)
    const top = [...totals]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .filter(([, ms]) => ms / n >= 0.2)
      .map(([k, ms]) => `${k} ${(ms / n).toFixed(1)}`)
      .join(' | ')
    options.report({
      at: Math.round((now - start) / 1000),
      frame: Math.round((now - windowStart) / n),
      inFrame: Math.round(inFrame / n),
      activeMeshes: Math.round(active / n),
      renderTargets: Math.round(rtt / n),
      render: Math.round(render / n),
      draws: Math.round(draws / n),
      top,
    })
    totals.clear()
    frames = inFrame = draws = active = rtt = render = 0
    windowStart = now
    if (now - start >= options.seconds * 1000) stop()
  })
  wrap()
  function stop() {
    engine.onBeginFrameObservable.remove(begin)
    engine.onEndFrameObservable.remove(end)
    inst.dispose()
  }
  return stop
}
