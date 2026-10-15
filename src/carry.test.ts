import { describe, test, expect } from 'bun:test'
import { createCarry, type CarryTarget } from './carry.js'

type Thing = { kind: string }
const holster = (log: string[] = []): CarryTarget<Thing> => ({
  id: 'holster',
  accepts: (t) => (t.kind === 'pistol' ? [] : ['only a pistol fits']),
  receive: (t, from) => {
    log.push(`${t.kind} from ${from}`)
  },
})

describe('carry', () => {
  test('a target that takes the thing receives it on drop', () => {
    const log: string[] = []
    const c = createCarry<Thing>()
    c.pickUp({ kind: 'pistol' }, 'hand')
    c.over(holster(log))
    expect(c.state.verdict).toEqual({ ok: true, reasons: [] })
    expect(c.drop()).toEqual({ done: true, target: 'holster' })
    expect(log).toEqual(['pistol from hand'])
    expect(c.state.thing).toBeNull()
  })

  test('a target that will not take it says why, and drop leaves it where it was', () => {
    const log: string[] = []
    const c = createCarry<Thing>()
    c.pickUp({ kind: 'rifle' }, 'hand')
    c.over(holster(log))
    expect(c.state.verdict).toEqual({
      ok: false,
      reasons: ['only a pistol fits'],
    })
    expect(c.drop()).toEqual({ done: false, reasons: ['only a pistol fits'] })
    expect(log).toEqual([])
  })

  test('dropping on nothing cancels', () => {
    const c = createCarry<Thing>()
    c.pickUp({ kind: 'pistol' })
    c.over(null)
    expect(c.drop().done).toBe(false)
    expect(c.state.thing).toBeNull()
  })

  test('drop asks again: a target that changed its mind refuses', () => {
    let open = true
    const door: CarryTarget<Thing> = {
      id: 'slot',
      accepts: () => (open ? [] : ['the slot closed']),
      receive: () => {},
    }
    const c = createCarry<Thing>()
    c.pickUp({ kind: 'key' })
    c.over(door)
    open = false
    expect(c.drop()).toEqual({ done: false, reasons: ['the slot closed'] })
  })

  test('a refusal from receive (returned or thrown) leaves it where it was', () => {
    const c = createCarry<Thing>()
    c.pickUp({ kind: 'x' })
    expect(
      c.drop({ id: 'a', accepts: () => [], receive: () => ['full'] })
    ).toEqual({ done: false, reasons: ['full'] })
    c.pickUp({ kind: 'x' })
    expect(
      c.drop({
        id: 'b',
        accepts: () => [],
        receive: () => {
          throw new Error('jammed')
        },
      })
    ).toEqual({ done: false, reasons: ['jammed'] })
  })

  test('two taps: pick up, then drop on a target given directly', () => {
    const log: string[] = []
    const c = createCarry<Thing>()
    c.pickUp({ kind: 'pistol' }, 'bag', 'tap')
    expect(c.state.mode).toBe('tap')
    expect(c.drop(holster(log)).done).toBe(true)
    expect(log).toEqual(['pistol from bag'])
  })

  test('verdictFor lights and dims targets without moving the pointer', () => {
    const c = createCarry<Thing>()
    expect(c.verdictFor(holster())).toBeNull()
    c.pickUp({ kind: 'rifle' })
    expect(c.verdictFor(holster())!.ok).toBe(false)
  })

  test('subscribers see every change, and can stop', () => {
    const c = createCarry<Thing>()
    const seen: (string | null)[] = []
    const stop = c.subscribe((s) => seen.push(s.thing?.kind ?? null))
    c.pickUp({ kind: 'pistol' })
    c.over(holster())
    c.cancel()
    stop()
    c.pickUp({ kind: 'rifle' })
    expect(seen).toEqual(['pistol', 'pistol', null])
  })
})
