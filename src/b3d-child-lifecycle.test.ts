import { beforeAll, describe, expect, test } from 'bun:test'

/**
 * `sceneReady` must not run twice without a `sceneDispose` between.
 *
 * Written after the live measurement that found it: a `b3d-launcher` with
 * `fireRate: 6` was firing eleven shots a second on a doc page, and the cause
 * was two render observers subtracting `dt` from the same cooldown. The
 * launcher could not see the duplicate — it keeps a handle on the last observer
 * it added — and neither could `tsc`, a unit test of the launcher, or the
 * launcher's own demo.
 *
 * What produces it is the queue. `whenReady` defers when the scene is not up
 * yet, and a child that is connected → disconnected → reconnected in that
 * window queues a callback each time, while the disconnect in between disposes
 * nothing because nothing was set up. The doc system does precisely this when
 * it mounts a live example.
 */
let B: typeof import('@babylonjs/core')
let utils: typeof import('./b3d-utils.js')

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
  B = await import('@babylonjs/core')
  utils = await import('./b3d-utils.js')
})

/**
 * The smallest thing that behaves like a `<tosi-b3d>` for this purpose: it has
 * a scene, a `register`, and a `whenReady` that QUEUES — which is the whole
 * mechanism under test.
 */
function fakeOwner(scene: any) {
  const queued: Array<() => void> = []
  let ready = false
  return {
    scene,
    register() {},
    whenReady(cb: () => void) {
      if (ready) cb()
      else queued.push(cb)
    },
    becomeReady() {
      ready = true
      for (const cb of queued.splice(0)) cb()
    },
  }
}

/**
 * A child that counts what it was asked to do.
 *
 * Created through `customElements` rather than with `new`, because a custom
 * element constructed directly throws "Illegal constructor" — the element has
 * to be upgraded by the document that owns it. One tag per call, so tests
 * cannot leak state into each other through a shared definition.
 */
let tagSeq = 0
function makeChild(): HTMLElement & { readied: number; disposed: number } {
  const tag = `test-b3d-child-${++tagSeq}`
  customElements.define(
    tag,
    class extends utils.B3dChild {
      readied = 0
      disposed = 0
      sceneReady() {
        this.readied++
      }
      sceneDispose() {
        this.disposed++
      }
    }
  )
  return document.createElement(tag) as any
}

/**
 * Drive the lifecycle through the REAL DOM, not by calling the callbacks.
 *
 * `findB3dOwner` duck-types its way up the tree looking for something with a
 * `scene` and a `register`, so a plain div carrying those IS an owner as far as
 * the code under test is concerned. Appending and removing then produces the
 * genuine `connectedCallback`/`disconnectedCallback` pairs, which matters: the
 * bug is about which of those run and in what order.
 */
function hostFor(owner: any): HTMLElement {
  const host = document.createElement('div')
  Object.assign(host, owner)
  document.body.append(host)
  return host
}

function connect(child: any, host: HTMLElement) {
  host.append(child)
}

function disconnect(child: any) {
  child.remove()
}

describe('B3dChild attach lifecycle', () => {
  test('a plain connect readies exactly once', () => {
    const owner = fakeOwner(new B.Scene(new B.NullEngine()))
    const host = hostFor(owner)
    const child = makeChild()
    connect(child, host)
    owner.becomeReady()
    expect(child.readied).toBe(1)
    expect(child.disposed).toBe(0)
  })

  test('THE BUG: reconnecting before the scene is up readies only once', () => {
    // Three connects while the scene is still loading queue three callbacks.
    // Before the guard, all three ran — and each one added a render observer.
    const owner = fakeOwner(new B.Scene(new B.NullEngine()))
    const host = hostFor(owner)
    const child = makeChild()
    connect(child, host)
    disconnect(child)
    connect(child, host)
    disconnect(child)
    connect(child, host)
    owner.becomeReady()
    expect(child.readied).toBe(1)
  })

  test('a disconnect BEFORE the scene is up disposes nothing', () => {
    // There is nothing to tear down, and calling `sceneDispose` anyway is how a
    // subclass ends up guarding every field against a teardown that precedes
    // its own construction.
    const owner = fakeOwner(new B.Scene(new B.NullEngine()))
    const host = hostFor(owner)
    const child = makeChild()
    connect(child, host)
    disconnect(child)
    expect(child.disposed).toBe(0)
    expect(child.readied).toBe(0)
  })

  test('a callback queued by a connection that has since ended does not fire', () => {
    const owner = fakeOwner(new B.Scene(new B.NullEngine()))
    const host = hostFor(owner)
    const child = makeChild()
    connect(child, host)
    disconnect(child)
    owner.becomeReady()
    expect(child.readied).toBe(0)
  })

  test('ready → dispose → ready is allowed, because it is a real move', () => {
    const owner = fakeOwner(new B.Scene(new B.NullEngine()))
    const host = hostFor(owner)
    const child = makeChild()
    connect(child, host)
    owner.becomeReady()
    expect(child.readied).toBe(1)
    disconnect(child)
    expect(child.disposed).toBe(1)
    connect(child, host)
    expect(child.readied).toBe(2)
  })

  test('MOVING an attached child disposes and re-readies, in balance', () => {
    /*
    Appending a node already in the tree is a MOVE, and the DOM implements a
    move as a disconnect followed by a connect — so the child tears down and
    sets up again. That is correct, and it is "moved is not removed" seen from
    the other side.

    Written after asserting the opposite and being corrected by the test: the
    guard is about callbacks QUEUED before a scene exists, not about moves. The
    property that matters is BALANCE — every ready has its dispose — which is
    exactly what the bug broke.
    */
    const owner = fakeOwner(new B.Scene(new B.NullEngine()))
    const host = hostFor(owner)
    const child = makeChild()
    connect(child, host)
    owner.becomeReady()
    expect(child.readied).toBe(1)
    connect(child, host)
    expect(child.readied).toBe(2)
    expect(child.disposed).toBe(1)
  })

  test('a NEW scene readies again — the guard is per scene, not once ever', () => {
    // An engine can be disposed and rebuilt under a child that never moved.
    const child = makeChild()
    const first = fakeOwner(new B.Scene(new B.NullEngine()))
    connect(child, hostFor(first))
    first.becomeReady()
    disconnect(child)
    const second = fakeOwner(new B.Scene(new B.NullEngine()))
    connect(child, hostFor(second))
    second.becomeReady()
    expect(child.readied).toBe(2)
  })
})
