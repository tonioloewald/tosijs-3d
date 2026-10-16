/*#
# Pseudo Random Numbers

**Randomness you can replay.** Everything procedural here (a galaxy, a
planet's craters, where the rocks go, who spawns) is drawn from a generator
started from a number, the SEED. Same seed, same numbers, in every browser,
so the same seed is the same world: you can share it, test it, and come back
to it.

Nothing here uses `Math.random()`. It cannot be seeded, so it can never give
you the same world twice, and it is not very random: the standard does not
say which algorithm it is, so its quality is whatever the browser shipped.
That has been bad. V8's before 2015 (MWC1616) had cycles short enough, and
patterns plain enough, to see in a picture of its output; engines are better
now, but "better now, in some browsers" is not something to build on.

We implement two generators, each for a job:

- **`PRNG`** (on **xoshiro128\*\***) for the general case: a stream of good
  numbers with convenience methods (ranges, a bell curve, weighted picks).
- **`CheapPRNG`** (on **mulberry32**) for derived data: one tiny generator
  per object, built, drawn from a few times, and dropped, millions of times
  over (a star's name and its details).

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

## Why these two

What we need from a generator, in order: the **same sequence everywhere**
(pure 32-bit integer arithmetic, `Math.imul` and shifts, so no engine's
floating point can change it), **seeded by one number**, then **cheap to
start**, and good enough statistically for games. Cryptographic strength is
not on the list: nothing here is a secret.

Measured in Bun, building one and drawing 8 numbers:

| Generator | State | Build + 8 draws | One draw |
| --- | --- | --- | --- |
| Mersenne Twister (MT19937) | 624 words | 13 µs | 0.02 µs |
| xoshiro128\*\* (`PRNG`) | 4 words | 0.09 µs | 0.01 µs |
| mulberry32 (`CheapPRNG`) | 1 word | 0.03 µs | 0.008 µs |

**xoshiro128\*\*** (Blackman and Vigna) is behind `PRNG` since 0.8.4. It
replaced the Mersenne Twister, which this page is named after: MT has a huge
state that it fills before its first draw, so merely starting one cost about
13 µs, and a star system starts one per planet while scoring candidate
systems starts thousands. xoshiro128\*\* starts about 150× faster, has a period
of 2¹²⁸, and passes the BigCrush and PractRand test batteries, which MT does
not (it fails the linear-complexity tests). Its one integer seed is spread
over its four words by splitmix32, which also keeps it out of the all-zero
state it could never leave.

**mulberry32** is smaller still: one 32-bit word, a few multiplies a draw. It
is weaker (a period of 2³², and each seed is one short stream), and that does
not matter for what it does: a handful of draws per star, each a pure
function of the star's seed. It is about 3× cheaper than xoshiro to start,
which counts at galaxy scale, and more to the point its output IS the galaxy:
star names and spectral details are drawn from it, so changing its engine
would rename every star. It stays.

**The Mersenne Twister** is still exported (`MersenneTwister`), for anyone
who needs the sequences it made before 0.8.4. Nothing here uses it.

A few places hash rather than generate: noise lattices (`noise-volume`,
`climate-noise`) fill bytes with xorshift32, and `latticeHash` turns a grid
point into a number directly. A hash answers "what is the number AT this
place" with no sequence to step through, which is what a texture or an
infinite grid needs.

## API

### `Xoshiro128`, `MersenneTwister`

The bare engines, for when you want numbers and nothing else.

| Method | Returns | Description |
| --- | --- | --- |
| `constructor(seed)` | | Create with a numeric seed (required: pass `Date.now()` for a different sequence each run) |
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


### `CheapPRNG`

The same surface as `PRNG` less `gaussrandom` (`value`, `range`,
`realRange`, `probability`, `pick`), on mulberry32. `RandomLike` is the part
both share, for a function that takes either.
*/
/*{ "parent": "reference", "order": 10 }*/
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
    /*
    The seed is REQUIRED (0.10). It used to default to `Date.now()`, which in a
    library whose promise is "same seed, same result" turned one forgotten
    argument into a different world every run, with nothing to say so. If you
    want a different sequence each time, say so: `new MersenneTwister(Date.now())`.
    */
    constructor(seed) {
        if (typeof seed !== 'number' || Number.isNaN(seed)) {
            throw new Error('MersenneTwister: a numeric seed is required (pass Date.now() if you want a different sequence each run)');
        }
        this.mt = new Array(this.N);
        this.mti = this.N + 1;
        this.initGenrand(seed);
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
 * xoshiro128** (Blackman & Vigna), seeded by splitmix32 — the engine behind
 * `PRNG` since 0.8.4.
 *
 * WHY NOT THE MERSENNE TWISTER. MT keeps what we like — deterministic
 * everywhere, seeded by one integer — but carries 624 words of state and
 * regenerates all of them before its first draw, so merely CONSTRUCTING one
 * cost ~13 µs. A star system builds one per planet, and scoring candidate
 * systems (GALAXY-DESIGN.md → interesting stars) builds thousands. This has 4
 * words of state: ~0.17 µs to construct and draw 8 (75× faster), and it
 * passes BigCrush and PractRand, which MT does not (it fails the
 * linear-complexity tests). Period 2¹²⁸, far past anything drawn here.
 *
 * Pure 32-bit integer maths (`Math.imul`, shifts), so the sequence is
 * identical in every JS engine. `MersenneTwister` stays exported for anyone
 * who needs the old sequences.
 */
export class Xoshiro128 {
    a;
    b;
    c;
    d;
    constructor(seed) {
        // splitmix32 spreads one integer across the four words, and never
        // produces the all-zero state xoshiro cannot leave.
        let s = seed >>> 0;
        const next = () => {
            s = (s + 0x9e3779b9) >>> 0;
            let z = s;
            z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
            z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
            return (z ^ (z >>> 16)) >>> 0;
        };
        this.a = next();
        this.b = next();
        this.c = next();
        this.d = next();
    }
    /** The next 32-bit unsigned integer — the reference `next()`. */
    int32() {
        const m = Math.imul(this.b, 5);
        const result = Math.imul((m << 7) | (m >>> 25), 9) >>> 0;
        const t = this.b << 9;
        this.c ^= this.a;
        this.d ^= this.b;
        this.b ^= this.c;
        this.a ^= this.d;
        this.c ^= t;
        this.d = (this.d << 11) | (this.d >>> 21);
        return result;
    }
    /** Random float in [0, 1) — the same 32-bit resolution MT's `random()` had. */
    random() {
        return this.int32() * (1.0 / 4294967296.0);
    }
}
export class PRNG {
    mt;
    gaussContext;
    constructor(seed) {
        this.mt = new Xoshiro128(seed);
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
    } /** Random float in [min, max) with optional skew function */
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
/**
 * mulberry32 — a tiny, FAST seeded PRNG for derived per-object data.
 *
 * Weaker than xoshiro128** (one 32-bit word, period 2³²); quality is not the
 * job. Derived data (a star's name, its spectral detail) wants one seeded
 * generator per object, built, drawn from a few times and dropped, at galaxy
 * scale: this starts about 3× cheaper than `Xoshiro128` (and ~500× cheaper
 * than the Mersenne Twister it was first measured against). And its output IS
 * the galaxy: swapping the engine would rename every star. Deterministic, like
 * everything else here.
 */
export class CheapPRNG {
    s;
    constructor(seed) {
        this.s = seed | 0;
    }
    /** Random float in [0, 1) */
    value() {
        this.s = (this.s + 0x6d2b79f5) | 0;
        let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /** Random integer in [min, max] (inclusive) */
    range(min, max) {
        return Math.floor(this.value() * (max - min + 1) + min);
    }
    /** Random float in [min, max) */
    realRange(min, max) {
        return this.value() * (max - min) + min;
    }
    /** Returns true with probability p (0..1) */
    probability(p) {
        return this.value() < p;
    }
    /** Weighted random selection from array — same surface as PRNG */
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