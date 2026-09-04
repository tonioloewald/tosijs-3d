import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

/*
CONSUMER ICONS.

Tonio: "I have a bunch of icons for the ensemble editor we don't necessarily
want to pollute tosijs-3d with." A consumer could always build a private set
with `createSvgIcons(theirData)`, but that only serves direct calls — every
WIDGET resolves a NAME (an `iconGrid3d` item, a table icon column, a menu
entry), so an icon set they cannot add to is one their widgets cannot use.
*/

let m: typeof import('./svg-icons.js')

const ART =
  '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18"/></svg>'

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  m = await import('./svg-icons.js')
})

describe('registerIcons', () => {
  test('a registered icon resolves everywhere a built-in does', () => {
    expect(m.iconExists('zoneBox')).toBe(false)
    m.registerIcons({ zoneBox: ART })
    expect(m.iconExists('zoneBox')).toBe(true)
    expect(m.iconGlyph('zoneBox').tagName).toBe('g')
    expect(m.svgIcons.zoneBox().tagName).toBe('svg')
    expect(m.iconNames()).toContain('zoneBox')
  })

  test('the default proxy sees icons registered AFTER it was built', () => {
    // It holds the live map, not a snapshot — a proxy over a copy would
    // resolve everything except what you just added.
    m.registerIcons({ lateIcon: ART })
    expect('lateIcon' in m.svgIcons).toBe(true)
  })

  test('a redirect aliases one of ours into their vocabulary', () => {
    m.registerIcons({ sceneMarker: 'star' })
    expect(m.iconExists('sceneMarker')).toBe(true)
    expect(m.iconGlyph('sceneMarker').tagName).toBe('g')
  })

  test('values are TRIMMED — a trailing space breaks a redirect', () => {
    // icon-data stores every entry with one, and a redirect is re-parsed as a
    // NAME where that space is fatal. It silently broke every mirrored icon
    // once already (#54).
    m.registerIcons({ paddedRedirect: '  star  ' })
    expect(m.iconExists('paddedRedirect')).toBe(true)
  })

  test('the composition suffixes still apply to registered art', () => {
    // A consumer's arrow gets its rotations free, same as ours.
    m.registerIcons({ myArrow: ART })
    expect(m.iconExists('myArrow90r')).toBe(true)
    expect(m.iconExists('myArrow0f')).toBe(true)
  })

  test('registering over an existing name replaces it', () => {
    // Deliberate: swapping our camera for one that matches your art is a
    // reasonable want. Nothing is removed, so unregistered names still work.
    m.registerIcons({ camera: ART })
    expect(m.iconExists('camera')).toBe(true)
    expect(m.iconExists('star')).toBe(true)
  })

  test('junk is ignored rather than poisoning the map', () => {
    m.registerIcons({ empty: '', spaces: '   ', notAString: 42 as any })
    expect(m.iconExists('empty')).toBe(false)
    expect(m.iconExists('spaces')).toBe(false)
    expect(m.iconExists('notAString')).toBe(false)
  })

  test('isRegisteredIcon tells consumer names from ours', () => {
    m.registerIcons({ theirs: ART })
    expect(m.isRegisteredIcon('theirs')).toBe(true)
    expect(m.isRegisteredIcon('star')).toBe(false)
  })
})

/*
HOSTILE NAMES, not just hostile values.

The suite pinned what happens when a VALUE is junk and never asked what happens
when a NAME collides with something on `Object.prototype`. `iconGlyph` looked up
`data[name]` on a plain object, so `constructor` returned a Function and
`?.trim()` threw — and since 0.8.0 a table's icon column feeds DATA into that
lookup, with no catch between it and the repaint.
*/
describe('icon names that collide with Object.prototype', () => {
  const HOSTILE = [
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__proto__',
    'propertyIsEnumerable',
  ]

  test('resolving one falls back instead of throwing', () => {
    for (const name of HOSTILE) {
      expect(() => m.iconGlyph(name)).not.toThrow()
    }
  })

  test('and the fallback is the same one any unknown name gets', () => {
    // Compare the MARKUP: `iconGlyph` returns a fresh element each call, so
    // two structurally identical results are still different objects.
    const markup = (n: string) =>
      (m.iconGlyph(n) as unknown as { outerHTML: string }).outerHTML
    const unknown = markup('definitely-not-an-icon-xyz')
    for (const name of HOSTILE) {
      expect(markup(name)).toBe(unknown)
    }
  })

  test('registering one stores DATA — `__proto__` does not become a prototype', () => {
    const before = Object.getPrototypeOf(m.iconData)
    m.registerIcons({
      __proto__: '<svg viewBox="0 0 24 24"><circle r="9"/></svg>',
    })
    // the map's prototype is untouched...
    expect(Object.getPrototypeOf(m.iconData)).toBe(before)
    // ...and an ordinary lookup still works afterwards
    expect(() => m.iconGlyph('bug')).not.toThrow()
  })

  test('a table cell carrying such a value cannot kill the repaint', () => {
    // The actual 0.8.0 exposure: `table` does iconGlyph(String(row[key])).
    for (const cell of HOSTILE) {
      expect(() => m.iconGlyph(String(cell))).not.toThrow()
    }
  })
})
