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

  test('focus follows a pointer tap — click a key, then Space/D-pad act on it', () => {
    const { kb } = mk()
    // Shipped as relocate-only first (no ring for pointer typists), but on a
    // real device the missing ring read as "focus is broken" and orphaned the
    // click-then-Space flow. Focus follows the press, as the table does.
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y)
    kb.handle!('up', q.x, q.y)
    expect(kb.focusedKey!.key.value).toBe('q')
    expect(
      (kb.el.querySelector('[data-kb-focus]') as SVGRectElement).getAttribute(
        'visibility'
      )
    ).toBe('visible')
    const p = centre('alpha', false, 's')
    kb.handle!('down', p.x, p.y)
    kb.handle!('up', p.x, p.y)
    expect(kb.focusedKey!.key.value).toBe('s')
  })
})

describe('keyboard — a ray’s micro-moves must not pick an accent', () => {
  test('jitter ON the held key, release in place → sticky strip, nothing typed', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20) // strip opens
    // a VR ray or fingertip always drifts a few px — still on the key itself
    kb.handle!('move', o.x + 2, o.y + 1)
    kb.handle!('up', o.x + 2, o.y + 1)
    // the old x-only pick read this as "slid onto an accent" and typed ê-style
    // surprises; in-the-strip is a y test too
    expect(keys).toEqual([])
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBeGreaterThan(0) // sticky, tappable
  })
})

describe('keyboard — hold-capable keys carry a discoverability hint', () => {
  test('every accent-capable key gets a faint ▾ (a c e i n o s u y z)', () => {
    const { kb } = mk()
    const hints = Array.from(kb.el.querySelectorAll('[data-kb-hint="▾"]'))
    expect(hints.length).toBe(10)
  })

  test('the spacebar hints ↔ only when the caret drag is actually wired', () => {
    const { kb } = mk() // no onCaretMove
    expect(kb.el.querySelectorAll('[data-kb-hint="↔"]').length).toBe(0)
    const kb2 = K.keyboard({ onKey: () => {}, onCaretMove: () => {} })
    kb2.layout(W)
    expect(kb2.el.querySelectorAll('[data-kb-hint="↔"]').length).toBe(1)
  })
})

describe('inputField — the caret is the focus indicator', () => {
  const caretOf = (f: any) =>
    (f.el as SVGGElement).querySelectorAll('rect')[1] as SVGRectElement

  test('unfocused: dim but VISIBLE — hidden read as unrecoverable on device', () => {
    const f = K.inputField({ value: 'hi' })
    f.layout(200)
    expect(caretOf(f).getAttribute('opacity')).toBe('0.35')
  })

  test('gaining host focus lights the caret; LOSING it does not dim (still the receiver)', () => {
    // "Who has the D-pad" and "where text goes" are different facts: tapping
    // keyboard keys moves box focus to the keyboard while text keeps landing
    // here, so the receiver's caret must stay lit.
    const f = K.inputField({ value: 'hi' })
    f.layout(200)
    f.setState({ hovered: false, pressed: false, focused: true })
    expect(caretOf(f).getAttribute('opacity')).toBe('1')
    f.setState({ hovered: false, pressed: false, focused: false })
    expect(caretOf(f).getAttribute('opacity')).toBe('1')
  })

  test('only setActive(false) dims — the host switching receivers', () => {
    const f = K.inputField({ value: 'hi' })
    f.layout(200)
    f.setActive(true)
    expect(caretOf(f).getAttribute('opacity')).toBe('1')
    f.setActive(false)
    expect(caretOf(f).getAttribute('opacity')).toBe('0.35')
  })

  test('onFocus fires on becoming the receiver — the host hook for exclusivity', () => {
    let focusA = 0
    const a = K.inputField({ value: 'a', onFocus: () => focusA++ })
    const b = K.inputField({ value: 'b' })
    a.layout(200)
    b.layout(200)
    a.handle!('down', 10, 20) // tap → receiver
    expect(focusA).toBe(1)
    a.insert('x') // already the receiver — no re-fire
    expect(focusA).toBe(1)
    // the host's exclusivity: b activates, host dims a
    b.setActive(true)
    a.setActive(false)
    expect(caretOf(a).getAttribute('opacity')).toBe('0.35')
    expect(caretOf(b).getAttribute('opacity')).toBe('1')
    a.setActive(true) // back — refires
    expect(focusA).toBe(2)
  })

  test('a tap brightens it too (standalone use, no host box)', () => {
    const f = K.inputField({ value: 'hi' })
    f.layout(200)
    f.handle!('down', 10, 20)
    expect(caretOf(f).getAttribute('opacity')).toBe('1')
  })
})

