import { describe, test, expect } from 'bun:test'

/*
A MOVE MUST NOT COST A SCENE — the lifecycle rule, tested without a GPU.

`connectedCallback` built an Engine and a Scene unconditionally, so re-parenting
an element built a SECOND pair. Disposing the first deletes its materials' shader
programs, and the surviving scene then renders black while every uniform reads
correct and `isReady()` returns true (tosijs-3d#58, and the real cause of the
intermittent black sky in #51).

A real `B3d` needs WebGL, so this pins the SEQUENCING rather than the rendering:
that a disconnect immediately followed by a connect performs no teardown at all.
That is the whole fix — the deferred teardown, and the reconnect that cancels it.
*/
class MoveLifecycle {
  teardowns = 0
  builds = 0
  pastAdditions: string[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private built = false
  private sceneReady = false
  private readyQueue: Array<() => void> = []
  private disposeHandlers: Array<() => void> = []

  whenReady(cb: () => void): void {
    if (this.sceneReady) cb()
    else this.readyQueue.push(cb)
  }

  whenSceneDisposed(cb: () => void): () => void {
    this.disposeHandlers.push(cb)
    return () => {
      const i = this.disposeHandlers.indexOf(cb)
      if (i > -1) this.disposeHandlers.splice(i, 1)
    }
  }

  connected(): void {
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
      return // a move: nothing was torn down, nothing to rebuild
    }
    if (!this.built) {
      this.built = true
      this.builds += 1
      this.sceneReady = true
      const queued = this.readyQueue
      this.readyQueue = []
      for (const cb of queued) cb()
    }
  }

  disconnected(): void {
    if (this.timer != null) return
    this.timer = setTimeout(() => {
      this.timer = null
      this.teardowns += 1
      this.built = false
      this.sceneReady = false
      for (const cb of [...this.disposeHandlers]) cb()
      // Scene state goes; the ready queue does NOT — see the tests below.
      this.pastAdditions = []
    }, 0)
  }
}

const settle = () => new Promise((r) => setTimeout(r, 5))

describe('re-parenting', () => {
  test('a MOVE builds once and tears down nothing', async () => {
    // The ensemble case: an ancestor host is re-parented, so everything in its
    // shadow root disconnects and reconnects in one task.
    const el = new MoveLifecycle()
    el.connected()
    el.disconnected()
    el.connected() // same task
    await settle()
    expect(el.builds).toBe(1)
    expect(el.teardowns).toBe(0)
  })

  test('a real REMOVAL still tears down', async () => {
    // The deferral must not turn a removal into a leak — that would trade a
    // corrupted scene for one that never goes away.
    const el = new MoveLifecycle()
    el.connected()
    el.disconnected()
    await settle()
    expect(el.teardowns).toBe(1)
  })

  test('remove, then add back later, builds again', async () => {
    const el = new MoveLifecycle()
    el.connected()
    el.disconnected()
    await settle() // teardown happens
    el.connected()
    expect(el.builds).toBe(2)
    expect(el.teardowns).toBe(1)
  })

  test('repeated moves stay at one scene', async () => {
    const el = new MoveLifecycle()
    el.connected()
    for (let i = 0; i < 5; i++) {
      el.disconnected()
      el.connected()
    }
    await settle()
    expect(el.builds).toBe(1)
    expect(el.teardowns).toBe(0)
  })
})

/*
THE OTHER HALF OF THE CONTRACT. Once "moved" and "removed" are different events,
the lifecycle hooks have to be trustworthy on their own — that is what makes the
engine churn a non-issue rather than a thing every consumer works around.

One rule covers all of it: SUBSCRIPTIONS ARE DURABLE, SCENE STATE IS NOT.
*/
describe('whenReady is a promise, not a hope', () => {
  test('a callback queued before a teardown fires against the NEXT scene', async () => {
    // The silent-drop bug: clearing the queue on teardown meant a consumer that
    // asked for the scene, and had it torn down before it was ready, got
    // nothing — no callback, no error, nothing to observe.
    const el = new MoveLifecycle()
    let ran = 0
    el.whenReady(() => ran++)
    el.disconnected()
    await settle()
    expect(el.teardowns).toBe(1)
    expect(ran).toBe(0) // there was never a scene to run against

    el.connected() // re-added later
    expect(ran).toBe(1) // …and the promise is kept
  })

  test('it still runs immediately when the scene is already up', () => {
    const el = new MoveLifecycle()
    el.connected()
    let ran = 0
    el.whenReady(() => ran++)
    expect(ran).toBe(1)
  })
})

describe('whenSceneDisposed', () => {
  test('fires on a genuine removal', async () => {
    const el = new MoveLifecycle()
    el.connected()
    let disposed = 0
    el.whenSceneDisposed(() => disposed++)
    el.disconnected()
    await settle()
    expect(disposed).toBe(1)
  })

  test('does NOT fire on a move — nothing was disposed', async () => {
    // The distinction the whole fix exists to make. A consumer releasing mesh
    // references here must not be told to let go of a scene that is still live.
    const el = new MoveLifecycle()
    el.connected()
    let disposed = 0
    el.whenSceneDisposed(() => disposed++)
    el.disconnected()
    el.connected()
    await settle()
    expect(disposed).toBe(0)
  })

  test('survives a rebuild, so it need not be re-registered', async () => {
    const el = new MoveLifecycle()
    el.connected()
    let disposed = 0
    el.whenSceneDisposed(() => disposed++)
    el.disconnected()
    await settle()
    el.connected() // second scene
    el.disconnected()
    await settle()
    expect(disposed).toBe(2)
  })

  test('unsubscribing stops it', async () => {
    const el = new MoveLifecycle()
    el.connected()
    let disposed = 0
    const off = el.whenSceneDisposed(() => disposed++)
    off()
    el.disconnected()
    await settle()
    expect(disposed).toBe(0)
  })
})

describe('scene state does not outlive its scene', () => {
  test('a teardown drops pastAdditions, so a new listener is not handed dead meshes', async () => {
    // addSceneListener replays every past addition to a late subscriber. Those
    // are nodes belonging to the scene that was just disposed.
    const el = new MoveLifecycle()
    el.connected()
    el.pastAdditions.push('mesh-from-scene-1')
    el.disconnected()
    await settle()
    el.connected()
    expect(el.pastAdditions).toEqual([])
  })

  test('a MOVE keeps them — the meshes are still alive', async () => {
    const el = new MoveLifecycle()
    el.connected()
    el.pastAdditions.push('mesh-still-alive')
    el.disconnected()
    el.connected()
    await settle()
    expect(el.pastAdditions).toEqual(['mesh-still-alive'])
  })
})
