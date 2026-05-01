/*#
# mersenne-twister

Seeded pseudo-random number generator based on the Mersenne Twister
(MT19937) algorithm. Provides deterministic random sequences from a
numeric seed — same seed always produces the same sequence.

The `PRNG` class wraps `MersenneTwister` with convenience methods for
common random operations: integer/float ranges, gaussian distribution,
weighted selection, and probability checks.

## Demo

```js
import { PRNG } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, p, button, pre } = elements

let output = ''
const prng = new PRNG(42)

output += 'Seed: 42\n\n'
output += 'value():        ' + prng.value().toFixed(6) + '\n'
output += 'range(1, 100):  ' + prng.range(1, 100) + '\n'
output += 'realRange(0,1): ' + prng.realRange(0, 1).toFixed(6) + '\n'
output += 'gaussrandom():  ' + prng.gaussrandom().toFixed(6) + '\n'
output += 'probability(0.5): ' + prng.probability(0.5) + '\n'
output += 'pick([a,b,c]):  ' + prng.pick(['a', 'b', 'c']) + '\n'
output += 'pick weighted:  ' + prng.pick(['rare', 'common'], [1, 99]) + '\n\n'

output += 'Deterministic check (new PRNG(42)):\n'
const prng2 = new PRNG(42)
output += 'value():        ' + prng2.value().toFixed(6) + ' (same as above)\n'

preview.append(pre(output))
```

## API

### `MersenneTwister`

| Method | Returns | Description |
| --- | --- | --- |
| `constructor(seed?)` | | Create with optional seed (defaults to Date.now()) |
| `random()` | `number` | Random float in [0, 1) |
| `int32()` | `number` | Random 32-bit unsigned integer |

### `PRNG`

| Method | Returns | Description |
| --- | --- | --- |
| `constructor(seed)` | | Create with numeric seed |
| `value()` | `number` | Random float in [0, 1) |
| `range(min, max)` | `number` | Random integer in [min, max] |
| `realRange(min, max, skew?)` | `number` | Random float in [min, max) with optional skew function |
| `gaussrandom(dev?)` | `number` | Gaussian random with given standard deviation (default 1) |
| `probability(p)` | `boolean` | Returns true with probability p |
| `pick(array, weights?)` | `T` | Weighted random selection from array |

*/
/**
 * Mersenne Twister MT19937 pseudo-random number generator.
 *
 * Based on the C implementation by Takuji Nishimura and Makoto Matsumoto.
 * Copyright (C) 1997-2002 Makoto Matsumoto and Takuji Nishimura.
 * BSD licensed. JavaScript wrapper by Sean McCullough.
 */
export class MersenneTwister {
    N = 624;
    M = 397;
    MATRIX_A = 0x9908b0df;
    UPPER_MASK = 0x80000000;
    LOWER_MASK = 0x7fffffff;
    mt;
    mti;
    constructor(seed) {
        this.mt = new Array(this.N);
        this.mti = this.N + 1;
        this.initGenrand(seed ?? Date.now());
    }
    initGenrand(s) {
        this.mt[0] = s >>> 0;
        for (this.mti = 1; this.mti < this.N; this.mti++) {
            const prev = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
            this.mt[this.mti] =
                ((((prev & 0xffff0000) >>> 16) * 1812433253) << 16) +
                    (prev & 0x0000ffff) * 1812433253 +
                    this.mti;
            this.mt[this.mti] >>>= 0;
        }
    }
    /** Random 32-bit unsigned integer */
    int32() {
        let y;
        const mag01 = [0x0, this.MATRIX_A];
        if (this.mti >= this.N) {
            let kk;
            if (this.mti === this.N + 1) {
                this.initGenrand(5489);
            }
            for (kk = 0; kk < this.N - this.M; kk++) {
                y =
                    (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            for (; kk < this.N - 1; kk++) {
                y =
                    (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] =
                    this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            y =
                (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
            this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];
            this.mti = 0;
        }
        y = this.mt[this.mti++];
        // Tempering
        y ^= y >>> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >>> 18;
        return y >>> 0;
    }
    /** Random float in [0, 1) */
    random() {
        return this.int32() * (1.0 / 4294967296.0);
    }
}
/**
 * Seeded pseudo-random number generator with convenience methods.
 * Wraps MersenneTwister for deterministic random sequences.
 */
export class PRNG {
    mt;
    gaussContext;
    constructor(seed) {
        this.mt = new MersenneTwister(seed);
        this.gaussContext = { phase: 0, V1: 0, V2: 0, S: 0 };
    }
    /** Random float in [0, 1) */
    value() {
        return this.mt.random();
    }
    /** Random integer in [min, max] (inclusive) */
    range(min, max) {
        return Math.floor(this.value() * (max - min + 1) + min);
    }
    /** Returns true with probability p (0..1) */
    probability(p) {
        return this.value() < p;
    }
    /** Random float in [min, max) with optional skew function */
    realRange(min, max, skewFunction) {
        let v = this.value();
        if (skewFunction) {
            v = skewFunction(v);
        }
        return v * (max - min) + min;
    }
    /** Gaussian random using Box-Muller transform (per Knuth) */
    gaussrandom(dev = 1.0) {
        let X;
        const ctx = this.gaussContext;
        if (ctx.phase === 0) {
            do {
                ctx.V1 = this.realRange(-1, 1);
                ctx.V2 = this.realRange(-1, 1);
                ctx.S = ctx.V1 * ctx.V1 + ctx.V2 * ctx.V2;
            } while (ctx.S >= 1 || ctx.S === 0);
            X = ctx.V1 * Math.sqrt((-2 * Math.log(ctx.S)) / ctx.S);
        }
        else {
            X = ctx.V2 * Math.sqrt((-2 * Math.log(ctx.S)) / ctx.S);
        }
        ctx.phase = 1 - ctx.phase;
        return X * dev;
    }
    /** Weighted random selection from array */
    pick(array, weights) {
        let s = 0;
        let idx;
        if (weights !== undefined) {
            for (idx = 0; idx < weights.length; idx++) {
                s += weights[idx];
            }
            s = this.value() * s;
            for (idx = 0; idx < weights.length; idx++) {
                s -= weights[idx];
                if (s < 0) {
                    break;
                }
            }
        }
        else {
            idx = this.range(0, array.length - 1);
        }
        return array[idx];
    }
}
//# sourceMappingURL=mersenne-twister.js.map