import { describe, test, expect, beforeAll } from 'bun:test'
import { arcOf, arcStart, arcEnd, arcWithinArc } from './arc.js'

let A: typeof import('./angle-field.js')

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
  A = await import('./angle-field.js')
})

/**
 * The screen point for a bearing on a dial laid out at `width`.
 *
 * Derived from the same north-up, clockwise-positive convention the widget
 * draws with — if the two ever disagree, every one of these tests fails at once,
 * which is the point of not measuring it off the SVG.
 */
const WIDTH = 240
function pointFor(width: number, degrees: number, label = false) {
  const pad = 4
  const capH = label ? 20 : 0
  const d = width - pad * 2
  const radius = Math.max(12, d / 2 - 10)
  const cx = pad + d / 2
  const cy = capH + pad + radius + 10
  const t = ((degrees - 90) * Math.PI) / 180
  return { x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius, cx, cy }
}

/** Press, move and release at a sequence of bearings. */
function sweep(
  w: { handle?: (k: any, x: number, y: number) => void },
  bearings: number[],
  label = false
) {
  bearings.forEach((b, i) => {
    const p = pointFor(WIDTH, b, label)
    w.handle?.(i === 0 ? 'down' : 'move', p.x, p.y)
  })
  const last = pointFor(WIDTH, bearings[bearings.length - 1], label)
  w.handle?.('up', last.x, last.y)
}

describe('angle3d', () => {
  test('a drag round the ring sets the bearing', () => {
    const seen: number[] = []
    const dial = A.angle3d({ value: 0, handleChange: (v) => seen.push(v) })
    dial.layout!(WIDTH)
    sweep(dial, [0, 90])
    expect(dial.value).toBeCloseTo(90, 4)
    expect(seen.length).toBeGreaterThan(0)
  })

  test('north is UP and clockwise is positive', () => {
    // Every bearing anyone reads — a compass, a radar, a turret — works this
    // way, and screen coordinates do neither.
    const dial = A.angle3d({ value: 0 })
    dial.layout!(WIDTH)
    const { cx, cy } = pointFor(WIDTH, 0)
    dial.handle!('down', cx, cy - 50) // straight up
    expect(dial.value).toBeCloseTo(0, 4)
    dial.handle!('move', cx + 50, cy) // to the right
    expect(dial.value).toBeCloseTo(90, 4)
    dial.handle!('up', cx + 50, cy)
  })

  test('wraps past north instead of stopping — the whole reason for a ring', () => {
    /*
    On a linear track 359° and 1° sit at opposite ends, so the one gesture you
    always want cannot be made. Here it is just a drag.
    */
    const dial = A.angle3d({ value: 350 })
    dial.layout!(WIDTH)
    sweep(dial, [350, 355, 5, 10])
    expect(dial.value).toBeCloseTo(10, 4)
  })

  test('limits CATCH at the near stop rather than jumping across', () => {
    const dial = A.angle3d({ value: 90, limits: arcOf(90, 60) }) // 60..120
    dial.layout!(WIDTH)
    sweep(dial, [90, 115, 130, 170])
    expect(dial.value).toBeCloseTo(120, 4)
  })

  test('handleCommit fires once, on release', () => {
    const commits: number[] = []
    const dial = A.angle3d({ value: 0, handleCommit: (v) => commits.push(v) })
    dial.layout!(WIDTH)
    sweep(dial, [0, 45, 90])
    expect(commits.length).toBe(1)
    expect(commits[0]).toBeCloseTo(90, 4)
  })

  test('setLimits re-settles a value that is no longer legal', () => {
    const dial = A.angle3d({ value: 270 })
    dial.layout!(WIDTH)
    dial.setLimits(arcOf(90, 60))
    expect(dial.value).toBe(60) // 270 is nearer the start than the end
  })

  test('a move with no press does nothing', () => {
    // Hovering across a dial must not drag it — the same rule every other
    // widget here follows.
    const dial = A.angle3d({ value: 0 })
    dial.layout!(WIDTH)
    const p = pointFor(WIDTH, 90)
    dial.handle!('move', p.x, p.y)
    expect(dial.value).toBe(0)
  })
})

