import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE SIGN CONTRACT: up / forward is POSITIVE, on every source.

This is the test that would have turned tosijs-3d#14 into a thirty-second
answer instead of a day. A source that disagrees about which way is up is
INTERNALLY consistent, so it looks fine on its own device — only a player with
two devices ever notices, and what they report is "the framework is broken",
not "one source is inverted". The convention was documented in three places and
enforced in none, so there was nothing to fail when someone doubted it.

What this pins is OUR ARITHMETIC, given a normal coordinate space: keyboard,
hardware and touch must agree on the sign for "up". What it deliberately does
NOT pin is the artwork's coordinate space — an SVG with a flipped or
negative-height viewBox would invert the touch source while every line of code
still read correctly, and that needs a real browser's `getScreenCTM` (measured
separately: the shipped clusters give d=+1, so up is positive).

The touch source is driven through `handlePointer`, its coordinate path — no
DOM events, no CTM, viewBox units in. That is the in-scene/VR entry point and
it shares `moveStick` with the pointer path, so the sign it yields is the sign
both paths yield.
*/

let KeyboardGamepadSource: typeof import('./keyboard-gamepad').KeyboardGamepadSource
let HardwareGamepadSource: typeof import('./hardware-gamepad').HardwareGamepadSource
let TouchGamepadSource: typeof import('./touch-gamepad').TouchGamepadSource

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
  ;({ KeyboardGamepadSource } = await import('./keyboard-gamepad'))
  ;({ HardwareGamepadSource } = await import('./hardware-gamepad'))
  ;({ TouchGamepadSource } = await import('./touch-gamepad'))
})

/** A stick's worth of SVG: a travel circle and a knob, with geometry stubbed
 * (happy-dom has no layout, and the numbers are all we need). */
const stickSvg = (): SVGSVGElement => {
  const doc = (globalThis as any).document
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
  for (const prefix of ['left_stick', 'right_stick']) {
    const travel = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
    travel.setAttribute('data-part', `${prefix}_travel`)
    // centre (100, 100), radius 50 — y-DOWN, the normal SVG convention.
    travel.getBBox = () => ({ x: 50, y: 50, width: 100, height: 100 })
    const knob = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
    knob.setAttribute('data-part', prefix)
    knob.getBBox = () => ({ x: 90, y: 90, width: 20, height: 20 })
    svg.appendChild(travel)
    svg.appendChild(knob)
  }
  return svg as unknown as SVGSVGElement
}

/** Push a stick from its centre toward the TOP of the artwork (smaller y). */
const pushUp = (src: any, side: 'left' | 'right') => {
  const id = side === 'left' ? 1 : 2
  // Both sticks share the stubbed geometry here, so distinguish by pointer id
  // and drive one at a time.
  src.handlePointer('down', 100, 100, id)
  src.handlePointer('move', 100, 60, id) // 40 units UP the screen
  return src.poll()
}

