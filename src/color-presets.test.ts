import { describe, expect, test } from 'bun:test'
import {
  COLOR_PRESETS,
  SWATCH_KEY,
  createSwatchStore,
  presetCells,
  presetList,
} from './color-presets.js'

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

describe('createSwatchStore', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
  }

  test("a saved colour sits after the caller's and before the general set", () => {
    const s = createSwatchStore()
    expect(s.add('#123456')).toBe(true)
    const list = s.list(['#abcdef']).map((p) => p.value)
    expect(list.slice(0, 2)).toEqual(['#abcdef', '#123456'])
    expect(list[2]).toBe(COLOR_PRESETS[0])
  })

  test('adding one already saved does nothing, and nonsense is refused', () => {
    const s = createSwatchStore()
    s.add('#123456')
    expect(s.add('#123456')).toBe(false)
    expect(s.add('nope')).toBe(false)
    expect(s.added).toEqual(['#123456'])
  })

  test('removing takes out a saved colour, a general one and a caller one alike', () => {
    const s = createSwatchStore()
    s.add('#123456')
    s.remove('#123456')
    s.remove(COLOR_PRESETS[0])
    s.remove('#abcdef')
    const list = s.list(['#abcdef']).map((p) => p.value)
    expect(list).not.toContain('#123456')
    expect(list).not.toContain(COLOR_PRESETS[0])
    expect(list).not.toContain('#abcdef')
    expect(s.added).toEqual([])
  })

  test('adding a removed colour puts it back', () => {
    const s = createSwatchStore()
    s.remove(COLOR_PRESETS[2])
    expect(s.add(COLOR_PRESETS[2])).toBe(true)
    expect(s.list().map((p) => p.value)).toContain(COLOR_PRESETS[2])
    // …without a second copy of a general colour in the saved list.
    expect(s.added).toEqual([])
  })

  test('it survives a reload, and a broken record starts empty', () => {
    const store = memory()
    const a = createSwatchStore(store)
    a.add('#123456')
    a.remove(COLOR_PRESETS[1])
    const b = createSwatchStore(store)
    expect(b.added).toEqual(['#123456'])
    expect(b.removed).toEqual([COLOR_PRESETS[1]])
    store.setItem(SWATCH_KEY, '{not json')
    expect(createSwatchStore(store).added).toEqual([])
  })

  test('listeners hear every change until they leave', () => {
    const s = createSwatchStore()
    let n = 0
    const off = s.subscribe(() => n++)
    s.add('#123456')
    s.remove('#123456')
    off()
    s.add('#654321')
    expect(n).toBe(2)
  })
})
