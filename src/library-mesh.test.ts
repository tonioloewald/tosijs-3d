import { describe, test, expect, afterEach } from 'bun:test'
import { loadLibraryMesh, type LibraryMeshRequest } from './library-mesh.js'

/*
THE SHARED LOADER HAD NO DIRECT TEST, WHICH IS HOW TWO BUGS GOT BACK IN.

`loadLibraryMesh` is what `b3d-prop`, `b3d-destroyable`, `b3d-turret` and
`b3d-launcher` all instantiate models through, and it was covered only through
those elements — each of which needs a DOM and a Babylon scene, so in practice
it was covered by nothing. Both #48 (rotation dropped on the library path) and
the per-scene cache bug live in code this file now exercises directly.

Nothing about it needs a browser: `owner` is duck-typed down to `getLibrary`,
and the library down to `ready` + `instantiate`. That is the whole reason it is
testable — and the reason a test that stubs those is real coverage rather than a
second copy of the logic.

`setInterval` is replaced with a hand-driven clock so the retry and the 5-second
give-up are assertions rather than a wait.
*/

/** A controllable stand-in for the module's `setInterval`/`clearInterval`. */
const fakeClock = () => {
  const timers = new Map<number, () => void>()
  let next = 1
  const realSet = globalThis.setInterval
  const realClear = globalThis.clearInterval
  ;(globalThis as any).setInterval = (fn: () => void) => {
    const id = next++
    timers.set(id, fn)
    return id
  }
  ;(globalThis as any).clearInterval = (id: number) => {
    timers.delete(id)
  }
  return {
    /** Fire every live timer once, as one 100 ms tick would. */
    tick(n = 1) {
      for (let i = 0; i < n; i++) for (const fn of [...timers.values()]) fn()
    },
    get pending() {
      return timers.size
    },
    restore() {
      globalThis.setInterval = realSet
      globalThis.clearInterval = realClear
    },
  }
}

let clock: ReturnType<typeof fakeClock> | null = null
afterEach(() => {
  clock?.restore()
  clock = null
})

const PLACE = { x: 1, y: 2, z: 3, rx: 10, ry: 20, rz: 30 }

/**
 * A request over a stub library, with the calls it makes recorded.
 *
 * `libraryAfter` is how many `getLibrary` misses to serve before the library
 * "connects" — declaration order in a scene is the author's business, so the
 * loader must survive being asked first.
 */
