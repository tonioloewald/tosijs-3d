/*
BONE-LENGTH SANITY: the skeleton a body gets (`humanRig`, UAL's
65 joints fitted to the morphed body) checked for what would break an
animation: a bone that collapses or balloons against the body's size, left
and right that disagree, a chain that folds back on itself, and a joint
that has left the body it moves.

Each check is relative to the default body where it can be, so a quirk of
the rig table (a joint that sits outside the skin on every body, like the
floor-level root) is reported once as a baseline, not on every corner.

Pure.
*/

import type { FittedRig } from './rig-fit.js'
import type { MeshSdf } from './mesh-sdf.js'

export interface BoneIssue {
  joint: string
  kind:
    | 'non-finite'
    | 'collapsed'
    | 'scale'
    | 'asymmetric'
    | 'order'
    | 'outside'
  detail: string
  /** How far off: a ratio for scale/asymmetry, metres for order/outside. */
  amount: number
}

export interface BoneReport {
  /** The body's height, metres (head joint top to floor is not used: mesh span). */
  height: number
  issues: BoneIssue[]
  /** Each joint's length to its parent, metres. */
  lengths: Record<string, number>
}

export interface BoneReference {
  height: number
  lengths: Record<string, number>
  /** Joints outside the skin on the default body (not flagged again). */
  outside: Set<string>
}

/** Bones shorter than this on the default body are not scale-checked. */
const MIN_REFERENCE = 0.005
/** A bone may grow or shrink by this factor (after height) before it is flagged. */
export const SCALE_LIMIT = 2
/** Left and right may differ by this fraction. */
export const SYMMETRY_LIMIT = 0.03

const len = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/** Chains that run downward (head first, as y falls) in the rest pose. */
const DOWNWARD: readonly string[][] = [
  ['Head', 'neck_01', 'spine_03', 'spine_02', 'spine_01', 'pelvis'],
  ['thigh_l', 'calf_l', 'foot_l'],
  ['thigh_r', 'calf_r', 'foot_r'],
  ['upperarm_l', 'lowerarm_l', 'hand_l'],
  ['upperarm_r', 'lowerarm_r', 'hand_r'],
]

export function boneLengths(rig: FittedRig): Record<string, number> {
  const out: Record<string, number> = {}
  for (const j of rig.joints) {
    if (j.parent == null) continue
    const p = rig.at(j.parent)
    if (p) out[j.name] = len(j.position, p)
  }
  return out
}

/** The default body's numbers, for the per-corner checks. */
export function boneReference(
  rig: FittedRig,
  height: number,
  sdf: MeshSdf
): BoneReference {
  const outside = new Set<string>()
  for (const j of rig.joints)
    if (sdf.distance(j.position.x, j.position.y, j.position.z) > 0)
      outside.add(j.name)
  return { height, lengths: boneLengths(rig), outside }
}

/** The pair of a `_l` joint, or null. */
const mirror = (name: string): string | null =>
  name.endsWith('_l') ? name.slice(0, -2) + '_r' : null

export function checkBones(
  rig: FittedRig,
  height: number,
  sdf: MeshSdf,
  ref: BoneReference
): BoneReport {
  const issues: BoneIssue[] = []
  const lengths = boneLengths(rig)
  for (const j of rig.joints) {
    const { x, y, z } = j.position
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
      issues.push({
        joint: j.name,
        kind: 'non-finite',
        detail: 'position is not finite',
        amount: NaN,
      })
  }
  const k = height / ref.height
  for (const [name, l] of Object.entries(lengths)) {
    const l0 = ref.lengths[name]
    if (l0 == null || l0 < MIN_REFERENCE) continue
    if (l < 0.001) {
      issues.push({
        joint: name,
        kind: 'collapsed',
        detail: `${(l * 1000).toFixed(1)} mm`,
        amount: l,
      })
      continue
    }
    const r = l / (l0 * k)
    if (r > SCALE_LIMIT || r < 1 / SCALE_LIMIT)
      issues.push({
        joint: name,
        kind: 'scale',
        detail: `${r.toFixed(2)}x the default's length, after height`,
        amount: r,
      })
  }
  for (const [name, l] of Object.entries(lengths)) {
    const other = mirror(name)
    if (other == null || lengths[other] == null) continue
    const m = Math.max(l, lengths[other])
    if (m < MIN_REFERENCE) continue
    const d = Math.abs(l - lengths[other]) / m
    if (d > SYMMETRY_LIMIT)
      issues.push({
        joint: name,
        kind: 'asymmetric',
        detail: `left ${(l * 1000).toFixed(1)} mm, right ${(
          lengths[other] * 1000
        ).toFixed(1)} mm`,
        amount: d,
      })
  }
  for (const chain of DOWNWARD)
    for (let i = 1; i < chain.length; i++) {
      const a = rig.at(chain[i - 1]!)
      const b = rig.at(chain[i]!)
      if (!a || !b) continue
      if (b.y >= a.y)
        issues.push({
          joint: chain[i]!,
          kind: 'order',
          detail: `not below ${chain[i - 1]} (${((b.y - a.y) * 1000).toFixed(
            1
          )} mm above)`,
          amount: b.y - a.y,
        })
    }
  for (const j of rig.joints) {
    if (ref.outside.has(j.name)) continue
    const d = sdf.distance(j.position.x, j.position.y, j.position.z)
    if (d > 0)
      issues.push({
        joint: j.name,
        kind: 'outside',
        detail: `${(d * 1000).toFixed(1)} mm outside the skin`,
        amount: d,
      })
  }
  return { height, issues, lengths }
}
