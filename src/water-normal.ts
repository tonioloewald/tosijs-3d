/*#
# water-normal

**A tiling water normal map, generated rather than downloaded.** Perlin height
field → per-texel surface normal → a `DynamicTexture` Babylon's `WaterMaterial`
can use as its bump map.

## Why generate it

`b3dWater` used to default to `/waterbump.png`, a file that ships in this
repo's `static/` and **not in the published package** — so every consumer taking
the default pointed at something they had never been told to serve
(tosijs-3d#46). Worse, the failure is invisible: Babylon falls back when a
texture does not decode, so the sea renders as a **checkerboard**, which looks
deliberate. It was reported as "is the water supposed to look like a
checkerboard (it actually looks awesome so if it's deliberate… kudos)".

Shipping the PNG would have fixed the missing file and left the real problem —
a default that depends on a fixed URL resolving in someone else's app. This has
no file, no network and no path: it works offline, in a headset, and in a test.

## Tiling matters more than beauty

A water bump map is scrolled and repeated across a large plane, so a seam is
visible everywhere at once. The noise is therefore sampled on a **torus** —
each axis wrapped through a full period — which makes the result tile exactly
by construction rather than by blending edges and hoping.
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { PerlinNoise } from './perlin-noise'

/**
 * Height at `(u, v)` on a torus, so the field repeats exactly over `[0,1)²`.
 *
 * Two-dimensional noise cannot tile: it has no period. Sampling a CIRCLE in
 * each axis (a 4-D idea done with two 2-D lookups summed) gives a field whose
 * opposite edges are the same samples, so the tile is seamless because it is
 * literally the same data, not because a blend hid the join.
 */
export function tileHeight(
  noise: PerlinNoise,
  u: number,
  v: number,
  octaves = 3
): number {
  let h = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    const a = Math.cos(u * Math.PI * 2) * freq
    const b = Math.sin(u * Math.PI * 2) * freq
    const c = Math.cos(v * Math.PI * 2) * freq
    const d = Math.sin(v * Math.PI * 2) * freq
    h += (noise.noise2D(a, c) + noise.noise2D(b, d)) * 0.5 * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return h / (norm || 1)
}

/**
 * Encode a height field as a tangent-space normal map into `rgba`.
 *
 * Pure and Babylon-free so the maths is testable: the slope is a central
 * difference, and the normal is `(-dx, -dy, 1)` normalised into the usual
 * 0..255 encoding with +Z as the flat direction.
 */
export function writeNormalMap(
  rgba: Uint8ClampedArray,
  size: number,
  height: (u: number, v: number) => number,
  strength = 2
): void {
  const step = 1 / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      // Wrapped central differences — the seam has to be differentiable too,
      // or the tile shows a hard line exactly where it repeats.
      const dx = height((u + step) % 1, v) - height((u - step + 1) % 1, v)
      const dy = height(u, (v + step) % 1) - height(u, (v - step + 1) % 1)
      let nx = -dx * strength
      let ny = -dy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      const i = (y * size + x) * 4
      rgba[i] = Math.round((nx * 0.5 + 0.5) * 255)
      rgba[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      rgba[i + 2] = Math.round((nz / len) * 0.5 * 255 + 127.5)
      rgba[i + 3] = 255
    }
  }
}

/**
 * The built-in water bump map. Seeded, so every run and every client gets the
 * same sea — a texture that differed per session would make a scene
 * irreproducible for no benefit.
 */
export function waterNormalTexture(
  scene: BABYLON.Scene,
  size = 256,
  seed = 1337
): BABYLON.DynamicTexture {
  const tex = new BABYLON.DynamicTexture(
    'w3d-water-normal',
    { width: size, height: size },
    scene,
    false
  )
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const img = ctx.createImageData(size, size)
  const noise = new PerlinNoise(seed)
  writeNormalMap(img.data as unknown as Uint8ClampedArray, size, (u, v) =>
    tileHeight(noise, u, v)
  )
  ctx.putImageData(img, 0, 0)
  tex.update(false)
  tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
  tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
  return tex
}
