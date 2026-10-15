import { describe, expect, test } from 'bun:test'
import { anchorLayout, anchorLength, type AnchorItem } from './anchor-layout.js'

const C = { width: 400, height: 300 }
const one = (it: AnchorItem, c = C) => anchorLayout([it], c).boxes[0]
const text = (w: number, area: number) => ({
  measure: (width?: number) =>
    width == null
      ? { width: w, height: 20 }
      : { height: Math.ceil(area / width) * 20 },
})

describe('lengths', () => {
  test('a number is units, a percentage a fraction of the span', () => {
    expect(anchorLength(12, 400)).toBe(12)
    expect(anchorLength('50%', 400)).toBe(200)
    expect(anchorLength('12.5%', 400)).toBe(50)
  })
})

describe('one axis, by its pins', () => {
  test('left and right: the width is what the pins leave', () => {
    expect(one({ left: 10, right: 30, top: 0, height: 5 })).toEqual({
      x: 10,
      y: 0,
      width: 360,
      height: 5,
    })
  })
  test('left and right with a stated width: it is a MINIMUM', () => {
    expect(
      one({ left: 10, right: 30, width: 100, top: 0, height: 5 }).width
    ).toBe(360)
    // Too narrow for it: it keeps its minimum and overflows past the right pin.
    expect(
      one(
        { left: 10, right: 30, width: 100, top: 0, height: 5 },
        { width: 120, height: 50 }
      )
    ).toEqual({ x: 10, y: 0, width: 100, height: 5 })
  })
  test('the anchor decides which way a minimum overflows', () => {
    const narrow = { width: 120, height: 50 }
    // 80 between the pins, 100 wanted: 20 over.
    expect(
      one(
        { left: 10, right: 30, width: 100, anchorX: 1, top: 0, height: 5 },
        narrow
      ).x
    ).toBe(-10)
    expect(
      one(
        {
          left: 10,
          right: 30,
          width: 100,
          anchor: 'center',
          top: 0,
          height: 5,
        },
        narrow
      ).x
    ).toBe(0)
  })
  test('left only: stated width exactly, else its natural width', () => {
    expect(one({ left: 10, width: 50, top: 0, height: 5 })).toMatchObject({
      x: 10,
      width: 50,
    })
    expect(one({ left: 10, top: 0, ...text(80, 80) })).toMatchObject({
      x: 10,
      width: 80,
    })
  })
  test('right only: placed from the right edge', () => {
    expect(one({ right: 4, top: 4, width: 20, height: 20 })).toEqual({
      x: 376,
      y: 4,
      width: 20,
      height: 20,
    })
  })
  test('anchor center with left and top at 50% centres it; no pin is the top left', () => {
    expect(
      one({ left: '50%', top: '50%', anchor: 'center', width: 100, height: 50 })
    ).toEqual({ x: 150, y: 125, width: 100, height: 50 })
    expect(one({ width: 100, height: 50 })).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    })
  })
  test('left: 50% alone is the left EDGE at the middle', () => {
    expect(one({ left: '50%', width: 100, top: 0, height: 5 }).x).toBe(200)
  })
  test('any anchor point: centre on the first quarter line, right edge at a left pin', () => {
    expect(
      one({ left: '25%', anchorX: 0.5, width: 100, top: 0, height: 5 }).x
    ).toBe(50)
    expect(
      one({ left: 300, anchorX: 1, width: 100, top: 0, height: 5 }).x
    ).toBe(200)
    // From the right, the default anchor is the right edge; 0 puts the left edge there.
    expect(
      one({ right: 100, anchorX: 0, width: 50, top: 0, height: 5 }).x
    ).toBe(300)
    expect(
      one({ left: 0, bottom: 0, anchorY: 0, width: 10, height: 10 }).y
    ).toBe(300)
  })
  test('between two pins that fit, the anchor changes nothing', () => {
    expect(
      one({ left: 0, right: 0, anchor: 'center', top: 0, height: 5 })
    ).toMatchObject({ x: 0, width: 400 })
  })
  test('fractional sizes', () => {
    expect(
      one({
        left: '50%',
        top: '50%',
        anchor: 'center',
        width: '60%',
        height: '10%',
      })
    ).toEqual({ x: 80, y: 135, width: 240, height: 30 })
  })
  test('no natural size: fills from its pin, or the whole span', () => {
    expect(one({ left: 100, top: 0, height: 5 })).toMatchObject({
      x: 100,
      width: 300,
    })
    expect(one({ right: 100, top: 0, height: 5 })).toMatchObject({
      x: 0,
      width: 300,
    })
    expect(one({})).toEqual({ x: 0, y: 0, width: 400, height: 300 })
  })
})

describe('width first, then height at that width', () => {
  test('stretched text is measured at the width it was given', () => {
    // 600 units of text: 2 lines at 300 wide, 6 lines at 100.
    expect(one({ left: 50, right: 50, top: 0, ...text(600, 600) }).height).toBe(
      40
    )
    expect(one({ left: 0, width: 100, top: 0, ...text(600, 600) }).height).toBe(
      120
    )
  })
  test('top and bottom: a stated height is a minimum, the measure is not asked', () => {
    expect(
      one({ left: 0, right: 0, top: 28, bottom: 0, ...text(10, 10) }).height
    ).toBe(272)
    expect(
      one({ left: 0, right: 0, top: 28, bottom: 0, height: 400 }).height
    ).toBe(400)
  })
  test('bottom only: placed up from the bottom edge by its measured height', () => {
    expect(
      one({ left: 0, right: 0, bottom: 10, ...text(400, 800) })
    ).toMatchObject({ y: 250, height: 40 })
  })
})

describe('within a rectangle (a window in the art)', () => {
  const win = { x: 100, y: 50, width: 200, height: 100 }
  test('pins and fractions are measured against the rectangle', () => {
    expect(
      one({ left: 10, right: 10, top: 0, height: 20, within: win })
    ).toEqual({ x: 110, y: 50, width: 180, height: 20 })
    expect(
      one({
        left: '50%',
        top: '50%',
        anchor: 'center',
        width: 40,
        height: 40,
        within: win,
      })
    ).toEqual({ x: 180, y: 80, width: 40, height: 40 })
  })
})

describe('layers', () => {
  test('the order given, unless z says otherwise; ties keep the order', () => {
    const { order } = anchorLayout([{}, { z: 2 }, {}, { z: -1 }, { z: 2 }], C)
    expect(order).toEqual([3, 0, 2, 1, 4])
  })
  test('a window: title bar, close button, content, and a centred dialog', () => {
    const { boxes } = anchorLayout(
      [
        { left: 0, right: 0, top: 0, height: 28 },
        { right: 4, top: 4, width: 20, height: 20 },
        { left: 0, right: 0, top: 28, bottom: 0 },
        {
          left: '50%',
          top: '50%',
          anchor: 'center',
          width: '60%',
          height: 120,
        },
      ],
      C
    )
    expect(boxes).toEqual([
      { x: 0, y: 0, width: 400, height: 28 },
      { x: 376, y: 4, width: 20, height: 20 },
      { x: 0, y: 28, width: 400, height: 272 },
      { x: 80, y: 90, width: 240, height: 120 },
    ])
  })
})
