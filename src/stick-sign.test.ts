import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'fs'

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

let KeyboardGamepadSource: typeof import('./keyboard-gamepad.js').KeyboardGamepadSource
let HardwareGamepadSource: typeof import('./hardware-gamepad.js').HardwareGamepadSource
let TouchGamepadSource: typeof import('./touch-gamepad.js').TouchGamepadSource

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
  ;({ KeyboardGamepadSource } = await import('./keyboard-gamepad.js'))
  ;({ HardwareGamepadSource } = await import('./hardware-gamepad.js'))
  ;({ TouchGamepadSource } = await import('./touch-gamepad.js'))
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
THE ARTWORK MUST CONTAIN THE STICK'S REACH.

At full deflection the knob's CENTRE sits on the travel rim, so its own rim
reaches `travelRadius + knobRadius` from centre. If the cluster's viewBox stops
short of that, the thumb is clipped — which is what happened: the left cluster
ended at x=1103 while the left stick reached 1117, and the right cluster started
at 803 while its stick reached 788. Hence "it clips a bit on the right for the
left stick, and on the left for the right stick".

The fix belongs HERE, in the bounds, not in the travel. Shrinking travel to keep
the thumb inside was tried first and reverted: it makes the stick harder to
control, which is a real cost for a cosmetic gain (Tonio: "leave the radius as
it was but change the outer bounding box").

Read from the SHIPPED assets, so re-exporting the artwork from a drawing tool
cannot quietly reintroduce it.
*/
describe('cluster artwork contains the full stick reach', () => {
  const parse = (file: string) => {
    const svg = readFileSync(`static/${file}`, 'utf8')
    const vb = /viewBox="([-\d. ]+)"/.exec(svg)![1].split(/\s+/).map(Number)
    const geom = (id: string) => {
      const at = svg.indexOf(`id="${id}"`)
      const seg = svg.slice(at, at + 260)
      const d = /d="M([-\d.]+),([-\d.]+) C/.exec(seg)!
      const cx = Number(d[1])
      const top = Number(d[2])
      const r = Math.abs(
        Number(/C[-\d.]+,[-\d.]+,([-\d.]+),/.exec(seg)![1]) - cx
      )
      return { cx, cy: top + r, r }
    }
    return { vb, geom }
  }

  for (const [file, side] of [
    ['gamepad-left.svg', 'left'],
    ['gamepad-right.svg', 'right'],
  ] as const) {
    test(`${file}: the thumb never leaves the box`, () => {
      const { vb, geom } = parse(file)
      const travel = geom(`${side}_stick_travel`)
      const knob = geom(`${side}_stick`)
      const reach = travel.r + knob.r
      const [x, y, w, h] = vb
      expect(travel.cx - reach).toBeGreaterThanOrEqual(x)
      expect(travel.cx + reach).toBeLessThanOrEqual(x + w)
      expect(travel.cy - reach).toBeGreaterThanOrEqual(y)
      expect(travel.cy + reach).toBeLessThanOrEqual(y + h)
    })
  }
})
