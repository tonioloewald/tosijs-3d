import { beforeAll, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

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

test('an SVG picture that loads after its scene let it go draws nothing, and does not throw', async () => {
  // ensemble's editor rebuilds constantly: the last effect (and its pictures)
  // went before the image arrived, and onload drew on a disposed texture.
  const { effectTexture, releaseEffectSprites } = await import(
    './effect-sprites.js'
  )
  const g = globalThis as any
  const RealImage = g.Image
  const made: Array<{ onload: (() => void) | null; src: string }> = []
  g.Image = class {
    onload: (() => void) | null = null
    src = ''
    constructor() {
      made.push(this)
    }
  }
  try {
    const engine = new BABYLON.NullEngine()
    const scene = new BABYLON.Scene(engine)
    effectTexture(scene, '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    expect(made.length).toBe(1)
    releaseEffectSprites(scene)
    expect(() => made[0].onload?.()).not.toThrow()
    scene.dispose()
    engine.dispose()
  } finally {
    g.Image = RealImage
  }
})
