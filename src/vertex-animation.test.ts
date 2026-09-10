import { describe, test, expect } from 'bun:test'
import {
  framePair,
  framesForClip,
  phaseAt,
  socketLayout,
  socketTexel,
  vatBytes,
  vatLayout,
  vatTexel,
  type VatClip,
} from './vertex-animation.js'

/*
THE MATHS THAT IS WRONG INVISIBLY.

A texel offset by half puts each vertex fractionally somewhere else — the figure
still renders, still animates, and is subtly, unfixably wrong. A loop seam that
does not wrap hitches once per stride, which reads as "the animation is bad"
rather than as an off-by-one. Neither shows up as an error, and neither is
findable by looking at a GPU.

So the layout and the phase maths live here, where they are plain arithmetic.
*/

const walk = (over: Partial<VatClip> = {}): VatClip => ({
  name: 'walk',
  start: 0,
  frames: 10,
  duration: 1,
  loop: true,
  ...over,
})

describe('layout — where a frame lives in the texture', () => {
  test('a small mesh is one row per frame', () => {
    const l = vatLayout(500, 60)
    expect(l.width).toBe(500)
    expect(l.rowsPerFrame).toBe(1)
    expect(l.height).toBe(60)
  })

  test('a mesh wider than the texture WRAPS rather than failing', () => {
    /*
    2048 is the safe hardware width (the Quest included) and a 3000-vertex
    figure is a reasonable thing to ask for. Refusing it would push the caller
    into decimating for the wrong reason.
    */
    const l = vatLayout(3000, 20, 2048)
    expect(l.width).toBe(2048)
    expect(l.rowsPerFrame).toBe(2)
    expect(l.height).toBe(40)
  })

  test('vertex 0 of frame 0 is the origin, and frames stack downward', () => {
    const l = vatLayout(500, 60)
    expect(vatTexel(l, 0, 0)).toEqual({ x: 0, y: 0 })
    expect(vatTexel(l, 499, 0)).toEqual({ x: 499, y: 0 })
    expect(vatTexel(l, 0, 1)).toEqual({ x: 0, y: 1 })
    expect(vatTexel(l, 0, 59)).toEqual({ x: 0, y: 59 })
  })

  test("a wrapped mesh puts its overflow on the frame's SECOND row", () => {
    // The case an off-by-one silently mangles: vertex 2048 is x=0 of the next
    // row DOWN, not x=0 of the next frame.
    const l = vatLayout(3000, 20, 2048)
    expect(vatTexel(l, 2048, 0)).toEqual({ x: 0, y: 1 })
    expect(vatTexel(l, 2999, 0)).toEqual({ x: 951, y: 1 })
    // ...and frame 1 starts below both rows of frame 0.
    expect(vatTexel(l, 0, 1)).toEqual({ x: 0, y: 2 })
  })

  test('out-of-range asks are clamped, not wrapped into someone else', () => {
    // A clamp shows the wrong pose; a wrap shows another vertex's position and
    // tears the mesh. Neither is right, and only one is diagnosable.
    const l = vatLayout(100, 10)
    expect(vatTexel(l, 999, 0)).toEqual({ x: 99, y: 0 })
    expect(vatTexel(l, -5, 0)).toEqual({ x: 0, y: 0 })
    expect(vatTexel(l, 0, 999).y).toBe(9)
  })
})

describe('frame interpolation — the thing that makes it not jerky', () => {
  test('phase 0 is the first frame, exactly', () => {
    expect(framePair(walk(), 0)).toEqual({ a: 0, b: 1, t: 0 })
  })

  test('it lands BETWEEN frames, which is the whole point', () => {
    const p = framePair(walk(), 0.05) // half of one tenth
    expect(p.a).toBe(0)
    expect(p.b).toBe(1)
    expect(p.t).toBeCloseTo(0.5, 9)
  })

  test('a LOOPING clip wraps its last frame back into its first', () => {
    /*
    The seam. Without the wrap the last tenth of a walk cycle interpolates
    toward nothing and the stride hitches once per cycle — which reads as "the
    animation is bad", not as an off-by-one in a texture lookup.
    */
    const p = framePair(walk(), 0.95)
    expect(p.a).toBe(9)
    expect(p.b).toBe(0)
    expect(p.t).toBeCloseTo(0.5, 9)
  })

  test('...and keeps going round rather than running out', () => {
    // `toBeCloseTo`, not `toEqual`: 2.35 - 2 is 0.3500000000000001 in binary
    // floating point, so the exact comparison fails on a difference nothing can
    // see. The property under test is "the same place", not "the same bits".
    const once = framePair(walk(), 0.35)
    const twice = framePair(walk(), 2.35)
    expect(twice.a).toBe(once.a)
    expect(twice.b).toBe(once.b)
    expect(twice.t).toBeCloseTo(once.t, 9)
  })

  test('a ONE-SHOT clip holds its last frame instead', () => {
    // A death that loops is a different kind of bug.
    const die = walk({ name: 'die', loop: false, frames: 10 })
    const end = framePair(die, 1)
    expect(end.a).toBe(8)
    expect(end.b).toBe(9)
    expect(end.t).toBeCloseTo(1, 9)
    // Past the end it stays there rather than restarting.
    expect(framePair(die, 5)).toEqual(end)
  })

  test('clips are OFFSET into a shared bake, so switching is not a new material', () => {
    const run = walk({ name: 'run', start: 10, frames: 8 })
    const p = framePair(run, 0)
    expect(p.a).toBe(10)
    expect(p.b).toBe(11)
  })

  test('a single-frame clip is a pose, and interpolates with itself', () => {
    const pose = walk({ frames: 1, loop: false })
    expect(framePair(pose, 0.7)).toEqual({ a: 0, b: 0, t: 0 })
  })

  test('nonsense holds the first frame rather than sampling nowhere', () => {
    expect(framePair(walk(), NaN)).toEqual({ a: 0, b: 0, t: 0 })
  })
})

