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
  // Lifting a finger used to dismiss the strip and type the plain letter, which made
  // the accents unreachable by touch — you press, the strip appears UNDER your
  // fingertip where you can't see it, and looking costs you the gesture. Reported
  // from a real device. It's now sticky: lift to look, tap to choose.
  test('hold then LIFT leaves the strip up and types nothing', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20) // popup opens
    kb.handle!('up', o.x, o.y) // lifted without sliding onto an accent
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBeGreaterThan(0) // still open
    expect(keys).toEqual([]) // and did NOT type the base character
  })

  test('…and the next tap on the strip picks that accent', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20)
    kb.handle!('up', o.x, o.y) // lift → sticky
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    const cells = Array.from(strip.querySelectorAll('rect')).slice(1)
    const cell = cells[3] as SVGRectElement // ö
    const cx =
      Number(cell.getAttribute('x')) + Number(cell.getAttribute('width')) / 2
    const cy =
      Number(cell.getAttribute('y')) + Number(cell.getAttribute('height')) / 2
    kb.handle!('down', cx, cy)
    expect(keys).toEqual(['ö'])
    expect(strip.childNodes.length).toBe(0) // and closes
  })

  test('a tap OFF a sticky strip dismisses it without typing anything', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20)
    kb.handle!('up', o.x, o.y)
    // tap a different key entirely — the tap is spent dismissing, not typing
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y)
    expect(keys).toEqual([])
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBe(0)
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