describe('arc3d', () => {
  test('dragging an EDGE changes the width, the other edge staying put', () => {
    const fan = A.arc3d({ value: arcOf(90, 60) }) // 60..120
    fan.layout!(WIDTH)
    sweep(fan, [120, 140, 160])
    expect(arcStart(fan.value)).toBeCloseTo(60, 3)
    expect(arcEnd(fan.value)).toBeCloseTo(160, 3)
  })

  test('dragging the MIDDLE swings the arc, the width staying put', () => {
    const fan = A.arc3d({ value: arcOf(90, 60) })
    fan.layout!(WIDTH)
    sweep(fan, [90, 150, 210])
    expect(fan.value.centre).toBeCloseTo(210, 3)
    expect(fan.value.width).toBeCloseTo(60, 3)
  })

  test('the grip is LATCHED at the press, not re-decided each frame', () => {
    /*
    THE CASE THAT MATTERS IS A DRAG THAT HITS A CLAMP.

    While an arc can follow the pointer, whatever you grabbed stays the nearest
    grip and re-deciding picks the same one — so latching looks free. It stops
    being free at a limit: the arc stops moving, the pointer carries on, and the
    now-nearest grip is the EDGE the pointer has passed. Re-decided, the gesture
    silently stops rotating and starts widening, at exactly the moment the
    author is pushing against a constraint and watching for what gives.

    (This test replaced one that swept an edge outward and could not fail: the
    edge you drag follows the pointer, so it is always the nearest grip.)
    */
    const envelope = arcOf(90, 100) // 40..140, so the centre may run 60..120
    const fan = A.arc3d({ value: arcOf(90, 40), envelope })
    fan.layout!(WIDTH)
    sweep(fan, [90, 120, 145])
    expect(fan.value.width).toBeCloseTo(40, 3) // still a rotation
    expect(fan.value.centre).toBeCloseTo(120, 3) // caught at the limit
  })

  test('a press on no grip does nothing rather than jumping an edge', () => {
    // "Somewhere in the middle" is most of a dial's area, and a jump there is
    // not undoable by letting go.
    const fan = A.arc3d({ value: arcOf(90, 40) })
    fan.layout!(WIDTH)
    const before = fan.value
    sweep(fan, [270, 280])
    expect(fan.value).toEqual(before)
  })

  test('an envelope is honoured throughout the drag, not only at the end', () => {
    const envelope = arcOf(90, 100) // 40..140
    const fan = A.arc3d({ value: arcOf(90, 40), envelope })
    fan.layout!(WIDTH)
    const legal: boolean[] = []
    const grab = pointFor(WIDTH, 110)
    fan.handle!('down', grab.x, grab.y)
    for (const b of [140, 200, 260, 320]) {
      const p = pointFor(WIDTH, b)
      fan.handle!('move', p.x, p.y)
      legal.push(arcWithinArc(fan.value, envelope))
    }
    const last = pointFor(WIDTH, 320)
    fan.handle!('up', last.x, last.y)
    expect(legal.every(Boolean)).toBe(true)
  })

  test('width limits hold', () => {
    const fan = A.arc3d({ value: arcOf(90, 60), minWidth: 20, maxWidth: 90 })
    fan.layout!(WIDTH)
    sweep(fan, [120, 200, 300])
    expect(fan.value.width).toBeLessThanOrEqual(90)
    sweep(fan, [arcEnd(fan.value), fan.value.centre])
    expect(fan.value.width).toBeGreaterThanOrEqual(20)
  })

  test('setEnvelope re-settles an arc a new placement made illegal', () => {
    // The ship case: moving the gun changes what it can bear, so the arc has to
    // follow. Leaving it illegal would be a control that lies.
    const fan = A.arc3d({ value: arcOf(270, 80) })
    fan.layout!(WIDTH)
    fan.setEnvelope(arcOf(0, 120)) // 300..60
    expect(arcWithinArc(fan.value, arcOf(0, 120))).toBe(true)
  })

  test('handleCommit fires once per gesture', () => {
    const commits: number[] = []
    const fan = A.arc3d({
      value: arcOf(90, 60),
      handleCommit: (v) => commits.push(v.width),
    })
    fan.layout!(WIDTH)
    sweep(fan, [120, 150, 170])
    expect(commits.length).toBe(1)
  })

  test('draws the BLOCKED sector when there is a restriction', () => {
    // The design point: a control that silently snaps teaches nothing about
    // why. With no envelope there is nothing to explain, so nothing is drawn.
    const restricted = A.arc3d({
      value: arcOf(90, 40),
      envelope: arcOf(90, 120),
    })
    restricted.layout!(WIDTH)
    const free = A.arc3d({ value: arcOf(90, 40) })
    free.layout!(WIDTH)
    const blocked = (w: { el: SVGElement }) =>
      w.el.querySelector('[data-dial-blocked]')?.getAttribute('d') ?? ''
    expect(blocked(restricted).length).toBeGreaterThan(0)
    expect(blocked(free)).toBe('')
  })
})