describe('phase — normalised progress, so one buffer drives every figure', () => {
  test('it is seconds over duration', () => {
    expect(phaseAt(walk({ duration: 2 }), 1)).toBeCloseTo(0.5, 9)
  })

  test('speed scales it, so two soldiers can walk at different rates', () => {
    expect(phaseAt(walk({ duration: 2 }), 1, 2)).toBeCloseTo(0, 9) // one full cycle, wrapped
    expect(phaseAt(walk({ duration: 2 }), 1, 1)).toBeCloseTo(0.5, 9)
    expect(phaseAt(walk({ duration: 2 }), 0.5, 2)).toBeCloseTo(0.5, 9)
  })

  test('a completed LOOP reads as zero, not as one', () => {
    /*
    Phase 1 and phase 0 are the same instant on a ring, and reporting 1 would
    make `framePair` interpolate from the last frame toward a frame that is not
    there. Worth pinning: it looks like an off-by-one and is the definition.
    */
    expect(phaseAt(walk({ duration: 1 }), 1)).toBe(0)
    expect(phaseAt(walk({ duration: 1, loop: false }), 1)).toBe(1)
  })

  test('a loop wraps and a one-shot clamps', () => {
    expect(phaseAt(walk({ duration: 1 }), 2.25)).toBeCloseTo(0.25, 9)
    expect(phaseAt(walk({ duration: 1, loop: false }), 2.25)).toBe(1)
  })

  test('a zero duration does not divide by zero', () => {
    expect(Number.isFinite(phaseAt(walk({ duration: 0 }), 3))).toBe(true)
  })
})

describe('the bake rate is the memory knob', () => {
  test('a clip needs at least two frames, or nothing can interpolate', () => {
    expect(framesForClip(0.01, 1)).toBe(2)
  })

  test('rate times duration, rounded up', () => {
    expect(framesForClip(2, 30)).toBe(60)
    expect(framesForClip(1.1, 10)).toBe(11)
  })

  test('a low rate is THREE times cheaper than a high one', () => {
    /*
    The trade the whole design rests on: with interpolation on, 10fps of baked
    walk reads as motion. "I don't really care if my 200 soldiers are a little
    jerky" — so bake them at 10 and the birds at 30, and the crowd pays nothing
    for the wildlife's smoothness.
    */
    const soldier = framesForClip(1, 10)
    const bird = framesForClip(1, 30)
    expect(bird / soldier).toBeCloseTo(3, 6)
  })

  test('nonsense is one frame rather than a crash', () => {
    expect(framesForClip(0, 30)).toBe(1)
    expect(framesForClip(2, 0)).toBe(1)
  })
})

describe('vatBytes — the number that decides the design', () => {
  test('a modest figure is half a megabyte, and nobody cares', () => {
    const l = vatLayout(500, 60)
    expect(vatBytes(l) / 1024 / 1024).toBeLessThan(1)
  })

  test('a heavy one is tens of megabytes, and somebody does', () => {
    /*
    5000 verts × 300 frames → 28MB, which is the case to catch in a spreadsheet
    rather than on a Quest. Note the WRAP costs real memory: 5000 vertices
    occupy three rows of 2048, so a fifth of the texture is padding. Rounding a
    mesh down to a multiple of the texture width is a free saving nobody would
    think to look for.
    */
    const l = vatLayout(5000, 300)
    expect(vatBytes(l) / 1024 / 1024).toBeGreaterThan(25)
  })

  test('half-float is half the bytes of float, and that is the default', () => {
    const l = vatLayout(500, 60)
    expect(vatBytes(l, 2, 4, 2) * 2).toBe(vatBytes(l, 2, 4, 4))
  })

  test('positions only is half of positions plus normals', () => {
    const l = vatLayout(500, 60)
    expect(vatBytes(l, 1)).toBe(vatBytes(l, 2) / 2)
  })
})

describe('sockets — where a helmet rides when there are no bones', () => {
  const sockets = socketLayout(['head', 'handR', 'handL', 'back'], 60)

  test('one row per frame, two texels per socket', () => {
    expect(sockets.width).toBe(8)
    expect(sockets.height).toBe(60)
  })

  test('a socket is found by NAME, so a bake and a mesh agree by contract', () => {
    expect(socketTexel(sockets, 'head', 0)).toEqual({ x: 0, y: 0 })
    expect(socketTexel(sockets, 'handR', 0)).toEqual({ x: 2, y: 0 })
    // Second texel of the pair is the orientation.
    expect(socketTexel(sockets, 'handR', 0, 1)).toEqual({ x: 3, y: 0 })
    expect(socketTexel(sockets, 'back', 5)).toEqual({ x: 6, y: 5 })
  })

  test('an unknown socket is null, not texel zero', () => {
    // Silently returning the head's transform for a typo'd socket would hang
    // every misspelled attachment off the same place and look deliberate.
    expect(socketTexel(sockets, 'tail', 0)).toBeNull()
  })

  test('it stays SMALL — four sockets is a kilobyte, not a skeleton', () => {
    // If a figure wants more attachment points than this it wants a skeleton,
    // and that is the seam to the named-character path.
    expect(sockets.width * sockets.height * 4 * 2).toBeLessThan(4096)
  })
})
