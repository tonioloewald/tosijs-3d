/*#
# rigged-body-glb

**Any rigged body out as a skinned GLB that plays UAL's clips by name.** A
body the rig tool made (an AI mesh, an artist's mesh, a scan), a file's own
skin, or MakeHuman's: `riggedBodyGlb(body)` writes it in the same profile as
Dramatis's character export, so three.js, Unity, Godot and Blender open it
and a UAL clip binds to its bones with no retargeting. Pure: no engine, bytes
out. `tosijs-3d/rigged-body-glb`.

```javascript
import { glbRigTriangles } from 'tosijs-3d/glb-rig'
import { bodyFromMarkers } from 'tosijs-3d/rigged-body'
import { riggedBodyGlb } from 'tosijs-3d/rigged-body-glb'

const body = bodyFromMarkers(glbRigTriangles(bytes), { markers })
const glb = riggedBodyGlb(body, { restPose: 't-pose', naming: 'ue' })
```

What the file is (Dramatis's `export-format`, version 1):

- **The skeleton**: one skin, `skeleton`, over the profile's 65 joints in its
  order (UE mannequin names as UAL spells them: `Head`, `_leaf` tips), or
  Mixamo's names with `naming: 'mixamo'` (`root` keeps its name). Every
  joint's rest ROTATION is UAL's own frame (`ual-rest`), only its position
  is the body's: that is what makes UAL's rotation keys mean the same thing
  on it. A joint the body lacks is placed along UAL's bone, scaled to the
  body; one the profile lacks (a tail) follows after the 65, in its
  parent's frame.
- **The rest pose**: a T-pose by default (arms straight out, palms down, as
  UAL stands; VRM needs one), reached by turning each limb bone onto UAL's
  and skinning the mesh there once; the feet are turned back so they stay
  flat. `restPose: 'source'` keeps the body as it was rigged, UAL's frames
  turned along its bones.
- **Root at the feet**: the soles at y = 0 and the pelvis over the origin,
  metres, Y up, facing +Z. `height` scales the body to a height in metres
  first (a mesh generator's 1.9 units, say, made a real 1.7 m).
- **Meshes**: `body`, one primitive per material, and `eyes` (both eyeballs,
  skinned wholly to `Head`, which the profile prefers to parenting a mesh
  under a joint). The file's own materials go out as glTF PBR with their
  pictures embedded, when the body's surfaces carry them as data (a body
  read by `glb-rig`); otherwise a plain grey.
- **`asset.extras`** is passed through as given (Dramatis's licence block
  goes there), with `generator` and `copyright`.

Weights are the body's own, four per vertex, renormalised.
*/
/*{ "parent": "character-core", "order": 33 }*/

import {
  writeSkinnedGlb,
  type GlbImage,
  type GlbJoint,
  type GlbMaterial,
  type GlbPrimitive,
} from './skinned-glb.js'
import { UAL_REST } from './ual-rest.js'
import type { RiggedBody } from './rigged-body.js'
import type { GltfSurfaceMaterial, GltfTextureRef } from './glb-rig.js'

type V3 = [number, number, number]
type Q = [number, number, number, number]

export type RigNaming = 'ue' | 'mixamo'
export type RigRestPose = 't-pose' | 'source'

export interface RiggedBodyGlbOptions {
  /** Joint names: UE mannequin's as UAL spells them (default), or Mixamo's. */
  naming?: RigNaming
  /** The bind pose: a T-pose (default), or the body as it was rigged. */
  restPose?: RigRestPose
  /** Scale the body to this height in metres first (default: as it is). */
  height?: number
  /** `asset.generator` (default `tosijs-3d`). */
  generator?: string
  /** `asset.copyright`. */
  copyright?: string
  /** `asset.extras`, as given. */
  extras?: Record<string, unknown>
}

