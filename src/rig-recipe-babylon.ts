/*
PUT A RIG RECIPE ON A LOADED CHARACTER (see `rig-recipe`): read its
skeleton with the recipe's role corrections, and hang its spring chains.
The rig tool saves recipes; a game loads the same model, calls this, and
retargets clips onto `read` with the recipe's `armSpaceDeg`.

Call it with the character in its REST pose (it puts the skeleton there):
a strand is placed by where its anchor bone is at rest.
*/

import * as BABYLON from '@babylonjs/core'
import { boneHeat } from './bone-heat.js'
import { readSkeleton, type ReadSkeleton } from './retarget-babylon.js'
import {
  springBones,
  springNodes,
  type SpringBoneCollider,
  type SpringBones,
} from './spring-chain-babylon.js'
import {
  strandPoints,
  type ColliderRecipe,
  type RigRecipe,
  type SpringRecipe,
} from './rig-recipe.js'
import type { SpringParams } from './spring-chain.js'

export interface AppliedSpring {
  recipe: SpringRecipe
  bones: SpringBones
  /** A strand's tube. */
  mesh?: BABYLON.Mesh
}

export interface AppliedRig {
  /** The skeleton with the recipe's roles: retarget clips onto this. */
  read: ReadSkeleton
  springs: AppliedSpring[]
  /** Why a spring was left out (a bone the model does not have). */
  problems: string[]
  dispose(): void
}

/** The character's frame: its placement, above glTF's mirrored `__root__`. */
function frameOf(root: BABYLON.Node): BABYLON.Quaternion {
  const parent = root.parent
  if (parent == null) return BABYLON.Quaternion.Identity()
  const rot = new BABYLON.Quaternion()
  parent
    .computeWorldMatrix(true)
    .decompose(new BABYLON.Vector3(), rot, new BABYLON.Vector3())
  return rot
}

const vec = (v: { x: number; y: number; z: number }) =>
  new BABYLON.Vector3(v.x, v.y, v.z)

/** The springs' params, from the recipe's. */
export function springParamsOf(
  p: SpringRecipe['params'] = {}
): Partial<SpringParams> {
  const out: Partial<SpringParams> = {}
  if (p.stiffness != null) out.stiffness = p.stiffness
  if (p.damping != null) out.damping = p.damping
  if (p.gravity != null) out.gravity = { x: 0, y: -p.gravity, z: 0 }
  return out
}

/**
 * Apply `recipe` to the character whose glTF root is `root` and skin is
 * `skeleton`. Returns the read skeleton and the live springs.
 */
export function applyRigRecipe(
  scene: BABYLON.Scene,
  root: BABYLON.TransformNode,
  skeleton: BABYLON.Skeleton,
  recipe: RigRecipe
): AppliedRig {
  skeleton.returnToRest()
  root.computeWorldMatrix(true)
  for (const n of root.getChildTransformNodes(false)) n.computeWorldMatrix(true)
  const read = readSkeleton(skeleton, root, recipe.roles ?? {})
  // An empty name leaves the role out, rather than naming a bone ''.
  for (const [role, bone] of Object.entries(recipe.roles ?? {}))
    if (bone === '') delete read.roles[role as keyof typeof read.roles]
  const frame = frameOf(root)
  const inFrame = (v: { x: number; y: number; z: number }) =>
    vec(v).applyRotationQuaternion(frame)
  const problems: string[] = []
  const springs: AppliedSpring[] = []

  // Sized to the body: the defaults are for a 1.8 m person.
  const box = root.getHierarchyBoundingVectors(true)
  const k = Math.max(0.1, box.max.y - box.min.y) / 1.8
  const up = inFrame({ x: 0, y: 1, z: 0 })
  const roleNode = (role: keyof ReadSkeleton['roles']) => {
    const name = read.roles[role]
    return name != null ? read.nodes.get(name) : undefined
  }
  const autoColliders = (): SpringBoneCollider[] => {
    const out: SpringBoneCollider[] = []
    const head = roleNode('head')
    if (head)
      out.push({ node: head, radius: 0.12 * k, offset: up.scale(0.09 * k) })
    const chest = roleNode('chest')
    if (chest) out.push({ node: chest, radius: 0.17 * k })
    for (const r of ['l-clavicle', 'r-clavicle'] as const) {
      const n = roleNode(r)
      if (n) out.push({ node: n, radius: 0.09 * k })
    }
    return out
  }
  const collidersOf = (s: SpringRecipe): SpringBoneCollider[] => {
    const c = s.colliders ?? 'auto'
    if (c === 'none') return []
    if (c === 'auto') return autoColliders()
    return c.flatMap((r: ColliderRecipe) => {
      const node = read.nodes.get(r.bone)
      if (node == null) {
        problems.push(`collider bone ${r.bone} is not in this model`)
        return []
      }
      return [
        {
          node,
          radius: r.radius,
          offset: r.offset ? inFrame(r.offset) : undefined,
        },
      ]
    })
  }

  const boneNodes = new Set(read.nodes.values())
  for (const s of recipe.springs ?? []) {
    const params = springParamsOf(s.params)
    if (s.kind === 'bones') {
      const first = read.nodes.get(s.root)
      if (first == null) {
        problems.push(`spring bone ${s.root} is not in this model`)
        continue
      }
      const chain: BABYLON.TransformNode[] = [first]
      for (let at = first; ; ) {
        const next = at
          .getChildren()
          .find((c) => boneNodes.has(c as BABYLON.TransformNode)) as
          | BABYLON.TransformNode
          | undefined
        if (next == null || chain.length >= 64) break
        chain.push(next)
        at = next
      }
      if (chain.length < 2) {
        problems.push(`spring bone ${s.root} has no bones below it`)
        continue
      }
      springs.push({
        recipe: s,
        bones: springNodes(scene, chain, { params, colliders: collidersOf(s) }),
      })
    } else {
      const anchor = read.nodes.get(s.anchor)
      if (anchor == null) {
        problems.push(`strand anchor ${s.anchor} is not in this model`)
        continue
      }
      const base = anchor.getAbsolutePosition()
      const points = strandPoints(s).map((p) => base.add(inFrame(p)))
      const bones = springBones(scene, anchor, points, {
        params,
        colliders: collidersOf(s),
      })
      const mesh = bones.skinTube({
        radius: s.radius,
        tipRadius: s.tipRadius,
        sides: 8,
        boneHeat,
      })
      const mat = new BABYLON.StandardMaterial(`${mesh.name}-mat`, scene)
      mat.diffuseColor = BABYLON.Color3.FromHexString(s.color ?? '#73401a')
      mat.backFaceCulling = false
      mesh.material = mat
      springs.push({ recipe: s, bones, mesh })
    }
  }

  return {
    read,
    springs,
    problems,
    dispose() {
      for (const s of springs) {
        s.mesh?.material?.dispose()
        s.mesh?.skeleton?.dispose()
        s.mesh?.dispose()
        s.bones.dispose()
      }
      springs.length = 0
    },
  }
}
