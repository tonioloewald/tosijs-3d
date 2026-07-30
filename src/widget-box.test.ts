import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let WB: typeof import('./widget-box')
let B: typeof import('./box')

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
  WB = await import('./widget-box')
  B = await import('./box')
})

/** A fake Widget3d that records the raw pointer events it receives. */
const spyWidget = (
  opts: { height?: number; hitTest?: (x: number) => boolean } = {}
) => {
  const events: Array<{ kind: string; x: number; y: number }> = []
  const el = (globalThis as any).document.createElementNS(
    'http://www.w3.org/2000/svg',
    'g'
  ) as SVGElement
  let laidAt = -1
  return {
    events,
    laidWidth: () => laidAt,
    widget: {
      el,
      layout(width: number) {
        laidAt = width
        return opts.height ?? 40
      },
      handle(kind: any, x: number, y: number) {
        events.push({ kind, x, y })
      },
      hitTest: opts.hitTest ? (x: number) => opts.hitTest!(x) : undefined,
    },
  }
}

describe('widgetChild — protocol translation', () => {
  test('layout(width) becomes measure(width) → height', () => {
    const s = spyWidget({ height: 55 })
    const child = WB.widgetChild(s.widget as any)
    expect(child.kind).toBe('block')
    expect(child.measure(200)).toEqual({ height: 55 })
    expect(s.laidWidth()).toBe(200)
  })

  test('an interactive widget is focusable; a static one is not', () => {
    const s = spyWidget()
    expect(WB.widgetChild(s.widget as any).focusable).toBe(true)
    const staticWidget = { el: s.widget.el, layout: () => 20 }
    expect(WB.widgetChild(staticWidget as any).focusable).toBe(false)
  })
})

describe('widgetBox — widgets inside a box', () => {
  test('pointer events reach the widget in CHILD-local coords', () => {
    const s = spyWidget({ height: 40 })
    const b = WB.widgetBox({ width: 200, padding: 10 }, [s.widget as any])
    // padding 10 → the child's origin is (10,10); a press at (60,25) is (50,15) local.
    b.handlePointer('down', 60, 25)
    expect(s.events).toEqual([{ kind: 'down', x: 50, y: 15 }])
  })

  test('a raw child CAPTURES: move/up off its rect still reach it (slider drag)', () => {
    const s = spyWidget({ height: 40 })
    const b = WB.widgetBox({ width: 200, padding: 0 }, [s.widget as any])
    b.handlePointer('down', 20, 20)
    // Drag well below the child's 40px row — outside its rect entirely.
    b.handlePointer('move', 20, 300)
    b.handlePointer('up', 20, 300)
    expect(s.events.map((e) => e.kind)).toEqual(['down', 'move', 'up'])
    // Still delivered in child-local coords, even though it's off-rect.
    expect(s.events[1].y).toBe(300)
  })

  test('leave ends a capture, so a widget is not stuck mid-drag', () => {
    const s = spyWidget()
    const b = WB.widgetBox({ width: 200, padding: 0 }, [s.widget as any])
    b.handlePointer('down', 20, 20)
    b.handlePointer('leave', 0, 0)
    expect(s.events.map((e) => e.kind)).toEqual(['down', 'leave'])
    // After leave the capture is released: a move goes nowhere.
    b.handlePointer('move', 20, 300)
    expect(s.events.map((e) => e.kind)).toEqual(['down', 'leave'])
  })

  test('hitTest keeps non-control area as scroll surface', () => {
    // Only x >= 100 is the "control"; the label half is scroll-drag surface.
    const s = spyWidget({ hitTest: (x) => x >= 100 })
    const b = WB.widgetBox({ width: 200, padding: 0 }, [s.widget as any])
    b.handlePointer('down', 20, 20) // label side — not the control
    expect(s.events).toEqual([])
    b.handlePointer('down', 150, 20) // control side
    expect(s.events.map((e) => e.kind)).toEqual(['down'])
  })

  test('a raw child does not also fire onActivate (it owns the gesture)', () => {
    const s = spyWidget()
    const child = WB.widgetChild(s.widget as any)
    let activated = 0
    const b = B.box(
      { width: 200, padding: 0 },
      { ...child, onActivate: () => activated++ }
    )
    b.handlePointer('down', 20, 20)
    b.handlePointer('up', 20, 20)
    expect(s.events.map((e) => e.kind)).toEqual(['down', 'up'])
    expect(activated).toBe(0)
  })

  test('mixed children: a plain button still activates normally alongside a raw widget', () => {
    const s = spyWidget({ height: 40 })
    let clicked = 0
    const btn = B.button('Go', { block: true, onActivate: () => clicked++ })
    const b = WB.widgetBox({ width: 200, padding: 0, gap: 0 }, [
      s.widget as any,
    ])
    // rebuild with both, since widgetBox takes widgets only
    const b2 = B.box(
      { width: 200, padding: 0, gap: 0 },
      WB.widgetChild(s.widget as any),
      btn
    )
    expect(b.width).toBe(200)
    b2.handlePointer('down', 20, 10) // the widget row
    b2.handlePointer('up', 20, 10)
    expect(clicked).toBe(0)
    const r = b2.childRect(1)!
    b2.handlePointer('down', 20, r.y + 5) // the button row
    b2.handlePointer('up', 20, r.y + 5)
    expect(clicked).toBe(1)
  })
})
