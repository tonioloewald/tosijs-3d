import { describe, test, expect } from 'bun:test'
import { attachSceneLayer } from './panel-layer.js'

/*
The scene layer is what makes a popup from a panel-on-a-plane a real popup
rather than something cropped by the panel that opened it. It is duck-typed all
the way down — an `svg` that can register a host, an `owner` that can open a
popup — precisely so it can be driven with neither Babylon nor a DOM.
*/

/** The two objects `attachSceneLayer` actually touches. */
const rig = (opts: { canRegister?: boolean; canPopup?: boolean } = {}) => {
  const registered: Array<(...a: any[]) => unknown> = []
  const opened: Record<string, unknown>[] = []
  const svg: any = {
    viewBox: { baseVal: { width: 320, height: 620 } },
  }
  if (opts.canRegister !== false) {
    svg.addLayerHost = (fn: any) => {
      registered.push(fn)
      return () => {}
    }
  }
  const owner: any = {}
  if (opts.canPopup !== false) {
    owner.openPopup = (o: Record<string, unknown>) => {
      opened.push(o)
      return { close: () => {} }
    }
  }
  return { svg, owner, registered, opened }
}

const attach = (r: ReturnType<typeof rig>) =>
  attachSceneLayer({
    svg: r.svg,
    owner: r.owner,
    openerMesh: { name: 'panel' },
    planeW: 1,
    planeH: 1.94,
  })

describe('attachSceneLayer', () => {
  test('registers exactly one host', () => {
    const r = rig()
    expect(attach(r)).toBe(true)
    expect(r.registered).toHaveLength(1)
  })

  test('marks it as CHROME-DRAWING, which is what reserves the band', () => {
    /*
    `popup-surface` draws move and close glyphs into the top of whatever SVG it
    is handed, so a sheet mounted by this host must keep a band clear for them.
    A DOM layer draws none and marks nothing, which is what lets a flat-only
    panel skip the band and not carry an empty strip above every menu.

    Asserted HERE rather than only through the panel, because a test that sets
    the flag on a fake host proves what the flag buys and nothing about whether
    this function sets it — and that gap is real: removing the marking left the
    panel-side tests green.
    */
    const r = rig()
    attach(r)
    expect(
      (r.registered[0] as unknown as { drawsChrome?: boolean }).drawsChrome
    ).toBe(true)
  })

  test('a registered host opens a popup, owned by the panel', () => {
    const r = rig()
    attach(r)
    const handle = r.registered[0](
      { getAttribute: () => '360', viewBox: { baseVal: {} } },
      { anchor: { x: 0, y: 0, width: 320, height: 40 } }
    ) as { close: () => void }
    expect(r.opened).toHaveLength(1)
    expect(r.opened[0].opener).toEqual({ name: 'panel' })
    expect(typeof handle.close).toBe('function')
  })

  test('passes handleClosed through, so one face closing closes them all', () => {
    const r = rig()
    attach(r)
    const seen = () => {}
    r.registered[0](
      { getAttribute: () => '360', viewBox: { baseVal: {} } },
      { anchor: { x: 0, y: 0, width: 320, height: 40 }, handleClosed: seen }
    )
    expect(r.opened[0].handleClosed).toBe(seen)
  })

  test('a popup is drawn at the PANEL\'s scale, not the panel\'s width', () => {
    /*
    It took `width * 0.95` whatever it contained — right for a keyboard, which
    is about as wide as a panel, and grotesque for a small select menu, which
    came out at twice the text size of the thing that opened it. Tonio: "The
    popup in VR is a completely different scale."

    The rule is that one viewBox unit is the same physical size on the panel and
    on its popup, so a menu reads as part of the same UI.
    */
    const r = rig() // panel viewBox is 320 wide, plane is 1 world unit
    attach(r)
    const open = (popWidth: number) => {
      r.opened.length = 0
      r.registered[0](
        {
          getAttribute: (n: string) => (n === 'width' ? String(popWidth) : '180'),
          viewBox: { baseVal: {} },
        },
        { anchor: { x: 0, y: 0, width: 320, height: 40 } }
      )
      return r.opened[0].width as number
    }
    // A 160-unit menu on a 320-unit panel is half the panel's width.
    expect(open(160)).toBeCloseTo(0.5, 6)
    // A 360-unit keyboard is WIDER than the panel, so it is capped rather than
    // allowed to dwarf what opened it.
    expect(open(360)).toBeCloseTo(0.95, 6)
  })

  test('is a NO-OP, not a throw, when it cannot attach', () => {
    // So a caller can wire it unconditionally — which is the point of returning
    // a boolean rather than making every call site test the preconditions.
    expect(attach(rig({ canRegister: false }))).toBe(false)
    expect(attach(rig({ canPopup: false }))).toBe(false)
  })
})
