import { describe, test, expect, beforeAll } from 'bun:test'

let K: typeof import('./keyboard')
let L: typeof import('./key-layout')

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
  K = await import('./keyboard')
  L = await import('./key-layout')
})

const W = 380
const KH = 38
const GAP = 5

/** Centre of a key, in keyboard-local coords. */
const centre = (mode: any, shift: boolean, value: string) => {
  const rects = L.keyRects(L.keyLayout(mode, shift), {
    width: W,
    keyHeight: KH,
    gap: GAP,
  })
  const r = rects.find((k) => k.key.value === value || k.key.label === value)!
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: r }
}

/** A keyboard wired to a recorder, already laid out. */
const mk = (holdMs = 5) => {
  const keys: string[] = []
  const actions: string[] = []
  const kb = K.keyboard({
    holdMs,
    onKey: (c) => keys.push(c),
    onAction: (a) => actions.push(a),
  })
  kb.layout(W)
  return { kb, keys, actions }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('keyboard — tapping', () => {
  test('a tap inserts the key', () => {
    const { kb, keys } = mk()
    const p = centre('alpha', false, 'q')
    kb.handle!('down', p.x, p.y)
    kb.handle!('up', p.x, p.y)
    expect(keys).toEqual(['q'])
  })

  test('releasing off the pressed key inserts nothing', () => {
    const { kb, keys } = mk()
    const p = centre('alpha', false, 'q')
    kb.handle!('down', p.x, p.y)
    kb.handle!('up', p.x + 500, p.y + 500)
    expect(keys).toEqual([])
  })

  test('an action key reports its action, not text', () => {
    const { kb, keys, actions } = mk()
    const p = centre('alpha', false, '⌫')
    kb.handle!('down', p.x, p.y)
    kb.handle!('up', p.x, p.y)
    expect(keys).toEqual([])
    expect(actions).toEqual(['backspace'])
  })
})

describe('keyboard — shift and mode', () => {
  test('shift upper-cases, then releases after ONE key (phone behaviour)', () => {
    const { kb, keys } = mk()
    const sh = centre('alpha', false, '⇧')
    kb.handle!('down', sh.x, sh.y)
    kb.handle!('up', sh.x, sh.y)
    // now shifted — tap Q
    const q = centre('alpha', true, 'Q')
    kb.handle!('down', q.x, q.y)
    kb.handle!('up', q.x, q.y)
    // shift auto-released, so the next tap is lower case
    const w = centre('alpha', false, 'w')
    kb.handle!('down', w.x, w.y)
    kb.handle!('up', w.x, w.y)
    expect(keys).toEqual(['Q', 'w'])
  })

  test('?123 switches to symbols and ABC comes back', () => {
    const { kb } = mk()
    const s = centre('alpha', false, '?123')
    kb.handle!('down', s.x, s.y)
    kb.handle!('up', s.x, s.y)
    expect(kb.mode).toBe('symbols')
    const a = centre('symbols', false, 'ABC')
    kb.handle!('down', a.x, a.y)
    kb.handle!('up', a.x, a.y)
    expect(kb.mode).toBe('alpha')
  })
})

describe('keyboard — press-hold-drag accents', () => {
  test('hold then release on the key gives the PLAIN character', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20) // popup opens
    kb.handle!('up', o.x, o.y) // released off the accent strip (it sits above)
    expect(keys).toEqual(['o'])
  })

  test('hold, slide onto an accent, release → inserts the ACCENT', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20)
    // The popup is centred over the key, 32px cells: ò ó ô ö õ ø œ. Aim at index 3 (ö).
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    const cells = Array.from(strip.querySelectorAll('rect')).slice(1) // [0] is the backdrop
    const cell = cells[3] as SVGRectElement
    const cx =
      Number(cell.getAttribute('x')) + Number(cell.getAttribute('width')) / 2
    const cy = Number(cell.getAttribute('y')) + 10
    kb.handle!('move', cx, cy)
    kb.handle!('up', cx, cy)
    expect(keys).toEqual(['ö'])
  })

  test('releasing BEFORE the hold fires is an ordinary tap', async () => {
    const { kb, keys } = mk(500) // long hold — we release well before it
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    kb.handle!('up', o.x, o.y)
    expect(keys).toEqual(['o'])
    // and no popup was left behind
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBe(0)
  })

  test('sliding off before the hold cancels it — no popup you did not ask for', async () => {
    const { kb, keys } = mk(30)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    kb.handle!('move', o.x + 200, o.y) // slid away
    await wait(60) // past the hold deadline
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBe(0)
    kb.handle!('up', o.x + 200, o.y)
    expect(keys).toEqual([])
  })

  test('a key with no accents never opens a popup', async () => {
    const { kb, keys } = mk(5)
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y)
    await wait(20)
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBe(0)
    kb.handle!('up', q.x, q.y)
    expect(keys).toEqual(['q'])
  })
})

describe('inputField', () => {
  test('insert appends at the caret and reports the change', () => {
    const seen: string[] = []
    const f = K.inputField({ value: 'hi', onChange: (v) => seen.push(v) })
    f.layout(200)
    f.insert('!')
    expect(f.value).toBe('hi!')
    expect(seen).toEqual(['hi!'])
  })

  test('backspace deletes a whole accented character', () => {
    const f = K.inputField({ value: 'schö' })
    f.layout(200)
    f.action('backspace')
    expect(f.value).toBe('sch')
  })

  test('space inserts a space; enter does not alter the text', () => {
    let entered = ''
    const f = K.inputField({ value: 'go', onEnter: (v) => (entered = v) })
    f.layout(200)
    f.action('space')
    expect(f.value).toBe('go ')
    f.action('enter')
    expect(f.value).toBe('go ')
    expect(entered).toBe('go ')
  })

  test('keyboard and field compose — typing drives the value', () => {
    const f = K.inputField({ value: '' })
    f.layout(300)
    const kb = K.keyboard({
      onKey: (c) => f.insert(c),
      onAction: (a) => f.action(a),
    })
    kb.layout(W)
    for (const ch of ['h', 'i']) {
      const p = centre('alpha', false, ch)
      kb.handle!('down', p.x, p.y)
      kb.handle!('up', p.x, p.y)
    }
    expect(f.value).toBe('hi')
    const bs = centre('alpha', false, '⌫')
    kb.handle!('down', bs.x, bs.y)
    kb.handle!('up', bs.x, bs.y)
    expect(f.value).toBe('h')
  })
})
