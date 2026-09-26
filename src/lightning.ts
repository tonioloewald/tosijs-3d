/*#
# lightning

The pure half of lightning (WEATHER-DESIGN stage 3, board #1123): WHEN and
WHERE strikes happen, what shape a bolt takes, and how long the thunder takes
to arrive. No Babylon; [[b3d-lightning]] draws and sounds it.

**Strikes are seeded.** Time is cut into short slots, and each slot of each
storm cell either strikes or not by a hash of (seed, cell, slot), with a
chance set by the cell's `storminess`. So the same seed gives the same storm
every run, a strike never depends on frame rate, and asking "what struck
between t0 and t1" is a pure question the simulation can ask too.

**Three kinds**, because a storm is not one flash:

| kind | where | share |
| --- | --- | --- |
| `ground` | cloud to ground: a bolt, the brightest flash, thunder | most |
| `cloud` | inside the cloud: the tower lit from within, no bolt | many |
| `sprite` | ABOVE the storm, 50–90 km up in reality: brief red-pink crowns and tendrils, only over strong storms | rare |
*/
/*{ "parent": "Environment" }*/

/** A storm, as far as lightning cares. */
export interface StormSource {
  /** Stable id, so its strikes are its own (seeding). */
  id: number
  at: { x: number; z: number }
  radius: number
  /** 0–1 lightning likelihood (the weather cell's `storminess` × strength). */
  storminess: number
}

export type StrikeKind = 'ground' | 'cloud' | 'sprite'

export interface Strike {
  /** When it happens, in the same clock the scheduler was asked in. */
  t: number
  kind: StrikeKind
  x: number
  z: number
  /** Which storm made it. */
  storm: number
  /** A per-strike seed for its shape (bolt path, sprite tendrils). */
  seed: number
}

/** The scheduler's resolution: one draw per storm per slot. */
export const STRIKE_SLOT = 0.25
/** Strikes per second over a storm at storminess 1. */
export const MAX_RATE = 0.6
/** Speed of sound, for thunder (m/s). */
export const SOUND_SPEED = 343

