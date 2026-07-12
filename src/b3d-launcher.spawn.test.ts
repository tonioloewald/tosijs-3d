import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine'

// b3d-launcher.ts also defines a tosijs Component (needs a DOM). Stub the few globals
// the module touches at load so we can import + exercise the pure projectile mechanism
// headlessly (this is what launcher.fire()/fireAt() call under the hood).
const g = globalThis as any
const noopEl = () => ({
  style: {},
  append() {},
  appendChild() {},
  addEventListener() {},
  setAttribute() {},
  querySelector: () => null,
})
g.HTMLElement ??= class {}
g.customElements ??= { define() {}, get() {} }
g.document ??= {
  head: noopEl(),
  body: noopEl(),
  createElement: noopEl,
  addEventListener() {},
  querySelector: () => null,
}
g.addEventListener ??= () => {}
g.window ??= g

// Imported AFTER the globals above — b3d-launcher registers a tosijs Component at load.
const { spawnMissile } = await import('./b3d-launcher')

/** Frame time we feed the headless engine — the missile traces below convert with it. */
const DT_MS = 16

function makeScene(): BABYLON.Scene {
  const engine = new NullEngine()
  // NullEngine reports a 0ms frame time headlessly; the projectile integrates by dt,
  // so give it a real 16ms tick to exercise the motion.
  ;(engine as any).getDeltaTime = () => DT_MS
  const scene = new BABYLON.Scene(engine)
  const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 0, -10), scene)
  scene.activeCamera = cam
  return scene
}
function makeOwner(scene: BABYLON.Scene): any {
  return { scene, onOriginShift() {}, offOriginShift() {} }
}

describe('spawnProjectile — the mechanism behind launcher.fire()', () => {
  test('creates a projectile mesh and moves it along its velocity', async () => {
    const { spawnProjectile } = await import('./b3d-launcher')
    const scene = makeScene()
    spawnProjectile(makeOwner(scene), {
      origin: new BABYLON.Vector3(0, 5, 0),
      velocity: new BABYLON.Vector3(0, 0, 20),
      warhead: { damage: 10 },
      params: { gravity: { x: 0, y: 0, z: 0 }, dragCoeff: 0, mass: 1 },
      maxLifetime: 100,
    })
    const mesh = scene.getMeshByName('projectile') as BABYLON.Mesh
    expect(mesh).not.toBeNull()
    const z0 = mesh.position.z
    for (let i = 0; i < 10; i++) scene.render()
    expect(mesh.position.z).toBeGreaterThan(z0)
  })
})

/**
 * Fly one engagement the way an aircraft actually fires: along the NOSE (+Z), from a
 * platform already doing `launcherSpeed`, at a target `deg` off that nose. The round is
 * NOT launched pointing at its lock — the seeker has to pull it on, and that's the
 * geometry every test below is about.
 *
 * Returns the closest approach (0 = detonated on the target) plus a per-frame trace of
 * speed and how far the heading has swung off the launch direction.
 */
function fly(o: {
  deg: number
  range: number
  launcherSpeed?: number
  boostTime?: number
  turnRate?: number
  frames?: number
}): {
  miss: number
  hit: boolean
  trace: Array<{ t: number; speed: number; headingOffDeg: number }>
} {
  const scene = makeScene()
  const owner = { ...makeOwner(scene), querySelectorAll: () => [] }
  const origin = new BABYLON.Vector3(0, 20, 0)
  const rad = (o.deg * Math.PI) / 180
  const target = BABYLON.MeshBuilder.CreateBox('target', { size: 2 }, scene)
  target.position = origin.add(
    new BABYLON.Vector3(Math.sin(rad) * o.range, 0, Math.cos(rad) * o.range)
  )

  let hit = false
  spawnMissile(owner, {
    origin,
    target,
    speed: 90, // b3d-aircraft's live missile tuning
    accel: 120,
    turnRate: o.turnRate ?? 3,
    boostTime: o.boostTime,
    direction: new BABYLON.Vector3(0, 0, 1), // the NOSE, not the target
    // The airframe's speed, which the round inherits. Cruise is
    // max(speed, launcherSpeed + 70), so a fast platform makes a FAST missile — and a
    // fast missile has a wide turn radius (v / turnRate). That is the whole story below.
    inheritVelocity: { x: 0, y: 0, z: o.launcherSpeed ?? 80 },
    warhead: { damage: 10 },
    maxLifetime: 10,
    onImpact: () => {
      hit = true
    },
  })
  const missile = scene.getMeshByName('projectile') as BABYLON.Mesh

  let miss = Infinity
  let prev = missile.position.clone()
  let t = 0
  const trace: Array<{ t: number; speed: number; headingOffDeg: number }> = []
  const frames = o.frames ?? 620
  for (let i = 0; i < frames && !missile.isDisposed(); i++) {
    scene.render()
    if (missile.isDisposed()) break
    t += DT_MS / 1000
    const vel = missile.position.subtract(prev).scale(1000 / DT_MS)
    prev = missile.position.clone()
    const speed = vel.length()
    trace.push({
      t,
      speed,
      headingOffDeg:
        (Math.acos(Math.max(-1, Math.min(1, vel.z / speed))) * 180) / Math.PI,
    })
    miss = Math.min(
      miss,
      BABYLON.Vector3.Distance(missile.position, target.position)
    )
  }
  return { miss: hit ? 0 : miss, hit, trace }
}