describe('every source agrees: up is positive', () => {
  test('touch — dragging toward the top of the artwork', () => {
    const src: any = new TouchGamepadSource(stickSvg(), {})
    const pad = pushUp(src, 'left')
    expect(pad.leftStickY).toBeGreaterThan(0)
  })

  test('keyboard — W is up/forward', () => {
    const src: any = new KeyboardGamepadSource()
    // Drive the documented key map rather than internals: W is leftStickY +.
    const axis = src.axes?.find((a: any) => a.field === 'leftStickY')
    expect(axis).toBeDefined()
    expect(axis.positiveKeys).toContain('W')
    // …and the attack/decay state it feeds is unsigned, so the sign is the map's.
    src.axisState.leftStickY = 1
    expect(src.poll().leftStickY).toBeGreaterThan(0)
  })

  test('hardware — a pad pushed up reports axes[1] negative, and we invert it', () => {
    const g = globalThis as any
    const prev = g.navigator?.getGamepads
    g.navigator ??= {}
    // A real pad pushed FORWARD reports axes[1] = -1 (the Gamepad API's y-down).
    g.navigator.getGamepads = () => [
      { axes: [0, -1, 0, -1], buttons: [], index: 0 },
    ]
    try {
      const src: any = new HardwareGamepadSource()
      const pad = src.poll()
      expect(pad.leftStickY).toBeGreaterThan(0)
      expect(pad.rightStickY).toBeGreaterThan(0)
    } finally {
      if (prev) g.navigator.getGamepads = prev
    }
  })

  test('THE CONTRACT: all three report the SAME sign for up', () => {
    // The assertion #14 was actually about. Any source that flips is caught
    // here, on a stock configuration, with no game in the picture.
    const touch: any = new TouchGamepadSource(stickSvg(), {})
    const touchY = pushUp(touch, 'left').leftStickY

    const kb: any = new KeyboardGamepadSource()
    kb.axisState.leftStickY = 1
    const kbY = kb.poll().leftStickY

    // A helper rather than a let/try/finally dance: the assignment inside the
    // try was flagged as dead (it always runs before any read), and reading a
    // value out of a scoped stub is what we actually mean.
    const withStubPad = <T>(axes: number[], fn: () => T): T => {
      const g = globalThis as any
      const prev = g.navigator?.getGamepads
      g.navigator ??= {}
      g.navigator.getGamepads = () => [{ axes, buttons: [], index: 0 }]
      try {
        return fn()
      } finally {
        if (prev) g.navigator.getGamepads = prev
      }
    }
    const hwY = withStubPad(
      [0, -1, 0, 0],
      () => new HardwareGamepadSource().poll().leftStickY
    )

    expect(Math.sign(touchY)).toBe(Math.sign(kbY))
    expect(Math.sign(kbY)).toBe(Math.sign(hwY))
    expect(Math.sign(touchY)).toBe(1)
  })
})

describe('sources are identifiable without guessing at class names', () => {
  test('each declares a stable `kind`', async () => {
    // An adopter matched our glass pad with `constructor.name === 'B3dGamepad'`,
    // their bundler mangled it, and the patch built on that lookup never ran —
    // so the experiments they drew conclusions from were no-ops (#14).
    const touch: any = new TouchGamepadSource(stickSvg(), {})
    expect(touch.kind).toBe('touch')
    expect(new (HardwareGamepadSource as any)().kind).toBe('hardware')
    expect(new (KeyboardGamepadSource as any)().kind).toBe('keyboard')
  })
})

/*
THE THUMB MUST STAY INSIDE ITS TRAVEL CIRCLE.

The knob's CENTRE used to travel the full travel radius, so at full deflection
half the knob hung outside — and clipped against the artwork's edge. Reported
from the flat pass: "it clips a bit on the right for the left stick, and on the
left for the right stick", which is each cluster meeting its own bounds.

Pinned as geometry rather than as pixels: whatever the artwork, the knob's rim
at full deflection must not pass the travel circle's rim.
*/
describe('stick travel leaves room for the knob', () => {
  test('at FULL deflection the knob is still inside the travel circle', () => {
    const src: any = new TouchGamepadSource(stickSvg(), {})
    // Sticks initialise on the first pointer — getBBox is all zeros until the
    // SVG is actually in a document, so the source retries rather than trusting
    // construction time.
    src.handlePointer('down', 100, 100, 1)
    const stick = src.sticks[0]
    // The stub: travel is 100 wide (r 50), knob 20 wide (r 10).
    expect(stick.radius).toBeCloseTo(40)
    const knobR = 10
    expect(stick.radius + knobR).toBeLessThanOrEqual(50)
  })

  test('full deflection still reads 1.0 — range is normalised, not lost', () => {
    const src: any = new TouchGamepadSource(stickSvg(), {})
    src.handlePointer('down', 100, 100, 1)
    src.handlePointer('move', 100, 100 - 40, 1) // exactly the new travel
    expect(src.poll().leftStickY).toBeCloseTo(1, 2)
  })

  test('pushing PAST the travel clamps rather than escaping', () => {
    const src: any = new TouchGamepadSource(stickSvg(), {})
    src.handlePointer('down', 100, 100, 1)
    src.handlePointer('move', 100, 0, 1) // way past the circle
    expect(src.poll().leftStickY).toBeLessThanOrEqual(1.001)
  })
})
