import { describe, test, expect, beforeAll } from 'bun:test'

/*
STARFIELD ATTRIBUTES ARE LIVE (tosijs-3d#88).

They used to be read once, in `sceneReady`, so a document applied to a sky that
already existed — the normal path for a singleton backdrop — produced zero
requests, no stars and no error. These drive a real sky on a NullEngine and
read what landed on the element, never what was asked for.
*/

let S: typeof import('./b3d-skybox.js')
let BABYLON: typeof import('@babylonjs/core')

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
  BABYLON = await import('@babylonjs/core')
  S = await import('./b3d-skybox.js')
})

const world = () => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  scene.activeCamera = new BABYLON.FreeCamera(
    'cam',
    new BABYLON.Vector3(0, 2, 0),
    scene
  )
  const owner: any = {
    scene,
    register: () => {},
    addSceneListener: () => {},
    removeSceneListener: () => {},
    addOriginListener: () => {},
    removeOriginListener: () => {},
    addFogLayer: () => () => {},
    whenReady: (cb: () => void) => cb(),
    querySelector: () => null,
    querySelectorAll: () => [],
  }
  return { scene, owner }
}

const sky = (attrs: Record<string, unknown> = {}) => {
  const el: any = S.b3dSkybox()
  Object.assign(el, { realtimeScale: 0, ...attrs })
  const w = world()
  el.owner = w.owner
  el.sceneReady(w.owner, w.scene)
  return { el, w }
}

describe('starfield attributes on a live sky', () => {
  test('setting starfieldData after construction loads the data cube', () => {
    const { el } = sky()
    expect(el._starData).toBeNull()
    el.starfieldData = '/sky/stars'
    el.render()
    expect(el._starData).not.toBeNull()
    expect(el._starData.url).toContain('/sky/stars')
    el.sceneDispose()
  })

  test('changing it swaps the cube, and clearing it releases it', () => {
    const { el } = sky({ starfieldData: '/sky/0.8.3/stars' })
    const first = el._starData
    expect(first.url).toContain('/sky/0.8.3/stars')
    el.starfieldData = '/sky/0.8.4/stars'
    el.render()
    expect(el._starData).not.toBe(first)
    expect(el._starData.url).toContain('/sky/0.8.4/stars')
    el.starfieldData = ''
    el.render()
    expect(el._starData).toBeNull()
    el.sceneDispose()
  })

  test('a new tilt reaches the dome', () => {
    const { el } = sky({ starfieldData: '/sky/stars', starfieldTilt: '0,0,0' })
    const q0 = el._tiltQuat.clone()
    el.starfieldTilt = '12,25,58'
    el.render()
    expect(el._tiltQuat.equalsWithEpsilon(q0, 1e-6)).toBe(false)
    el.sceneDispose()
  })

  test('an unrelated attribute does not rebuild the starfield', () => {
    const { el } = sky({ starfieldData: '/sky/stars' })
    const data = el._starData
    el.timeOfDay = 22
    el.render()
    expect(el._starData).toBe(data)
    el.sceneDispose()
  })

  test('dispose releases the cubes, so a move does not leak them', () => {
    const { el } = sky({
      starfieldData: '/sky/stars',
      starfieldCube: '/sky/nebula',
    })
    const data = el._starData
    const cube = el._starCube
    el.sceneDispose()
    expect(el._starData).toBeNull()
    expect(el._starCube).toBeNull()
    expect(data.isDisposed ?? data.getInternalTexture() == null).toBeTruthy()
    expect(cube).not.toBeNull()
  })
})

describe('atmosphere — the world has its own air (tosijs-3d#89)', () => {
  test('air is atmosphere × (1 − band)', () => {
    const { el, w } = sky()
    const cam = w.scene.activeCamera!
    expect(el._vacuumNow()).toBe(0) // Earth, sea level
    el.atmosphere = 0
    expect(el._vacuumNow()).toBe(1) // the Moon, without climbing
    el.atmosphere = 0.5
    expect(el._vacuumNow()).toBeCloseTo(0.5, 9)
    // The band still works, and multiplies: half the air, half-way up.
    Object.assign(el, { atmosphere: 0.5, spaceStart: 0, spaceFull: 100 })
    cam.position.y = 50
    cam.computeWorldMatrix(true)
    expect(el._vacuumNow()).toBeCloseTo(1 - 0.5 * 0.5, 6)
    el.sceneDispose()
  })

  test('the tint reaches the sky shader, and white is no change', () => {
    const { el } = sky()
    const mat = el.mesh.material
    expect(mat._vectors3.b3dTintZ.asArray()).toEqual([1, 1, 1])
    expect(mat._floats.b3dTintAmt).toBe(0)
    el.zenithTint = '#e8c890'
    el.horizonTint = '#d09a60'
    el.tintStrength = 1
    el.render()
    expect(mat._floats.b3dTintAmt).toBe(1)
    const z = mat._vectors3.b3dTintZ
    const h = mat._vectors3.b3dTintH
    expect(z.x).toBeCloseTo(0xe8 / 255, 3)
    expect(h.z).toBeCloseTo(0x60 / 255, 3)
    el.sceneDispose()
  })
})
