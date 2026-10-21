/*
A block of 3D gradient noise that **tiles in every direction**, as bytes, for
a shader to sample from a texture instead of computing. Arithmetic noise in a
fragment shader is the expensive way to get noise: eight hashed corners a
sample, every pixel, every frame. One texture read replaces that, and a
mip-mapped texture also fades to its average in the distance where computed
noise shimmers.

The ground shader ([[biome-plugin]]) uses one for its fine detail. It is pure
(no engine, seeded), so the same seed is the same ground everywhere.

```javascript
import { noiseVolume } from 'tosijs-3d'
const bytes = noiseVolume(64, 16) // 64 texels a side, repeating every 16 cells
```

A value is `0.5 + 0.5 * gain * n`, where `n` is the noise in about -0.9 to 0.9.
The average is 0.5, so a shader reads `texel * 2 - 1`.
*/

/**
 * `size`³ bytes of gradient noise with `cells` lattice cells along each side
 * (`size` should be a multiple of `cells`). Sample `x + size*y + size*size*z`.
 */
export function noiseVolume(
  size = 64,
  cells = 16,
  seed = 1,
  gain = 1.3
): Uint8Array {
  // One unit gradient per lattice point, wrapped, so the block tiles.
  const grads = new Float32Array(cells * cells * cells * 3)
  let state = seed >>> 0 || 1
  const rand = () => {
    // xorshift32: seeded, and the same in every engine.
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
  for (let i = 0; i < grads.length; i += 3) {
    const z = rand() * 2 - 1
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    grads[i] = r * Math.cos(a)
    grads[i + 1] = r * Math.sin(a)
    grads[i + 2] = z
  }
  const corner = (
    ix: number,
    iy: number,
    iz: number,
    fx: number,
    fy: number,
    fz: number
  ) => {
    const g = 3 * ((ix % cells) + cells * ((iy % cells) + cells * (iz % cells)))
    return grads[g] * fx + grads[g + 1] * fy + grads[g + 2] * fz
  }
  const fade = (t: number) => t * t * (3 - 2 * t)
  const mix = (a: number, b: number, t: number) => a + (b - a) * t
  const out = new Uint8Array(size * size * size)
  const scale = cells / size
  let o = 0
  for (let z = 0; z < size; z++) {
    const pz = z * scale
    const iz = Math.floor(pz)
    const fz = pz - iz
    const wz = fade(fz)
    for (let y = 0; y < size; y++) {
      const py = y * scale
      const iy = Math.floor(py)
      const fy = py - iy
      const wy = fade(fy)
      for (let x = 0; x < size; x++) {
        const px = x * scale
        const ix = Math.floor(px)
        const fx = px - ix
        const wx = fade(fx)
        const n = mix(
          mix(
            mix(
              corner(ix, iy, iz, fx, fy, fz),
              corner(ix + 1, iy, iz, fx - 1, fy, fz),
              wx
            ),
            mix(
              corner(ix, iy + 1, iz, fx, fy - 1, fz),
              corner(ix + 1, iy + 1, iz, fx - 1, fy - 1, fz),
              wx
            ),
            wy
          ),
          mix(
            mix(
              corner(ix, iy, iz + 1, fx, fy, fz - 1),
              corner(ix + 1, iy, iz + 1, fx - 1, fy, fz - 1),
              wx
            ),
            mix(
              corner(ix, iy + 1, iz + 1, fx, fy - 1, fz - 1),
              corner(ix + 1, iy + 1, iz + 1, fx - 1, fy - 1, fz - 1),
              wx
            ),
            wy
          ),
          wz
        )
        out[o++] = Math.max(
          0,
          Math.min(255, Math.round(127.5 + 127.5 * gain * n))
        )
      }
    }
  }
  return out
}

/**
 * `cells`³ bytes of VALUE noise: one random value at each lattice point and
 * nothing between, wrapped, so it tiles. A shader eases the fraction and lets
 * the linear filter do the interpolation, which gives exactly the noise the
 * eight-hashed-corners arithmetic computes, from one read (`noise-texture`).
 */
export function latticeVolume(cells = 64, seed = 1): Uint8Array {
  let state = seed >>> 0 || 1
  const out = new Uint8Array(cells * cells * cells)
  for (let i = 0; i < out.length; i++) {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    out[i] = state >>> 24
  }
  return out
}

/**
 * Read a `noiseVolume` block in code the way the biome shader reads it as a
 * texture (four texels a lattice cell, the fraction eased, linear between
 * texels, wrapping): about -1…1. So a climate drawn from the block can be
 * worked out away from the GPU, by the decorator for one.
 */
export function sampleNoiseVolume(
  volume: Uint8Array,
  size: number,
  x: number,
  y: number,
  z: number
): number {
  const axis = (p: number): [number, number, number] => {
    const uv = p * 4 + 0.5
    const i = Math.floor(uv)
    const f = uv - i
    const lo = (((i - 1) % size) + size) % size
    return [lo, (lo + 1) % size, f * f * (3 - 2 * f)]
  }
  const [x0, x1, wx] = axis(x)
  const [y0, y1, wy] = axis(y)
  const [z0, z1, wz] = axis(z)
  const at = (ix: number, iy: number, iz: number) =>
    volume[ix + size * (iy + size * iz)]
  const mix = (a: number, b: number, t: number) => a + (b - a) * t
  const value = mix(
    mix(
      mix(at(x0, y0, z0), at(x1, y0, z0), wx),
      mix(at(x0, y1, z0), at(x1, y1, z0), wx),
      wy
    ),
    mix(
      mix(at(x0, y0, z1), at(x1, y0, z1), wx),
      mix(at(x0, y1, z1), at(x1, y1, z1), wx),
      wy
    ),
    wz
  )
  return (value / 255) * 2 - 1
}
