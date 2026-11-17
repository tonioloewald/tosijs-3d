/*#
# aim-assist

**Aiming a stick at a person**, two helpers. Pure: plain `{x, y, z}`.

- `stickCurve(v, expo)`: a stick's deflection shaped so small movements are
  small. `expo` 1 is linear; 2 (the biped's default while aiming) turns at a
  quarter of the rate at half deflection and the same rate at full, so a
  nudge fine-tunes and a shove still swings round.
- `aimFriction(origin, dir, targets, strength)`: how much to slow the aim, as
  a factor on its rate (1 is no change). It is `1 - strength` while the aim
  line passes within a target's radius, easing back to 1 at three times that,
  so the sight drags across a person rather than skating off them. It never
  moves the aim: that is the player's.

- `stickyAim(lock, input)`: the aim STICKS to a target. Sweeping near one
  (within `capture`) with the stick below `breakout` locks onto it: from
  then the aim follows the target as it, or you, move, and the stick slides
  the aim slowly across it (`fineDegPerSec`, to put it on the head). Push the
  stick past `breakout` and it lets go and swings freely; slide past
  `release` and it lets go too. A fresh lock caught near the edge eases onto
  the body (no snap); touching the stick stops that, so an aim you put on
  the head stays there.

The biped uses them in gunplay (`aimCurve`, `aimAssist`, `aimBreakout`).
*/
/*{ "parent": "aim" }*/

export interface AimVec {
  x: number
  y: number
  z: number
}

export interface AimTarget {
  /** Where to aim (a chest). */
  at: AimVec
  /** How big it is across, in metres, from its centre (about 0.35 for a person). */
  radius: number
}

/** A stick's deflection (-1…1) raised to `expo`, keeping its sign. */
export function stickCurve(v: number, expo = 2): number {
  const a = Math.min(1, Math.abs(v))
  return Math.sign(v) * Math.pow(a, Math.max(1, expo))
}

/**
 * The factor on the aim's rate (1 = unchanged) for an aim line from `origin`
 * along `dir` (need not be unit) past `targets`.
 */
export function aimFriction(
  origin: AimVec,
  dir: AimVec,
  targets: AimTarget[],
  strength = 0.5
): number {
  if (strength <= 0 || targets.length === 0) return 1
  const len = Math.hypot(dir.x, dir.y, dir.z)
  if (len === 0) return 1
  const dx = dir.x / len
  const dy = dir.y / len
  const dz = dir.z / len
  let best = 0
  for (const t of targets) {
    const ox = t.at.x - origin.x
    const oy = t.at.y - origin.y
    const oz = t.at.z - origin.z
    const along = ox * dx + oy * dy + oz * dz
    if (along <= 0) continue
    // How far the line passes from the target, in its radii.
    const px = ox - dx * along
    const py = oy - dy * along
    const pz = oz - dz * along
    const miss = Math.hypot(px, py, pz) / Math.max(1e-3, t.radius)
    // Full inside the radius, fading out by three radii.
    const on = miss <= 1 ? 1 : miss >= 3 ? 0 : 1 - (miss - 1) / 2
    if (on > best) best = on
  }
  return 1 - Math.min(1, strength) * best
}

/** A target seen from the aim's origin, in degrees (pitch positive DOWN). */
export interface AngularTarget {
  yawDeg: number
  pitchDeg: number
  /** Its radius as an angle. */
  radiusDeg: number
  /** Can it be locked onto (in view, nothing in the way)? Default true. */
  clear?: boolean
}

export interface AimLock {
  /** The index of the locked target in this frame's list, or -1. */
  target: number
  /** Where on it the aim is, from its centre, in degrees. */
  offYawDeg: number
  offPitchDeg: number
  /** Just caught: easing onto the target until the stick moves. */
  settling?: boolean
}

export const NO_LOCK: AimLock = { target: -1, offYawDeg: 0, offPitchDeg: 0 }