// --- quaternions, [x, y, z, w] ---
const IDENTITY: Q = [0, 0, 0, 1]
const qmul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const qconj = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]]
const qnorm = (q: Q): Q => {
  const l = Math.hypot(...q) || 1
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]
}
const qrot = (q: Q, v: V3): V3 => {
  const [x, y, z, w] = q
  const ix = w * v[0] + y * v[2] - z * v[1]
  const iy = w * v[1] + z * v[0] - x * v[2]
  const iz = w * v[2] + x * v[1] - y * v[0]
  const iw = -x * v[0] - y * v[1] - z * v[2]
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ]
}
/** The shortest turn taking direction `a` onto `b`. */
function qfromTo(a: V3, b: V3): Q {
  const la = Math.hypot(...a)
  const lb = Math.hypot(...b)
  if (la < 1e-9 || lb < 1e-9) return IDENTITY
  const u: V3 = [a[0] / la, a[1] / la, a[2] / la]
  const v: V3 = [b[0] / lb, b[1] / lb, b[2] / lb]
  const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  if (d < -0.999999) {
    // Opposite: half a turn about any axis square to `a`.
    const axis: V3 = Math.abs(u[0]) < 0.9 ? [0, -u[2], u[1]] : [u[2], 0, -u[0]]
    return qnorm([axis[0], axis[1], axis[2], 0])
  }
  return qnorm([
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
    1 + d,
  ])
}
/** Row-major 3x3. */
function qmatrix(q: Q): number[] {
  const [x, y, z, w] = q
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y),
  ]
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

// --- the profile ---
const PROFILE = UAL_REST.map(([name, parent]) => ({ name, parent }))
const PROFILE_INDEX = new Map(PROFILE.map((j, i) => [j.name, i]))

/** UAL's rest in model space: each joint's rotation and position. */
const UAL_GLOBAL = (() => {
  const rotations: Q[] = []
  const positions: V3[] = []
  UAL_REST.forEach(([, parent, t, r]) => {
    const q = qnorm([...r] as Q)
    const p = parent == null ? -1 : PROFILE_INDEX.get(parent)!
    if (p < 0) {
      rotations.push(q)
      positions.push([...t] as V3)
    } else {
      rotations.push(qnorm(qmul(rotations[p], q)))
      positions.push(add(positions[p], qrot(rotations[p], [...t] as V3)))
    }
  })
  return { rotations, positions }
})()

/** Mixamo's name for each profile joint (`root` keeps its own). */
export const MIXAMO_JOINT_NAMES: Readonly<Record<string, string>> = (() => {
  const m: Record<string, string> = {
    root: 'root',
    pelvis: 'mixamorig:Hips',
    spine_01: 'mixamorig:Spine',
    spine_02: 'mixamorig:Spine1',
    spine_03: 'mixamorig:Spine2',
    neck_01: 'mixamorig:Neck',
    Head: 'mixamorig:Head',
  }
  for (const [s, side] of [
    ['l', 'Left'],
    ['r', 'Right'],
  ]) {
    m[`clavicle_${s}`] = `mixamorig:${side}Shoulder`
    m[`upperarm_${s}`] = `mixamorig:${side}Arm`
    m[`lowerarm_${s}`] = `mixamorig:${side}ForeArm`
    m[`hand_${s}`] = `mixamorig:${side}Hand`
    for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
      const F = f[0].toUpperCase() + f.slice(1)
      m[`${f}_01_${s}`] = `mixamorig:${side}Hand${F}1`
      m[`${f}_02_${s}`] = `mixamorig:${side}Hand${F}2`
      m[`${f}_03_${s}`] = `mixamorig:${side}Hand${F}3`
      m[`${f}_04_leaf_${s}`] = `mixamorig:${side}Hand${F}4`
    }
    m[`thigh_${s}`] = `mixamorig:${side}UpLeg`
    m[`calf_${s}`] = `mixamorig:${side}Leg`
    m[`foot_${s}`] = `mixamorig:${side}Foot`
    m[`ball_${s}`] = `mixamorig:${side}ToeBase`
    m[`ball_leaf_${s}`] = `mixamorig:${side}Toe_End`
  }
  return Object.freeze(m)
})()

/** The limb bones laid along UAL's in the T-pose. */
const AIMED =
  /^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky|thigh|calf)_/
/** Turned back to where they faced, so the feet stay flat. */
const KEPT = /^(foot|ball)_/

interface Skeleton {
  names: string[]
  parents: number[]
  /** Model-space rest positions. */
  rest: V3[]
}

/** The joint each one aims at: a hand along its middle finger, else its child. */
function aimChild(sk: Skeleton, i: number): number {
  const name = sk.names[i]
  if (name.startsWith('hand_'))
    return sk.names.indexOf(name.replace('hand_', 'middle_01_'))
  return sk.parents.indexOf(i)
}

/**
 * The body's joints in the profile's order (missing ones placed along UAL's
 * bone, scaled to the body), then any it has that the profile does not.
 * `from[k]` is the output index of the body's joint k.
 */
