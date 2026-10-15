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
// Button i's centre in the toolbar's own units (pad 4, size 40, gap 6).
const at = (i: number) => [4 + i * 46 + 20, 24] as const

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
