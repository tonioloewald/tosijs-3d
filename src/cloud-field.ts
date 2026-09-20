/*#
# cloud-field

**One cloud field, sampled by everything that needs it.** A deck you can see, a
shadow on the ground, and a whiteout when you fly through it are three views of
the same weather — so they are three reads of one array rather than three
systems that have to be kept in agreement.

That agreement is the whole point. Recycling blobs cannot give it: the shadow
map is painted from where the blobs happen to be, so the shade underfoot never
quite belongs to the cloud overhead. Tonio: *"having a single decal (even if it
has less coverage) that is driven by the cloud shader logic seems like a
performance and appearance win."* It is both, and the appearance half is the
one you notice.

## Baked once, not evaluated per pixel

`cloudField` returns a **tileable** density array. Both consumers sample that
texture by world XZ rather than re-implementing the noise — which matters more
than it sounds, because the alternative is a pure TypeScript version and a GLSL
version that have to produce identical output forever. They would not. Every
"why is the shadow slightly off the cloud" bug lives in that gap, and baking
removes the gap rather than narrowing it.

`coverage` is deliberately NOT baked in. It is a threshold applied at sample
time, so weather is a live uniform on both the deck and its shadow and they
cannot disagree about it — clear to overcast with nothing regenerated.

## Tileable by construction

Sampled on a torus, the same trick `water-normal` uses: the 2D position is
mapped onto two circles in 4D and read from 3D noise, so the field wraps in both
axes with no seam to hide. A cloud deck has to repeat — it covers the sky — and
a visible tile boundary is worse than no clouds.
*/
/*{ "parent": "environment", "order": 920 }*/

import { PerlinNoise } from './perlin-noise.js'

export interface CloudFieldOptions {
  /** Edge of the square field, in texels. Powers of two are kindest to the GPU. */
  size?: number
  /** Noise seed — same seed, same weather. */
  seed?: number
  /** How many times the field repeats across its own width. Higher = smaller puffs. */
  frequency?: number
  /** fBm octaves. 4 is plenty for cloud; more just costs bake time. */
  octaves?: number
  /** Amplitude ratio between octaves. */
  persistence?: number
}

/**
 * A tileable cloud-density field in `[0,1]`, row-major, `size × size`.
 *
 * NO coverage threshold is applied — see the note above. This is the raw
 * density; what counts as cloud is decided at sample time by whoever is
 * looking, so the deck and its shadow share one live dial.
 */
export function cloudField(options: CloudFieldOptions = {}): Float32Array {
  const size = options.size ?? 256
  const frequency = options.frequency ?? 3
  const octaves = options.octaves ?? 4
  const persistence = options.persistence ?? 0.5
  const noise = new PerlinNoise(options.seed ?? 1337)

  const out = new Float32Array(size * size)
  let min = Infinity
  let max = -Infinity

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      /*
      ON A TORUS, so the field wraps. `u` and `v` go round two circles and the
      noise is read in 3D — the seam cannot exist rather than being hidden,
      which is the same construction `water-normal` uses and for the same
      reason.
      */
      const u = (x / size) * Math.PI * 2
      const v = (y / size) * Math.PI * 2
      let amp = 1
      let freq = frequency
      let sum = 0
      let norm = 0
      for (let o = 0; o < octaves; o++) {
        const r = freq / (Math.PI * 2)
        sum +=
          amp *
          noise.noise3D(
            r * Math.cos(u),
            r * Math.sin(u),
            r * Math.cos(v) + r * Math.sin(v)
          )
        norm += amp
        amp *= persistence
        freq *= 2
      }
      const value = sum / norm
      out[y * size + x] = value
      if (value < min) min = value
      if (value > max) max = value
    }
  }

  /*
  NORMALISE TO [0,1] AFTER THE FACT. fBm does not fill its nominal range — the
  octaves rarely align — so a field left raw sits in a narrow band around the
  middle and `coverage` then does almost nothing across most of its travel.
  Stretching to the observed extremes makes the dial behave the same whatever
  the seed and octave count happen to produce.
  */
  const span = max - min || 1
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) / span
  return out
}

/**
 * How much cloud is at a density, for a given `coverage` — the shared rule.
 *
 * `coverage` 0 is clear sky and 1 is solid overcast, and the SOFTNESS of the
 * edge matters as much as the threshold: a hard cut reads as torn paper, so
 * this ramps over a band and the band narrows as the sky fills in. Overcast
 * has no visible edges because there is nothing left to be the edge of.
 */
export function cloudOpacity(density: number, coverage: number): number {
  const c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage
  if (c <= 0) return 0
  if (c >= 1) return 1
  // Threshold falls as coverage rises: more of the field qualifies as cloud.
  const threshold = 1 - c
  const softness = 0.18 * (1 - c) + 0.02
  const t = (density - threshold + softness) / (softness * 2)
  return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t)
}
