import { describe, test, expect, beforeAll, afterEach } from 'bun:test'

let ef: typeof import('./embed-font.js')

beforeAll(async () => {
  const { Window } = await import('happy-dom')
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
  ef = await import('./embed-font.js')
})

afterEach(() => {
  ef.unregisterSvgFont('Rosario')
  ef.unregisterSvgFont('Other')
})

const fakeFont = (bytes = 64) =>
  new Response(new Uint8Array(bytes).fill(65), { status: 200 })

describe('base64OfBytes', () => {
  test('round-trips', () => {
    const bytes = new Uint8Array([72, 105, 33])
    expect(atob(ef.base64OfBytes(bytes))).toBe('Hi!')
  })

  test('survives a font-sized payload without a RangeError', () => {
    // `String.fromCharCode(...bytes)` spreads every byte as an argument and
    // throws somewhere around 100k — which is exactly font territory.
    const big = new Uint8Array(300_000).fill(97)
    expect(ef.base64OfBytes(big).length).toBeGreaterThan(300_000)
  })
})

describe('fontFaceCss', () => {
  test('inlines the bytes as a data URI with the right mime', async () => {
    globalThis.fetch = (async () => fakeFont()) as unknown as typeof fetch
    const f = await ef.fontFaceCss('Rosario', '/x/rosario.woff2')
    expect(f.css).toContain("font-family:'Rosario'")
    expect(f.css).toContain('data:font/woff2;base64,')
    expect(f.bytes).toBeGreaterThan(0)
  })

  test('caches per URL — the payload must not be refetched per panel', async () => {
    let fetches = 0
    globalThis.fetch = (async () => {
      fetches++
      return fakeFont()
    }) as unknown as typeof fetch
    await ef.fontFaceCss('Other', '/x/other.woff2')
    await ef.fontFaceCss('Other', '/x/other.woff2')
    expect(fetches).toBe(1)
  })

  test('a FAILED fetch is not cached as the answer', async () => {
    // Otherwise one flaky load disables the font for the life of the page.
    let n = 0
    globalThis.fetch = (async () => {
      n++
      return n === 1 ? new Response('', { status: 500 }) : fakeFont()
    }) as unknown as typeof fetch
    await expect(ef.fontFaceCss('Other', '/x/flaky.woff2')).rejects.toThrow()
    const ok = await ef.fontFaceCss('Other', '/x/flaky.woff2')
    expect(ok.css).toContain('base64,')
  })
})

describe('svgFontStyle — only what the markup uses', () => {
  test('nothing registered ⇒ nothing injected', () => {
    expect(ef.svgFontStyle('<svg><text>hi</text></svg>')).toBe('')
  })

  test('injects a registered face the markup mentions', async () => {
    globalThis.fetch = (async () => fakeFont()) as unknown as typeof fetch
    await ef.registerSvgFont('Rosario', '/x/rosario.woff2')
    const out = ef.svgFontStyle(
      '<svg><text font-family="Rosario, serif">hi</text></svg>'
    )
    expect(out).toContain('<style>')
    expect(out).toContain('@font-face')
  })

  test('and NOT one it does not — a panel must not carry every font', async () => {
    // The payload is re-parsed on every rasterisation, so this is the
    // difference between one font per texture and all of them.
    globalThis.fetch = (async () => fakeFont()) as unknown as typeof fetch
    await ef.registerSvgFont('Rosario', '/x/rosario.woff2')
    expect(
      ef.svgFontStyle('<svg><text font-family="Georgia, serif">hi</text></svg>')
    ).toBe('')
  })

  test('unregister removes it', async () => {
    globalThis.fetch = (async () => fakeFont()) as unknown as typeof fetch
    await ef.registerSvgFont('Rosario', '/x/rosario.woff2')
    ef.unregisterSvgFont('Rosario')
    expect(
      ef.svgFontStyle('<svg><text font-family="Rosario">hi</text></svg>')
    ).toBe('')
  })
})
