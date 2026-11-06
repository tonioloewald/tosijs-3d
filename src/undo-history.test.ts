import { describe, expect, test } from 'bun:test'
import { undoHistory } from './undo-history.js'

describe('undoHistory', () => {
  test('undo and redo step through what was recorded', () => {
    const h = undoHistory<number>()
    expect(h.canUndo).toBe(false)
    h.record(1)
    h.record(2)
    h.record(3)
    expect(h.undo()).toBe(2)
    expect(h.undo()).toBe(1)
    expect(h.undo()).toBeUndefined()
    expect(h.canRedo).toBe(true)
    expect(h.redo()).toBe(2)
    expect(h.redo()).toBe(3)
    expect(h.redo()).toBeUndefined()
  })

  test('recording after an undo drops the undone steps', () => {
    const h = undoHistory<string>()
    h.record('a')
    h.record('b')
    h.record('c')
    h.undo()
    h.undo()
    h.record('d')
    expect(h.canRedo).toBe(false)
    expect(h.undo()).toBe('a')
  })

  test('a state equal to the current one is not a step', () => {
    const h = undoHistory<{ x: number }>()
    expect(h.record({ x: 1 })).toBe(true)
    expect(h.record({ x: 1 })).toBe(false)
    h.record({ x: 2 })
    // Restoring a state and recording it again changes nothing.
    const back = h.undo()!
    expect(h.record(back)).toBe(false)
    expect(h.canRedo).toBe(true)
  })

  test('past the limit the oldest steps go', () => {
    const h = undoHistory<number>({ limit: 3 })
    for (let i = 0; i < 6; i++) h.record(i)
    expect(h.undo()).toBe(4)
    expect(h.undo()).toBe(3)
    expect(h.undo()).toBeUndefined()
  })

  test('clear starts again', () => {
    const h = undoHistory<number>()
    h.record(1)
    h.record(2)
    h.clear(5)
    expect(h.current()).toBe(5)
    expect(h.canUndo).toBe(false)
  })
})