describe('keyboard — pressed keys visibly press', () => {
  // On the flat overlay a click has ambient confirmation; on a textured plane
  // in 3D it may have none — a keyboard whose keys don't press reads as DEAD
  // even while it types perfectly (reported from device).
  const bgOf = (kb: any, label: string) => {
    const cell = Array.from(
      kb.el.querySelectorAll('[data-key]') as NodeListOf<SVGGElement>
    ).find((c) => c.getAttribute('data-key') === label)!
    return (cell.firstChild as SVGRectElement).getAttribute('fill')
  }

  test('down tints the key, up restores it', () => {
    const { kb } = mk()
    const idle = bgOf(kb, 'q')
    const p = centre('alpha', false, 'q')
    kb.handle!('down', p.x, p.y)
    const pressed = bgOf(kb, 'q')
    expect(pressed).not.toBe(idle)
    kb.handle!('up', p.x, p.y)
    expect(bgOf(kb, 'q')).toBe(idle)
  })

  test('a cancelled gesture (leave) restores the tint too', () => {
    const { kb } = mk()
    const idle = bgOf(kb, 'q')
    const p = centre('alpha', false, 'q')
    kb.handle!('down', p.x, p.y)
    kb.handle!('leave', 0, 0)
    expect(bgOf(kb, 'q')).toBe(idle)
  })

  test('a mode-switching key restores cleanly despite the relayout it causes', () => {
    const { kb } = mk()
    const p = centre('alpha', false, '?123')
    kb.handle!('down', p.x, p.y)
    kb.handle!('up', p.x, p.y)
    expect(kb.mode).toBe('symbols')
    // every painted key wears its resting fill — nothing kept the pressed tint
    const cells = Array.from(
      kb.el.querySelectorAll('[data-key]') as NodeListOf<SVGGElement>
    )
    const downTint = cells.some(
      (c) => (c.firstChild as SVGRectElement).getAttribute('fill') === '#3a4150'
    )
    expect(downTint).toBe(false)
  })
})

describe('keyboard — a lost pointerup cannot wedge the board (self-heal on down)', () => {
  test('an orphaned press: the NEXT down flushes it and works normally', () => {
    const { kb, keys } = mk()
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y) // up never arrives (lost by the scene pick path)
    const w = centre('alpha', false, 'w')
    kb.handle!('down', w.x, w.y)
    kb.handle!('up', w.x, w.y)
    expect(keys).toEqual(['w']) // not eaten, not doubled
    // and no key is left wearing the pressed tint
    const stuck = Array.from(
      kb.el.querySelectorAll('[data-key]') as NodeListOf<SVGGElement>
    ).some(
      (c) => (c.firstChild as SVGRectElement).getAttribute('fill') === '#3a4150'
    )
    expect(stuck).toBe(false)
  })

  test('an orphaned SPACE press that became a caret drag does NOT eat the next click', async () => {
    // The mystifying "first click dead, second works": the orphaned drag made
    // the next up read as "end of caret drag: type nothing".
    const moves: number[] = []
    const keys: string[] = []
    const kb = K.keyboard({
      holdMs: 5,
      onKey: (c) => keys.push(c),
      onAction: () => {},
      onCaretMove: (d) => moves.push(d),
    })
    kb.layout(W)
    const sp = centre('alpha', false, 'space')
    kb.handle!('down', sp.x, sp.y)
    await wait(20) // hold fires → caret-drag mode; the up is then LOST
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y)
    kb.handle!('up', q.x, q.y)
    expect(keys).toEqual(['q']) // the click types; it is not spent ending the drag
  })

  test('an orphaned accent hold: next down clears the abandoned strip', async () => {
    const { kb, keys } = mk(5)
    const o = centre('alpha', false, 'o')
    kb.handle!('down', o.x, o.y)
    await wait(20) // strip opens mid-press; the up is LOST (never sticky)
    const q = centre('alpha', false, 'q')
    kb.handle!('down', q.x, q.y)
    kb.handle!('up', q.x, q.y)
    expect(keys).toEqual(['q'])
    const strip = kb.el.querySelector('[data-kb="popup"]') as SVGGElement
    expect(strip.childNodes.length).toBe(0)
  })
})

