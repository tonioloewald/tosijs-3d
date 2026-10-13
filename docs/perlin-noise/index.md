# perlin-noise

**Seeded 3D Perlin noise.** The same seed always gives the same field, which
is what terrain, clouds and everything else procedural here is built on.

```javascript
import { PerlinNoise } from 'tosijs-3d/perlin-noise'

const noise = new PerlinNoise(1234) // always pass a seed
noise.noise3D(x, y, z) // about -1..1, smooth
noise.noise2D(x, y)
noise.fractal(x, y, z, 6, 0.5, 2) // octaves, persistence, lacunarity
```

Leave the seed out and you get a different field every time, which is rarely
what you want. Noise is 0 at every whole-number coordinate, so scale your
inputs (`x * 0.01`) and do not sample on the integer grid.
