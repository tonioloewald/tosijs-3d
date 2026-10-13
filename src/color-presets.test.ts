import { describe, expect, test } from 'bun:test'
import { COLOR_PRESETS, presetCells, presetList } from './color-presets.js'

describe('presetList', () => {
  test("the caller's presets come first, then the general set", () => {
    const list = presetList(['#123456'], true)
    expect(list[0].value).toBe('#123456')
    expect(list.length).toBe(COLOR_PRESETS.length + 1)
  })

  test('a repeat is shown once, where it first appeared', () => {
    const list = presetList(['#FFFFFF', 'white', '#ffffff'], true)
    expect(list.filter((p) => p.value === '#ffffff').length).toBe(1)
    expect(list[0].value).toBe('#ffffff')
  })

  test('what does not parse is left out, not drawn black', () => {
    expect(presetList(['nonsense', '', '#12'], false)).toEqual([])
  })

  test("'off' shows only the caller's", () => {
    expect(presetList([{ name: 'belt', value: '#a9774c' }], false)).toEqual([
      { name: 'belt', value: '#a9774c' },
    ])
  })

  test('every default parses', () => {
    expect(presetList(undefined, true).length).toBe(COLOR_PRESETS.length)
  })
})

describe('presetCells', () => {
  test('as many across as fit, wrapping', () => {
    // 24 wide with 6 between: four fit in 114 (4*24 + 3*6), five do not.
    const c = presetCells(10, 114)
    expect(c.columns).toBe(4)
    expect(c.at(0)).toEqual({ x: 0, y: 0 })
    expect(c.at(3)).toEqual({ x: 90, y: 0 })
    expect(c.at(4)).toEqual({ x: 0, y: 30 })
    expect(c.height).toBe(3 * 24 + 2 * 6)
  })

  test('never zero columns, and no height for nothing', () => {
    expect(presetCells(3, 0).columns).toBe(1)
    expect(presetCells(0, 200).height).toBe(0)
  })
})
