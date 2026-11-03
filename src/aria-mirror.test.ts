import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import { ariaMirror } from './aria-mirror.js'
import { controlTree } from './widget-semantics.js'

let W: typeof import('./widgets3d.js')

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
  W = await import('./widgets3d.js')
})

/** An event from the element's own window (Bun has its own `Event`). */
const fire = (e: Element, type: string) =>
  e.dispatchEvent(new (e.ownerDocument.defaultView as any).Event(type))

/** A panel's rows, rebuilt on demand as the scene rebuilds its panel. */
function panel() {
  const state = {
    time: 6,
    night: false,
    resets: 0,
    quality: 'auto',
    open: true,
  }
  let rows: any[] = []
  const build = () => {
    rows = [
      W.label3d({
        text: 'Sky',
        collapsible: true,
        open: state.open,
        handleToggle: (o: boolean) => (state.open = o),
      } as any),
      W.slider3d({
        label: 'time of day',
        value: state.time,
        min: 0,
        max: 24,
        handleChange: (v) => (state.time = v),
      }),
      W.toggle3d({
        label: 'night',
        value: state.night,
        handleChange: (v) => (state.night = v),
      }),
      W.select3d({
        label: 'quality',
        value: state.quality,
        options: ['auto', 'low', 'high'].map((o) => ({ label: o, value: o })),
        handleChange: (v: unknown) => (state.quality = String(v)),
      } as any),
      W.button3d({ label: 'reset', handleClick: () => state.resets++ }),
    ]
    for (const w of rows) w.layout?.(300)
  }
  build()
  return { state, build, read: () => controlTree(rows) }
}

describe('aria mirror', () => {
  test('real controls, named, that work through the widgets', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const p = panel()
    const m = ariaMirror(host, p.read, { label: 'City Drive settings' })
    m.update()
    const r = m.root
    expect(r.getAttribute('role')).toBe('region')
    expect(r.getAttribute('aria-label')).toBe('City Drive settings')
    expect(r.querySelector('h3 button')!.textContent).toBe('Sky')

    const range = r.querySelector('input[type=range]') as HTMLInputElement
    expect(range.getAttribute('aria-label')).toBe('time of day')
    expect(range.min).toBe('0')
    expect(range.max).toBe('24')
    range.value = '21'
    fire(range, 'input')
    expect(p.state.time).toBe(21)

    const sw = r.querySelector('input[role=switch]') as HTMLInputElement
    expect(sw.parentElement!.textContent!.trim()).toBe('night')
    sw.checked = true
    fire(sw, 'change')
    expect(p.state.night).toBe(true)

    const sel = r.querySelector('select') as HTMLSelectElement
    expect([...sel.options].map((o) => o.textContent)).toEqual([
      'auto',
      'low',
      'high',
    ])
    sel.value = 'high'
    fire(sel, 'change')
    expect(p.state.quality).toBe('high')

    const reset = [...r.querySelectorAll('button')].find(
      (b) => b.textContent === 'reset'
    )!
    reset.click()
    expect(p.state.resets).toBe(1)
    m.dispose()
    expect(host.children.length).toBe(0)
  })

  test('a rebuilt panel patches values in place and keeps focus', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const p = panel()
    const m = ariaMirror(host, p.read)
    m.update()
    const sw = m.root.querySelector('input[role=switch]') as HTMLInputElement
    sw.focus()
    p.state.night = true
    p.build()
    m.update()
    // Same element, new value, still focused.
    expect(m.root.querySelector('input[role=switch]')).toBe(sw)
    expect(sw.checked).toBe(true)
    expect(document.activeElement).toBe(sw)
    // Its handler reaches the NEW widget.
    sw.checked = false
    fire(sw, 'change')
    expect(p.state.night).toBe(false)
    m.dispose()
  })

  test('nothing to read empties it', () => {
    const host = document.createElement('div')
    const m = ariaMirror(host, () => null)
    m.update()
    expect(m.root.children.length).toBe(0)
  })
})

describe('editors in the mirror', () => {
  test('a curve reads out its points and takes a preset', async () => {
    const { curve3d } = await import('./curve-field.js')
    const { presetsFor } = await import('./curve.js')
    let changed = 0
    const c = curve3d({
      label: 'shape',
      value: 'no change',
      handleChange: () => changed++,
    })
    c.layout?.(200)
    const host = document.createElement('div')
    const m = ariaMirror(host, () => controlTree([c]))
    m.update()
    const group = m.root.querySelector('[role=group]')!
    expect(group.getAttribute('aria-label')).toBe('shape')
    expect(group.querySelector('p')!.textContent).toMatch(
      /^shape: 2 points: x 0, y 0/
    )
    const sel = group.querySelector('select')!
    expect(sel.getAttribute('aria-label')).toBe('shape preset')
    const preset = presetsFor('profile').find((p) => p.name !== 'no change')!
    sel.value = preset.name
    fire(sel, 'change')
    expect(changed).toBe(1)
    m.update()
    expect(group.querySelector('p')!.textContent).not.toMatch(
      /^shape: 2 points: x 0, y 0; x 1, y 1$/
    )
    m.dispose()
  })
})

describe('focus across a rebuild', () => {
  test('a renamed control keeps focus by its place', () => {
    let paused = false
    const rows = () => [
      W.button3d({
        label: paused ? 'Resume' : 'Pause',
        handleClick: () => (paused = !paused),
      }),
      W.button3d({ label: 'reset', handleClick: () => {} }),
    ]
    let current = rows()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const m = ariaMirror(host, () => controlTree(current))
    m.update()
    const pause = m.root.querySelector('button')!
    pause.focus()
    pause.click()
    current = rows()
    m.update()
    const first = m.root.querySelector('button')!
    expect(first.textContent).toBe('Resume')
    expect(document.activeElement).toBe(first)
    m.dispose()
  })
})

describe('sliders in the mirror', () => {
  test('a log slider steps along its track and says its formatted value', () => {
    let radius = 50
    const s = W.slider3d({
      label: 'planet radius',
      value: radius,
      min: 2,
      max: 6400,
      scale: 'log',
      format: (v: number) => Math.round(v) + ' km',
      handleChange: (v: number) => (radius = v),
    } as any)
    s.layout?.(300)
    const host = document.createElement('div')
    const m = ariaMirror(host, () => controlTree([s]))
    m.update()
    const r = m.root.querySelector('input[type=range]') as HTMLInputElement
    expect(r.max).toBe('1000')
    expect(r.getAttribute('aria-valuetext')).toBe('50 km')
    const before = Number(r.value)
    r.value = String(before + 10)
    fire(r, 'input')
    // One step is 1% of the track: about 8% more on a 2..6400 log scale.
    expect(radius).toBeGreaterThan(50)
    expect(radius).toBeLessThan(60)
    m.dispose()
  })
})
