# magazine

**Rounds in the gun, and reloading**, pure. A magazine holds `capacity`
rounds; firing spends one; a reload takes `seconds` and then fills it from a
reserve (`take(n)` hands over up to n rounds, from the bag, say). Nothing in
the reserve, no reload. [b3d-launcher](/b3d-launcher/) uses it when its
`reloadTime` is set; without one a launcher's ammo regenerates instead
(`resource`), which suits an energy weapon or a turret.

```javascript
import { makeMagazine, fireRound, beginReload, tickMagazine } from 'tosijs-3d/magazine'

const mag = makeMagazine(12)
fireRound(mag) // true: 11 left
beginReload(mag, 1.2, 40) // 40 rounds in the bag
tickMagazine(mag, 1.2, (n) => n) // 'reloaded': 12 again (1 round taken)
```

A reload in progress blocks firing, and `cancelReload` (switching weapons)
leaves the magazine as it was.
