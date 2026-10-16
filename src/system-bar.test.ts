import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

let systemBar: typeof import('./system-bar.js').systemBar
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
  // happy-dom's own, or its dispatchEvent rejects Bun's (the hold event).
  g.Event = win.Event
  g.CustomEvent = win.CustomEvent
  systemBar = (await import('./system-bar.js')).systemBar
})

const button = (opts: { hidden?: boolean; disabled?: boolean } = {}) => {
  const b = document.createElement('button') as HTMLButtonElement
  b.hidden = !!opts.hidden
  b.disabled = !!opts.disabled
  let clicks = 0
  b.addEventListener('click', () => clicks++)
  return { b, clicks: () => clicks }
}
// Button i's centre in the toolbar's own units.
const at = (i: number) => [7 + i * 43 + 20, 27] as const

describe('systemBar mirrors HTML buttons', () => {
  test('only the buttons that show are drawn, and a press clicks the right one', () => {
    const a = button(), hidden = button({ hidden: true }), c = button()
    const bar = systemBar([a.b, hidden.b, c.b])
    expect(bar.count).toBe(2)
    const hp = (bar.svg as any).handlePointer
    hp('down', ...at(1))
    hp('up', ...at(1))
    expect(c.clicks()).toBe(1)
    expect(a.clicks()).toBe(0)
    bar.dispose()
  })
  test('an icon is never nameless: the button title rides along as <title>', async () => {
    const a = button(), b = button()
    a.b.title = 'Inventory'
    const bar = systemBar([a.b, b.b])
    const names = () =>
      [...bar.svg.querySelectorAll('title')].map((t) => t.textContent)
    expect(names()).toEqual(['Inventory'])
    b.b.setAttribute('aria-label', 'Enter VR')
    await new Promise((r) => setTimeout(r, 0))
    expect(names()).toEqual(['Inventory', 'Enter VR'])
    bar.dispose()
  })
  test('a disabled button is drawn but ignores a press', () => {
    const a = button({ disabled: true })
    const bar = systemBar([a.b])
    const hp = (bar.svg as any).handlePointer
    hp('down', ...at(0))
    hp('up', ...at(0))
    expect(a.clicks()).toBe(0)
    bar.dispose()
  })
  test('a press that ends on another button is not a click', () => {
    const a = button(), c = button()
    const bar = systemBar([a.b, c.b])
    const hp = (bar.svg as any).handlePointer
    hp('down', ...at(0))
    hp('up', ...at(1))
    expect(a.clicks() + c.clicks()).toBe(0)
    bar.dispose()
  })

  test('a button styled away (display: none) is not drawn, and is drawn again when shown', async () => {
    const a = button(), b = button()
    document.body.append(a.b, b.b)
    b.b.style.display = 'none'
    const bar = systemBar([a.b, b.b])
    expect(bar.count).toBe(1)
    b.b.style.display = ''
    await new Promise((r) => setTimeout(r, 0))
    expect(bar.count).toBe(2)
    bar.dispose()
    a.b.remove()
    b.b.remove()
  })
})

describe('systemBar press and hold', () => {
  test('held past HOLD_MS, the button gets systemhold and no click', async () => {
    const { HOLD_MS } = await import('./system-bar.js')
    const one = button()
    let holds = 0
    one.b.addEventListener('systemhold', () => holds++)
    const bar = systemBar([one.b])
    const h = (bar.svg as any).handlePointer
    h('down', ...at(0))
    await new Promise((r) => setTimeout(r, HOLD_MS + 50))
    h('up', ...at(0))
    expect(holds).toBe(1)
    expect(one.clicks()).toBe(0)
    bar.dispose()
  })
  test('a quick press is a click, and sliding off cancels the hold', async () => {
    const { HOLD_MS } = await import('./system-bar.js')
    const one = button()
    let holds = 0
    one.b.addEventListener('systemhold', () => holds++)
    const bar = systemBar([one.b])
    const h = (bar.svg as any).handlePointer
    h('down', ...at(0))
    h('up', ...at(0))
    h('down', ...at(0))
    h('move', 400, 400)
    await new Promise((r) => setTimeout(r, HOLD_MS + 50))
    expect(one.clicks()).toBe(1)
    expect(holds).toBe(0)
    bar.dispose()
  })
})
