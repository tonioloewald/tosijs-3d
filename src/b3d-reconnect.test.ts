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
  private timer: ReturnType<typeof setTimeout> | null = null
  private built = false

  connected(): void {
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
      return // a move: nothing was torn down, nothing to rebuild
    }
    if (!this.built) {
      this.built = true
      this.builds += 1
    }
  }

  disconnected(): void {
    if (this.timer != null) return
    this.timer = setTimeout(() => {
      this.timer = null
      this.teardowns += 1
      this.built = false
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