describe('spawnMissile — BOOST: accelerate forward, but keep steering', () => {
  // The motor thrusts along the body for `boostTime`, and the seeker's authority ramps
  // in across that window rather than being switched off (see guidance.boostAuthority).
  // So the round leaves the rail going essentially where it was pointed, and gains
  // agility as it gains speed. Worst case for "does it go forward": a lock at the edge
  // of the 35° cone, so the seeker wants to haul it sideways from frame 1.
  const boosting = () => fly({ deg: 35, range: 110, frames: 30 }).trace

  test('leaves the rail essentially straight, and accelerating', () => {
    const trace = boosting()
    const first = trace[0]
    expect(first.headingOffDeg).toBeLessThan(1) // still on the nose
    expect(first.speed).toBeGreaterThan(80) // already moving (inherit + kick)
    // Thrust is building it toward cruise = max(90, 80 + 70) = 150.
    const early = trace[Math.floor(0.1 / (DT_MS / 1000))]
    expect(early.speed).toBeGreaterThan(first.speed)
    expect(early.headingOffDeg).toBeLessThan(5) // barely off the nose yet
  })

  test('but it IS steering during boost — it is not frozen', () => {
    // The bug this replaces: a hard "no steering until burnout" gate. By the end of the
    // 0.45s boost the seeker should have swung the nose well onto the lock.
    const trace = boosting()
    const atBurnout = trace[Math.floor(0.44 / (DT_MS / 1000))]
    expect(atBurnout.headingOffDeg).toBeGreaterThan(20)
    expect(atBurnout.speed).toBeGreaterThan(140) // and it got up to cruise doing it
  })
})

describe('spawnMissile — hits an off-axis lock', () => {
  // b3d-aircraft locks within a 35° cone but fires along the nose, so up to 35° of
  // initial heading error is routine. At the live tuning (airframe 80 → cruise 150,
  // turnRate 3 → turn radius ~50 units) it should still make all of these.
  test.each([0, 15, 25, 35])(
    'hits a target %i° off the nose at range 110',
    (deg) => {
      expect(fly({ deg, range: 110 }).hit).toBe(true)
    }
  )
})

describe('spawnMissile — the turn radius is a WALL, and it is meant to be', () => {
  // A missile turns at turnRate (rad/s) while flying at cruise, so its turn radius is
  // v / turnRate. Cruise is floored at launcherSpeed + 70 — so the faster the platform,
  // the faster the round, and the WIDER the circle it needs to come around.
  //
  // Past a point that circle no longer fits inside the engagement and the shot is
  // physically unmakeable: it overshoots and cannot get back. That is not a bug to be
  // tuned away — these tests exist so nobody "fixes" a miss by inflating turnRate or
  // deleting the closing-speed floor. If you want the shot, don't take it fast, close
  // and off-axis.

  test('fast platform + close + off-axis = forced miss, and by a mile', () => {
    // 150 u/s airframe → cruise 220 → turn radius ~73 units. The target is 70 out and
    // 35° off: it sits well inside that circle.
    const shot = fly({ deg: 35, range: 70, launcherSpeed: 150 })
    expect(shot.hit).toBe(false)
    expect(shot.miss).toBeGreaterThan(20) // ~32 units — a rout, not a graze
  })

  test('the SAME shot is makeable from a slow platform — it is the radius, not a bug', () => {
    // Parked launcher → cruise 90 → turn radius ~30 units, and the identical geometry
    // is comfortably inside the envelope. Same seeker, same code, different physics.
    expect(fly({ deg: 35, range: 70, launcherSpeed: 0 }).hit).toBe(true)
  })

  test('and the fast platform CAN make it with room to turn — reach, not agility', () => {
    // Same 150 u/s airframe, same 15° off-axis: unmakeable up close, makeable with
    // range to work in. Distance is what buys the turn, not a bigger turnRate.
    expect(fly({ deg: 15, range: 70, launcherSpeed: 150 }).hit).toBe(false)
    expect(fly({ deg: 15, range: 110, launcherSpeed: 150 }).hit).toBe(true)
  })
})
