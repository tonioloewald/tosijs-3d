# Noise texture

Shader noise **read instead of computed**. Arithmetic noise in a fragment
shader is the expensive way to get noise: eight hashed corners a sample, every
pixel, every frame, and a cloud pixel takes 54 samples. Reading a texture
replaces that with one fetch, and a mip-mapped texture also fades to its
average in the distance where computed noise shimmers. The ground shader
([[biome-plugin]]), planet surfaces and planet clouds use it.

## Noise volume

`noiseVolume` is a block of 3D gradient noise that **tiles in every
direction**, as bytes. It is pure (no engine, seeded), so the same seed is the
same ground everywhere.

```javascript
import { noiseVolume } from 'tosijs-3d'
const bytes = noiseVolume(64, 16) // 64 texels a side, repeating every 16 cells
```

A value is `0.5 + 0.5 * gain * n`, where `n` is the noise in about -0.9 to 0.9.
The average is 0.5, so a shader reads `texel * 2 - 1`.

## Value noise in GLSL

For value noise the lattice is a 3D texture with one random byte a point
(`latticeVolume`); the shader eases the fraction itself and the linear filter
does the eight-corner blend, so it is the same noise from one read. Neighbouring
cells always agree about a shared corner, which an arithmetic hash on a headset
GPU does not guarantee.

`NOISE_TEXTURE_GLSL` defines `b3dVn(p)` (0…1, like `b3dGgNoise`) and
`b3dVnFbm(p)` (like `b3dGgFbm`). With `B3D_NOISETEX` undefined (no 3D
textures: WebGL 1) they are the arithmetic ones, so it must come after
`GAS_GIANT_GLSL`.
