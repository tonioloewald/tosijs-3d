/*
THE BABYLON SIDE OF RETARGETING (see `retarget`): read a loaded character's
skeleton into the pure form, and turn another rig's AnimationGroup into one
that drives this character's bones.

Rest poses are read from the skin's REST matrices, and the bones at the top
are measured against the model's root rather than their own parent node:
an exporter often hangs the skeleton under an armature node with its own
rotation (Mixamo through Blender does), and two rigs only agree about "up"
and "forward" once that is included.
*/

import * as BABYLON from '@babylonjs/core'
import {
  humanoidRoles,
  retargeter,
  type RestBone,
  type Role,
  type Skeleton,
} from './retarget.js'
import type { Quat, Vec3 } from './spatial-transform.js'

/** A skeleton read from a Babylon skin, with what is needed to write back. */
export interface ReadSkeleton extends Skeleton {
  /** The node each bone's animation targets, by bone name. */
  nodes: Map<string, BABYLON.TransformNode>
  /**
   * For a top bone, the rotation from the model root to its parent node
   * (an armature, say). Identity for the rest.
   */
  above: Map<string, Quat>
}

const q = (r: BABYLON.Quaternion): Quat => ({ x: r.x, y: r.y, z: r.z, w: r.w })
const v = (p: BABYLON.Vector3): Vec3 => ({ x: p.x, y: p.y, z: p.z })
const toB = (r: Quat) => new BABYLON.Quaternion(r.x, r.y, r.z, r.w)

/**
 * Read `skeleton` (a loaded skin's) as `retarget` needs it, with rest poses
 * measured from `root` (the model's top node, e.g. glTF's `__root__`).
 * `overrides` corrects a role the names got wrong.
 */
export function readSkeleton(
  skeleton: BABYLON.Skeleton,
  root: BABYLON.Node,
  overrides: Partial<Record<Role, string>> = {}
): ReadSkeleton {
  const rootInv = root.computeWorldMatrix(true).clone().invert()
  const nodes = new Map<string, BABYLON.TransformNode>()
  const above = new Map<string, Quat>()
  const bones: RestBone[] = []
  const scale = new BABYLON.Vector3()
  const rot = new BABYLON.Quaternion()
  const pos = new BABYLON.Vector3()
  for (const bone of skeleton.bones) {
    const node = bone.getTransformNode()
    const name = node?.name ?? bone.name
    if (node != null) nodes.set(name, node)
    const parentBone = bone.getParent()
    const parent = parentBone
      ? parentBone.getTransformNode()?.name ?? parentBone.name
      : null
    let rest = bone.getRestMatrix().clone()
    if (parentBone == null) {
      // A top bone: include everything between the model root and it.
      const parentNode = node?.parent ?? null
      if (parentNode != null) {
        const toParent = parentNode
          .computeWorldMatrix(true)
          .multiply(rootInv)
        toParent.decompose(scale, rot, pos)
        above.set(name, q(rot))
        rest = rest.multiply(toParent)
      }
    }
    rest.decompose(scale, rot, pos)
    bones.push({ name, parent, rotation: q(rot), position: v(pos) })
  }
  addEnds(skeleton, bones, rootInv)
  return {
    bones,
    roles: humanoidRoles(bones, overrides),
    nodes,
    above,
  }
}

/*
WHERE A BONE POINTS WHEN NOTHING HANGS BELOW IT: the middle of the vertices
it drives most. A Kenney chibi's arm is one bone with no hand, so only its
flesh says the arm hangs down; without this, it took only the source's turn
since rest, and UAL's rest is not a standing pose (the chibi walked like a
crab). Measured in the model root's space, as the rest is.
*/
function addEnds(
  skeleton: BABYLON.Skeleton,
  bones: RestBone[],
  rootInv: BABYLON.Matrix
): void {
  const scene = skeleton.getScene()
  const sum = bones.map(() => ({ x: 0, y: 0, z: 0, n: 0 }))
  const p = new BABYLON.Vector3()
  for (const mesh of scene.meshes) {
    if (mesh.skeleton !== skeleton) continue
    const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const idx = mesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind)
    const wts = mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind)
    if (pos == null || idx == null || wts == null) continue
    const toRoot = mesh.computeWorldMatrix(true).multiply(rootInv)
    for (let i = 0; i < pos.length / 3; i++) {
      let best = -1
      let bw = 0
      for (let k = 0; k < 4; k++) {
        const w = wts[i * 4 + k]
        if (w > bw) {
          bw = w
          best = idx[i * 4 + k]
        }
      }
      if (best < 0 || best >= sum.length) continue
      BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(
        pos[i * 3],
        pos[i * 3 + 1],
        pos[i * 3 + 2],
        toRoot,
        p
      )
      const s = sum[best]
      s.x += p.x
      s.y += p.y
      s.z += p.z
      s.n++
    }
  }
  for (let i = 0; i < bones.length; i++) {
    const s = sum[i]
    if (s.n > 0) bones[i].end = { x: s.x / s.n, y: s.y / s.n, z: s.z / s.n }
  }
}

