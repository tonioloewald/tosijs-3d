import { describe, expect, test } from 'bun:test'
import {
  FULL_CIRCLE,
  arcOf,
  arcComplement,
  arcContains,
  arcEnd,
  arcStart,
  arcWithinArc,
  clampAngleToArc,
  clampArc,
  dragArc,
  nearestArcGrip,
} from './arc.js'

describe('an arc is a centre and a width', () => {
  test('normalises the centre and clamps the width', () => {
    expect(arcOf(-90, 40)).toEqual({ centre: 270, width: 40 })
    expect(arcOf(0, 400).width).toBe(360)
    expect(arcOf(0, -10).width).toBe(0)
  })

  test('start and end come out of the pair', () => {
    const a = arcOf(90, 60)
    expect(arcStart(a)).toBe(60)
    expect(arcEnd(a)).toBe(120)
  })

  test('an arc across north has no special case', () => {
    // The whole reason for this representation: 350..10 needs no wrap handling
    // because the arc never says where it starts.
    const a = arcOf(0, 20)
    expect(arcStart(a)).toBe(350)
    expect(arcEnd(a)).toBe(10)
  })
})

describe('arcContains', () => {
  test('holds bearings within half the width of the centre', () => {
    const a = arcOf(90, 60)
    expect(arcContains(a, 90)).toBe(true)
    expect(arcContains(a, 61)).toBe(true)
    expect(arcContains(a, 119)).toBe(true)
    expect(arcContains(a, 59)).toBe(false)
    expect(arcContains(a, 121)).toBe(false)
  })

  test('wraps across north for free', () => {
    const a = arcOf(0, 20)
    expect(arcContains(a, 355)).toBe(true)
    expect(arcContains(a, 5)).toBe(true)
    expect(arcContains(a, 180)).toBe(false)
  })

  test('the edges are inside', () => {
    const a = arcOf(90, 60)
    expect(arcContains(a, 60)).toBe(true)
    expect(arcContains(a, 120)).toBe(true)
  })

  test('the full circle contains everything', () => {
    for (const angle of [0, 90, 180, 270, 359.9]) {
      expect(arcContains(FULL_CIRCLE, angle)).toBe(true)
    }
  })
})

describe('arcWithinArc', () => {
  test('needs BOTH a narrower width and a centre inside the slack', () => {
    const outer = arcOf(90, 100)
    expect(arcWithinArc(arcOf(90, 40), outer)).toBe(true)
    expect(arcWithinArc(arcOf(120, 40), outer)).toBe(true) // just fits: 120+20=140
    expect(arcWithinArc(arcOf(125, 40), outer)).toBe(false) // 145 > 140
    // Narrow enough is not sufficient — it has to be pointing the right way.
    expect(arcWithinArc(arcOf(270, 10), outer)).toBe(false)
  })

  test('a wider arc is never inside a narrower one, wherever it points', () => {
    expect(arcWithinArc(arcOf(90, 120), arcOf(90, 100))).toBe(false)
  })

  test('an arc is inside itself', () => {
    const a = arcOf(37, 84)
    expect(arcWithinArc(a, a)).toBe(true)
  })

  test('everything is inside the full circle', () => {
    expect(arcWithinArc(arcOf(200, 350), FULL_CIRCLE)).toBe(true)
  })

  test('containment wraps too', () => {
    // The ship case: a bow arc straddling north, holding a narrower one.
    const bow = arcOf(0, 120)
    expect(arcWithinArc(arcOf(350, 20), bow)).toBe(true)
    expect(arcWithinArc(arcOf(180, 20), bow)).toBe(false)
  })
})

describe('clampAngleToArc', () => {
  test('leaves a permitted bearing alone', () => {
    expect(clampAngleToArc(90, arcOf(90, 60))).toBe(90)
  })

  test('CATCHES at the nearer stop rather than jumping to the far one', () => {
    /*
    The failure this exists to prevent: dragging a hair past one limit
    teleporting the handle to the opposite stop. A wrapped-distance test against
    the CENTRE does exactly that, and it reads as the control fighting you.
    */
    const limits = arcOf(90, 60) // 60..120
    expect(clampAngleToArc(121, limits)).toBe(120)
    expect(clampAngleToArc(59, limits)).toBe(60)
    // Well past the end, but still nearer that end than the start.
    expect(clampAngleToArc(150, limits)).toBe(120)
  })

  test('picks the genuinely nearer end when they compete', () => {
    const limits = arcOf(90, 60)
    // 350 is 70° from the start (60) and 130° from the end (120).
    expect(clampAngleToArc(350, limits)).toBe(60)
  })

  test('the full circle clamps nothing', () => {
    expect(clampAngleToArc(200, FULL_CIRCLE)).toBe(200)
  })
})