const harness = (
  opts: {
    libraryAfter?: number
    instantiate?: (name: string, cfg: any) => unknown
    generation?: () => number
    started?: number
  } = {}
) => {
  const calls: Array<{ name: string; cfg: any }> = []
  const loaded: unknown[] = []
  let asked = 0
  let readyResolve: () => void = () => {}
  const ready = new Promise<void>((r) => {
    readyResolve = r
  })

  const lib = {
    ready,
    instantiate: (name: string, cfg: any) => {
      calls.push({ name, cfg })
      return opts.instantiate ? opts.instantiate(name, cfg) : { name: 'root' }
    },
  }

  const owner = {
    getLibrary: (_type: string) => {
      asked++
      return asked > (opts.libraryAfter ?? 0) ? lib : null
    },
  }

  const req: LibraryMeshRequest = {
    owner: owner as never,
    type: 'kit',
    meshName: 'crate',
    transform: { ...PLACE },
    generation: opts.generation ?? (() => 1),
    started: opts.started ?? 1,
    onLoaded: (node) => loaded.push(node),
    label: '<tosi-b3d-prop>',
  }

  return {
    req,
    calls,
    loaded,
    get asked() {
      return asked
    },
    /** Let `lib.ready` settle, then let its `.then` run. */
    async settle() {
      readyResolve()
      await ready
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

describe('placement reaches instantiate', () => {
  test('forwards ROTATION as well as position — #48', async () => {
    /*
    The bug that came back after the loader was already shared: rotation cannot
    be left to a later `render()`, because `AbstractMesh.render()` is a
    COMPONENT render and has already run by the time an async load assigns the
    mesh. Position applied, rotation silently did not, and a launcher with
    `ry: 180` fired its shells backwards.
    */
    const h = harness()
    loadLibraryMesh(h.req)
    await h.settle()
    expect(h.calls).toHaveLength(1)
    expect(h.calls[0].name).toBe('crate')
    expect(h.calls[0].cfg).toMatchObject(PLACE)
  })

  test('asks for the CANONICAL frame — the fix the `url:` path does not get', async () => {
    const h = harness()
    loadLibraryMesh(h.req)
    await h.settle()
    expect(h.calls[0].cfg.canonical).toBe(true)
  })

  test('hands the instantiated root to the caller', async () => {
    const node = { it: 'me' }
    const h = harness({ instantiate: () => node })
    loadLibraryMesh(h.req)
    await h.settle()
    expect(h.loaded).toEqual([node])
  })
})

describe('the library may connect AFTER the element', () => {
  test('retries until it appears, then loads once', async () => {
    clock = fakeClock()
    const h = harness({ libraryAfter: 3 })
    loadLibraryMesh(h.req)
    expect(h.calls).toHaveLength(0)
    expect(clock.pending).toBe(1)
    clock.tick(3)
    await h.settle()
    expect(h.calls).toHaveLength(1)
    // ...and it stops asking once it has what it wanted.
    expect(clock.pending).toBe(0)
  })

  test('gives up loudly after 5 s rather than polling forever', () => {
    /*
    A missing library is an authoring mistake, and the failure has to SAY so.
    Silence here is what sent four consumers off to write their own retry.
    */
    clock = fakeClock()
    const h = harness({ libraryAfter: Number.MAX_SAFE_INTEGER })
    const errors: string[] = []
    const realError = console.error
    console.error = (...a: unknown[]) => errors.push(String(a[0]))
    try {
      loadLibraryMesh(h.req)
      clock.tick(51)
    } finally {
      console.error = realError
    }
    expect(clock.pending).toBe(0)
    expect(errors.join('\n')).toContain('no <tosi-b3d-library type="kit">')
  })

  test('the disposer stops the retry, so a removed element holds no timer', () => {
    clock = fakeClock()
    const h = harness({ libraryAfter: Number.MAX_SAFE_INTEGER })
    const stop = loadLibraryMesh(h.req)
    expect(clock.pending).toBe(1)
    stop()
    expect(clock.pending).toBe(0)
  })
})

describe('a superseded load must not land — #49', () => {
  /*
  Remove the element inside the load window and the disconnect handler finds
  nothing to dispose; the pending callback then builds a node owned by nobody,
  which is a permanent ghost in the scene. The generation guard is what makes
  that unrepresentable.
  */

  test('a generation bump BEFORE the library resolves discards the load', async () => {
    let gen = 1
    const h = harness({ generation: () => gen, started: 1 })
    loadLibraryMesh(h.req)
    gen = 2 // the element was disposed while `lib.ready` was pending
    await h.settle()
    expect(h.calls).toHaveLength(0)
    expect(h.loaded).toHaveLength(0)
  })

  test('a load that starts stale never asks for the library at all', () => {
    const h = harness({ generation: () => 9, started: 1 })
    loadLibraryMesh(h.req)
    expect(h.asked).toBe(0)
    expect(h.calls).toHaveLength(0)
  })

  test('a generation bump stops the RETRY as well as the load', () => {
    // Otherwise a disposed element keeps a 5-second timer alive behind it.
    clock = fakeClock()
    let gen = 1
    const h = harness({
      libraryAfter: Number.MAX_SAFE_INTEGER,
      generation: () => gen,
      started: 1,
    })
    loadLibraryMesh(h.req)
    expect(clock.pending).toBe(1)
    gen = 2
    clock.tick()
    expect(clock.pending).toBe(0)
    expect(h.calls).toHaveLength(0)
  })
})

describe('a name the library does not have', () => {
  test('reports it and does NOT call onLoaded with nothing', async () => {
    const h = harness({ instantiate: () => null })
    const errors: string[] = []
    const realError = console.error
    console.error = (...a: unknown[]) => errors.push(String(a[0]))
    try {
      loadLibraryMesh(h.req)
      await h.settle()
    } finally {
      console.error = realError
    }
    expect(h.loaded).toHaveLength(0)
    expect(errors.join('\n')).toContain('could not instantiate "crate"')
    // The message names the asking element, or the author cannot find it.
    expect(errors.join('\n')).toContain('<tosi-b3d-prop>')
  })
})
