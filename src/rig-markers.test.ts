import { describe, test, expect, beforeAll } from 'bun:test'

let R: typeof import('./rig-markers.js')

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
  R = await import('./rig-markers.js')
})

/*
A cross for a body: a 2 m post (x -0.2..0.2) and 1.6 m of arms across it at
1.4 to 1.6 m, 0.4 m deep (z -0.2..0.2). Enough for a front and a side view.
*/
function cross(): { positions: number[]; indices: number[] } {
  const positions: number[] = []
  const indices: number[] = []
  const box = (x0: number, x1: number, y0: number, y1: number) => {
    const b = positions.length / 3
    for (const x of [x0, x1])
      for (const y of [y0, y1]) for (const z of [-0.2, 0.2]) positions.push(x, y, z)
    // Front (z = +0.2) and right side (x = x1) faces.
    indices.push(b + 1, b + 5, b + 7, b + 1, b + 7, b + 3)
    indices.push(b + 5, b + 4, b + 6, b + 5, b + 6, b + 7)
  }
  box(-0.2, 0.2, 0, 2)
  box(-0.8, 0.8, 1.4, 1.6)
  return { positions, indices }
}

const markers = () => ({
  chin: { x: 0, y: 1.8 },
  groin: { x: 0, y: 1 },
  wristL: { x: 0.7, y: 1.5 },
  wristR: { x: -0.7, y: 1.5 },
  elbowL: { x: 0.4, y: 1.5 },
  elbowR: { x: -0.4, y: 1.5 },
  kneeL: { x: 0.1, y: 0.5 },
  kneeR: { x: -0.1, y: 0.5 },
})

describe('markerField3d', () => {
  test('dragging a wrist moves the other one with it, and commits once on release', () => {
    const changes: any[] = []
    const commits: any[] = []
    const f = R.markerField3d({
      ...cross(),
      value: markers(),
      handleChange: (m) => changes.push(m),
      handleCommit: (m) => commits.push(m),
    })
    f.layout(300)
    // Where the left wrist is drawn: read it back off the SVG.
    const dot = [...f.el.querySelectorAll('circle')].find(
      (c) => Number(c.getAttribute('cx')) > 200
    )!
    const x = Number(dot.getAttribute('cx'))
    const y = Number(dot.getAttribute('cy'))
    f.handle!('down', x, y)
    expect(f.active).toBe('wristL')
    f.handle!('move', x - 20, y + 10)
    f.handle!('move', x - 30, y + 10)
    f.handle!('up', x - 30, y + 10)
    expect(commits.length).toBe(1)
    expect(changes.length).toBe(2)
    const m = f.markers
    expect(m.wristL.x).toBeLessThan(0.7)
    expect(m.wristL.y).toBeLessThan(1.5)
    expect(m.wristR).toEqual({ x: -m.wristL.x, y: m.wristL.y })
  })

  test('with symmetry off, one side moves alone; chin and groin keep to the centre with it on', () => {
    const f = R.markerField3d({ ...cross(), value: markers(), symmetry: false })
    f.layout(300)
    const at = (name: string) => {
      const dots = [...f.el.querySelectorAll('circle')]
      const i = ['chin', 'groin', 'wristL', 'wristR', 'elbowL', 'elbowR', 'kneeL', 'kneeR'].indexOf(name)
      return { x: Number(dots[i].getAttribute('cx')), y: Number(dots[i].getAttribute('cy')) }
    }
    const w = at('wristR')
    f.handle!('down', w.x, w.y)
    f.handle!('move', w.x + 15, w.y)
    f.handle!('up', w.x + 15, w.y)
    expect(f.markers.wristL).toEqual({ x: 0.7, y: 1.5 })
    expect(f.markers.wristR.x).toBeGreaterThan(-0.7)

    f.symmetry = true
    const c = at('chin')
    f.handle!('down', c.x, c.y)
    f.handle!('move', c.x + 25, c.y + 5)
    f.handle!('up', c.x + 25, c.y + 5)
    expect(f.markers.chin.x).toBe(0)
    expect(f.markers.chin.y).toBeLessThan(1.8)
  })

  test('a tail tip gets a side view, and dragging it there moves it in depth', () => {
    const f = R.markerField3d({ ...cross(), value: markers(), tail: { x: 0, y: 0.8, z: -0.1 } })
    f.layout(300)
    const dots = [...f.el.querySelectorAll('circle')]
    expect(dots.length).toBe(10) // eight, plus the tail in both views
    const side = dots[9]
    const x = Number(side.getAttribute('cx'))
    const y = Number(side.getAttribute('cy'))
    f.handle!('down', x, y)
    expect(f.active).toBe('tail')
    f.handle!('move', x + 12, y)
    f.handle!('up', x + 12, y)
    expect(f.tail!.z).toBeGreaterThan(-0.1)
    expect(f.tail!.y).toBeCloseTo(0.8, 1)
  })

  test('hovering names the marker; with no value it starts from the guess', () => {
    const f = R.markerField3d(cross())
    f.layout(300)
    const caption = f.el.querySelector('text')!
    expect(caption.textContent).toContain('Drag')
    const dot = f.el.querySelectorAll('circle')[0]
    f.handle!('hover', Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy')))
    expect(caption.textContent).toBe('Chin')
    const m = f.markers
    expect(m.wristL.x).toBeGreaterThan(0.4)
    expect(m.groin.y).toBeLessThan(m.chin.y)
  })
})
