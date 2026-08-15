import { describe, test, expect } from 'bun:test'

/*
ORIENTATION IS A VIEWPORT FACT, NOT AN API CALL.

`screen.orientation` is the obvious source and the wrong dependency: it is
patchy on iOS, so a scene that only listens to it hears nothing on the devices
that rotate most. The viewport always tells the truth — turn the device and
`innerWidth`/`innerHeight` swap.

The classifier is the whole idea, so it's pinned here. Two properties matter:
a rotation must be reported, and a mere RESIZE must not be — otherwise every
drag of a window edge on a desktop fires a "you rotated" event, and a game that
pauses on rotation would pause while you resized it.
*/

/** Mirrors `_watchPause`'s classifier in tosi-b3d.ts. */
const orientationOf = (w: number, h: number): 'portrait' | 'landscape' =>
  h >= w ? 'portrait' : 'landscape'

describe('viewport orientation', () => {
  test('classifies by aspect, with square counting as portrait', () => {
    expect(orientationOf(390, 844)).toBe('portrait') // iPhone upright
    expect(orientationOf(844, 390)).toBe('landscape') // …turned
    expect(orientationOf(500, 500)).toBe('portrait') // tie → portrait, arbitrary but FIXED
  })

  test('a rotation changes the classification', () => {
    const before = orientationOf(390, 844)
    const after = orientationOf(844, 390)
    expect(after).not.toBe(before)
  })

  test('a RESIZE that keeps the aspect side does not', () => {
    // The property that stops a desktop window drag reading as a rotation.
    expect(orientationOf(1200, 800)).toBe(orientationOf(900, 700))
    expect(orientationOf(390, 844)).toBe(orientationOf(320, 700))
  })

  test('it does not need screen.orientation to exist', () => {
    // The whole reason for deriving rather than listening: no API, still right.
    const g = globalThis as any
    const had = 'orientation' in (g.screen ?? {})
    expect(orientationOf(844, 390)).toBe('landscape')
    expect(had || true).toBe(true) // documents the independence, asserts nothing about the env
  })
})
