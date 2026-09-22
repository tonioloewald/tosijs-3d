/*#
# starfield-codec

**A starfield is DATA, not a picture — so store it as data.** Six small RGBA
faces where the channels are not colour but *position, brightness, colour index
and size*, one object per texel, decoded in the sky shader into points that are
sharp at any field of view.

Tonio: *"Given a starfield background is a very specific kind of image I imagine
we could encode something very efficient in say a 512 or 1024 map by treating
the values as data."*

## Why, in numbers

A baked sky is a raster of something almost entirely empty. The shipped 2048
cube carries **25 million texels to describe about ten thousand stars**, and it
is 2048 only because stars smeared at 1024 — the nebulae never needed it.

| | raster | data |
| --- | --- | --- |
| VRAM | 96 MiB (2048 cube) | 24 MiB (1024 cube) |
| on disk | 2.3 MB | a few hundred KB |
| sharpness | fixed pixels — blurs as you zoom | **resolution-independent** |

The third row is the one that matters. A raster star is a smear of pixels baked
at one resolution; a decoded star is a point evaluated per fragment, so it stays
a point at any FOV. That is what 2048 was trying to buy and could not.

## The split is POINT-LIKE vs SMOOTH — measured, not assumed

Baking the nebula system alone at 256 and 1024 and comparing:

| | 256 | 1024 |
| --- | --- | --- |
| mean luminance | 3.838 | 3.839 |
| bright texels | 0.615% | 0.624% |
| peak luminance | 196 | 238 |

Energy and bright-area survive a 256 map almost exactly. What 256 costs is
PEAK, and it costs it on the point-like content — so nebulae belong in a small
smooth cube, while stars **and distant galaxies** belong here. A distant galaxy
is a small disc rather than a point, which is what the `size` field is for: the
same four bytes doing slightly more work rather than a third mechanism.

## Crowded texels PACK rather than drop

The encoding is a spatial hash, so objects can land on the same texel. The
birthday estimate says that is rare — and the birthday estimate assumes an
evenly spread sky, which **a galaxy is the exact opposite of**. Measured against
the real generator, one object per texel loses 21% of a galaxy at 512 and 7% at
1024, not the fractions of a percent the formula promises.

So a crowded texel switches layout instead: `B = 255` marks three objects at
eight bits each (`uu vv bbb c`), which recovers essentially all of them.

| cap | kept at 512 | kept at 1024 |
| --- | --- | --- |
| 1 | 78.8% | 93.0% |
| 2 | 93.7% | 99.1% |
| **3** | **98.0%** | 99.8% |

Crude on purpose: this layout only ever applies where objects are already inside
one texel of each other, which is the dense core, where they merge into a blur
and what survives is aggregate brightness rather than any individual star. And
what a full texel does drop is still chosen rather than arbitrary — **brightest
first**, so the loss lands on the faintest.

## The layout

| channel | carries |
| --- | --- |
| R | sub-texel u, so position survives the quantisation |
| G | sub-texel v |
| B | brightness, gamma-encoded. **`0` means empty** — that is what makes a mostly-black sky compress |
| A | `size` in the high nibble, palette index in the low |

## ⚠️ The face convention is load-bearing

Encoder and shader must agree about which face a direction lands on and which
way u and v run, or every star is in the wrong place — and it will look
plausible, because a wrong starfield is still a starfield. {@link dirToFace}
implements the OpenGL cube convention that `textureCube` uses, and
{@link faceToDir} inverts it; `starfield-codec.test.ts` round-trips random
directions through both, which is the only way this stays honest.
*/
/*{ "parent": "space", "order": 430 }*/

/** A thing in the sky: a star, or a distant galaxy. */
export interface SkyObject {
  /** Direction from the viewer. Need not be normalised. */
  x: number
  y: number
  z: number
  /** 0…1. Gamma-encoded into 8 bits — see `BRIGHT_GAMMA`. */
  brightness: number
  /** 0…1 red, green, blue. Quantised to {@link STAR_PALETTE}. */
  r: number
  g: number
  b: number
  /**
   * Angular radius as a fraction of `sizeScale`, 0…1. A star is 0 (a point);
   * a distant galaxy is a small disc.
   */
  size?: number
}

/** `px nx py ny pz nz` — the `CubeTexture` file suffixes, in GL face order. */
export const FACE_NAMES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const

