import { beforeAll, describe, expect, mock, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

/*
THE VOICE BUDGET: over it the quietest voice yields, and a voice that yielded
stays quiet. It used to be started again on the next frame and evicted again,
a new WebAudio graph (and for a `url` voice a fetch) every frame for every
voice over budget (0.11.0 gate). WebAudio is stubbed: what is counted is how
often a voice is started.
*/
let starts = 0
let stops = 0
mock.module('./effect-audio.js', () => ({
  placeListener() {},
  startVoice() {
    starts++
    return {
      place() {},
      set() {},
      stop() {
        stops++
      },
    }
  },
}))

// The player's imports reach tosijs, which needs a DOM (as the other scene
// tests set up).
beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  g.document ??= win.document
})

describe('effect voices over budget', () => {
  test('a voice that yielded is not started again every frame', async () => {
    const { EffectPlayer } = await import('./effect-player.js')
    const { setQuality, qualityBudgets } = await import('./b3d-quality.js')
    const { EFFECT_RECIPE_VERSION } = await import('./effect-recipe.js')
    setQuality('low')
    const budget = qualityBudgets().effectVoices
    const engine = new BABYLON.NullEngine()
    const scene = new BABYLON.Scene(engine)
    new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 0, -5), scene)
    const node = new BABYLON.TransformNode('here', scene)
    // Three more voices than the budget, each a little louder than the last.
    const extra = 3
    const layers = Array.from({ length: budget + extra }, (_, i) => ({
      kind: 'sound' as const,
      voice: 'rumble' as const,
      gain: 0.2 + i * 0.05,
    }))
    const player = new EffectPlayer(scene, node, {
      version: EFFECT_RECIPE_VERSION,
      layers,
    } as any)
    player.play()
    for (let f = 0; f < 5; f++) scene.render()
    const settled = starts
    for (let f = 0; f < 60; f++) scene.render()
    // Every voice started once, the quietest `extra` stopped once, and no
    // restarts while nothing changed.
    expect(settled).toBe(budget + extra)
    expect(starts).toBe(settled)
    expect(stops).toBe(extra)
    player.dispose()
    scene.dispose()
    engine.dispose()
    setQuality('auto')
  })
})