describe('clampArc', () => {
  test('honours width limits', () => {
    expect(clampArc(arcOf(90, 200), { maxWidth: 90 }).width).toBe(90)
    expect(clampArc(arcOf(90, 10), { minWidth: 30 }).width).toBe(30)
  })

  test('slides the arc back inside its envelope', () => {
    const envelope = arcOf(90, 180) // 0..180
    const out = clampArc(arcOf(170, 40), { envelope })
    // 170±20 would reach 190; the widest legal centre is 160.
    expect(out.centre).toBe(160)
    expect(out.width).toBe(40)
  })

  test('narrows FIRST, then positions — the other order cannot succeed', () => {
    /*
    Nothing about where a too-wide arc points can make it fit, so narrowing is
    the constraint that has to give. Doing it first leaves the centre free to
    honour what the author was aiming at; doing it second would have already
    moved the centre for no reason.
    */
    const envelope = arcOf(90, 100) // 40..140
    const out = clampArc(arcOf(120, 200), { envelope })
    expect(out.width).toBe(100)
    expect(out.centre).toBe(90) // no slack left, so it can only be the envelope
  })

  test('a width limit wider than the envelope does not win', () => {
    const envelope = arcOf(0, 60)
    expect(clampArc(arcOf(0, 300), { maxWidth: 180, envelope }).width).toBe(60)
  })

  test('an already-legal arc is untouched', () => {
    const envelope = arcOf(90, 180)
    const value = arcOf(90, 40)
    expect(clampArc(value, { envelope })).toEqual(value)
  })
})

describe('nearestArcGrip', () => {
  test('finds the edge you aimed at', () => {
    const a = arcOf(90, 60)
    expect(nearestArcGrip(a, 61)).toBe('start')
    expect(nearestArcGrip(a, 119)).toBe('end')
    expect(nearestArcGrip(a, 90)).toBe('centre')
  })

  test('is null when nothing is within reach', () => {
    expect(nearestArcGrip(arcOf(90, 60), 270)).toBeNull()
  })

  test('on a NARROW arc the edges beat the centre', () => {
    /*
    All three grips sit within a few degrees, so something has to lose. An edge
    you cannot grab is worse than a rotation you have to reach for: rotating can
    still be done by dragging one edge and then the other, where a width that
    cannot be changed is simply stuck.
    */
    const narrow = arcOf(90, 4) // start 88, centre 90, end 92
    expect(nearestArcGrip(narrow, 88)).toBe('start')
    expect(nearestArcGrip(narrow, 92)).toBe('end')
  })
})

describe('dragArc', () => {
  test('an edge changes the width, the other edge staying put', () => {
    const a = arcOf(90, 60) // 60..120
    const out = dragArc(a, 'end', 150)
    expect(arcStart(out)).toBe(60)
    expect(arcEnd(out)).toBe(150)
    expect(out.width).toBe(90)
  })

  test('the centre rotates the whole arc, the width staying put', () => {
    const a = arcOf(90, 60)
    const out = dragArc(a, 'centre', 200)
    expect(out.centre).toBe(200)
    expect(out.width).toBe(60)
  })

  test('widening past 180° keeps growing instead of flipping', () => {
    /*
    `wrapDegrees` gives the SHORT way round, so measuring the new width with it
    flips to the other side the moment the arc passes half the circle: a slow
    widen would snap to a narrow arc halfway through. The directed difference
    grows monotonically all the way to 360.
    */
    const a = arcOf(90, 60) // start 60
    let width = 0
    for (const angle of [140, 190, 240, 300, 350]) {
      const out = dragArc(a, 'end', angle)
      expect(out.width).toBeGreaterThan(width)
      width = out.width
    }
    expect(width).toBeGreaterThan(180)
  })

  test('honours an envelope while dragging', () => {
    const envelope = arcOf(90, 100) // 40..140
    const out = dragArc(arcOf(90, 40), 'end', 200, { envelope })
    expect(out.width).toBeLessThanOrEqual(100)
    expect(arcWithinArc(out, envelope)).toBe(true)
  })

  test('honours width limits while dragging', () => {
    const out = dragArc(arcOf(90, 60), 'end', 300, { maxWidth: 90 })
    expect(out.width).toBe(90)
  })

  test('a drag that produces an illegal arc still produces a LEGAL one', () => {
    // Whatever the gesture, the value handed back is always usable — the widget
    // never has to check.
    const limits = { envelope: arcOf(0, 120), minWidth: 10, maxWidth: 60 }
    for (const angle of [0, 45, 90, 180, 270, 359]) {
      for (const grip of ['start', 'end', 'centre'] as const) {
        const out = dragArc(arcOf(0, 30), grip, angle, limits)
        expect(out.width).toBeGreaterThanOrEqual(10)
        expect(out.width).toBeLessThanOrEqual(60)
        expect(arcWithinArc(out, limits.envelope)).toBe(true)
      }
    }
  })
})

describe('arcComplement', () => {
  test('is the blocked sector a widget draws', () => {
    const blocked = arcComplement(arcOf(90, 100))!
    expect(blocked.centre).toBe(270)
    expect(blocked.width).toBe(260)
  })

  test('the two together are the whole circle and do not overlap', () => {
    const permitted = arcOf(30, 140)
    const blocked = arcComplement(permitted)!
    expect(permitted.width + blocked.width).toBeCloseTo(360, 9)
    for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
      // Every bearing is in exactly one of them (edges belong to both).
      const inside = arcContains(permitted, angle)
      const out = arcContains(blocked, angle)
      expect(inside || out).toBe(true)
    }
  })

  test('nothing is blocked when everything is allowed', () => {
    expect(arcComplement(FULL_CIRCLE)).toBeNull()
  })
})
