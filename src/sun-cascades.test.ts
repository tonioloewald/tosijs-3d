import { beforeAll, describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

/*
A SUN'S CASCADES FOLLOW THE CAMERA (#3420). Babylon splits the cascades from
the camera's near and far planes once, and again only when the generator's
own settings change. A sun made while an orthographic face view held the
near plane behind the camera split from it, got NaN, and drew the whole
scene black from then on (reproduced headless: a late sun, a face view,
back to perspective).

A real cascaded generator needs a depth-texture array, which a NullEngine
cannot make, so the repair is driven against a stand-in with the surface it
uses: the shadow map's before-bind observable, `splitFrustum()` and
`shadowMaxZ`. What it checks is what the repair promises: split again when
the camera changes, never split from a near plane at or behind the camera,
and give the camera its own near plane back.
*/
let follow: typeof import('./b3d-shadows.js').cascadesFollowCamera

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
  follow = (await import('./b3d-shadows.js')).cascadesFollowCamera
})

function setup() {
  const engine = new BABYLON.NullEngine()
  const scene = new BABYLON.Scene(engine)
  const cam = new BABYLON.ArcRotateCamera(
    'cam',
    1,
    1,
    10,
    BABYLON.Vector3.Zero(),
    scene
  )
  scene.activeCamera = cam
  const onBeforeBind = new BABYLON.Observable<unknown>()
  // What the generator would split from, read at the moment it splits.
  const splitNear: number[] = []
  const gen = {
    shadowMaxZ: 0,
    splitFrustum: () => splitNear.push(scene.activeCamera!.minZ),
    getShadowMap: () => ({
      onBeforeBindObservable: onBeforeBind,
      getScene: () => scene,
    }),
  }
  // Babylon's own observer sits between ours: it splits when told to.
  follow(gen as any, () => 30)
  const render = () => onBeforeBind.notifyObservers(null)
  return { engine, scene, cam, gen, splitNear, render }
}

describe('cascadesFollowCamera', () => {
  test('splits once, and again only when the camera changes', () => {
    const { engine, cam, gen, splitNear, render } = setup()
    render()
    render()
    expect(splitNear.length).toBe(1)
    expect(gen.shadowMaxZ).toBe(30)
    cam.maxZ = 500
    render()
    expect(splitNear.length).toBe(2)
    engine.dispose()
  })

  test('a near plane behind the camera is never split from, and is given back', () => {
    const { engine, scene, cam, splitNear, render } = setup()
    cam.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
    cam.minZ = -cam.maxZ
    render()
    expect(splitNear[splitNear.length - 1]).toBeGreaterThan(0)
    expect(cam.minZ).toBe(-cam.maxZ)
    // Back to perspective: a change, so it splits again from the real plane.
    cam.mode = BABYLON.Camera.PERSPECTIVE_CAMERA
    cam.minZ = 0.1
    render()
    expect(splitNear[splitNear.length - 1]).toBe(0.1)
    scene.dispose()
    engine.dispose()
  })

  test('a different camera is a change', () => {
    const { engine, scene, splitNear, render } = setup()
    render()
    scene.activeCamera = new BABYLON.FreeCamera(
      'other',
      BABYLON.Vector3.Zero(),
      scene
    )
    render()
    expect(splitNear.length).toBe(2)
    engine.dispose()
  })
})
