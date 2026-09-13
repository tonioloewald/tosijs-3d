import { beforeAll, describe, expect, test } from 'bun:test'

/*
AN INPUT MANAGER WITH NO INPUT SOURCE IS NEVER WHAT SOMEONE MEANT.

`B3dInputFocus` used to build its `MappedInputProvider` only when it found a
`<tosi-game-controller>` among its children. Written the obvious way —
`inputFocus(hero)` — it therefore built nothing, and everything downstream was
a no-op: `focusEntity` is guarded on the provider, so the player entity never
received an `inputProvider`, and the glass pad is a SOURCE added to that
provider rather than an input path of its own.

Nothing about it looked wrong. The biped was found, `player` was true, the pad
was mounted, drawn and correctly filtered to the controls the demo uses, and
`focusedEntity` was quietly null. Tonio, on the playground: "It doesn't seem to
be wired up at all." It had already shipped in two demos.

So the provider is now built unconditionally, and this is the invariant.
*/
let B: typeof import('@babylonjs/core')
let focusMod: typeof import('./b3d-input-focus.js')

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
  focusMod = await import('./b3d-input-focus.js')
})

/** The smallest thing `B3dChild` accepts as an owner. */
function fakeOwner(scene: any) {
  return {
    scene,
    register() {},
    whenReady(cb: () => void) {
      cb()
    },
  }
}

function mount(): {
  el: any
  scene: any
} {
  const scene = new B.Scene(new B.NullEngine())
  const host = document.createElement('div')
  Object.assign(host, fakeOwner(scene))
  document.body.append(host)
  const el = focusMod.inputFocus() as any
  host.append(el)
  return { el, scene }
}

describe('inputFocus wires itself', () => {
  test('THE BUG: no gameController child still yields a provider', () => {
    const { el } = mount()
    expect(el.inputMappedProvider).not.toBe(null)
    el.remove()
  })

  test('it appends the controller it had to invent', () => {
    const { el } = mount()
    expect(el.querySelector('tosi-game-controller')).not.toBe(null)
    el.remove()
  })

  test('an author-supplied controller is used, not duplicated', () => {
    /*
    The case the original code was written for, and it still has to win: a
    consumer who passes their own `gameController()` — configured, or shared —
    must get THAT one, and exactly one.
    */
    const scene = new B.Scene(new B.NullEngine())
    const host = document.createElement('div')
    Object.assign(host, fakeOwner(scene))
    document.body.append(host)
    const el = focusMod.inputFocus() as any
    const gc = document.createElement('tosi-game-controller')
    el.append(gc)
    host.append(el)
    expect(el.querySelectorAll('tosi-game-controller')).toHaveLength(1)
    expect(el.querySelector('tosi-game-controller')).toBe(gc)
    el.remove()
  })
})
