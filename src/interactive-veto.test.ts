import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE HALF THE PURE TEST COULD NOT SEE.

`interaction.test.ts` calls `activationVeto` with HAND-BUILT info, so it only
ever exercised the case where the info is already correct. The pre-release
review found that the behaviour feeding that function got it wrong on exactly
the two paths the feature was added for — a scripted `activate()` and
`useNearest` — and no pure test could have noticed.

The specific failure: `_last.distance` initialises to 0 and is written only by a
pointer hover of this behaviour's own meshes, so an NPC activating a door nobody
had hovered was told `distance: 0`, and the reach veto this library's own doc
sells (`info.distance > 2`) returned FALSE. The door opened.
*/

let B: typeof import('./interactive-behavior.js')
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
  B = await import('./interactive-behavior.js')
  scene = new BABYLON.Scene(new BABYLON.NullEngine())
})

/** The reach veto verbatim from `b3d-interactive`'s own documentation. */
const REACH_VETO = {
  name: 'out-of-reach',
  blocks: (info: { source?: string; distance?: number }) =>
    info.source !== 'near' && (info.distance ?? 0) > 2,
}

const makeDoor = (name: string) => {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, { size: 1 }, scene)
  const behavior = new B.InteractiveBehavior(
    { scene } as never,
    { dispatchEvent: () => true },
    { meshes: () => [mesh] }
  )
  behavior.attach()
  return { mesh, behavior }
}

describe('a scripted activate() and its reach veto', () => {
  test('an UNHOVERED door refuses a reach veto instead of opening', () => {
    // The shipped bug: distance defaulted to 0, so `0 > 2` was false and a
    // door 50 m from the actor opened.
    const { behavior, mesh } = makeDoor('never-hovered')
    behavior.vetoes.push(REACH_VETO)
    let fired = 0
    behavior.whenActivated = () => fired++
    expect(behavior.activate({ actor: 'npc' })).toBe(false)
    expect(fired).toBe(0)
    behavior.dispose()
    mesh.dispose()
  })

  test('...and opens when the caller SAYS it is close', () => {
    // Failing closed is only correct if there is a way to say otherwise.
    const { behavior, mesh } = makeDoor('close-enough')
    behavior.vetoes.push(REACH_VETO)
    expect(behavior.activate({ actor: 'npc', distance: 0.5 })).toBe(true)
    behavior.dispose()
    mesh.dispose()
  })

  test('a bare activate() reports source "api", even after a hover', () => {
    // The spread order put `_last` after the default, so a hovered element
    // reported `source: 'pointer'` for a scripted call.
    const { behavior, mesh } = makeDoor('spread-order')
    let seen: string | undefined
    behavior.vetoes.push({
      name: 'probe',
      blocks: (info: { source?: string }) => {
        seen = info.source
        return false
      },
    })
    behavior.activate()
    expect(seen).toBe('api')
    behavior.dispose()
    mesh.dispose()
  })

  test('operable agrees with activate() — same info, same answer', () => {
    /*
    They used the OPPOSITE spread order, so `operable === true` did not imply
    `activate()` would fire. A caller that checks before acting was told yes and
    then refused.
    */
    const { behavior, mesh } = makeDoor('agreement')
    behavior.vetoes.push(REACH_VETO)
    expect(behavior.operable).toBe(false)
    expect(behavior.activate()).toBe(false)
    behavior.vetoes.length = 0
    expect(behavior.operable).toBe(true)
    expect(behavior.activate()).toBe(true)
    behavior.dispose()
    mesh.dispose()
  })

  test('a HOVERED door reports operable — the pointer is about to open it', () => {
    /*
    B2 OF THE 0.8.1 RE-REVIEW, and the cost of over-generalising the fix above.

    `operable` and `debugState` were routed through `_apiInfo()` too, so they
    judged a hovered element at `distance: Infinity` and reported "blocked" at
    the same instant a press opened it. `operable` is public API documented as
    "would actually work"; `debugState` is the only debug readout that exists in
    a headset. Both said the opposite of what the pointer did.

    An ACTIVATION with no distance must still fail closed — that is the bug this
    one grew out of, and it is asserted below. Inspection is different: the
    pointer path knows the real distance, so the inspector should use it.
    */
    const { behavior, mesh } = makeDoor('hovered-operable')
    behavior.vetoes.push(REACH_VETO)
    // What a hover writes: this behaviour's own mesh, 1.2 m away.
    ;(behavior as any)._state.phase = 'hover'
    ;(behavior as any)._last = { mesh, point: null, distance: 1.2 }

    expect(behavior.operable).toBe(true)
    expect(behavior.debugState.vetoes).toEqual(['out-of-reach:ok'])
    // ...and a bare scripted activate() STILL fails closed, unchanged.
    expect(behavior.activate()).toBe(false)

    behavior.dispose()
    mesh.dispose()
  })

  test('a hovered door OUT of reach still reports blocked', () => {
    // The inspector uses the real distance, which means it must also report a
    // genuine refusal — otherwise it has just moved the lie.
    const { behavior, mesh } = makeDoor('hovered-far')
    behavior.vetoes.push(REACH_VETO)
    ;(behavior as any)._state.phase = 'hover'
    ;(behavior as any)._last = { mesh, point: null, distance: 9 }
    expect(behavior.operable).toBe(false)
    expect(behavior.debugState.vetoes).toEqual(['out-of-reach:blocks'])
    behavior.dispose()
    mesh.dispose()
  })

  test('debugState says what it judged with, not just the verdict', () => {
    // "blocked" with no distance is a readout you cannot act on — especially in
    // a headset, where it is the only one you have.
    const { behavior, mesh } = makeDoor('debug-info')
    ;(behavior as any)._state.phase = 'hover'
    ;(behavior as any)._last = { mesh, point: null, distance: 1.2 }
    expect(behavior.debugState.judgedWith).toMatchObject({
      source: 'pointer',
      distance: 1.2,
    })
    behavior.dispose()
    mesh.dispose()
  })

  test('a veto that ignores its argument is unaffected', () => {
    let locked = true
    const { behavior, mesh } = makeDoor('legacy')
    behavior.vetoes.push({ name: 'locked', blocks: () => locked })
    expect(behavior.activate()).toBe(false)
    locked = false
    expect(behavior.activate()).toBe(true)
    behavior.dispose()
    mesh.dispose()
  })
})

describe('nearestTo carries the distance it measured', () => {
  test('useNearest can answer a reach veto, because the distance is real', () => {
    // `nearestInteractive` computed the true distance and threw it away, so the
    // one path most likely to carry a reach veto was the one that could not
    // answer it.
    const { behavior, mesh } = makeDoor('reachable')
    mesh.position.set(0, 0, 0)
    mesh.computeWorldMatrix(true)
    const found = B.nearestTo(scene, new BABYLON.Vector3(0, 0, 5))
    expect(found?.it).toBe(behavior)
    expect(found?.distance).toBeCloseTo(5, 4)
    behavior.dispose()
    mesh.dispose()
  })

  test('nothing in range is null, not a zero distance', () => {
    expect(B.nearestTo(scene, new BABYLON.Vector3(0, 0, 9999))).toBeNull()
  })
})