const IDENT: Quat = { x: 0, y: 0, z: 0, w: 1 }
const mul = (a: Quat, b: Quat): Quat => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
})
const conj = (a: Quat): Quat => ({ x: -a.x, y: -a.y, z: -a.z, w: a.w })

/**
 * Turn `group` (animating `source`'s bones) into a new AnimationGroup that
 * drives `target`'s bones the same way, sampled at `fps`. Bones the two
 * rigs do not share (fingers on a rig without them) are left at rest.
 */
export function retargetClip(
  group: BABYLON.AnimationGroup,
  source: ReadSkeleton,
  target: ReadSkeleton,
  options: { fps?: number; name?: string; scene?: BABYLON.Scene } = {}
): BABYLON.AnimationGroup {
  const rt = retargeter(source, target)
  const fps = options.fps ?? 30
  // What animates each source bone, by name.
  const rotAnim = new Map<string, BABYLON.Animation>()
  const posAnim = new Map<string, BABYLON.Animation>()
  let rate = 60
  for (const ta of group.targetedAnimations) {
    const name = (ta.target as BABYLON.Node)?.name
    if (name == null) continue
    rate = ta.animation.framePerSecond || rate
    if (ta.animation.targetProperty === 'rotationQuaternion')
      rotAnim.set(name, ta.animation)
    else if (ta.animation.targetProperty === 'position')
      posAnim.set(name, ta.animation)
  }
  const from = group.from
  const to = group.to
  const seconds = Math.max(0, (to - from) / rate)
  const frames = Math.max(1, Math.round(seconds * fps))

  const moving = rt.roles.map((r) => target.roles[r]!)
  const keys = new Map<string, Array<{ frame: number; value: BABYLON.Quaternion }>>(
    moving.map((n) => [n, []])
  )
  const hipsKeys: Array<{ frame: number; value: BABYLON.Vector3 }> = []
  const sHips = source.roles.hips
  const tHips = target.roles.hips

  for (let i = 0; i <= frames; i++) {
    const at = from + (i / frames) * (to - from)
    const rotations = new Map<string, Quat>()
    for (const [name, anim] of rotAnim) {
      const value = anim.evaluate(at) as BABYLON.Quaternion
      let local = q(value)
      // A top bone's keys are relative to its node parent: bring them to
      // the model root, as its rest is.
      const a = source.above.get(name)
      if (a != null) local = mul(a, local)
      rotations.set(name, local)
    }
    let hips: Vec3 | undefined
    if (sHips != null) {
      const anim = posAnim.get(sHips)
      if (anim != null) hips = v(anim.evaluate(at) as BABYLON.Vector3)
    }
    const out = rt.pose(rotations, hips)
    for (const name of moving) {
      let local = out.rotations.get(name)
      if (local == null) continue
      const a = target.above.get(name)
      if (a != null) local = mul(conj(a), local)
      keys.get(name)!.push({ frame: i, value: toB(local) })
    }
    if (out.hips != null && tHips != null)
      hipsKeys.push({
        frame: i,
        value: new BABYLON.Vector3(out.hips.x, out.hips.y, out.hips.z),
      })
  }

  const made = new BABYLON.AnimationGroup(
    options.name ?? `${group.name}→retargeted`,
    options.scene
  )
  for (const name of moving) {
    const node = target.nodes.get(name)
    const k = keys.get(name)!
    if (node == null || k.length === 0) continue
    node.rotationQuaternion ??= toB(IDENT)
    const anim = new BABYLON.Animation(
      `${name}.rotation`,
      'rotationQuaternion',
      fps,
      BABYLON.Animation.ANIMATIONTYPE_QUATERNION,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    )
    anim.setKeys(k)
    made.addTargetedAnimation(anim, node)
  }
  if (tHips != null && hipsKeys.length > 0) {
    const node = target.nodes.get(tHips)
    if (node != null) {
      const anim = new BABYLON.Animation(
        `${tHips}.position`,
        'position',
        fps,
        BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
      )
      anim.setKeys(hipsKeys)
      made.addTargetedAnimation(anim, node)
    }
  }
  return made
}

/** `retargetClip` for several groups, each named after its source. */
export function retargetClips(
  groups: readonly BABYLON.AnimationGroup[],
  source: ReadSkeleton,
  target: ReadSkeleton,
  options: { fps?: number; scene?: BABYLON.Scene } = {}
): BABYLON.AnimationGroup[] {
  return groups.map((g) =>
    retargetClip(g, source, target, { ...options, name: g.name })
  )
}