function profileSkeleton(body: RiggedBody): Skeleton & { from: number[] } {
  const at = (n: string) => body.rig.at(n)
  const pelvis = at('pelvis')
  const head = at('Head')
  const ualPelvis = UAL_GLOBAL.positions[PROFILE_INDEX.get('pelvis')!]
  const ualHead = UAL_GLOBAL.positions[PROFILE_INDEX.get('Head')!]
  const scale =
    pelvis && head
      ? Math.hypot(head.x - pelvis.x, head.y - pelvis.y, head.z - pelvis.z) /
        Math.hypot(...sub(ualHead, ualPelvis))
      : 1
  const names: string[] = []
  const parents: number[] = []
  const rest: V3[] = []
  PROFILE.forEach((j, i) => {
    names.push(j.name)
    const p = j.parent == null ? -1 : PROFILE_INDEX.get(j.parent)!
    parents.push(p)
    const own = at(j.name)
    if (own) rest.push([own.x, own.y, own.z])
    else if (p < 0) rest.push([0, 0, 0])
    else {
      const bone = sub(UAL_GLOBAL.positions[i], UAL_GLOBAL.positions[p])
      rest.push(
        add(rest[p], [bone[0] * scale, bone[1] * scale, bone[2] * scale])
      )
    }
  })
  // Joints beyond the profile (a tail), parents first as the rig lists them.
  for (const j of body.rig.joints)
    if (!PROFILE_INDEX.has(j.name)) {
      names.push(j.name)
      parents.push(j.parent == null ? 0 : names.indexOf(j.parent))
      rest.push([j.position.x, j.position.y, j.position.z])
    }
  const from = body.rig.joints.map((j) => names.indexOf(j.name))
  return { names, parents, rest, from }
}

/** Per joint, the model-space turn it applies, and where it ends up. */
interface Repose {
  turn: Q[]
  positions: V3[]
}

function tPose(sk: Skeleton): Repose {
  const turn: Q[] = []
  const positions: V3[] = []
  sk.names.forEach((name, i) => {
    const p = sk.parents[i]
    const parentTurn = p < 0 ? IDENTITY : turn[p]
    positions.push(
      p < 0
        ? sk.rest[i]
        : add(positions[p], qrot(parentTurn, sub(sk.rest[i], sk.rest[p])))
    )
    let own: Q = IDENTITY
    const c = aimChild(sk, i)
    const u = PROFILE_INDEX.get(name)
    const uc = c >= 0 ? PROFILE_INDEX.get(sk.names[c]) : undefined
    if (AIMED.test(name) && c >= 0 && u != null && uc != null) {
      const now = qrot(parentTurn, sub(sk.rest[c], sk.rest[i]))
      own = qfromTo(now, sub(UAL_GLOBAL.positions[uc], UAL_GLOBAL.positions[u]))
    } else if (KEPT.test(name)) own = qconj(parentTurn)
    turn.push(qnorm(qmul(own, parentTurn)))
  })
  return { turn, positions }
}

const sourcePose = (sk: Skeleton): Repose => ({
  turn: sk.rest.map(() => IDENTITY),
  positions: sk.rest.map((p) => [...p] as V3),
})

/** Linear-blend skinning from the rest joints to the pose. */
function skinTo(
  positions: ArrayLike<number>,
  joints: ArrayLike<number>,
  weights: ArrayLike<number>,
  rest: V3[],
  pose: Repose
): Float64Array {
  const n = positions.length / 3
  const out = new Float64Array(n * 3)
  const mats = pose.turn.map(qmatrix)
  for (let v = 0; v < n; v++) {
    const px = positions[v * 3]
    const py = positions[v * 3 + 1]
    const pz = positions[v * 3 + 2]
    let x = 0
    let y = 0
    let z = 0
    let total = 0
    for (let k = 0; k < 4; k++) {
      const w = weights[v * 4 + k]
      if (!(w > 0)) continue
      const j = joints[v * 4 + k]
      const r = mats[j]
      const a = rest[j]
      const b = pose.positions[j]
      const dx = px - a[0]
      const dy = py - a[1]
      const dz = pz - a[2]
      x += w * (b[0] + r[0] * dx + r[1] * dy + r[2] * dz)
      y += w * (b[1] + r[3] * dx + r[4] * dy + r[5] * dz)
      z += w * (b[2] + r[6] * dx + r[7] * dy + r[8] * dz)
      total += w
    }
    if (total > 0) {
      out[v * 3] = x / total
      out[v * 3 + 1] = y / total
      out[v * 3 + 2] = z / total
    } else {
      out[v * 3] = px
      out[v * 3 + 1] = py
      out[v * 3 + 2] = pz
    }
  }
  return out
}

