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