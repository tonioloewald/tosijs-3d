# b3d-quality

The **system quality proxy** — the single place that vends device-appropriate
defaults. The [probe](?b3d-probe.ts) measures the device and feeds a
[`PerfProfile`](?perf-probe.ts) in here; components then resolve any attribute left
at its `auto` sentinel against the current budgets. A global override (`setQuality`)
lets a settings menu force a tier.

This module is deliberately DOM-free (plain state + an observer list, no tosijs
import) so all of its logic is unit-testable headless — the pure-module ethos the
rest of the framework follows.

## The `auto` default convention

Components declare performance-sensitive attributes with an **`auto` sentinel**
(`0` for numbers) instead of a hard-wired number, and resolve them here:

```typescript
// in a component's setup:
const subs = resolveBudget(this.hiResSubdivisions, 'hiResSubdivisions', { xr })
//           explicit author value wins; 0 (auto) → the tier's budget
```

So an author who sets a value gets exactly that; everything left unset adapts to
the measured device. **This is the pattern to reach for wherever you find a
hard-wired default that affects performance** (terrain detail, shadow map size,
reflection resolution, render scaling…): make the default `auto` and resolve it,
rather than baking one number that's wrong for both a phone and a workstation.

## Global override

```javascript
import { setQuality, getQuality } from 'tosijs-3d'

setQuality('low')            // force low everywhere
setQuality('auto')           // back to the measured profile (default)
// a settings <select> calls setQuality(e.target.value) and reads getQuality()
```

## Budgets that are sized once: `headsetDevice()`

A scene is built flat, before any session starts, so a budget that is read
once at build (terrain detail, a pool size, a shadow map) is resolved for the
flat tier and then drawn twice in stereo. On a standalone headset that is the
wrong tier for the whole session. For those, pass `headsetDevice()` as `xr`:

```javascript
import { resolveBudget, headsetDevice } from 'tosijs-3d'

const subs = resolveBudget(this.subdivisions, 'hiResSubdivisions', {
  xr: headsetDevice(),
})
```

It is true on a standalone headset (a Quest), false on a PC driving one. A
budget re-read every frame does not need it: pass the live `xr` state there.
