import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from 'bun:test'
import { resetHandlerWarnings } from './handler-of.js'

/*
ONE SENTENCE HAS TO BE TRUE: `handleX` always works.

Before this, whether `handleChange` did anything depended on which widget you
were holding — `curve3d` took it, `inputField` took `onChange`, and neither
complained about the other. Three callbacks shipped dead for exactly that
reason. These tests exercise the factories that used to accept ONLY `onX`
through their NEW names, so a regression is a red test rather than a callback
that silently never fires.

The deprecated spellings stay covered by the existing suites, which still pass
them — that is the backward-compatibility half, and it is deliberate that it is
tested by the old tests rather than duplicated here.
*/

let T: typeof import('./table.js')
let K: typeof import('./keyboard.js')
let B: typeof import('./box.js')

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
  T = await import('./table.js')
  K = await import('./keyboard.js')
  B = await import('./box.js')
})

let warnings: string[] = []
const realWarn = console.warn
beforeEach(() => {
  resetHandlerWarnings()
  warnings = []
  console.warn = (...a: unknown[]) => {
    warnings.push(a.join(' '))
  }
})
afterEach(() => {
  console.warn = realWarn
})

describe('handleX works on the factories that used to take only onX', () => {
  test('table — handleSelect', () => {
    const picked: string[][] = []
    const t = T.table({
      rows: [
        { id: 'r0', name: 'a' },
        { id: 'r1', name: 'b' },
      ],
      columns: [{ key: 'name', label: 'Name', flex: 1 }],
      height: 200,
      rowHeight: 28,
      headerHeight: 28,
      selection: 'single',
      handleSelect: (ids) => picked.push(ids),
    })
    t.layout(300)
    t.handle!('up', 40, 28 + 2 + 14)
    expect(picked.at(-1)).toEqual(['r0'])
    expect(warnings).toHaveLength(0)
  })

  test('inputField — handleChange', () => {
    const seen: string[] = []
    const f = K.inputField({ handleChange: (v) => seen.push(v) })
    f.layout(240)
    f.insert('hi')
    expect(seen.at(-1)).toBe('hi')
    expect(warnings).toHaveLength(0)
  })

  test('keyboard — handleKey', async () => {
    // Pressed through the widget's own pointer path, so this covers the wiring
    // rather than the callback being handed back to us.
    const L = await import('./key-layout.js')
    const W = 380
    const keys: string[] = []
    const kb = K.keyboard({ handleKey: (k) => keys.push(k) })
    kb.layout(W)
    const rects = L.keyRects(L.keyLayout('alpha', false), {
      width: W,
      keyHeight: 38,
      gap: 5,
    })
    const q = rects.find((k) => k.key.value === 'q')!
    const x = q.x + q.width / 2
    const y = q.y + q.height / 2
    kb.handle!('down', x, y)
    kb.handle!('up', x, y)
    expect(keys).toEqual(['q'])
    expect(warnings).toHaveLength(0)
  })

  test('box button — handleActivate', () => {
    let fired = 0
    const btn = B.button('Go', { handleActivate: () => (fired += 1) })
    expect(btn.handleActivate).toBeDefined()
    btn.handleActivate!()
    expect(fired).toBe(1)
    expect(warnings).toHaveLength(0)
  })

  test('the deprecated spelling still works — and says so once', () => {
    let fired = 0
    const btn = B.button('Go', { onActivate: () => (fired += 1) })
    // `button` resolves through the shim at construction, so the value landed
    // under the NEW name and the box will find it.
    btn.handleActivate!()
    expect(fired).toBe(1)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('onActivate')
  })
})
