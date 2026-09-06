import { describe, test, expect, beforeAll } from 'bun:test'

/*
#43: THE CHASE CAMERA ACCEPTED A SETTING AND IGNORED IT.

`chaseDistance`/`chaseMinHeight` were consumed once, when the rig was built, and
never read again — so a slider bound to one accepted the write, read the new
value back, and moved the camera not at all. ensemble measured it as
bit-identical framing across a 3× change.

What made it worse than an ordinary no-op is that `chasePitchFollow` on the SAME
element IS live, so the element as a whole looked responsive and only some of it
was. From outside there is no way to tell those apart except by measuring each
one — which is exactly what this file does, through `applyInput`, the real
per-frame path.

⚠️ The fix used to be covered only by `aircraft-rig.test.ts`, which imports no
local module at all: deleting `_applyChaseGeometry()` from the frame loop
reintroduced #43 in full with the whole suite still green.

`applyInput` runs headlessly against a NullEngine — the flight model is pure
(`fly-by-wire`) and the owner is duck-typed — so nothing here needs a browser.
*/

let A: typeof import('./b3d-aircraft.js')
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
  A = await import('./b3d-aircraft.js')
})

const EMPTY = {
  forward: 0,
  strafe: 0,
  turn: 0,
  pitch: 0,
  throttle: 0,
  jump: false,
  shoot: false,
  sprint: false,
  interact: false,
  cameraZoom: 0,
  lookX: 0,
  lookY: 0,
  aim: false,
} as any

/** An aircraft with the chase rig built, ready to be flown one frame at a time. */
const flying = (attrs: Record<string, unknown> = {}) => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  /*
  ⚠️ ASSIGNED AS PROPERTIES. tosijs drains attributes on `connectedCallback`,
  and this element is never in a document — anything passed to the creator's
  config would sit unread and the test would measure the default instead.
  (`chaseDistance` and friends are plain fields rather than attributes, so they
  would have worked either way; `weapons` would not have.)
  */
  const el = A.b3dAircraft({}) as any
  Object.assign(el, { weapons: 'off', ...attrs })

  el.owner = {
    scene,
    register: () => {},
    addSceneListener: () => {},
    whenReady: (cb: () => void) => cb(),
    addDebugSource: () => () => {},
    addOriginListener: () => {},
    removeOriginListener: () => {},
    shiftOrigin: () => {},
    insideCavity: () => false,
  }

  const node = new BABYLON.TransformNode('plane', scene)
  node.rotationQuaternion = BABYLON.Quaternion.Identity()
  el.meshNode = node
  el.mesh = node

  const pivot = new BABYLON.TransformNode('chase-pivot', scene)
  pivot.rotationQuaternion = BABYLON.Quaternion.Identity()
  el._chasePivot = pivot

  const chase = new BABYLON.FreeCamera(
    'chase',
    new BABYLON.Vector3(0, 0, 0),
    scene
  )
  chase.parent = pivot
  chase.rotationQuaternion = BABYLON.Quaternion.Identity()
  el.chaseCamera = chase

  return {
    el,
    chase,
    /** One frame of the real update, with the sticks centred. */
    frame(dt = 1 / 60) {
      el.applyInput({ ...EMPTY }, dt)
    },
    /** Where the camera sits behind and above the airframe. */
    get offset() {
      return { y: chase.position.y, z: chase.position.z }
    },
    /** The fixed look-down angle that keeps the plane framed. */
    get lookPitch(): number {
      return el._chaseLookPitch
    },
  }
}

describe('the chase rig reads its geometry every frame', () => {
  test('a change to chaseDistance MOVES the camera — the reported no-op', () => {
    const f = flying({ chaseDistance: 6, chaseMinHeight: 2 })
    f.frame()
    const before = f.offset.z
    f.el.chaseDistance = 18 // 3×, the change ensemble measured as bit-identical
    f.frame()
    expect(f.offset.z).not.toBeCloseTo(before, 6)
    expect(f.offset.z).toBeCloseTo(before * 3, 6)
  })

  test('a change to chaseMinHeight moves it too', () => {
    const f = flying({ chaseDistance: 6, chaseMinHeight: 2 })
    f.frame()
    const before = f.offset.y
    f.el.chaseMinHeight = 6
    f.frame()
    expect(f.offset.y).toBeCloseTo(before * 3, 6)
  })

  test('the camera sits BEHIND and ABOVE, which is what the sign convention means', () => {
    // −Z is behind (the airframe's nose is local +Z) and +Y is above. Getting
    // either sign wrong puts the view inside or under the plane.
    const f = flying({ chaseDistance: 6, chaseMinHeight: 2 })
    f.frame()
    expect(f.offset.z).toBeLessThan(0)
    expect(f.offset.y).toBeGreaterThan(0)
  })
})

describe('the look angle follows from the geometry, not from a second setting', () => {
  test('it is atan2(height, distance) — the camera looks DOWN at the plane', () => {
    const f = flying({ chaseDistance: 6, chaseMinHeight: 2 })
    f.frame()
    expect(f.lookPitch).toBeCloseTo(Math.atan2(2, 6), 9)
    expect(f.lookPitch).toBeGreaterThan(0)
  })

  test('scaling BOTH backs the camera off along the same sight line', () => {
    /*
    Why the three chase constants move together whenever content scale changes.
    The look angle is the RATIO, so doubling both leaves the framing angle
    untouched and only the distance grows — which is what "pull it back" should
    mean, and is not what changing distance alone would do.
    */
    const f = flying({ chaseDistance: 6, chaseMinHeight: 2 })
    f.frame()
    const angle = f.lookPitch
    f.el.chaseDistance = 12
    f.el.chaseMinHeight = 4
    f.frame()
    expect(f.lookPitch).toBeCloseTo(angle, 9)
    expect(f.offset.z).toBeCloseTo(-2 * 6 * (f.offset.y / 4), 6)
  })

  test('a change to the geometry updates the angle, not just the position', () => {
    // Moving the camera without re-aiming it frames the plane at the wrong
    // place — the half-fix that looks right until you change the ratio.
    const f = flying({ chaseDistance: 6, chaseMinHeight: 2 })
    f.frame()
    const angle = f.lookPitch
    f.el.chaseMinHeight = 6 // taller only: a steeper look-down
    f.frame()
    expect(f.lookPitch).toBeGreaterThan(angle)
    expect(f.lookPitch).toBeCloseTo(Math.atan2(6, 6), 9)
  })
})
