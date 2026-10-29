import { describe, test, expect } from 'bun:test'
import {
  writeCharacter,
  readCharacter,
  CHARACTER_FORMAT,
  CHARACTER_VERSION,
} from './character-file.js'

const settings = { gender: 0.5, hair: 'none', blink: true, look: { type: 'cloth', inputs: {} } }
const slots = { top: { look: 'as made', material: { type: 'cloth', inputs: {} } } }
const defaults = { settings, slots }

const ada = {
  name: 'Ada',
  settings: { gender: 0.1, hair: 'short02', blink: false, look: { type: 'cloth', inputs: { albedo: '#123456' } } },
  cloth: { top: { look: 'blue', material: { type: 'cloth', inputs: { recolour: 1 } } } },
  tailor: [[[0.1, 1], [0.2, 1], [0.2, 0.5]]] as Array<Array<[number, number]>>,
  garments: { cape: new Uint8Array([0, 1, 2, 250, 255]) },
}

describe('character-file', () => {
  test('a character round-trips through JSON, garments included', () => {
    const json = JSON.stringify(writeCharacter(ada, { saved: '2026-10-29T00:00:00Z' }))
    const { character, warnings } = readCharacter(json, defaults)
    expect(warnings).toEqual([])
    expect(character.name).toBe('Ada')
    expect(character.settings).toEqual(ada.settings)
    expect(character.cloth).toEqual(ada.cloth)
    expect(character.tailor).toEqual(ada.tailor)
    expect(Array.from(character.garments.cape)).toEqual([0, 1, 2, 250, 255])
  })

  test('the document says what it is and which layout', () => {
    const doc = writeCharacter(ada)
    expect(doc.format).toBe(CHARACTER_FORMAT)
    expect(doc.version).toBe(CHARACTER_VERSION)
  })

  test('missing settings keep their defaults; unknown and mistyped ones are skipped and said', () => {
    const doc = writeCharacter(ada) as any
    delete doc.settings.blink
    doc.settings.gender = 'very'
    doc.settings.wings = 2
    const { character, warnings } = readCharacter(doc, defaults)
    expect(character.settings.blink).toBe(true)
    expect(character.settings.gender).toBe(0.5)
    expect(character.settings.hair).toBe('short02')
    expect(warnings.some((w) => w.startsWith('gender:'))).toBe(true)
    expect(warnings.some((w) => w.startsWith('wings:'))).toBe(true)
  })

  test('outline points that are not [x, y] numbers are dropped', () => {
    const doc = writeCharacter(ada) as any
    doc.tailor[0].push({ x: 1, y: 2 }, [NaN, 1], 'x')
    expect(readCharacter(doc, defaults).character.tailor).toEqual(ada.tailor)
  })

  test('a slot with no or broken look gets its default', () => {
    const doc = writeCharacter({ ...ada, cloth: { top: { look: 3 as any, material: null } } })
    expect(readCharacter(doc, defaults).character.cloth.top).toEqual(slots.top)
  })

  test('not a character, or newer than this reader: refused', () => {
    expect(() => readCharacter({ format: 'something' }, defaults)).toThrow(/not a character/)
    const doc = { ...writeCharacter(ada), version: CHARACTER_VERSION + 1 }
    expect(() => readCharacter(doc, defaults)).toThrow(/newer/)
  })

  test('a broken garment is skipped, the rest still loads', () => {
    const doc = writeCharacter(ada) as any
    doc.garments.bad = '***'
    const { character, warnings } = readCharacter(doc, defaults)
    expect(character.garments.cape).toBeDefined()
    expect(character.garments.bad).toBeUndefined()
    expect(warnings.some((w) => w.includes('bad'))).toBe(true)
  })
})
