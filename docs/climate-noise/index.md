# climate-noise

The broad noise that makes one region of a world wetter or warmer than the
next, as a function both the ground shader and ordinary code can evaluate and
get the same answer.

A shader's hashed noise cannot be reproduced on the CPU: it depends on how each
GPU rounds `sin`. So the climate noise is a small grid of seeded random bytes.
The shader reads it as a texture, with the fraction eased and the linear filter
doing the blend; `climateNoise` does the same sum in code. That is what lets
the decorator put the forest where the ground is drawn green.

```javascript
import { climateLattice, climateNoise } from 'tosijs-3d'

const lattice = climateLattice()
const wetter = climateNoise(lattice, x * 0.001, z * 0.001) // about -1…1
```

The grid is 256 cells a side and wraps, so at one cell a kilometre the pattern
repeats every 256 km.
