/*#
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
*/
/*{ "parent": "b3d-launcher" }*/

export interface Magazine {
  capacity: number
  loaded: number
  /** Seconds until a reload finishes; 0 when not reloading. */
  reloadLeft: number
}

export function makeMagazine(capacity: number, loaded = capacity): Magazine {
  return { capacity, loaded: Math.max(0, Math.min(capacity, loaded)), reloadLeft: 0 }
}

export const reloading = (m: Magazine) => m.reloadLeft > 0

/** Spend a round. False when empty or reloading. */
export function fireRound(m: Magazine): boolean {
  if (m.loaded <= 0 || reloading(m)) return false
  m.loaded--
  return true
}

/**
 * Start reloading, `seconds` long. False (nothing starts) when it is full,
 * already reloading, or the reserve (`available` rounds) is empty.
 */
export function beginReload(m: Magazine, seconds: number, available: number): boolean {
  if (reloading(m) || m.loaded >= m.capacity || available <= 0) return false
  m.reloadLeft = Math.max(1e-6, seconds)
  return true
}

/** Stop a reload; the magazine keeps what it had. */
export function cancelReload(m: Magazine): void {
  m.reloadLeft = 0
}

/**
 * Advance `dt` seconds; when a reload finishes, fill from `take(n)` (which
 * hands over up to n) and return `'reloaded'`.
 */
export function tickMagazine(
  m: Magazine,
  dt: number,
  take: (n: number) => number
): 'reloaded' | null {
  if (!reloading(m)) return null
  m.reloadLeft = Math.max(0, m.reloadLeft - dt)
  if (m.reloadLeft > 0) return null
  const got = Math.max(0, Math.min(m.capacity - m.loaded, take(m.capacity - m.loaded)))
  m.loaded += got
  return 'reloaded'
}

/** A new capacity (a different gun in the same hand): what is loaded is kept, up to it. */
export function setCapacity(m: Magazine, capacity: number): void {
  m.capacity = capacity
  m.loaded = Math.min(m.loaded, capacity)
}