export interface StickyOptions {
  /** Stick deflection (0…1) past which a lock lets go. */
  breakout?: number
  /** How fast a stick below breakout slides the aim across a target, at the breakout. */
  fineDegPerSec?: number
  /** How near (in target radii, or degrees, whichever is more) a sweep locks on. */
  captureRadii?: number
  captureDeg?: number
  /** How far off its centre a slide may go before it lets go. */
  releaseRadii?: number
  releaseDeg?: number
  /** How fast a fresh lock eases onto the target's body. */
  settleDegPerSec?: number
}

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180

/**
 * One frame of sticky aim. `aim` is where the aim is now, `stick` the aim
 * stick (x turns right, y raises the aim; -1…1), `targets` this frame's
 * candidates in a STABLE order (the lock is kept by `id`). Returns the new
 * lock and, while locked, the aim to use; `aim: null` means aim freely.
 */
export function stickyAim(
  lock: AimLock & { id?: unknown },
  input: {
    aim: { yawDeg: number; pitchDeg: number }
    stick: { x: number; y: number }
    targets: (AngularTarget & { id?: unknown })[]
    dt: number
  },
  options: StickyOptions = {}
): {
  lock: AimLock & { id?: unknown }
  aim: { yawDeg: number; pitchDeg: number } | null
} {
  const breakout = options.breakout ?? 0.7
  const fine = options.fineDegPerSec ?? 6
  const { aim, stick, targets, dt } = input
  const push = Math.hypot(stick.x, stick.y)
  const free = { lock: { ...NO_LOCK }, aim: null }
  if (push >= breakout) return free

  // Still locked: the same target (by id), still there.
  let i =
    lock.target >= 0
      ? targets.findIndex((t, n) =>
          lock.id !== undefined ? t.id === lock.id : n === lock.target
        )
      : -1
  let offYaw = lock.offYawDeg
  let offPitch = lock.offPitchDeg
  let settling = lock.settling ?? false
  if (i < 0) {
    settling = true
    // Not locked: lock onto the nearest one the aim is passing over.
    let best = Infinity
    for (let n = 0; n < targets.length; n++) {
      const t = targets[n]
      if (t.clear === false) continue
      const dy = wrap(aim.yawDeg - t.yawDeg)
      const dp = aim.pitchDeg - t.pitchDeg
      const off = Math.hypot(dy, dp)
      const reach = Math.max(
        (options.captureRadii ?? 3) * t.radiusDeg,
        options.captureDeg ?? 4
      )
      if (off <= reach && off < best) {
        best = off
        i = n
        offYaw = dy
        offPitch = dp
      }
    }
    if (i < 0) return free
  }
  const t = targets[i]
  // Caught near the edge: it eases onto the body (to half its radius, at
  // `settleDegPerSec`), so a lock is a hit. Touching the stick stops it,
  // so an aim you placed (on the head) is not pulled back.
  if (push > 0.1) settling = false
  if (settling) {
    const off = Math.hypot(offYaw, offPitch)
    const inside = t.radiusDeg * 0.5
    if (off > inside) {
      const step = Math.min(off - inside, (options.settleDegPerSec ?? 15) * dt)
      offYaw -= (offYaw / off) * step
      offPitch -= (offPitch / off) * step
    } else settling = false
  }
  // The stick, below the breakout, slides across the target: slowly, and
  // in proportion, so a nudge is a nudge.
  const k = (fine * dt) / breakout
  offYaw += stick.x * k
  offPitch -= stick.y * k
  const release = Math.max(
    (options.releaseRadii ?? 4) * t.radiusDeg,
    options.releaseDeg ?? 6
  )
  if (Math.hypot(offYaw, offPitch) > release) return free
  return {
    lock: { target: i, id: t.id, offYawDeg: offYaw, offPitchDeg: offPitch, settling },
    aim: { yawDeg: wrap(t.yawDeg + offYaw), pitchDeg: t.pitchDeg + offPitch },
  }
}
