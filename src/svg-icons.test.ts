import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

// svg-icons.ts pulls in tosijs (svgElements), which subclasses HTMLElement at module
// load and builds through the DOM — so the DOM globals must exist BEFORE the import.
// Same bootstrap as hud-trace.test.ts.
let mod: typeof import('./svg-icons')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters that throw — irrelevant here */
    }
  }
  mod = await import('./svg-icons')
})

const FIXTURE = {
  box: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18"/></svg>',
  cube: '<svg class="color" viewBox="0 0 24 24"><path style="fill:#00a79e" d="M3 3h18v18H3z"/></svg>',
  // A redirect entry that itself carries a suffix (as the generator emits for
  // directional folders: arrowDownRight → arrowUpRight90r).
  boxDown: 'box90r',
}

describe('svgIcons — element creation', () => {
  test('returns a real <svg> with the source class + tosi-icon, carrying the child geometry', () => {
    const icons = mod.createSvgIcons(FIXTURE)
    const el = icons.box()
    expect(el.tagName.toLowerCase()).toBe('svg')
    expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(el.classList.contains('tosi-icon')).toBe(true)
    expect(el.classList.contains('stroked')).toBe(true)
    expect(el.querySelector('rect')).not.toBeNull()
  })

  test('element parts have full creator power (props pass through)', () => {
    const icons = mod.createSvgIcons(FIXTURE)
    const el = icons.box({ style: { opacity: '0.3' } })
    // builder never sets opacity for a stroked icon, so the caller's value survives
    expect(el.style.opacity).toBe('0.3')
  })

  test('a `color` icon keeps its baked-in fills (root fill not forced to currentColor)', () => {
    const icons = mod.createSvgIcons(FIXTURE)
    const el = icons.cube()
    expect(el.style.fill).toBe('') // untouched for color icons
    expect(el.querySelector('path')?.getAttribute('style')).toContain('#00a79e')
  })
})

describe('svgIcons — composition + redirects', () => {
  test('a suffix rotates via CSS transform', () => {
    const el = mod.createSvgIcons(FIXTURE).box90r()
    expect(el.style.transform).toBe('rotate(90deg)')
    expect(el.style.transformOrigin).toBe('50% 50%')
  })

  test('a redirect that carries a suffix resolves through to the base + transform', () => {
    const el = mod.createSvgIcons(FIXTURE).boxDown()
    expect(el.querySelector('rect')).not.toBeNull()
    expect(el.style.transform).toBe('rotate(90deg)')
  })

  test('stacking a caller suffix on a suffixed redirect accumulates the rotation', () => {
    const el = mod.createSvgIcons(FIXTURE).boxDown90r()
    expect(el.style.transform).toBe('rotate(90deg) rotate(90deg)')
  })
})

describe('svgIcons — misses', () => {
  test('an unknown name warns and returns a fallback square', () => {
    const icons = mod.createSvgIcons(FIXTURE)
    const orig = console.warn
    const warnings: string[] = []
    console.warn = (m?: unknown) => warnings.push(String(m))
    try {
      const el = icons.nope()
      expect(el.tagName.toLowerCase()).toBe('svg')
      expect(el.querySelector('rect')).not.toBeNull()
    } finally {
      console.warn = orig
    }
    expect(warnings.some((w) => w.includes('nope'))).toBe(true)
  })

  test('`in` reflects resolvability; iconNames lists only real artwork', () => {
    const icons = mod.createSvgIcons(FIXTURE)
    expect('box90r' in icons).toBe(true)
    expect('nope' in icons).toBe(false)
    expect(mod.iconNames(FIXTURE).sort()).toEqual(['box', 'cube'])
  })
})

describe('svgIcons — the real generated set', () => {
  test('builds the cube (color) and a stroked glyph', () => {
    expect(mod.svgIcons.tosijs3d().querySelector('path')).not.toBeNull()
    expect(mod.svgIcons.chevron().querySelector('polyline')).not.toBeNull()
  })

  test('a generator directional redirect resolves (arrowDownRight → arrowUpRight90r)', () => {
    const el = mod.svgIcons.arrowDownRight()
    expect(el.querySelector('polyline')).not.toBeNull()
    expect(el.style.transform).toBe('rotate(90deg)')
  })

  test('xrColor (the enter-XR/VR mark) resolves as a color icon with baked fills', () => {
    const el = mod.svgIcons.xrColor()
    expect(el.querySelector('path')).not.toBeNull()
    expect(el.classList.contains('color')).toBe(true)
    expect(el.style.fill).toBe('') // color icons keep per-path fills, root untouched
  })

  test('the moreHorizontal alias resolves to moreVertical rotated 90°', () => {
    expect('moreHorizontal' in mod.svgIcons).toBe(true)
    const el = mod.svgIcons.moreHorizontal()
    expect(el.querySelector('circle')).not.toBeNull() // moreVertical is three dots
    expect(el.style.transform).toBe('rotate(90deg)')
  })
})

describe('iconGlyph — texture-safe, explicit-colour glyphs', () => {
  test('a stroked glyph is tinted via explicit stroke attrs and positioned/scaled', () => {
    const g = mod.iconGlyph('check', { color: '#fff', size: 20, x: 5, y: 5 })
    expect(g.tagName.toLowerCase()).toBe('g')
    expect(g.getAttribute('transform')).toContain('translate(5 5) scale(')
    expect(g.getAttribute('stroke')).toBe('#fff')
    expect(g.getAttribute('fill')).toBe('none')
    expect(g.childNodes.length).toBeGreaterThan(0)
  })

  test('a filled glyph gets explicit fill, no stroke', () => {
    const g = mod.iconGlyph('game', { color: '#0f0' })
    expect(g.getAttribute('fill')).toBe('#0f0')
    expect(g.getAttribute('stroke')).toBe('none')
  })

  test('a colour glyph keeps its baked palette (no tint attrs on the group)', () => {
    const g = mod.iconGlyph('xrColor')
    expect(g.getAttribute('fill')).toBeNull()
    expect(g.getAttribute('stroke')).toBeNull()
    expect(g.querySelector('path')).not.toBeNull()
  })

  test('an unknown name warns and yields the fallback square', () => {
    const orig = console.warn
    const warnings: string[] = []
    console.warn = (m?: unknown) => warnings.push(String(m))
    try {
      const g = mod.iconGlyph('nope')
      expect(g.querySelector('rect')).not.toBeNull()
    } finally {
      console.warn = orig
    }
    expect(warnings.some((w) => w.includes('nope'))).toBe(true)
  })
})
