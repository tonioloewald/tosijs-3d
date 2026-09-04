import { describe, test, expect } from 'bun:test'
import {
  chromeLayout,
  chromeHit,
  uvToViewBox,
  type ChromeLayout,
} from './popup-chrome.js'

/*
THE CLOSE BUTTON MUST BE WHERE THE × IS.

This is the specific defect these tests exist for: the glyph was placed by the
drawing code and the hit region by the pointer code, in different units, and on
a portrait panel they were FULLY DISJOINT — the × drawn at u 0.655..0.745, the
close region starting at u > 0.89. Pressing the visible × fell through to the
drag branch, and since dragging an owned popup tears it off, the close button
tore the popup off its opener.

It survived because the shipped demo's landscape card is one of the few aspects
where the two happened to overlap. So the cases below sweep aspect ratios
deliberately — wide, square and portrait — rather than testing the one shape we
happen to draw.
*/

/** Does the close region contain every corner of the drawn close glyph? */
const containsGlyph = (l: ChromeLayout, r = l.close): boolean => {
  const pts: Array<[number, number]> = [
    [r.x, r.y],
    [r.x + r.size, r.y],
    [r.x, r.y + r.size],
    [r.x + r.size, r.y + r.size],
  ]
  return pts.every(([x, y]) => chromeHit(x, y, l) === 'close')
}

const ASPECTS: Array<[string, number, number]> = [
  ['wide 220x130', 220, 130],
  ['square 300x300', 300, 300],
  ['portrait 200x600', 200, 600],
  ['very wide 800x120', 800, 120],
]

describe('the close region contains the close glyph, at every aspect', () => {
  for (const [name, w, h] of ASPECTS) {
    for (const grip of [0.2, 0.35, 0.5]) {
      test(`${name} @ grip ${grip}`, () => {
        const l = chromeLayout(w, h, grip)
        expect(containsGlyph(l)).toBe(true)
      })
    }
  }
})

describe('the move glyph is DRAG, never close — or the tear-off is a trap', () => {
  for (const [name, w, h] of ASPECTS) {
    test(name, () => {
      const l = chromeLayout(w, h, 0.2)
      expect(l.move).not.toBeNull()
      const m = l.move!
      for (const [x, y] of [
        [m.x, m.y],
        [m.x + m.size, m.y],
        [m.x, m.y + m.size],
        [m.x + m.size, m.y + m.size],
      ]) {
        expect(chromeHit(x, y, l)).toBe('drag')
      }
    })
  }
})

describe('the panel body reaches its own content', () => {
  test('below the bar is content, so a popup can contain a button', () => {
    const l = chromeLayout(220, 130, 0.2)
    expect(chromeHit(110, l.barHeight + 1, l)).toBe('content')
    expect(chromeHit(10, 129, l)).toBe('content')
  })

  test('gripHeight 0 makes the WHOLE panel a drag handle', () => {
    const l = chromeLayout(220, 130, 0)
    expect(chromeHit(110, 65, l)).toBe('drag')
    expect(chromeHit(219, 129, l)).toBe('drag')
  })
})

describe('glyphs cannot collide or escape the panel', () => {
  test('a tall grip on a narrow panel still separates move from close', () => {
    // The pathological case: bar taller than the panel is wide.
    const l = chromeLayout(120, 600, 0.5)
    const m = l.move!
    expect(m.x + m.size).toBeLessThanOrEqual(l.close.x)
  })

  test('every glyph stays inside the viewBox', () => {
    for (const [, w, h] of ASPECTS) {
      for (const grip of [0.2, 0.5, 1]) {
        const l = chromeLayout(w, h, grip)
        for (const r of [l.move!, l.close]) {
          expect(r.x).toBeGreaterThanOrEqual(0)
          expect(r.y).toBeGreaterThanOrEqual(0)
          expect(r.x + r.size).toBeLessThanOrEqual(w + 1e-9)
          expect(r.y + r.size).toBeLessThanOrEqual(h + 1e-9)
        }
      }
    }
  })

  test('no move glyph when the popup is not draggable', () => {
    expect(chromeLayout(220, 130, 0.2, false).move).toBeNull()
  })
})

describe('uvToViewBox — the flip that hides a title bar at the bottom', () => {
  test('v = 1 is the TOP of the panel', () => {
    expect(uvToViewBox(0, 1, 200, 100).y).toBeCloseTo(0)
    expect(uvToViewBox(0, 0, 200, 100).y).toBeCloseTo(100)
  })

  test('a press at the top-right in UV lands on close', () => {
    const l = chromeLayout(200, 600, 0.2)
    const p = uvToViewBox(0.97, 0.98, 200, 600)
    expect(chromeHit(p.x, p.y, l)).toBe('close')
  })

  test('THE REGRESSION: the drawn × on a portrait panel is clickable', () => {
    // Before the fix this exact point classified as `drag`, which tore the
    // popup off its opener instead of closing it.
    const l = chromeLayout(200, 600, 0.2)
    const centre = {
      x: l.close.x + l.close.size / 2,
      y: l.close.y + l.close.size / 2,
    }
    expect(chromeHit(centre.x, centre.y, l)).toBe('close')
  })
})

describe('the close TARGET does not shrink with the glyph', () => {
  test('a smaller glyph keeps a target at least as wide as the bar is tall', () => {
    // `chromeHit` tests `x >= closeHitX`, not `close.x` — so drawing the glyph
    // smaller (which Tonio asked for) must not quietly make the corner harder to
    // hit. That is the wrong trade for a controller ray.
    const l = chromeLayout(300, 200, 0.2, true)
    expect(l.closeHitX).toBeLessThanOrEqual(l.close.x)
    expect(300 - l.closeHitX).toBeGreaterThanOrEqual(l.barHeight)
  })

  test('a press in the corner still closes, at the glyph or beside it', () => {
    const l = chromeLayout(300, 200, 0.2, true)
    expect(chromeHit(299, 2, l)).toBe('close')
    expect(chromeHit(l.closeHitX + 1, l.barHeight / 2, l)).toBe('close')
    // …and just left of the target is still a drag, not a close.
    expect(chromeHit(l.closeHitX - 2, l.barHeight / 2, l)).toBe('drag')
  })

  test('the glyph is drawn inside its own target', () => {
    const l = chromeLayout(300, 200, 0.2, true)
    expect(l.close.x).toBeGreaterThanOrEqual(l.closeHitX)
    expect(l.close.x + l.close.size).toBeLessThanOrEqual(300)
  })
})