/**
 * Smooth vertex normals, counter-clockwise faces outward, shared across
 * vertices at the same place (a uv seam is not a crease).
 */
function smoothNormals(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>
): Float32Array {
  const n = positions.length / 3
  const key = (v: number) =>
    `${Math.round(positions[v * 3] * 1e5)},${Math.round(
      positions[v * 3 + 1] * 1e5
    )},${Math.round(positions[v * 3 + 2] * 1e5)}`
  const weld = new Map<string, number>()
  const group = new Int32Array(n)
  for (let v = 0; v < n; v++) {
    const k = key(v)
    let g = weld.get(k)
    if (g == null) weld.set(k, (g = weld.size))
    group[v] = g
  }
  const acc = new Float64Array(weld.size * 3)
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]
    const b = indices[t + 1]
    const c = indices[t + 2]
    const ux = positions[b * 3] - positions[a * 3]
    const uy = positions[b * 3 + 1] - positions[a * 3 + 1]
    const uz = positions[b * 3 + 2] - positions[a * 3 + 2]
    const vx = positions[c * 3] - positions[a * 3]
    const vy = positions[c * 3 + 1] - positions[a * 3 + 1]
    const vz = positions[c * 3 + 2] - positions[a * 3 + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const v of [a, b, c]) {
      const g = group[v] * 3
      acc[g] += nx
      acc[g + 1] += ny
      acc[g + 2] += nz
    }
  }
  const out = new Float32Array(n * 3)
  for (let v = 0; v < n; v++) {
    const g = group[v] * 3
    out[v * 3] = acc[g]
    out[v * 3 + 1] = acc[g + 1]
    out[v * 3 + 2] = acc[g + 2]
  }
  return out // writeSkinnedGlb makes them unit length
}

const isGltfMaterial = (m: unknown): m is GltfSurfaceMaterial =>
  m != null && Array.isArray((m as GltfSurfaceMaterial).baseColorFactor)

/** The body's materials as glTF, their pictures collected once each. */
function materialsOf(
  body: RiggedBody,
  surfaceCount: number,
  textured: boolean
): { materials: GlbMaterial[]; images: GlbImage[] } {
  const images: GlbImage[] = []
  const seen = new Map<Uint8Array, number>()
  const image = (t: GltfTextureRef | undefined, name: string) => {
    if (!textured || t?.bytes == null) return undefined
    if (t.mimeType !== 'image/png' && t.mimeType !== 'image/jpeg')
      return undefined
    let i = seen.get(t.bytes)
    if (i == null) {
      images.push({ name, mimeType: t.mimeType, bytes: t.bytes })
      i = images.length - 1
      seen.set(t.bytes, i)
    }
    return { image: i }
  }
  const materials: GlbMaterial[] = []
  for (let s = 0; s < surfaceCount; s++) {
    const name = s === 0 ? 'body' : `body_${s + 1}`
    const m = body.surfaces?.[s]?.material
    if (!isGltfMaterial(m)) {
      materials.push({
        name,
        baseColorFactor: [0.8, 0.8, 0.8, 1],
        metallicFactor: 0,
        roughnessFactor: 0.8,
        alphaMode: 'OPAQUE',
        doubleSided: false,
      })
      continue
    }
    const out: GlbMaterial = {
      name,
      baseColorFactor: m.baseColorFactor,
      metallicFactor: m.metallicFactor,
      roughnessFactor: m.roughnessFactor,
      alphaMode: m.alphaMode,
      ...(m.alphaMode === 'MASK' ? { alphaCutoff: m.alphaCutoff } : {}),
      doubleSided: m.doubleSided,
    }
    const base = image(m.baseColorTexture, `${name}_baseColor`)
    if (base) out.baseColorTexture = base
    const mr = image(m.metallicRoughnessTexture, `${name}_metallicRoughness`)
    if (mr) out.metallicRoughnessTexture = mr
    const normal = image(m.normalTexture, `${name}_normal`)
    if (normal) out.normalTexture = { ...normal, scale: m.normalTexture!.scale }
    const occlusion = image(m.occlusionTexture, `${name}_occlusion`)
    if (occlusion)
      out.occlusionTexture = {
        ...occlusion,
        strength: m.occlusionTexture!.strength,
      }
    if (m.emissiveFactor.some((x) => x > 0))
      out.emissiveFactor = m.emissiveFactor
    const emissive = image(m.emissiveTexture, `${name}_emissive`)
    if (emissive) {
      out.emissiveTexture = emissive
      out.emissiveFactor ??= [1, 1, 1]
    }
    materials.push(out)
  }
  return { materials, images }
}

