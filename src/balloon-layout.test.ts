import { describe, expect, test } from 'bun:test'
import {
  BALLOON_H,
  BALLOON_W,
  balloonLayout,
  fitBalloon,
  rowAt,
  wrapText,
} from './balloon-layout.js'

describe('balloon layout', () => {
  test('words wrap at the width, never splitting one', () => {
    expect(wrapText('one two three four', 9)).toEqual([
      'one two',
      'three',
      'four',
    ])
    expect(wrapText('', 10)).toEqual([])
  })

  test('the balloon stands on the bottom, tail room below, rows under the caption', () => {
    const L = balloonLayout('Welcome, welcome. Looking for something?', [
      { id: 'shop', label: 'What do you sell?' },
      { id: 'bye', label: 'Bye.' },
    ])
    expect(L.box.y + L.box.h).toBeLessThan(BALLOON_H)
    expect(L.box.y).toBeGreaterThan(0)
    expect(L.lines.length).toBeGreaterThan(0)
    expect(L.rows.map((r) => r.label)).toEqual([
      '1. What do you sell?',
      '2. Bye.',
    ])
    expect(L.rows[0].y).toBeGreaterThan(L.lines.at(-1)!.y)
  })

  test('a point finds its row, and nothing outside the balloon', () => {
    const L = balloonLayout('Hm?', [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ])
    const b = L.rows[1]
    expect(rowAt(L, BALLOON_W / 2, b.y + b.h / 2)).toBe('b')
    expect(rowAt(L, BALLOON_W / 2, L.lines[0].y)).toBeNull()
    expect(rowAt(L, -5, b.y + 1)).toBeNull()
  })

  test('a caption too long for the room is cut with an ellipsis', () => {
    const long = 'word '.repeat(200)
    const replies = [1, 2, 3, 4].map((n) => ({
      id: `${n}`,
      label: `reply ${n}`,
    }))
    const L = balloonLayout(long, replies)
    expect(L.lines.at(-1)!.text.endsWith('…')).toBe(true)
    expect(L.box.y).toBeGreaterThanOrEqual(0)
  })

  test('a balloon with room goes over the head, tail straight down', () => {
    const fit = fitBalloon({ left: 3, right: 3, up: 3, down: 2 }, 1, 0.6)
    expect(fit.dx).toBe(0)
    expect(fit.dy).toBeCloseTo(0.1)
    expect(fit.tail).toBe(0.5)
  })

  test('against the top of the view it comes down and aside, clear of the face, tail to the head', () => {
    // Head near the top, more room on the left.
    const room = { left: 2, right: 1.5, up: 0.4, down: 2 }
    const fit = fitBalloon(room, 1, 0.6, { margin: 0.05 })
    expect(fit.dy + 0.6).toBeCloseTo(0.35) // its top at the margin
    expect(fit.side).toBe(-1)
    expect(fit.dx).toBeLessThan(-(0.5 + 0.15)) // its near edge past the head
    expect(fit.tail).toBe(1) // pointing right, at the head
  })

  test('a little short of room it only slides down a little and barely aside', () => {
    const fit = fitBalloon({ left: 3, right: 3, up: 0.68, down: 2 }, 1, 0.6)
    expect(fit.dy).toBeCloseTo(0.08)
    expect(Math.abs(fit.dx)).toBeLessThan(0.01)
  })

  test('it stays inside the side edges and keeps its side unless the other has much more room', () => {
    const edge = fitBalloon({ left: 0.2, right: 4, up: 3, down: 2 }, 1, 0.6)
    expect(edge.dx).toBeCloseTo(0.3) // its left edge at the view's
    expect(edge.tail).toBeCloseTo(0.2)
    const kept = fitBalloon({ left: 1.5, right: 1.7, up: 0.2, down: 2 }, 1, 0.6, { side: -1 })
    expect(kept.side).toBe(-1)
    const moved = fitBalloon({ left: 0.6, right: 2, up: 0.2, down: 2 }, 1, 0.6, { side: -1 })
    expect(moved.side).toBe(1)
  })
})
