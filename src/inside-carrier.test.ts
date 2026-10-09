import { beforeAll, describe, expect, test } from 'bun:test'

/*
THE XR POINTER DOES NOT PICK WHAT YOU ARE SITTING IN (board #3198).

In a cockpit the hull is nearer than any panel, so the controller's ray landed
on the canopy and the panel behind it could not be pressed. `insideCarrier` is
the rule the pointer's predicate uses, on plain `{ parent }` objects.
*/

const node = (parent?: unknown) => ({ parent })

let insideCarrier: typeof import('./b3d-utils.js').insideCarrier

beforeAll(async () => {
  // b3d-utils defines elements on import, so it needs a DOM.
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
  ;({ insideCarrier } = await import('./b3d-utils.js'))
})

describe('insideCarrier', () => {
  test('the vehicle carrying the rig, and everything beneath it, is inside', () => {
    const hull = node()
    const rig = node(hull)
    const canopy = node(node(hull))
    expect(insideCarrier(hull, rig)).toBe(true)
    expect(insideCarrier(canopy, rig)).toBe(true)
  })

  test('the rig’s own children (your panels) are not', () => {
    const hull = node()
    const rig = node(hull)
    const panel = node(rig)
    expect(insideCarrier(panel, rig)).toBe(false)
    expect(insideCarrier(node(panel), rig)).toBe(false)
  })

  test('on foot (a rig with no parent) nothing is', () => {
    const rig = node()
    expect(insideCarrier(node(), rig)).toBe(false)
    expect(insideCarrier(node(), null)).toBe(false)
  })

  test('another vehicle is still a target', () => {
    const hull = node()
    const rig = node(hull)
    expect(insideCarrier(node(node()), rig)).toBe(false)
  })
})
