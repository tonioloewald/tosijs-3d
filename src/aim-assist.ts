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

The biped uses both in gunplay (`aimCurve`, `aimAssist`).
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
