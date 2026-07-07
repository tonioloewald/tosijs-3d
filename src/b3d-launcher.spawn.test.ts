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

function makeScene(): BABYLON.Scene {
  const engine = new NullEngine()
  // NullEngine reports a 0ms frame time headlessly; the projectile integrates by dt,
  // so give it a real 16ms tick to exercise the motion.
  ;(engine as any).getDeltaTime = () => 16
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
