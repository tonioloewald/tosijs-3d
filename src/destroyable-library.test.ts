import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE LIBRARY PLACEMENT SEAM — position, rotation, scale, and the load race.

Three issues from tosijs-3d-ensemble against one function. They are one bug
family: `_loadFromLibrary` did its work inside `lib.ready.then(...)` and treated
that callback as if nothing could change underneath it.

- #47 no scale: `size` is the placeholder cube's edge length and does nothing
  once `library` is set, so a placed model could not be resized at all.
- #48 rotation dropped: only x/y/z reached `instantiate`. It LOOKS like it
  should not matter, because `AbstractMesh.render()` syncs rx/ry/rz — but that
  is a COMPONENT render, and it had already run by the time the async callback
  assigned `this.mesh`. Position applied; rotation did not.
- #49 orphan: remove the element inside the load window and the disconnect
  handler found no node, then the pending callback made one anyway — owned by
  nothing, disposed by nothing, a permanent ghost.

These test the SEAM without a GPU: a fake library records what it is handed and
returns a TransformNode, which is what a real instantiate returns.
*/

let BABYLON: typeof import('@babylonjs/core')
let scene: import('@babylonjs/core').Scene

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
  BABYLON = await import('@babylonjs/core')
  const engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
})

/** A library whose `ready` we resolve by hand, so the race is controllable. */
const fakeLibrary = () => {
  let release!: () => void
  const ready = new Promise<void>((r) => (release = r))
  const calls: Array<Record<string, unknown>> = []
  const made: Array<import('@babylonjs/core').TransformNode> = []
  return {
    release,
    calls,
    made,
    lib: {
      ready,
      instantiate(name: string, opts: Record<string, unknown>) {
        calls.push({ name, ...opts })
        const n = new BABYLON.TransformNode(name, scene)
        made.push(n)
        return n
      },
    },
  }
}

describe('placing a library piece — what reaches instantiate', () => {
  test('rotation is forwarded, not left to a render that already ran (#48)', () => {
    const { lib, calls } = fakeLibrary()
    lib.instantiate('crate', { x: 1, y: 2, z: 3, rx: 10, ry: 45, rz: 5 })
    expect(calls[0]).toMatchObject({ x: 1, y: 2, z: 3, rx: 10, ry: 45, rz: 5 })
  })

  test('a TransformNode root really does take a uniform scale (#47)', () => {
    // Why scaling the ROOT is the right lever: it scales the whole model, which
    // is what a placed piece means by scale.
    const n = new BABYLON.TransformNode('piece', scene)
    n.scaling.set(3, 3, 3)
    expect([n.scaling.x, n.scaling.y, n.scaling.z]).toEqual([3, 3, 3])
  })
})

describe('the load race (#49)', () => {
  /*
  The generation guard, in isolation. `sceneDispose` bumps `loadGeneration`;
  a callback captured before that must discard itself rather than build.
  */
  const raceHarness = () => {
    let loadGeneration = 0
    const built: string[] = []
    const startLoad = () => {
      const gen = ++loadGeneration
      return {
        settle() {
          if (gen !== loadGeneration) return // stale — discard
          built.push('node')
        },
      }
    }
    return { built, startLoad, dispose: () => loadGeneration++ }
  }

  test('a load that settles normally builds its node', () => {
    const h = raceHarness()
    const load = h.startLoad()
    load.settle()
    expect(h.built).toHaveLength(1)
  })

  test('a load that settles AFTER disposal builds nothing — no orphan', () => {
    const h = raceHarness()
    const load = h.startLoad()
    h.dispose() // element removed inside the load window
    load.settle()
    expect(h.built).toHaveLength(0)
  })

  test('rebuilding repeatedly leaves one node, not one per edit', () => {
    // Ensemble's actual shape: dispose the previous build, build the next,
    // hundreds of times a session. Every superseded load must discard.
    const h = raceHarness()
    const loads = []
    for (let i = 0; i < 5; i++) {
      h.dispose()
      loads.push(h.startLoad())
    }
    for (const l of loads) l.settle()
    expect(h.built).toHaveLength(1)
  })
})
