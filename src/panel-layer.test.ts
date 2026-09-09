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

  test('is a NO-OP, not a throw, when it cannot attach', () => {
    // So a caller can wire it unconditionally — which is the point of returning
    // a boolean rather than making every call site test the preconditions.
    expect(attach(rig({ canRegister: false }))).toBe(false)
    expect(attach(rig({ canPopup: false }))).toBe(false)
  })
})
