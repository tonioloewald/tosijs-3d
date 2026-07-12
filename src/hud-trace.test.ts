/**
 * The radar trace's LOCK CUE, rendered — the one thing `hud-math` can't pin, because it's
 * about which COLOUR lands on which channel, not about the numbers.
 *
 * The contract, and why it is what it is (it's been got wrong twice):
 *  - acquiring → WHITE fill ramping to 50%, outline still the FACTION colour;
 *  - locked    → outline goes WHITE, and the fill takes over the faction colour at 75%.
 * The two channels trade jobs, so a trace never stops saying what it is — which is also
 * what would keep a lockable NEUTRAL legible.
 *
 * Lock was first drawn as merely a denser fill of the SAME colour (50% → 75%) and proved
 * unreadable in flight; that's why "locked" now changes a different channel rather than
 * only deepening the one that's already moving. The 75% survives, but as legibility (a
 * 50% faction fill is washed out inside a white outline), NOT as the cue. Don't collapse
 * the two channels back together.
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let buildFallbackHud: typeof import('./hud').buildFallbackHud

beforeAll(async () => {
  // hud.ts builds real SVG nodes (document.createElementNS + tosijs svgElements), so it
  // needs a DOM. happy-dom is enough — no engine, no canvas.
  const win = new Window() as any
  const g = globalThis as any
  // tosijs (which hud.ts pulls in for svgElements) subclasses HTMLElement at MODULE LOAD
  // and builds through DocumentFragment, so the DOM globals must be in place BEFORE the
  // import below — not merely before the render. Fill every gap happy-dom can cover
  // rather than naming them one at a time; `??=` means we never clobber a real global.
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* getters that throw off-document — not ours to care about */
    }
  }
  const hud = await import('./hud')
  buildFallbackHud = hud.buildFallbackHud
})

/** Render one hostile trace at a given lock state and report what the glyph looks like. */
function draw(lockProgress: number, locked?: boolean) {
  const hud = buildFallbackHud() // returns the controller; .el is the live SVG
  hud.setTraces([
    { x: 128, y: 128, kind: 'hostile', lockProgress, locked, tracked: true },
  ])
  const layer = hud.el.querySelector('#traces') as SVGGElement
  const shapes = Array.from(
    layer.querySelectorAll('*') as unknown as SVGElement[]
  ).filter((s) => (s.style.stroke || s.getAttribute('stroke') || '') !== '')
  expect(shapes.length).toBeGreaterThan(0) // the glyph has an outline to speak of
  const s = shapes[0]
  return {
    stroke: (s.style.stroke || s.getAttribute('stroke') || '').toLowerCase(),
    fill: (s.style.fill || '').toLowerCase(),
    fillOpacity: parseFloat(s.style.fillOpacity || '0'),
  }
}

const isWhite = (c: string) =>
  /#fff(fff)?\b|rgb\(255,\s*255,\s*255\)|white/.test(c)

describe('radar trace — acquiring', () => {
  test('untouched contact: faction outline, no fill', () => {
    const g = draw(0)
    expect(isWhite(g.stroke)).toBe(false) // still the faction colour
    expect(g.fillOpacity).toBe(0)
  })

  test('lock building: WHITE fill ramps up, outline stays FACTION', () => {
    const half = draw(0.5)
    expect(isWhite(half.fill)).toBe(true)
    expect(half.fillOpacity).toBeCloseTo(0.25, 6)
    expect(isWhite(half.stroke)).toBe(false) // you still know what it is

    const full = draw(1)
    expect(full.fillOpacity).toBeCloseTo(0.5, 6)
    expect(full.fillOpacity).toBeGreaterThan(half.fillOpacity) // it fills as you hold
  })
})

describe('radar trace — locked', () => {
  test('the OUTLINE goes white — a CHANGE OF CHANNEL is what makes lock readable', () => {
    // Lock was once drawn as only a denser fill of the same colour, and at speed you
    // could not tell it from "nearly locked". Whatever else changes, this must: the
    // channel that was NOT moving during acquisition is the one that announces the lock.
    expect(isWhite(draw(1, true).stroke)).toBe(true)
    expect(isWhite(draw(1).stroke)).toBe(false) // ...and not a moment before
  })

  test('the FILL hands back the faction colour the outline just gave up', () => {
    // The whole point of the trade: locked or not, the trace still tells you WHAT it is.
    // Without it, "locked" would erase "hostile" — and a lockable neutral would be
    // indistinguishable from a lockable hostile.
    const acquiring = draw(0.9)
    const locked = draw(1, true)
    expect(isWhite(acquiring.fill)).toBe(true) // white while acquiring…
    expect(isWhite(locked.fill)).toBe(false) // …faction once locked
    expect(locked.fill).toBe(acquiring.stroke) // exactly the colour the outline had
  })

  test('and it fills bolder than the ramp ever gets — 75% vs 50%', () => {
    // Not the cue (see above), just legibility: a 50% faction fill reads washed out
    // inside a white outline.
    const locked = draw(1, true)
    expect(locked.fillOpacity).toBeCloseTo(0.75, 6)
    expect(locked.fillOpacity).toBeGreaterThan(draw(1).fillOpacity)
  })
})