/** A run of the body's triangles as a primitive with its own vertices. */
function primitive(
  start: number,
  count: number,
  indices: ArrayLike<number>,
  positions: ArrayLike<number>,
  normals: Float32Array,
  joints: ArrayLike<number>,
  weights: ArrayLike<number>,
  uvs: ArrayLike<number> | undefined,
  colors: ArrayLike<number> | undefined,
  material: number
): GlbPrimitive {
  const remap = new Map<number, number>()
  const order: number[] = []
  const ix = new Uint32Array(count)
  for (let k = 0; k < count; k++) {
    const v = indices[start + k]
    let at = remap.get(v)
    if (at == null) {
      at = order.length
      remap.set(v, at)
      order.push(v)
    }
    ix[k] = at
  }
  const take = (src: ArrayLike<number>, size: number) => {
    const out = new Float32Array(order.length * size)
    order.forEach((v, i) => {
      for (let c = 0; c < size; c++) out[i * size + c] = src[v * size + c]
    })
    return out
  }
  return {
    positions: take(positions, 3),
    normals: take(normals, 3),
    uvs: uvs ? take(uvs, 2) : null,
    colors: colors ? take(colors, 4) : null,
    joints: take(joints, 4),
    weights: take(weights, 4),
    indices: ix,
    material,
  }
}

/**
 * A rigged body as a skinned GLB in Dramatis's export profile: the 65 UAL
 * joints with UAL's frames (or Mixamo's names), a T-pose (or the body's own
 * rest), the soles on the floor under the origin, `body` and `eyes` meshes,
 * the file's materials and pictures. Pure; the GLB's bytes.
 */
