import { beforeAll, describe, expect, mock, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

/*
MOUNT, THEN UNMOUNT, LEAVES THE HOST'S SCENE AS IT WAS (tosijs-3d#122).
ensemble builds a scene, mounts the effect tool on a piece, unmounts it, and
asserts every count is back; this pins the same promise here. WebAudio is
stubbed (no AudioContext in a test).
*/
mock.module('./effect-audio.js', () => ({
  placeListener() {},
  startVoice() {
    return { place() {}, set() {}, stop() {} }
  },
}))
/*
Sprites are drawn on a 2D canvas, which a test DOM does not have: stood in for
by 1x1 textures, made and released per scene as the real module does, so the
texture count still says whether they go with the pool.
*/
const sprites = new WeakMap<BABYLON.Scene, Map<string, BABYLON.Texture>>()
const sprite = (scene: BABYLON.Scene, key: string) => {
  let m = sprites.get(scene)
  if (m == null) sprites.set(scene, (m = new Map()))
  let t = m.get(key)
  if (t == null) {
    t = BABYLON.RawTexture.CreateRGBATexture(
      new Uint8Array(4),
      1,
      1,
      scene
    )
    m.set(key, t)
  }
  return t
}
mock.module('./effect-sprites.js', () => ({
  effectSprite: sprite,
  effectTexture: sprite,
  releaseEffectSprites(scene: BABYLON.Scene) {
    for (const t of sprites.get(scene)?.values() ?? []) t.dispose()
    sprites.delete(scene)
  },
}))

let win: any
beforeAll(async () => {
  const { Window } = await import('happy-dom')
  win = new Window() as any
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

const OBSERVABLES = [
  'onBeforeRenderObservable',
  'onAfterRenderObservable',
  'onBeforeAnimationsObservable',
  'onAfterAnimationsObservable',
  'onBeforeCameraRenderObservable',
  'onPointerObservable',
  'onNewMeshAddedObservable',
  'onDisposeObservable',
] as const

function counts(scene: BABYLON.Scene, host: Element) {
  return {
    meshes: scene.meshes.length,
    materials: scene.materials.length,
    textures: scene.textures.length,
    nodes: scene.transformNodes.length,
    lights: scene.lights.length,
    cameras: scene.cameras.length,
    particles: scene.particleSystems.length,
    observers: OBSERVABLES.map(
      (k) => (scene as any)[k]?.observers?.length ?? 0
    ).reduce((a, b) => a + b, 0),
    children: host.children.length,
    active: scene.activeCamera?.name,
  }
}

describe('mountEffectTool', () => {
  test('mount, unmount twice: every count is back, and the camera too', async () => {
    /*
    ONE DOM's events throughout: the panel is a happy-dom element, so its
    events must be happy-dom's, and so must the tool's EventTarget. Bun's own
    stay global otherwise (another file mixing the two failed CI once), so
    they are swapped in for this test only and put back.
    */
    const g = globalThis as any
    const saved = {
      Event: g.Event,
      CustomEvent: g.CustomEvent,
      EventTarget: g.EventTarget,
    }
    Object.assign(g, {
      Event: win.Event,
      CustomEvent: win.CustomEvent,
      EventTarget: win.EventTarget,
    })
    try {
    const { mountEffectTool } = await import('./effect-tool.js')
    const engine = new BABYLON.NullEngine()
    const scene = new BABYLON.Scene(engine)
    const cam = new BABYLON.ArcRotateCamera(
      'host-cam',
      -1,
      1,
      8,
      new BABYLON.Vector3(1, 2, 3),
      scene
    )
    scene.activeCamera = cam
    new BABYLON.HemisphericLight('host-light', BABYLON.Vector3.Up(), scene)
    // The parts of a <tosi-b3d> the tool reaches for.
    const host = document.createElement('div') as any
    host.scene = scene
    host.weatherAt = () => ({ wind: { x: 0, z: 0 } })
    host.setActiveCamera = (c: BABYLON.Camera) => (scene.activeCamera = c)
    host._closeSystemPanel = () => {}

    const before = counts(scene, host)
    const camBefore = [cam.alpha, cam.beta, cam.radius, ...cam.target.asArray()]

    const tool = mountEffectTool(host, { files: false, stage: false, camera: cam })
    for (let f = 0; f < 10; f++) scene.render()
    const during = counts(scene, host)
    expect(during.particles).toBeGreaterThan(0)
    expect(during.children).toBe(before.children + 1) // its system panel

    tool.unmount()
    tool.unmount()
    for (let f = 0; f < 3; f++) scene.render()
    // Babylon removes an observer on the next tick, not at once.
    await new Promise((r) => setTimeout(r, 0))
    expect(counts(scene, host)).toEqual(before)
    expect([cam.alpha, cam.beta, cam.radius, ...cam.target.asArray()]).toEqual(
      camBefore
    )
    scene.dispose()
    engine.dispose()
    } finally {
      Object.assign(g, saved)
    }
  })
})
