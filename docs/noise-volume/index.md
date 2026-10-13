# Noise volume

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
