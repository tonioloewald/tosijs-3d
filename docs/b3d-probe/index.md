# b3d-probe

`<tosi-b3d-probe>` — a device-capability probe. Drop it anywhere (a landing page is
ideal) and on connect it times a short battery of real GPU/CPU work on a hidden
canvas, classifies the device into a quality tier + concrete budgets (via the pure
[perf-probe](?perf-probe.ts) core), and caches the result in `localStorage`. Every
`<tosi-b3d>` on the origin can then read those budgets to pick sensible defaults —
transparently dropping detail on a Quest-class device without user-agent voodoo.

It **skips the benchmark** and returns the cached budgets instantly when a recent
result exists for this device + probe version (see `perf-probe`'s re-run rules; TTL
is 30 days). A cached result — even a stale one — is dispatched immediately so
consumers never wait; a fresh measurement follows if a re-run is due.

The probe measures the FLAT pipeline (you can't open an immersive session without a
gesture); the XR tier is derived by biasing down one notch for stereo fill. This is
the *starting* tier — pair it with a runtime FPS-driven loop to handle thermal
throttling.

```js
import { elements } from 'tosijs'
import { b3dProbe } from 'tosijs-3d'

const output = elements.pre()

preview.append(
  b3dProbe({
    // tosijs binds on<Event> props via addEventListener — onProfile → 'profile'.
    onProfile(e) {
      const { tier, xrTier, budgets, xrBudgets, cached } = e.detail
      output.textContent = [
        `flat tier: ${tier}  (${cached ? 'cached' : 'measured'})`,
        JSON.stringify(budgets, null, 2),
        ``,
        `xr tier: ${xrTier}  (what a headset scene reads)`,
        JSON.stringify(xrBudgets, null, 2),
      ].join('\n')
    },
  }),
  output
)
```
