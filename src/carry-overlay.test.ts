import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

// carry-box builds SVG through tosijs, which needs a DOM before import.
let carryOverlay: typeof import('./carry-box.js').carryOverlay
let createCarry: typeof import('./carry.js').createCarry
beforeAll(async () => {
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
  carryOverlay = (await import('./carry-box.js')).carryOverlay
  createCarry = (await import('./carry.js')).createCarry
})

const release = () =>
  window.dispatchEvent(
    new (window as any).MouseEvent('pointerup', { clientX: 5, clientY: 5 })
  )

describe('carryOverlay: a release over nothing', () => {
  test('a two-tap pick-up survives the release it happened on', () => {
    const carry = createCarry<string>()
    const overlay = carryOverlay(carry)
    carry.pickUp('pistol', 'bag', 'tap')
    release()
    expect(carry.state.thing).toBe('pistol')
    overlay.dispose()
  })
  test('a drag let go over nothing goes back', () => {
    const carry = createCarry<string>()
    const overlay = carryOverlay(carry)
    carry.pickUp('pistol', 'bag', 'drag')
    release()
    expect(carry.state.thing).toBeNull()
    overlay.dispose()
  })
})
