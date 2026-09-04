import { describe, expect, test } from 'bun:test'
import { selectionIcon, applySelection } from './selection.js'

describe('selectionIcon — radio vs checkbox convention', () => {
  test('single-select uses circles', () => {
    expect(selectionIcon('single', false)).toBe('circle')
    expect(selectionIcon('single', true)).toBe('checkCircle')
  })

  test('multi-select uses squares', () => {
    expect(selectionIcon('multi', false)).toBe('square')
    expect(selectionIcon('multi', true)).toBe('checkSquare')
  })

  test('the unselected state is a real glyph, not nothing', () => {
    // An empty slot would make "not selected" and "not selectable" look identical,
    // and would shift the row's layout when it became selected.
    expect(selectionIcon('single', false)).toBeTruthy()
    expect(selectionIcon('multi', false)).toBeTruthy()
  })
})

describe('applySelection — single', () => {
  test('picking replaces the previous selection', () => {
    const next = applySelection(new Set(['a']), 'b', 'single')
    expect([...next]).toEqual(['b'])
  })

  test('by default, re-picking the selected row KEEPS it', () => {
    const next = applySelection(new Set(['a']), 'a', 'single')
    expect([...next]).toEqual(['a'])
  })

  test('allowDeselect lets a re-pick clear it (optional filters, nullable enums)', () => {
    const next = applySelection(new Set(['a']), 'a', 'single', {
      allowDeselect: true,
    })
    expect([...next]).toEqual([])
  })

  test('allowDeselect still SELECTS when picking a different row', () => {
    const next = applySelection(new Set(['a']), 'b', 'single', {
      allowDeselect: true,
    })
    expect([...next]).toEqual(['b'])
  })

  test('allowDeselect is ignored for multi (which toggles by definition)', () => {
    const off = applySelection(new Set(['a']), 'a', 'multi', {
      allowDeselect: false,
    })
    expect([...off]).toEqual([])
  })

  test('picking from empty selects', () => {
    expect([...applySelection(new Set(), 'a', 'single')]).toEqual(['a'])
  })
})

describe('applySelection — multi', () => {
  test('toggles on and off', () => {
    const on = applySelection(new Set(), 'a', 'multi')
    expect([...on]).toEqual(['a'])
    const off = applySelection(on, 'a', 'multi')
    expect([...off]).toEqual([])
  })

  test('accumulates independent rows', () => {
    let s = applySelection(new Set(), 'a', 'multi')
    s = applySelection(s, 'b', 'multi')
    expect([...s].sort()).toEqual(['a', 'b'])
  })

  test('deselecting one leaves the others', () => {
    const s = applySelection(new Set(['a', 'b', 'c']), 'b', 'multi')
    expect([...s].sort()).toEqual(['a', 'c'])
  })
})

describe('applySelection — purity', () => {
  test('never mutates the set it was given', () => {
    const before = new Set(['a'])
    applySelection(before, 'b', 'multi')
    applySelection(before, 'b', 'single')
    expect([...before]).toEqual(['a'])
  })
})
