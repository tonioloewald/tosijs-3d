# resource

**A pool that drains and refills, after a pause.** The one mechanic behind a
destroyable's health and a launcher's energy: it regenerates, but only once it
has been left alone for `regenDelay` seconds.

```javascript
import { makeResource, drain, regenTick, fraction } from 'tosijs-3d/resource'

const energy = makeResource({ max: 100, regenRate: 10, regenDelay: 2 })
drain(energy, 30) // now 70. Returns the overkill: what could not be taken (0 here)
regenTick(energy, 1) // nothing yet: still inside the delay
regenTick(energy, 1.5) // the delay has passed: 75
fraction(energy) // 0.75, for a meter
```

Also `refill`, `isEmpty` and `isFull`. Time only moves through `regenTick`,
so it is deterministic. See [[destroyable]].
