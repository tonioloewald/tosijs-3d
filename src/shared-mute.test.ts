import { describe, expect, test } from 'bun:test'
import { sharedMute } from './shared-mute.js'

const engine = (volume = 0.7) => {
  const e = { volume }
  const hold = sharedMute(
    () => e.volume,
    (v) => (e.volume = v)
  )
  return { e, hold }
}

describe('sharedMute', () => {
  test('two holds released in the order taken leave the volume as it was', () => {
    const { e, hold } = engine()
    const a = hold()
    const b = hold()
    expect(e.volume).toBe(0)
    a()
    expect(e.volume).toBe(0)
    b()
    expect(e.volume).toBe(0.7)
  })

  test('and in the reverse order', () => {
    const { e, hold } = engine()
    const a = hold()
    const b = hold()
    b()
    expect(e.volume).toBe(0)
    a()
    expect(e.volume).toBe(0.7)
  })

  test('a release called twice counts once', () => {
    const { e, hold } = engine()
    const a = hold()
    const b = hold()
    a()
    a()
    expect(e.volume).toBe(0)
    b()
    expect(e.volume).toBe(0.7)
  })

  test('a volume set while held stands', () => {
    const { e, hold } = engine()
    const a = hold()
    e.volume = 0.3
    a()
    expect(e.volume).toBe(0.3)
  })

  test('a later hold reads the volume afresh', () => {
    const { e, hold } = engine()
    hold()()
    e.volume = 0.5
    const a = hold()
    expect(e.volume).toBe(0)
    a()
    expect(e.volume).toBe(0.5)
  })
})