describe('keyboard — a slow space tap is still a space', () => {
  test('hold past the timer, move NOTHING, release → types space (headset triggers are slow)', async () => {
    const moves: number[] = []
    const actions: string[] = []
    const kb = K.keyboard({
      holdMs: 5,
      caretStepPx: 10,
      onKey: () => {},
      onAction: (a) => actions.push(a),
      onCaretMove: (d) => moves.push(d),
    })
    kb.layout(W)
    const sp = centre('alpha', false, 'space')
    kb.handle!('down', sp.x, sp.y)
    await wait(20) // trackpad mode engaged
    kb.handle!('up', sp.x, sp.y) // …but the caret never moved: it was a tap
    expect(moves).toEqual([])
    expect(actions).toEqual(['space'])
  })

  test('…but a drag that DID move the caret still types nothing', async () => {
    const moves: number[] = []
    const actions: string[] = []
    const kb = K.keyboard({
      holdMs: 5,
      caretStepPx: 10,
      onKey: () => {},
      onAction: (a) => actions.push(a),
      onCaretMove: (d) => moves.push(d),
    })
    kb.layout(W)
    const sp = centre('alpha', false, 'space')
    kb.handle!('down', sp.x, sp.y)
    await wait(20)
    kb.handle!('move', sp.x + 30, sp.y)
    kb.handle!('up', sp.x + 30, sp.y)
    expect(moves.length).toBeGreaterThan(0)
    expect(actions).toEqual([])
  })
})

describe('inputField type — one property, three jobs (#37)', () => {
  test('the field tells you which keyboard layout to raise', () => {
    expect(K.inputField({ type: 'number' }).keyboardMode).toBe('numpad')
    expect(K.inputField({ type: 'email' }).keyboardMode).toBe('email')
    expect(K.inputField({}).keyboardMode).toBe('alpha')
  })

  test('typing "-0.5" left to right is never blocked mid-way', () => {
    // The classic typed-field bug: validating per keystroke makes a negative or
    // fractional number impossible to enter, because it is invalid until done.
    const f = K.inputField({ type: 'number' })
    for (const ch of '-0.5') {
      f.insert(ch)
      expect(f.isValid()).toBe(true)
    }
    expect(f.value).toBe('-0.5')
  })

  test('commit REFUSES gibberish and restores the last good value', () => {
    const f = K.inputField({ type: 'number', value: '42' })
    f.setValue('12a')
    expect(f.commit()).toBe('42')
    expect(f.value).toBe('42')
    // and never NaN, which is what a naive parse would have written
    expect(f.value).not.toBe('NaN')
  })

  test('commit normalises rather than merely accepting', () => {
    const f = K.inputField({ type: 'number' })
    f.setValue('007')
    expect(f.commit()).toBe('7')
    f.setValue('1.')
    expect(f.commit()).toBe('1')
  })

  test('the in-progress/answer asymmetry, stated directly', () => {
    const f = K.inputField({ type: 'number', value: '3' })
    f.setValue('-')
    expect(f.isValid()).toBe(true) // fine to have typed
    expect(f.commit()).toBe('3') // not fine to have meant
  })

  test('integer refuses a fraction at commit', () => {
    const f = K.inputField({ type: 'integer', value: '5' })
    f.setValue('2.5')
    expect(f.commit()).toBe('5')
  })

  test('clearing a field is a legitimate answer, not gibberish', () => {
    const f = K.inputField({ type: 'number', value: '9' })
    f.setValue('')
    expect(f.commit()).toBe('')
  })

  test('Enter settles the value BEFORE the handler sees it', () => {
    // Otherwise every onEnter handler has to re-do the parse, and each one has
    // to remember to.
    let seen: string | null = null
    const f = K.inputField({
      type: 'number',
      value: '1',
      onEnter: (v) => {
        seen = v
      },
    })
    f.setValue('008')
    f.action('enter')
    expect(seen).toBe('8')
  })

  test('a text field is unaffected by any of it', () => {
    const f = K.inputField({ value: '  hi  ' })
    expect(f.type).toBe('text')
    expect(f.commit()).toBe('  hi  ')
  })
})