export function riggedBodyGlb(
  body: RiggedBody,
  options: RiggedBodyGlbOptions = {}
): Uint8Array {
  const naming = options.naming ?? 'ue'
  const restPose = options.restPose ?? 't-pose'
  if (naming !== 'ue' && naming !== 'mixamo')
    throw new Error(
      `riggedBodyGlb: naming must be 'ue' or 'mixamo', not ${JSON.stringify(
        naming
      )}`
    )
  if (restPose !== 't-pose' && restPose !== 'source')
    throw new Error(
      `riggedBodyGlb: restPose must be 't-pose' or 'source', not ${JSON.stringify(
        restPose
      )}`
    )
  const sk = profileSkeleton(body)
  const nVerts = body.positions.length / 3

  // Influences onto the profile's joints.
  const joints = new Uint16Array(nVerts * 4)
  for (let i = 0; i < joints.length; i++)
    joints[i] = Math.max(0, sk.from[body.weights.indices[i]] ?? 0)
  const weights = body.weights.weights

  // Into the rest pose.
  const pose = restPose === 't-pose' ? tPose(sk) : sourcePose(sk)
  const posed = skinTo(body.positions, joints, weights, sk.rest, pose)
  const head = sk.names.indexOf('Head')
  const eyes = (body.eyes ?? []).map((e) => {
    const n = e.positions.length / 3
    return skinTo(
      e.positions,
      new Uint16Array(n * 4).fill(head),
      Float32Array.from({ length: n * 4 }, (_, k) => (k % 4 === 0 ? 1 : 0)),
      sk.rest,
      pose
    )
  })

  // Scaled to height, the soles on the floor, the pelvis over the origin.
  let lo = Infinity
  let hi = -Infinity
  for (let i = 1; i < posed.length; i += 3) {
    lo = Math.min(lo, posed[i])
    hi = Math.max(hi, posed[i])
  }
  const scale =
    options.height != null && hi > lo ? options.height / (hi - lo) : 1
  const pelvis = pose.positions[sk.names.indexOf('pelvis')]
  const place = (p: ArrayLike<number>, i: number): V3 => [
    (p[i] - pelvis[0]) * scale,
    (p[i + 1] - lo) * scale,
    (p[i + 2] - pelvis[2]) * scale,
  ]
  const placeAll = (src: Float64Array) => {
    const out = new Float64Array(src.length)
    for (let i = 0; i < src.length; i += 3) out.set(place(src, i), i)
    return out
  }
  const positions = placeAll(posed)
  const eyePositions = eyes.map(placeAll)
  const at = pose.positions.map((p) => place(p, 0))
  at[0] = [0, 0, 0] // root: on the floor, under the pelvis

  // Each joint's model-space frame: UAL's (turned along the body's bones in
  // the source pose), so its rotation keys mean the same here.
  const frames: Q[] = sk.names.map((name, i) => {
    const u = PROFILE_INDEX.get(name)
    if (u == null) return IDENTITY // filled from the parent below
    const ual = UAL_GLOBAL.rotations[u]
    if (restPose === 't-pose') return ual
    const c = aimChild(sk, i)
    const uc = c >= 0 ? PROFILE_INDEX.get(sk.names[c]) : undefined
    if (!AIMED.test(name) || c < 0 || uc == null) return ual
    const turn = qfromTo(
      sub(UAL_GLOBAL.positions[uc], UAL_GLOBAL.positions[u]),
      sub(at[c], at[i])
    )
    return qnorm(qmul(turn, ual))
  })
  sk.names.forEach((name, i) => {
    if (!PROFILE_INDEX.has(name)) frames[i] = frames[sk.parents[i]]
  })

  const glbJoints: GlbJoint[] = sk.names.map((name, i) => {
    const p = sk.parents[i]
    const parentFrame = p < 0 ? IDENTITY : frames[p]
    const local = p < 0 ? at[i] : qrot(qconj(parentFrame), sub(at[i], at[p]))
    const rotation = qnorm(qmul(qconj(parentFrame), frames[i]))
    return {
      name: naming === 'mixamo' ? MIXAMO_JOINT_NAMES[name] ?? name : name,
      parent: p,
      translation: local,
      rotation,
    }
  })
  // Inverse binds: the inverse of each joint's model-space matrix.
  const ibm = new Float32Array(sk.names.length * 16)
  frames.forEach((q, i) => {
    const r = qmatrix(qconj(q)) // row-major inverse rotation
    const t = qrot(qconj(q), at[i])
    const o = i * 16
    // Column-major: R^T, then -R^T·p.
    ibm.set(
      [
        r[0],
        r[3],
        r[6],
        0,
        r[1],
        r[4],
        r[7],
        0,
        r[2],
        r[5],
        r[8],
        0,
        -t[0],
        -t[1],
        -t[2],
        1,
      ],
      o
    )
  })

  // The body, one primitive per surface.
  const indices = body.indices
  const normals = smoothNormals(positions, indices)
  const runs = body.surfaces?.length
    ? body.surfaces.map((s) => [s.start, s.count])
    : [[0, indices.length]]
  const { materials, images } = materialsOf(body, runs.length, body.uvs != null)
  const meshes = [
    {
      name: 'body',
      primitives: runs.map(([start, count], s) =>
        primitive(
          start,
          count,
          indices,
          positions,
          normals,
          joints,
          weights,
          body.uvs,
          body.colors,
          s
        )
      ),
    },
  ]
  if (eyePositions.length) {
    const pos: number[] = []
    const ix: number[] = []
    eyePositions.forEach((p, e) => {
      const base = pos.length / 3
      for (const x of p) pos.push(x)
      for (const i of body.eyes![e].indices) ix.push(base + i)
    })
    const n = pos.length / 3
    materials.push({
      name: 'eyes',
      baseColorFactor: [0.95, 0.95, 0.95, 1],
      metallicFactor: 0,
      roughnessFactor: 0.2,
      alphaMode: 'OPAQUE',
      doubleSided: false,
    })
    meshes.push({
      name: 'eyes',
      primitives: [
        {
          positions: Float32Array.from(pos),
          normals: smoothNormals(pos, ix),
          uvs: null,
          colors: null,
          joints: new Uint16Array(n * 4).fill(head),
          weights: Float32Array.from({ length: n * 4 }, (_, k) =>
            k % 4 === 0 ? 1 : 0
          ),
          indices: Uint32Array.from(ix),
          material: materials.length - 1,
        },
      ],
    })
  }

  return writeSkinnedGlb({
    asset: {
      generator: options.generator ?? 'tosijs-3d',
      ...(options.copyright ? { copyright: options.copyright } : {}),
      ...(options.extras ? { extras: options.extras } : {}),
    },
    joints: glbJoints,
    skinName: 'skeleton',
    skeletonRoot: 0,
    inverseBindMatrices: ibm,
    meshes,
    materials,
    images,
  })
}
