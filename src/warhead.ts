/**
 * Pure, Babylon-free warhead damage resolution (see COMBAT-DESIGN.md). A warhead
 * is single-use and delivers damage one of two ways:
 *  - DIRECT: a fixed amount to the single thing it hits.
 *  - AREA (AOE): linear falloff between two radii — full damage `D` within
 *    `fullRadius`, scaling DOWN linearly to a floor of **1** at `blastRadius`,
 *    and 0 beyond. (Deliberately linear, not inverse-square.)
 *
 * Line-of-sight occlusion is intentionally OUT of this pure model: the bridge
 * (`b3d-warhead`) does the raycasts and passes only visible targets (or marks
 * each target's `visible` flag). Everything here is deterministic and unit-tested.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface WarheadSpec {
  /** Full damage `D` — dealt on a direct hit and within the AOE full radius. */
  damage: number
  /** Within this distance the AOE deals full damage. Default 0 (peak only at the center). */
  fullRadius?: number
  /** AOE outer radius: damage falls linearly from `D` (at fullRadius) to 1 here, 0 beyond. */
  blastRadius?: number
}

export interface AoeTarget {
  id: string
  position: Vec3
  /**
   * False = blocked by line-of-sight (shield/geometry between it and the warhead)
   * → takes nothing. Defaults to visible when omitted (the bridge sets it).
   */
  visible?: boolean
}

export function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * AOE damage at a given distance from the blast center. Full `D` inside
 * `fullRadius`; linear down to a floor of 1 at `blastRadius`; 0 beyond it.
 */
export function aoeFalloff(spec: WarheadSpec, distance: number): number {
  const D = spec.damage
  const rFull = spec.fullRadius ?? 0
  const R = spec.blastRadius ?? rFull
  if (distance <= rFull) return D
  if (distance > R) return 0
  // Degenerate ring (R <= rFull): inside → full (handled above), else 0.
  if (R <= rFull) return 0
  const t = (distance - rFull) / (R - rFull) // 0 at rFull, 1 at R
  return D - (D - 1) * t // D → 1
}

/**
 * Resolve an AOE blast over a set of targets: returns the damage each VISIBLE
 * target within the blast radius takes (targets marked `visible: false`, or beyond
 * `blastRadius`, are omitted). `amount` is pre-armor/protection — the Destroyable
 * pipeline applies those.
 */
export function resolveAoe(
  spec: WarheadSpec,
  center: Vec3,
  targets: AoeTarget[]
): Array<{ id: string; amount: number }> {
  const out: Array<{ id: string; amount: number }> = []
  for (const t of targets) {
    if (t.visible === false) continue
    const amount = aoeFalloff(spec, dist3(center, t.position))
    if (amount > 0) out.push({ id: t.id, amount })
  }
  return out
}