describe('fieldGroup — the bookkeeping every host was writing (#37 items 1, 7)', () => {
  const setup = () => {
    const modes: string[] = []
    const name = K.inputField({ type: 'text' })
    const age = K.inputField({ type: 'number', value: '30' })
    const group = K.fieldGroup({
      fields: [name, age],
      keyboard: { setMode: (m) => modes.push(m) },
    })
    return { name, age, group, modes }
  }

  test('EXCLUSIVITY: focusing one field un-focuses the rest', () => {
    const { name, age, group } = setup()
    group.focus(name)
    expect(group.active).toBe(name)
    group.focus(age)
    expect(group.active).toBe(age)
    // two lit fields both claiming the keyboard is worse than none
    group.handleKey('7')
    expect(name.value).toBe('')
  })

  test('the incoming field chooses the LAYOUT — the point of having a type', () => {
    const { name, age, group, modes } = setup()
    group.focus(name)
    group.focus(age)
    expect(modes).toEqual(['alpha', 'numpad'])
  })

  test('COMMIT ON LEAVE: a half-typed value never survives the move', () => {
    const { name, age, group } = setup()
    group.focus(age)
    age.setValue('1.')
    group.focus(name)
    expect(age.value).toBe('1')
  })

  test('and gibberish is restored rather than carried away', () => {
    const { name, age, group } = setup()
    group.focus(age)
    age.setValue('nope')
    group.focus(name)
    expect(age.value).toBe('30')
  })

  test('keys reach the active field, and report whether they were consumed', () => {
    const { name, group } = setup()
    group.focus(name)
    expect(group.handleKey('h')).toBe(true)
    expect(group.handleKey('i')).toBe(true)
    expect(name.value).toBe('hi')
    expect(group.handleKey('Backspace')).toBe(true)
    expect(name.value).toBe('h')
  })

  test('with nothing focused, keys are NOT consumed', () => {
    // So a page with fields on it still scrolls and traverses normally.
    const { group } = setup()
    expect(group.handleKey('a')).toBe(false)
  })

  test('shortcuts and named keys are never swallowed', () => {
    const { name, group } = setup()
    group.focus(name)
    expect(group.handleKey('r', { meta: true })).toBe(false)
    expect(group.handleKey('Tab')).toBe(false)
    expect(name.value).toBe('')
  })

  test('blur commits too — an abandoned edit still settles', () => {
    const { age, group } = setup()
    group.focus(age)
    age.setValue('007')
    group.blur()
    expect(age.value).toBe('7')
    expect(group.active).toBe(null)
  })

  test('a TAPPED field becomes active, agreeing with programmatic focus', () => {
    // If a tap did not register here, the keys would go to whichever field was
    // focused last by code — silently, and only sometimes.
    const { name, age, group } = setup()
    group.focus(name)
    age.setActive(true) // simulates the field reporting its own focus
    group.handleKey('5')
    expect(name.value).toBe('')
  })
})

describe('numeric scrub — drag OR type, one control (#50)', () => {
  const drag = (f: any, from: number, to: number) => {
    f.handle('down', from, 20)
    f.handle('move', to, 20)
    f.handle('up', to, 20)
  }

  test('dragging changes the value', () => {
    const f = K.inputField({ type: 'number', value: '10', scrub: 0.1 })
    drag(f, 100, 200)
    expect(Number(f.value)).toBeCloseTo(20, 6)
  })

  test('a TAP still places the caret rather than scrubbing', () => {
    // The whole design: the difference is travel, not a mode or a hit zone —
    // so the two never need to be aimed at differently.
    const f = K.inputField({ type: 'number', value: '10', scrub: 0.1 })
    f.handle('down', 100, 20)
    f.handle('move', 101, 20) // within the slop
    f.handle('up', 101, 20)
    expect(f.value).toBe('10')
  })

  test('step quantises the scrub', () => {
    const f = K.inputField({
      type: 'number',
      value: '0',
      scrub: 0.01,
      step: 0.25,
    })
    drag(f, 0, 137)
    const v = Number(f.value)
    expect(Math.abs(v / 0.25 - Math.round(v / 0.25))).toBeLessThan(1e-9)
  })

  test('and the text stays READABLE — no 2.7000000000000006', () => {
    const f = K.inputField({
      type: 'number',
      value: '0',
      scrub: 0.01,
      step: 0.1,
    })
    drag(f, 0, 273)
    expect(f.value).not.toContain('000000')
    expect(f.value.split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1)
  })

  test('min/max clamp a scrub', () => {
    const f = K.inputField({
      type: 'number',
      value: '5',
      scrub: 1,
      min: 0,
      max: 10,
    })
    drag(f, 0, 500)
    expect(Number(f.value)).toBe(10)
    drag(f, 500, 0)
    expect(Number(f.value)).toBe(0)
  })

  test('an integer field scrubs in whole numbers', () => {
    const f = K.inputField({ type: 'integer', value: '0', scrub: 0.1 })
    drag(f, 0, 55)
    expect(Number.isInteger(Number(f.value))).toBe(true)
  })

  test('scrub is OFF unless asked for — a text field must not change on drag', () => {
    const f = K.inputField({ type: 'number', value: '10' })
    drag(f, 100, 300)
    expect(f.value).toBe('10')
  })
})
