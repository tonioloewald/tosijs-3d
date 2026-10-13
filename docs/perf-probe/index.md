# perf-probe

Pure, Babylon-free core for the device-capability probe (see
[b3d-probe](?b3d-probe.ts) for the component that actually runs the benchmark).

The philosophy is **measure, don't guess**: rather than sniffing user-agents, the
probe times a small battery of real GPU/CPU work, maps the raw milliseconds to a
quality *tier* and concrete *budgets* (terrain detail, shadow map size, render
scaling…), and caches the result in `localStorage`. This module owns everything
that doesn't touch the GPU — the classifier, the budget table, the storage schema,
the device signature, and the "should I re-run?" decision — so it's all unit
testable without a canvas (feed it synthetic numbers, assert the tier).

Re-run only when the benchmark itself changed (`PROBE_VERSION`), the device changed
(`signature`), or the cache is stale (`DEFAULT_TTL_MS`, 30 days — devices don't get
faster; the TTL is just a backstop for browser/driver updates and a bad cold read).

## Example

The pure classifier. [b3d-probe](?b3d-probe.ts) runs the benchmark and stores the result; this core
just turns measurements into a tier and its budgets:

```javascript
import { classify, budgetsForTier } from 'tosijs-3d'
// measurements → a device TIER ('low' | 'medium' | 'high' | 'hmd')
// tier → PerfBudgets (render scale, shadow-map size, terrain detail, …) that components resolve
// when their attribute is left `auto`.
```
