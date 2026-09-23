import { describe, expect, test } from 'bun:test'
import {
  BRIGHT_GAMMA,
  PACKED_CAPACITY,
  STAR_PALETTE,
  decodeTexel,
  dirToFace,
  encodeStarfield,
  faceToDir,
  paletteGlsl,
  paletteIndex,
  type SkyObject,
  spectralGlsl,
  spectralRamp,
  STAR_PALETTE,
} from './starfield-codec.js'

/*
WHAT ACTUALLY MATTERS HERE IS SELF-CONSISTENCY, not absolute orientation.

Tonio: "sky being subtly wrong is actually fine" — and he is right, nobody knows
the real constellations. A whole-sky rotation is invisible.

What is NOT invisible is a convention that disagrees with ITSELF: a sign flipped
on one face scrambles stars relative to the smooth nebula cube and tears the sky
apart along that face's seams. So these tests pin the round trip and say nothing
about which way is up.
*/

/** A deterministic spread of directions — no Math.random in a pinned test. */
function directions(n: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = []
  // Fibonacci sphere: even coverage, and it lands on every face and near edges.
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const t = golden * i
    out.push([Math.cos(t) * r, y, Math.sin(t) * r])
  }
  return out
}

describe('the cube convention', () => {
  test('dirToFace and faceToDir are exact inverses', () => {
    for (const [x, y, z] of directions(2000)) {
      const { face, u, v } = dirToFace(x, y, z)
      const d = faceToDir(face, u, v)
      const len = Math.hypot(d.x, d.y, d.z)
      expect(d.x / len).toBeCloseTo(x, 6)
      expect(d.y / len).toBeCloseTo(y, 6)
      expect(d.z / len).toBeCloseTo(z, 6)
    }
  })

  test('uv stays inside the face, including on the axes', () => {
    // The axes are the corner cases: exactly on a face centre, and exactly on
    // an edge between two faces. Both must land somewhere legal.
    const axes: Array<[number, number, number]> = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [1, 1, 0],
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
      [-1, -1, -1],
    ]
    for (const [x, y, z] of axes) {
      const { face, u, v } = dirToFace(x, y, z)
      expect(face).toBeGreaterThanOrEqual(0)
      expect(face).toBeLessThan(6)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  test('every face is actually used', () => {
    // A convention that quietly maps two directions to one face would pass the
    // inverse test and lose a sixth of the sky.
    const seen = new Set<number>()
    for (const [x, y, z] of directions(500)) seen.add(dirToFace(x, y, z).face)
    expect(seen.size).toBe(6)
  })
})

describe('encode → decode', () => {
  test('a star comes back where it was put', () => {
    /*
    Within a texel, because that is the promise: the sub-texel offset means the
    quantisation costs ACCURACY, not position. At 512 a texel is 90/512 degrees,
    so the tolerance below is about a texel's worth of angle.
    */
    const size = 512
    const objs: SkyObject[] = directions(300).map(([x, y, z], i) => ({
      x,
      y,
      z,
      brightness: 0.2 + (i % 7) * 0.1,
      r: 1,
      g: 0.92,
      b: 0.8,
    }))
    const enc = encodeStarfield(objs, size)

    let checked = 0
    for (const o of objs) {
      const { face, u, v } = dirToFace(o.x, o.y, o.z)
      const ix = Math.min(size - 1, Math.floor(u * size))
      const iy = Math.min(size - 1, Math.floor(v * size))
      const [d] = decodeTexel(enc.faces, size, face, ix, iy)
      if (d == null) continue // lost to a collision; counted separately
      const dot = d.x * o.x + d.y * o.y + d.z * o.z
      // One texel at 512/face is ~0.176°; allow two for the corner stretch.
      expect(Math.acos(Math.min(1, dot)) * 57.2958).toBeLessThan(0.36)
      checked++
    }
    expect(checked).toBeGreaterThan(290)
  })

  test('brightness survives the gamma round trip', () => {
    const size = 64
    for (const b of [0.001, 0.01, 0.1, 0.5, 1]) {
      const enc = encodeStarfield(
        [{ x: 1, y: 0.01, z: 0.02, brightness: b, r: 1, g: 1, b: 1 }],
        size
      )
      const { face, u, v } = dirToFace(1, 0.01, 0.02)
      const [d] = decodeTexel(
        enc.faces,
        size,
        face,
        Math.floor(u * size),
        Math.floor(v * size)
      )
      // 8 bits of a gamma curve — relative error, not absolute.
      expect(Math.abs(d.brightness - b) / b).toBeLessThan(0.08)
    }
  })

  test('FAINT stars survive, which is what the gamma is for', () => {
    // A linear 8-bit encoding would quantise these to zero — i.e. to "empty
    // texel" — and silently delete the faint half of every sky.
    const size = 64
    const faint = Math.pow(1 / 255, 1 / BRIGHT_GAMMA)
    const enc = encodeStarfield(
      [{ x: 1, y: 0, z: 0, brightness: faint * 4, r: 1, g: 1, b: 1 }],
      size
    )
    const { face, u, v } = dirToFace(1, 0, 0)
    const [d] = decodeTexel(
      enc.faces,
      size,
      face,
      Math.floor(u * size),
      Math.floor(v * size)
    )
    expect(d).toBeDefined()
    expect(d.brightness).toBeGreaterThan(0)
  })

  test('size and colour come back, in the new A layout', () => {
    const size = 32
    const at = (faces: Uint8Array[]) => {
      const { face, u, v } = dirToFace(0.1, 1, 0.1)
      const [d] = decodeTexel(
        faces,
        size,
        face,
        Math.floor(u * size),
        Math.floor(v * size)
      )
      return d
    }
    // A galaxy: size round-trips; the colour is a fixed warm tint, not the
    // input rgb — that is the design (galaxies are old warm populations).
    const enc = encodeStarfield(
      [
        {
          x: 0.1,
          y: 1,
          z: 0.1,
          brightness: 0.8,
          r: 1,
          g: 0.75,
          b: 0.48,
          size: 1,
        },
      ],
      size
    )
    const g = at(enc.faces, 0)
    expect(g.size).toBeCloseTo(1, 2)
    expect(g.r).toBe(1)
    expect(g.b).toBeGreaterThan(0.45)

    // A bright star: the spectral value round-trips through the ramp.
    const enc2 = encodeStarfield(
      [
        {
          x: 0.1,
          y: 1,
          z: 0.1,
          brightness: 0.8,
          r: 1,
          g: 1,
          b: 1,
          spectral: 0.9,
        },
      ],
      size
    )
    const ramp = spectralRamp(0.9)
    const s2 = at(enc2.faces, 0)
    expect(s2.size).toBe(0)
    expect(s2.r).toBeCloseTo(ramp[0], 2)
    expect(s2.b).toBeCloseTo(ramp[2], 2)

    // A faint star: the warm-yellow default.
    const enc3 = encodeStarfield(
      [{ x: 0.1, y: 1, z: 0.1, brightness: 0.1, r: 1, g: 1, b: 1 }],
      size
    )
    const f = at(enc3.faces, 0)
    expect(f.r).toBeCloseTo(STAR_PALETTE[6][0], 2)
    expect(f.b).toBeCloseTo(STAR_PALETTE[6][2], 2)
  })
})

describe('collisions', () => {
  test('a contested texel PACKS both rather than dropping one', () => {
    /*
    Two objects in one texel used to mean one was lost. They are packed now, so
    the assertion is that BOTH survive — and that the order they arrived in does
    not change the result, because order-dependence would mean the sky changes
    when the generator's loop order does.
    */
    const size = 8
    /*
    Deliberately OFF the texel boundary. The first version of this test used
    (1,0,0) and (1,0.0001,0), which sit either side of v = 0.5 — exactly a texel
    edge at this size — so the two never collided and the test was asserting
    nothing. The assertion caught it, which is the argument for having written
    it as a behaviour rather than a snapshot.
    */
    const dim = { x: 1, y: 0.03, z: 0.03, brightness: 0.05, r: 1, g: 1, b: 1 }
    const bright = {
      x: 1,
      y: 0.031,
      z: 0.031,
      brightness: 0.9,
      r: 1,
      g: 1,
      b: 1,
    }
    const a = dirToFace(dim.x, dim.y, dim.z)
    const b2 = dirToFace(bright.x, bright.y, bright.z)
    const face = a.face
    const ix = Math.floor(a.u * size)
    const iy = Math.floor(a.v * size)
    // The premise, stated: these two really are in one texel.
    expect(b2.face).toBe(face)
    expect(Math.floor(b2.u * size)).toBe(ix)
    expect(Math.floor(b2.v * size)).toBe(iy)

    for (const order of [
      [dim, bright],
      [bright, dim],
    ]) {
      const enc = encodeStarfield(order, size)
      const got = decodeTexel(enc.faces, size, face, ix, iy)
      expect(got.length).toBe(2)
      // Brightest first, whichever order they were handed over in.
      expect(got[0].brightness).toBeGreaterThan(got[1].brightness)
      expect(got[0].brightness).toBeGreaterThan(0.4)
      expect(enc.collided).toBe(0)
    }
  })

  test('holds up to PACKED_CAPACITY, then drops the faintest', () => {
    const size = 8
    // Five objects in one texel, brightest last so order cannot be doing it.
    const many = [0.1, 0.3, 0.5, 0.7, 0.9].map((brightness, i) => ({
      x: 1,
      y: 0.03 + i * 0.0002,
      z: 0.03,
      brightness,
      r: 1,
      g: 1,
      b: 1,
    }))
    const a = dirToFace(many[0].x, many[0].y, many[0].z)
    const enc = encodeStarfield(many, size)
    const got = decodeTexel(
      enc.faces,
      size,
      a.face,
      Math.floor(a.u * size),
      Math.floor(a.v * size)
    )
    expect(got.length).toBe(PACKED_CAPACITY)
    expect(enc.collided).toBe(many.length - PACKED_CAPACITY)
    // What survived is the BRIGHT end — 0.9, 0.7, 0.5 rather than any three.
    expect(got[0].brightness).toBeGreaterThan(0.6)
    expect(Math.min(...got.map((o) => o.brightness))).toBeGreaterThan(0.2)
  })

  test('a packed object still decodes to roughly where it was', () => {
    /*
    Quarter-texel resolution instead of 1/256, which is the price of packing.
    At 512 a texel is 0.176°, so a quarter is 0.044° — still far under a pixel
    at any sane field of view, which is why the trade is worth making.
    */
    const size = 512
    const pair = [
      { x: 1, y: 0.031, z: 0.017, brightness: 0.9, r: 1, g: 1, b: 1 },
      { x: 1, y: 0.0312, z: 0.0172, brightness: 0.4, r: 1, g: 1, b: 1 },
    ]
    const a = dirToFace(pair[0].x, pair[0].y, pair[0].z)
    const enc = encodeStarfield(pair, size)
    const got = decodeTexel(
      enc.faces,
      size,
      a.face,
      Math.floor(a.u * size),
      Math.floor(a.v * size)
    )
    expect(got.length).toBe(2)
    for (const d of got) {
      const L = Math.hypot(pair[0].x, pair[0].y, pair[0].z)
      const dot =
        d.x * (pair[0].x / L) + d.y * (pair[0].y / L) + d.z * (pair[0].z / L)
      expect(Math.acos(Math.min(1, dot)) * 57.2958).toBeLessThan(0.2)
    }
  })

  test('an empty sky encodes to all zeros — which is why it compresses', () => {
    const enc = encodeStarfield([], 64)
    for (const f of enc.faces) expect(f.every((b) => b === 0)).toBe(true)
  })

  test('collision rate matches the birthday estimate', () => {
    // Filed in TODO as ~0.3% for 10k in a 512 cube. Assert the ORDER, not the
    // exact number — this is the claim the whole design rests on.
    const size = 512
    const objs: SkyObject[] = directions(10000).map(([x, y, z], i) => ({
      x,
      y,
      z,
      brightness: 0.1 + (i % 9) * 0.1,
      r: 1,
      g: 1,
      b: 1,
    }))
    const enc = encodeStarfield(objs, size)
    expect(enc.placed).toBeGreaterThan(9900)
    expect(enc.collided / objs.length).toBeLessThan(0.02)
  })
})

describe('the palette', () => {
  test('exactly 16 entries, because the index is a nibble', () => {
    expect(STAR_PALETTE.length).toBe(16)
  })

  test('maps a colour to its nearest entry', () => {
    for (let i = 0; i < STAR_PALETTE.length; i++) {
      const [r, g, b] = STAR_PALETTE[i]
      expect(paletteIndex(r, g, b)).toBe(i)
    }
  })

  test('emits GLSL the shader can compile, from the SAME numbers', () => {
    const glsl = paletteGlsl()
    expect(glsl).toContain('vec3[16]')
    // Every entry appears, so a drift between the two cannot hide.
    for (const c of STAR_PALETTE) expect(glsl).toContain(c[0].toFixed(3))
  })
})

describe('spectralGlsl', () => {
  test('emits only float literals — GLSL ES has no int→float conversion in expressions', () => {
    const src = spectralGlsl()
    // An integer with no digit, dot or word char on either side. `0.16` is
    // fine (digits attached to the dot), `vec3` is fine (attached to a
    // word); `vec3(1, 0.5)` is not — the 1 is a bare int and the shader
    // will not compile.
    expect(src).not.toMatch(/(?<![\w.])\d+(?![\w.])/)
    expect(src).toContain('vec3 b3dSpectral(float t)')
  })
})