/**
 * Brightness is stored as `value^GAMMA`, which spends the 8 bits where the eye
 * is rather than where the arithmetic is.
 *
 * Star flux is `10^(-0.4·m)`, so a magnitude range of 1…12 spans 25,000:1.
 * Linear 8-bit would put 254 of its 255 codes in the brightest 1% of that and
 * quantise everything else to nothing. At 0.5 the faintest code lands around
 * 1.5e-5 of full, which covers the range with room to spare.
 */
export const BRIGHT_GAMMA = 0.5

/**
 * `B === 255` marks a PACKED texel: three crude stars instead of one precise
 * one. Precise brightness is therefore capped at 254, which costs the top
 * 0.4% of one channel and buys the dense core.
 */
export const PACKED_FLAG = 255

/**
 * How many objects a packed texel holds. Three, chosen by MEASUREMENT rather
 * than by what fits — the occupancy histogram of a real galaxy is what picked
 * it, and 24 bits happening to divide by three is luck.
 *
 * | cap | kept at 512 | kept at 1024 |
 * | --- | --- | --- |
 * | 1 | 78.8% | 93.0% |
 * | 2 | 93.7% | 99.1% |
 * | **3** | **98.0%** | 99.8% |
 * | 4 | 99.3% | 99.9% |
 *
 * Three is where the curve flattens, and it takes a real galaxy from 21% lost
 * to essentially none.
 *
 * ⚠️ **But packing trades position for capacity, and at 512 that shows.** A
 * packed object keeps only a QUARTER-texel position, and when a texel spans
 * several screen pixels the quantisation becomes a visible lattice through the
 * dense band — measured by looking, not predicted. At 1024 a texel is half as
 * wide and the lattice disappears.
 *
 * So: **1024 is the size to ship** (24 MiB, nothing lost), and 512 is for
 * sparser skies or wider fields of view, where the core never gets close
 * enough to the eye for a quarter of a texel to matter.
 */
export const PACKED_CAPACITY = 3

/**
 * Sixteen colours, because a star is not any colour — it is a blackbody, and
 * they run along one line from blue-white to orange-red.
 *
 * The last four are the distant-galaxy range (pale yellow to orange), which
 * shares no part of the stellar line on purpose: those are old populations seen
 * through redshift, and nothing out there is blue.
 *
 * ⚠️ The shader builds its palette from this array via {@link paletteGlsl}, so
 * there is exactly one copy of these numbers.
 */
export const STAR_PALETTE: Array<[number, number, number]> = [
  [0.61, 0.69, 1.0],
  [0.67, 0.75, 1.0],
  [0.78, 0.84, 1.0],
  [0.86, 0.9, 1.0],
  [0.94, 0.95, 1.0],
  [1.0, 0.99, 0.98],
  [1.0, 0.96, 0.89],
  [1.0, 0.92, 0.8],
  [1.0, 0.87, 0.7],
  [1.0, 0.8, 0.6],
  [1.0, 0.72, 0.5],
  [1.0, 0.62, 0.4],
  // Distant galaxies: warm, and deliberately off the stellar line.
  [1.0, 0.93, 0.78],
  [1.0, 0.88, 0.68],
  [1.0, 0.82, 0.58],
  [1.0, 0.75, 0.48],
]

/** Which cube face a direction lands on, and where on it. */
export interface FaceUv {
  /** Index into {@link FACE_NAMES}. */
  face: number
  /** 0…1 across the face. */
  u: number
  v: number
}

/**
 * Direction → face and uv, in the OpenGL cube-map convention.
 *
 * Written out rather than derived, because this is the piece that silently
 * ruins everything if it disagrees with `textureCube` by a sign. The major
 * axis picks the face; the other two become u and v with the signs the spec
 * gives, and both are mapped from −1…1 into 0…1 at the end.
 */
export function dirToFace(x: number, y: number, z: number): FaceUv {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const az = Math.abs(z)
  let face: number
  let sc: number
  let tc: number
  let ma: number
  if (ax >= ay && ax >= az) {
    if (x > 0) {
      face = 0
      sc = -z
      tc = -y
    } else {
      face = 1
      sc = z
      tc = -y
    }
    ma = ax
  } else if (ay >= az) {
    if (y > 0) {
      face = 2
      sc = x
      tc = z
    } else {
      face = 3
      sc = x
      tc = -z
    }
    ma = ay
  } else {
    if (z > 0) {
      face = 4
      sc = x
      tc = -y
    } else {
      face = 5
      sc = -x
      tc = -y
    }
    ma = az
  }
  const inv = ma === 0 ? 0 : 0.5 / ma
  return { face, u: sc * inv + 0.5, v: tc * inv + 0.5 }
}

