/*#
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
*/
/*{ "parent": "reference", "order": 22 }*/
/** Cells along each side of the lattice. A power of two, so it wraps as a texture. */
export const CLIMATE_CELLS = 256;
/**
 * Value noise is flatter-topped than the simplex noise it replaced, so the same
 * amplitude moved the climate further. This brings it back to about the same
 * spread, so amplitudes set before keep roughly their strength.
 */
export const CLIMATE_GAIN = 0.65;
/** One seeded random byte per lattice point, row by row. */
export function climateLattice(seed = 7) {
    let state = seed >>> 0 || 1;
    const out = new Uint8Array(CLIMATE_CELLS * CLIMATE_CELLS);
    for (let i = 0; i < out.length; i++) {
        // xorshift32: seeded, and the same in every engine.
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        out[i] = state >>> 24;
    }
    return out;
}
/** One octave: the lattice blended with an eased fraction, -1…1. */
export function climateOctave(lattice, x, y) {
    const n = CLIMATE_CELLS;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let fx = x - ix;
    let fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % n) + n) % n;
    const y0 = ((iy % n) + n) % n;
    const x1 = (x0 + 1) % n;
    const y1 = (y0 + 1) % n;
    const a = lattice[y0 * n + x0];
    const b = lattice[y0 * n + x1];
    const c = lattice[y1 * n + x0];
    const d = lattice[y1 * n + x1];
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return ((top + (bottom - top) * fy) / 255) * 2 - 1;
}
/**
 * The climate noise at a point: two octaves, about -1…1. The ground shader's
 * `bioClimate` is this sum, term for term.
 */
export function climateNoise(lattice, x, y) {
    return (CLIMATE_GAIN *
        (climateOctave(lattice, x, y) +
            0.5 * climateOctave(lattice, x * 2.03 + 17.7, y * 2.03 + 17.7)));
}
//# sourceMappingURL=climate-noise.js.map