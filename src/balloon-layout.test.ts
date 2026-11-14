import { describe, expect, test } from 'bun:test'
import { BALLOON_H, BALLOON_W, balloonLayout, rowAt, wrapText } from './balloon-layout.js'

describe('balloon layout', () => {
  test('words wrap at the width, never splitting one', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four'])
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
    expect(L.rows.map((r) => r.label)).toEqual(['1. What do you sell?', '2. Bye.'])
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
    const replies = [1, 2, 3, 4].map((n) => ({ id: `${n}`, label: `reply ${n}` }))
    const L = balloonLayout(long, replies)
    expect(L.lines.at(-1)!.text.endsWith('…')).toBe(true)
    expect(L.box.y).toBeGreaterThanOrEqual(0)
  })
})
