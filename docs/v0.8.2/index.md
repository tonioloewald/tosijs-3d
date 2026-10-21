# 0.8.2

<!--{ "parent": "CHANGELOG", "order": 9991998 }-->

## Added

- **The encoded sky** — `starfield-codec` + `skybox-baker`. A starfield is data,
  not a picture: six small RGBA faces carry sub-texel position, gamma brightness
  and a spectral A-byte, decoded in the sky shader into points that stay points
  at any zoom. The shipped pair (256 smooth + 1024 data) renders a 100k-star
  galaxy at 25 MiB of VRAM and 0.4 MB on disk, against the 2.3 MB / 96 MiB
  raster it replaces. The A-byte spends precision where the eye is: faint stars
  are warm yellow, bright stars carry a 224-step spectral ramp, galaxy discs
  their size.
- **`png.ts`** — a lossless PNG encoder — and with it the package's first
  runtime dependency: **`fflate` (`^0.8.3`)** supplies the deflate, because
  Chrome's `CompressionStream` output is rejected by Chrome's own PNG decoder
  and the packed fields must survive byte-exact. The packed fields must survive
  byte-exact, and both the canvas path (premultiplied backing store) and
  Chrome's `CompressionStream` deflate destroy them; the encoder writes the
  bytes directly and a test round-trips through real inflate.
- **Distant dim stars** (`distantStars`, default 3000) — isotropic points
  outside the disc, so the off-band sky has texture instead of blankness.
- **`b3d-cloud-deck`** — the cloud DECK: a tiled field shader with one
  coverage dial driving transmission, gloom and depth; orographic clouds that
  ask the terrain for its own height sampler; a shared cloud shadow.
- **The `world-sim` page** — the kitchen sink: live-dialed terrain (sea level
  as a fraction of v-size), weather, and the encoded sky, under Demos.
- **`spectralGlsl`/`spectralRamp`/`spectralValue`** and the `generatePlanets`
  galaxy option — the colour follows the class, and planets (71% of galaxy
  generation time) are computed on demand via `generateStarSystem`.

## Changed

- **Galaxy generation is ~70× faster** — names derive from each star's own
  seed via a cheap PRNG (no collision retries, no name table), planets are
  on-demand, and the core nebulae are a fixed budget rather than a fraction.
- **The sky is one rigid frame** — the dome's rotation carries the gradient,
  the sun, the moon and the stars together; the star fade dies by gamma at the
  first hint of daylight, and the golden hour has two stops (amber, then a
  pink-red at the horizon crossing) feeding the deck's fringe and the fog
  through the light's colour.
- **The baker downloads ONE zip** — twelve separate downloads got silently
  dropped by the browser mid-burst.

## Fixed

- The biome classifier's sea level and lapse rate are LIVE dials — they
  move the snow line without re-cutting the tile pool (the shader reads the
  plugin params every bind; the old spelling regenerated the world for a
  value the shader never saw).
- The cloud-deck shadow survived field re-bakes (the shadow's sampler was
  left pointing at a disposed texture).
- The cloud-deck's core glow no longer blows out at high star counts.
- The sky shader compiles under the strictest decoders — floats in the
  generated GLSL now LOOK like floats.