/**
 * Face and uv → direction. The exact inverse of {@link dirToFace}, and tested
 * as one: a convention that is only implemented once cannot be checked.
 */
export function faceToDir(
  face: number,
  u: number,
  v: number
): { x: number; y: number; z: number } {
  const s = u * 2 - 1
  const t = v * 2 - 1
  switch (face) {
    case 0:
      return { x: 1, y: -t, z: -s }
    case 1:
      return { x: -1, y: -t, z: s }
    case 2:
      return { x: s, y: 1, z: t }
    case 3:
      return { x: s, y: -1, z: -t }
    case 4:
      return { x: s, y: -t, z: 1 }
    default:
      return { x: -s, y: -t, z: -1 }
  }
}

/** Nearest entry in {@link STAR_PALETTE}, by squared distance. */
export function paletteIndex(r: number, g: number, b: number): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < STAR_PALETTE.length; i++) {
    const p = STAR_PALETTE[i]
    const d =
      (p[0] - r) * (p[0] - r) + (p[1] - g) * (p[1] - g) + (p[2] - b) * (p[2] - b)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

export interface EncodedStarfield {
  /** Six `size × size × 4` RGBA faces, in {@link FACE_NAMES} order. */
  faces: Uint8Array[]
  size: number
  /** How many objects were written. */
  placed: number
  /** How many were dropped because a brighter one already held the texel. */
  collided: number
}

/**
 * Encode a sky into six RGBA faces.
 *
 * Objects are placed in whichever texel their direction falls in, with the
 * sub-texel position kept in R and G so the quantisation costs accuracy rather
 * than position. **Brighter wins a contested texel** — so what a collision
 * costs is always the fainter of two things already within one texel of each
 * other.
 */
export function encodeStarfield(
  objects: SkyObject[],
  size = 512
): EncodedStarfield {
  const faces: Uint8Array[] = []
  for (let i = 0; i < 6; i++) faces.push(new Uint8Array(size * size * 4))
  let placed = 0
  let collided = 0

  /*
  BUCKET FIRST, then choose a mode per texel — rather than writing as we go and
  discarding losers.

  A one-pass encoder cannot know whether a texel will end up holding one object
  or four, so it has to commit to the precise layout on the first write and drop
  everything after. Counting first means a crowded texel can switch to the
  packed layout and keep three, which is what takes the real galaxy from 21%
  lost to 2% at 512.
  */
  const buckets = new Map<number, SkyObject[]>()
  const stride = size * size
  for (const o of objects) {
    const len = Math.hypot(o.x, o.y, o.z)
    if (!(len > 0)) continue
    const { face, u, v } = dirToFace(o.x / len, o.y / len, o.z / len)
    // Clamp rather than wrap: a direction exactly on a face edge is legal and
    // must not land on the opposite side of the face.
    const fx = Math.min(size - 1e-6, Math.max(0, u * size))
    const fy = Math.min(size - 1e-6, Math.max(0, v * size))
    const ix = Math.floor(fx)
    const iy = Math.floor(fy)
    const key = face * stride + iy * size + ix
    const at = buckets.get(key)
    // Carry the sub-texel position along rather than recomputing it later.
    const tagged = { ...o, x: fx - ix, y: fy - iy, z: 0 } as SkyObject
    if (at == null) buckets.set(key, [tagged])
    else at.push(tagged)
  }

  for (const [key, group] of buckets) {
    const face = Math.floor(key / stride)
    const rest = key - face * stride
    const p = rest * 4
    const buf = faces[face]
    // Brightest first: whatever a crowded texel has to drop should be faintest.
    group.sort((a, b) => b.brightness - a.brightness)
    placed += Math.min(group.length, group.length === 1 ? 1 : PACKED_CAPACITY)
    collided += Math.max(
      0,
      group.length - (group.length === 1 ? 1 : PACKED_CAPACITY)
    )

    if (group.length === 1) {
      const o = group[0]
      const sizeNibble = Math.min(15, Math.max(0, Math.round((o.size ?? 0) * 15)))
      buf[p] = Math.round(o.x * 255)
      buf[p + 1] = Math.round(o.y * 255)
      // 254, not 255 — that code is the packed flag.
      buf[p + 2] = Math.min(
        PACKED_FLAG - 1,
        Math.max(1, Math.round(255 * Math.pow(Math.max(0, Math.min(1, o.brightness)), BRIGHT_GAMMA)))
      )
      buf[p + 3] = (sizeNibble << 4) | paletteIndex(o.r, o.g, o.b)
      continue
    }

    /*
    PACKED: three objects at eight bits each, in R, G and A.

      uu(2) vv(2) bbb(3) c(1)

    Quarter-texel position, eight brightness levels, one bit of colour. Crude on
    purpose — this layout only ever applies where objects are ALREADY within one
    texel of each other, which is the dense core, where they merge into a blur
    and what survives is aggregate brightness rather than any individual star.
    */
    const slots = [p, p + 1, p + 3]
    for (let i = 0; i < PACKED_CAPACITY; i++) {
      const o = group[i]
      if (o == null) {
        buf[slots[i]] = 0
        continue
      }
      const uu = Math.min(3, Math.floor(o.x * 4))
      const vv = Math.min(3, Math.floor(o.y * 4))
      const bb = Math.min(
        7,
        Math.max(0, Math.round(8 * Math.pow(Math.max(0, Math.min(1, o.brightness)), BRIGHT_GAMMA)) - 1)
      )
      // One bit: warm or cool, taken from the same palette the precise path uses.
      const c = paletteIndex(o.r, o.g, o.b) >= 6 ? 1 : 0
      buf[slots[i]] = (uu << 6) | (vv << 4) | (bb << 1) | c
    }
    buf[p + 2] = PACKED_FLAG
  }
  return { faces, size, placed, collided }
}

/** One decoded object, as the shader would reconstruct it. */
export interface DecodedObject {
  x: number
  y: number
  z: number
  brightness: number
  r: number
  g: number
  b: number
  size: number
}

/**
 * Decode one texel back into the objects it holds — none, one, or up to
 * {@link PACKED_CAPACITY}.
 *
 * Exists so the round trip can be TESTED without a GPU. The shader does the
 * same arithmetic; this is what pins it down, because a decode that only exists
 * in GLSL can only be checked by looking at a sky and deciding it seems fine.
 */
export function decodeTexel(
  faces: Uint8Array[],
  size: number,
  face: number,
  ix: number,
  iy: number
): DecodedObject[] {
  const p = (iy * size + ix) * 4
  const buf = faces[face]
  const flag = buf[p + 2]
  if (flag === 0) return []

  const at = (su: number, sv: number, bright: number, pal: [number, number, number], sz: number) => {
    const d = faceToDir(face, (ix + su) / size, (iy + sv) / size)
    const len = Math.hypot(d.x, d.y, d.z)
    return {
      x: d.x / len, y: d.y / len, z: d.z / len,
      brightness: bright, r: pal[0], g: pal[1], b: pal[2], size: sz,
    }
  }

  if (flag !== PACKED_FLAG) {
    return [
      at(
        buf[p] / 255,
        buf[p + 1] / 255,
        Math.pow(flag / 255, 1 / BRIGHT_GAMMA),
        STAR_PALETTE[buf[p + 3] & 0x0f],
        (buf[p + 3] >> 4) / 15
      ),
    ]
  }

  // Packed: three crude objects in R, G and A — see `encodeStarfield`.
  const out: DecodedObject[] = []
  for (const slot of [p, p + 1, p + 3]) {
    const bits = buf[slot]
    if (bits === 0) continue
    const uu = (bits >> 6) & 3
    const vv = (bits >> 4) & 3
    const bb = (bits >> 1) & 7
    const c = bits & 1
    out.push(
      at(
        (uu + 0.5) / 4,
        (vv + 0.5) / 4,
        Math.pow((bb + 1) / 8, 1 / BRIGHT_GAMMA),
        STAR_PALETTE[c === 1 ? 9 : 3],
        0
      )
    )
  }
  return out
}

/**
 * The palette as a GLSL array literal, so the shader and this module cannot
 * drift. Emitted rather than transcribed for the same reason the density field
 * is baked rather than re-implemented.
 */
export function paletteGlsl(name = 'STAR_PALETTE'): string {
  const rows = STAR_PALETTE.map(
    (c) => `vec3(${c[0].toFixed(3)}, ${c[1].toFixed(3)}, ${c[2].toFixed(3)})`
  ).join(', ')
  return `const vec3 ${name}[16] = vec3[16](${rows});`
}