describe('keyboard — spacebar as a caret trackpad', () => {
  const mkCaret = (holdMs = 5) => {
    const moves: number[] = []
    const keys: string[] = []
    const actions: string[] = []
    const kb = K.keyboard({
      holdMs,
      caretStepPx: 10,
      onKey: (c) => keys.push(c),
      onAction: (a) => actions.push(a),
      onCaretMove: (d) => moves.push(d),
    })
    kb.layout(W)
    return { kb, moves, keys, actions }
  }
  const space = () => centre('alpha', false, 'space')

  test('holding space then sliding moves the caret, one step per threshold', async () => {
    const { kb, moves } = mkCaret()
    const s = space()
    kb.handle!('down', s.x, s.y)
    await wait(20) // hold fires → trackpad mode
    kb.handle!('move', s.x + 30, s.y) // 3 × 10px
    expect(moves).toEqual([1, 1, 1])
    kb.handle!('move', s.x + 10, s.y) // back 20px
    expect(moves).toEqual([1, 1, 1, -1, -1])
  })

  test('the drag KEEPS WORKING far outside the key (as iOS does)', async () => {
    const { kb, moves } = mkCaret()
    const s = space()
    kb.handle!('down', s.x, s.y)
    await wait(20)
    // way off the spacebar, off the keyboard entirely — a spacebar-width gesture
    // would otherwise buy only a spacebar of travel
    kb.handle!('move', s.x + 400, s.y - 300)
    expect(moves.length).toBe(40)
    expect(moves.every((d) => d === 1)).toBe(true)
  })

  test('a caret drag does NOT also type a space', async () => {
    const { kb, actions, moves } = mkCaret()
    const s = space()
    kb.handle!('down', s.x, s.y)
    await wait(20)
    kb.handle!('move', s.x + 30, s.y)
    kb.handle!('up', s.x + 30, s.y)
    expect(moves.length).toBeGreaterThan(0)
    expect(actions).toEqual([])
  })

  test('a quick tap on space still types a space', async () => {
    const { kb, actions } = mkCaret(500) // long hold; we release well before
    const s = space()
    kb.handle!('down', s.x, s.y)
    kb.handle!('up', s.x, s.y)
    expect(actions).toEqual(['space'])
  })

  test('leave ends the drag rather than stranding it', async () => {
    const { kb, moves } = mkCaret()
    const s = space()
    kb.handle!('down', s.x, s.y)
    await wait(20)
    kb.handle!('move', s.x + 20, s.y)
    const before = moves.length
    kb.handle!('leave', 0, 0)
    kb.handle!('move', s.x + 200, s.y) // ignored — gesture is over
    expect(moves.length).toBe(before)
  })

  test('without an onCaretMove handler, space is just a key', async () => {
    const moves: number[] = []
    const actions: string[] = []
    const kb = K.keyboard({
      holdMs: 5,
      onAction: (a) => actions.push(a),
      onKey: () => {},
    })
    kb.layout(W)
    const s = space()
    kb.handle!('down', s.x, s.y)
    await wait(20)
    kb.handle!('up', s.x, s.y)
    expect(moves).toEqual([])
    expect(actions).toEqual(['space'])
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

describe('keyboard — the accent strip stays inside the keyboard rect', () => {
  // The strip renders fine outside the keyboard's rect, but the HOST routes
  // pointers by child rect — a strip poking above the keyboard lands on the
  // neighbouring widget (the text field), which then eats the tap.
  test('a TOP-row key (all the vowels!) opens its strip BELOW the key', async () => {
    const { kb } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20)
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    const backdrop = strip.querySelector('rect')!
    expect(Number(backdrop.getAttribute('y'))).toBeGreaterThanOrEqual(
      o.rect.y + o.rect.height
    )
    kb.handle!('up', o.x, o.y)
  })

  test('a second-row key keeps its strip above, clamped to y ≥ 0', async () => {
    const { kb } = mk(5)
    const a = centre('alpha', false, 'a')
    kb.handle!('down', a.x, a.y)
    await wait(20)
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    const backdrop = strip.querySelector('rect')!
    const by = Number(backdrop.getAttribute('y'))
    expect(by).toBeGreaterThanOrEqual(0)
    expect(by).toBeLessThan(a.rect.y) // above the key, not over it
    kb.handle!('up', a.x, a.y)
  })

  test('tapping the ORIGIN key of a sticky strip types the plain letter', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20)
    kb.handle!('up', o.x, o.y) // lift → sticky strip
    kb.handle!('down', o.x, o.y) // tap the key you held: the plain character
    expect(keys).toEqual(['o'])
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBe(0)
  })
})

describe('keyboard — D-pad focus traversal', () => {
  const ring = (kb: any) =>
    kb.el.querySelector('[data-kb-focus]') as SVGRectElement

  test('entering downward seeds the TOP row (where you arrived from)', () => {
    const { kb } = mk()
    expect(kb.focusedKey).toBeNull()
    expect(kb.focusMove(0, 1)).toBe(true)
    expect(kb.focusedKey!.y).toBe(0)
    expect(ring(kb).getAttribute('visibility')).toBe('visible')
  })

  test('entering upward seeds the BOTTOM row', () => {
    const { kb } = mk()
    const rects = L.keyRects(L.keyLayout('alpha', false), {
      width: W,
      keyHeight: KH,
      gap: GAP,
    })
    const maxY = Math.max(...rects.map((r) => r.y))
    kb.focusMove(0, -1)
    expect(kb.focusedKey!.y).toBe(maxY)
  })

  test('arrows walk key to key', () => {
    const { kb } = mk()
    kb.focusMove(0, 1)
    const first = kb.focusedKey!
    expect(kb.focusMove(1, 0)).toBe(true)
    expect(kb.focusedKey!.x).toBeGreaterThan(first.x)
    expect(kb.focusMove(0, 1)).toBe(true)
    expect(kb.focusedKey!.y).toBeGreaterThan(first.y)
  })

  test('moving off the top ESCAPES (returns false) rather than trapping the D-pad', () => {
    const { kb } = mk()
    kb.focusMove(0, 1) // top row
    expect(kb.focusMove(0, -1)).toBe(false)
    // not cleared here — the HOST clears when focus actually lands elsewhere
    expect(kb.focusedKey).not.toBeNull()
  })

  test('focusActivate presses the focused key; focusClear drops the ring', () => {
    const { kb, keys } = mk()
    kb.focusMove(0, 1)
    const v = kb.focusedKey!.key.value!
    kb.focusActivate()
    expect(keys).toEqual([v])
    kb.focusClear()
    expect(kb.focusedKey).toBeNull()
    expect(ring(kb).getAttribute('visibility')).toBe('hidden')
  })

  test('focus survives a mode switch (relayout repaints the ring, not just the keys)', () => {
    const { kb } = mk()
    kb.focusMove(0, 1)
    kb.setMode('symbols')
    expect(kb.focusedKey).not.toBeNull()
    expect(ring(kb).getAttribute('visibility')).toBe('visible')
  })

  test('a pointer tap RELOCATES active focus, but never summons the ring', () => {
    const { kb } = mk()
    // no focus: typing by pointer keeps the ring away (unlike the table — typing
    // is a stream of taps and a ring chasing every keystroke is noise)
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y)
    kb.handle!('up', q.x, q.y)
    expect(kb.focusedKey).toBeNull()
    // with focus active, a tap moves it — pointer → D-pad resumes from the tap
    kb.focusMove(0, 1)
    const p = centre('alpha', false, 's')
    kb.handle!('down', p.x, p.y)
    kb.handle!('up', p.x, p.y)
    expect(kb.focusedKey!.key.value).toBe('s')
  })
})
