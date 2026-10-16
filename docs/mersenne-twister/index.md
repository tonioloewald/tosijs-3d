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