/** Integer hash → [0, 1). Deterministic on every machine. */
export function hash01(a: number, b: number, c: number, d = 0): number {
  // xxHash32-style: each input folded in with its own prime, then a full
  // avalanche. A weaker mix correlated the "does this slot strike" draw with
  // the "what kind" draw, and no sprite ever appeared in 400 strikes.
  let h = Math.imul(a | 0, 0x9e3779b1) ^ 0x165667b1
  h = Math.imul((h ^ Math.imul(b | 0, 0x85ebca77)) >>> 0, 0xc2b2ae3d)
  h = (h << 13) | (h >>> 19)
  h = Math.imul((h ^ Math.imul(c | 0, 0x27d4eb2f)) >>> 0, 0x165667b1)
  h = (h << 17) | (h >>> 15)
  h = Math.imul((h ^ Math.imul(d | 0, 0x61c88647)) >>> 0, 0x85ebca77)
  h ^= h >>> 15
  h = Math.imul(h, 0xc2b2ae3d)
  h ^= h >>> 13
  h = Math.imul(h, 0x27d4eb2f)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/**
 * Every strike in [t0, t1), from these storms. Pure and seeded: the same
 * arguments always give the same strikes, and splitting an interval in two
 * gives exactly the strikes of the whole (slots are aligned to absolute time).
 */
export function strikesBetween(
  storms: readonly StormSource[],
  t0: number,
  t1: number,
  seed = 1
): Strike[] {
  const out: Strike[] = []
  if (!(t1 > t0)) return out
  const s0 = Math.floor(t0 / STRIKE_SLOT)
  const s1 = Math.ceil(t1 / STRIKE_SLOT)
  for (const storm of storms) {
    const p =
      Math.min(1, Math.max(0, storm.storminess)) * MAX_RATE * STRIKE_SLOT
    if (p <= 0) continue
    for (let slot = s0; slot < s1; slot++) {
      if (hash01(seed, storm.id, slot, 1) >= p) continue
      const t = (slot + hash01(seed, storm.id, slot, 2)) * STRIKE_SLOT
      if (t < t0 || t >= t1) continue
      // Nearer the core than the rim: sqrt of a uniform would be uniform over
      // the disc; the square keeps strikes where the storm is strongest.
      const r = storm.radius * hash01(seed, storm.id, slot, 3) ** 1.6
      const a = hash01(seed, storm.id, slot, 4) * Math.PI * 2
      const roll = hash01(seed, storm.id, slot, 5)
      // Sprites only over STRONG storms, and rarely even then.
      const kind: StrikeKind =
        storm.storminess > 0.6 && roll < 0.05
          ? 'sprite'
          : roll < 0.55
          ? 'ground'
          : 'cloud'
      out.push({
        t,
        kind,
        x: storm.at.x + Math.cos(a) * r,
        z: storm.at.z + Math.sin(a) * r,
        storm: storm.id,
        seed: Math.floor(hash01(seed, storm.id, slot, 6) * 2 ** 31),
      })
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

/** Seconds from a strike at `distance` metres until its thunder arrives. */
export function thunderDelay(distance: number): number {
  return Math.max(0, distance) / SOUND_SPEED
}

type V3 = { x: number; y: number; z: number }

/**
 * A bolt: a jagged channel from `top` to `bottom`, plus a few branches that
 * die out. Midpoint displacement, seeded, so a strike always looks the same.
 * Returns polylines; the first is the main channel.
 */
export function boltPath(
  top: V3,
  bottom: V3,
  seed: number,
  opts: { detail?: number; jag?: number; branches?: number } = {}
): V3[][] {
  const detail = opts.detail ?? 6
  const jag = opts.jag ?? 0.12
  let k = 0
  const rnd = () => hash01(seed, k++, 7, 11) * 2 - 1
  const channel = (a: V3, b: V3, depth: number, amp: number): V3[] => {
    let pts: V3[] = [a, b]
    for (let d = 0; d < depth; d++) {
      const next: V3[] = [pts[0]]
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1]
        const q = pts[i]
        const len = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)
        const off = len * amp
        next.push(
          {
            x: (p.x + q.x) / 2 + rnd() * off,
            y: (p.y + q.y) / 2 + rnd() * off * 0.3,
            z: (p.z + q.z) / 2 + rnd() * off,
          },
          q
        )
      }
      pts = next
    }
    return pts
  }
  const main = channel(top, bottom, detail, jag)
  const out = [main]
  const n = opts.branches ?? 3
  for (let b = 0; b < n; b++) {
    const i = 2 + Math.floor(((rnd() + 1) / 2) * (main.length * 0.6))
    const from = main[Math.min(i, main.length - 2)]
    const drop = (top.y - bottom.y) * (0.15 + 0.2 * ((rnd() + 1) / 2))
    const to = {
      x: from.x + rnd() * drop * 0.6,
      y: from.y - drop,
      z: from.z + rnd() * drop * 0.6,
    }
    out.push(channel(from, to, detail - 2, jag * 1.3))
  }
  return out
}

/**
 * How bright a flash is `age` seconds after the strike, 0–1: a lightning
 * flash is not one pulse but a few RE-STROKES down the same channel, which
 * is the flicker you see. Seeded, so a strike always flickers the same way.
 */
export function flashAt(age: number, seed: number, length = 0.45): number {
  if (age < 0 || age > length) return 0
  const strokes = 2 + Math.floor(hash01(seed, 3, 5) * 3)
  let v = 0
  for (let i = 0; i < strokes; i++) {
    // The first stroke IS the strike (at 0); re-strokes follow it.
    const at =
      i === 0 ? 0 : (i / strokes) * length * 0.7 + hash01(seed, i, 9) * 0.04
    const d = age - at
    if (d >= 0) v = Math.max(v, Math.exp(-d * 28) * (i === 0 ? 1 : 0.75))
  }
  return Math.min(1, v)
}
