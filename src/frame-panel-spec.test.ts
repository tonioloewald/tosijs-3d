import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

// frame-panel pulls in tosijs, which needs a DOM before import.
let presentationSpec: typeof import('./frame-panel.js').presentationSpec
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
  presentationSpec = (await import('./frame-panel.js')).presentationSpec
})

describe('presentationSpec: one panel, two presentations', () => {
  const spec = {
    frame: 'eye' as const,
    anchor: 'left-shoulder' as const,
    flatAnchor: { azimuthDeg: -16, elevationDeg: 18 },
    screenAnchor: { left: 64, top: '2vmin' as const },
  }
  test('in a headset the screen pins are dropped and the VR anchor stands', () => {
    const xr = presentationSpec(spec, false)
    expect(xr.screenAnchor).toBeUndefined()
    expect(xr.anchor).toBe('left-shoulder')
  })
  test('flat, the flat anchor stands in and the screen pins apply', () => {
    const flat = presentationSpec(spec, true)
    expect(flat.anchor).toEqual(spec.flatAnchor)
    expect(flat.screenAnchor).toEqual(spec.screenAnchor)
  })
  test('a panel with neither is passed through unchanged', () => {
    const plain = { frame: 'body' as const, anchor: 'waist' as const }
    expect(presentationSpec(plain, true)).toBe(plain)
    expect(presentationSpec(plain, false)).toBe(plain)
  })
})
