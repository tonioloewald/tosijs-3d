import { describe, expect, test } from 'bun:test'
import {
  edit,
  insert,
  backspace,
  deleteForward,
  moveCaret,
  moveTo,
  selectAll,
  selectedText,
  hasSelection,
  length,
} from './text-edit.js'

describe('edit — construction', () => {
  test('caret defaults to the end', () => {
    expect(edit('hello')).toEqual({ text: 'hello', caret: 5, anchor: 5 })
  })

  test('an explicit caret is clamped into range', () => {
    expect(edit('hi', 99).caret).toBe(2)
    expect(edit('hi', -5).caret).toBe(0)
  })

  test('empty is valid', () => {
    expect(edit()).toEqual({ text: '', caret: 0, anchor: 0 })
  })
})

describe('insert', () => {
  test('inserts at the caret', () => {
    const s = insert(edit('helo', 3), 'l')
    expect(s.text).toBe('hello')
    expect(s.caret).toBe(4)
  })

  test('replaces a selection', () => {
    let s = edit('hello')
    s = moveTo(s, 0)
    s = moveTo(s, 5, true) // select all of it
    s = insert(s, 'bye')
    expect(s.text).toBe('bye')
    expect(s.caret).toBe(3)
    expect(hasSelection(s)).toBe(false)
  })

  test('inserting a multi-code-point string advances the caret by code points', () => {
    const s = insert(edit(''), '😀')
    expect(s.text).toBe('😀')
    expect(s.caret).toBe(1) // ONE code point, though '😀'.length === 2
  })
})

describe('backspace — code points, not UTF-16 units', () => {
  test('deletes the character before the caret', () => {
    expect(backspace(edit('hello')).text).toBe('hell')
  })

  test('at the start it is a no-op', () => {
    const s = edit('hello', 0)
    expect(backspace(s)).toBe(s)
  })

  test('deletes a whole emoji, not half a surrogate pair', () => {
    const s = backspace(edit('hi😀'))
    expect(s.text).toBe('hi')
    // The bug this guards: a naive slice leaves a lone surrogate, which renders as
    // a broken glyph AND can't be deleted by a second backspace.
    expect(Array.from(s.text).length).toBe(2)
  })

  test('deletes an accented character from the long-press popup', () => {
    expect(backspace(edit('schön')).text).toBe('schö')
    expect(backspace(edit('schö')).text).toBe('sch')
  })

  test('deletes the selection when there is one', () => {
    let s = moveTo(edit('hello'), 1)
    s = moveTo(s, 4, true) // select 'ell'
    expect(selectedText(s)).toBe('ell')
    expect(backspace(s).text).toBe('ho')
  })
})

describe('deleteForward', () => {
  test('deletes the character after the caret', () => {
    expect(deleteForward(edit('hello', 0)).text).toBe('ello')
  })

  test('at the end it is a no-op', () => {
    const s = edit('hi')
    expect(deleteForward(s)).toBe(s)
  })

  test('handles emoji as one unit', () => {
    expect(deleteForward(edit('😀hi', 0)).text).toBe('hi')
  })
})

describe('caret movement', () => {
  test('moves and clamps', () => {
    expect(moveCaret(edit('hello'), -2).caret).toBe(3)
    expect(moveCaret(edit('hello'), 99).caret).toBe(5)
    expect(moveCaret(edit('hello', 0), -99).caret).toBe(0)
  })

  test('moves by code point across an emoji', () => {
    // 'a😀b' is 4 UTF-16 units but 3 code points; one left from the end is after 😀.
    const s = moveCaret(edit('a😀b'), -1)
    expect(s.caret).toBe(2)
    expect(backspace(s).text).toBe('ab') // deleted the emoji whole
  })

  test('extend keeps the anchor (shift-arrow)', () => {
    const s = moveCaret(edit('hello'), -3, true)
    expect(s.anchor).toBe(5)
    expect(s.caret).toBe(2)
    expect(selectedText(s)).toBe('llo')
  })

  test('collapsing a selection goes to its EDGE, not the caret', () => {
    let s = moveTo(edit('hello'), 1)
    s = moveTo(s, 4, true) // anchor 1, caret 4
    expect(moveCaret(s, -1).caret).toBe(1) // start of selection
    expect(moveCaret(s, 1).caret).toBe(4) // end of selection
  })
})

describe('selection', () => {
  test('selectAll spans the text', () => {
    const s = selectAll(edit('hello'))
    expect(selectedText(s)).toBe('hello')
    expect(hasSelection(s)).toBe(true)
  })

  test('a collapsed caret selects nothing', () => {
    expect(hasSelection(edit('hello'))).toBe(false)
    expect(selectedText(edit('hello'))).toBe('')
  })

  test('length counts code points', () => {
    expect(length(edit('a😀b'))).toBe(3)
  })
})
