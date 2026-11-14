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
  under a joint; with `eyeTexture`, eye-art's picture laid on each by
  `gltfEyeUvs`, else plain white). The file's own materials go out as glTF PBR with their
  pictures embedded, when the body's surfaces carry them as data (a body
  read by `glb-rig`); otherwise a plain grey.
- **Springs**, when given the rig `recipe`: a bone spring (a tail) swings
  from its root down, a strand is baked into joints under its anchor and a
  tube skinned to them, colliders (`auto`: head, chest, clavicles, sized to
  the body) go on their bones. They are written as `VRMC_springBone`, which
  three-vrm, UniVRM and Godot's VRM importer read with no setup, and as
  `TOSIJS_spring_chains`, our own settings exactly (see
  [spring-vrm](/spring-vrm/) for how the two models differ).
- **Garments**, with `garments`: proxies bound to this body (`garmentProxy`
  from a garment file: the tailor's cuts and draped cloth, or a garment
  from Blender), each a mesh named for its slot, skinned with weights from
  the body's own, as the builder draws them (armour lifted 5 mm), with its
  material as data (its pictures, and its saved look's glTF factors where
  it has a plain reading). A recoloured cloth's picture is written
  recoloured when you pass `bake: bakeClothLook` ([cloth-bake](/cloth-bake/),
  PNG or JPEG in, PNG out), so the file shows what the builder does in any
  engine; without it the pictures go as they came, and the writer carries no
  image decoder. The skin they cover is tucked under them, as the
  builder does, and skin a garment lists in its `delete` (as MakeHuman's
  clothes do) is dropped; `cover: false` leaves the skin alone.
- **Clips**, with `clips`: animations read from any skinned GLB
  ([[glb-clips]]: UAL's, Mixamo's, Meshy's) retargeted onto this skeleton
  and written as glTF animations, 30 keys a second by default (rotations,
  and the hips' travel), each with its own `extras` (its licence).
- **A held item**, with `held`: a joint named `weapon_r` (or `held.name`)
  under the hand, where a grip (see [[hold-grip]]) puts the item's grip
  point, turned as the grip says, in the hand's socket frame
  ([[hand-socket]]): the same place the character builder shows it. Unity
  and Unreal attach their own items to a named bone like this one. With
  `held.item` (a mesh in its own frame, as `glbRigTriangles(bytes, { pick })`
  reads one out of a library file) the item goes in too, as a mesh `held`
  skinned wholly to that joint, scaled by the grip's `scale`, its grip
  point (`held.gripPoint`, else the middle of its lowest third) on the
  joint, its own materials and pictures, and `held.extras` (its licence) on
  the mesh, as its file has it.
- **`asset.extras`** is passed through as given (Dramatis's licence block
  goes there), with `generator` and `copyright`.

Weights are the body's own, four per vertex, renormalised.
*/
/*{ "parent": "skinned-glb", "order": 1 }*/

import {
  writeSkinnedGlb,
  type GlbImage,
  type GlbJoint,
  type GlbMaterial,
  type GlbMesh,
  type GlbPrimitive,
} from './skinned-glb.js'
import { UAL_REST } from './ual-rest.js'
import type { BodyTriangles, RiggedBody } from './rigged-body.js'
import type { GarmentProxy, GarmentProxyMaterial } from './garment-proxy.js'
import type { HumanProxy } from './human-pack.js'
import { drawnPositions, fitProxy, proxyWeights } from './proxy-fit.js'
import { coverSkin } from './proxy-cover.js'
import { vertexNormals } from './hair-fit.js'
import { bakeClip, type GlbClip, type GlbClipSource } from './glb-clips.js'
import { humanoidRoles } from './retarget.js'
import { gltfEyeUvs } from './eye-art.js'
import type { GlbAnimation } from './skinned-glb.js'
import {
  gripMatrix,
  gripPoint,
  mat4Multiply,
  socketWorld,
  type Grip,
  type Vec3 as HandVec3,
} from './hand-socket.js'
import type { GltfSurfaceMaterial, GltfTextureRef } from './glb-rig.js'
import {
  STRAND_DEFAULTS,
  strandPoints,
  type RigRecipe,
  type SpringRecipe,
  type StrandSpringRecipe,
} from './rig-recipe.js'
import { SPRING_DEFAULTS } from './spring-chain.js'
import {
  springExtensions,
  type SpringChainOut,
  type SpringColliderOut,
} from './spring-vrm.js'

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
  /**
   * The rig recipe, for its springs: bone chains swing, strands are baked
   * into joints and a tube mesh, colliders go on their bones; written as
   * `VRMC_springBone` and `TOSIJS_spring_chains` (see spring-vrm).
   */
  recipe?: Partial<RigRecipe>
  /** A held item, or only its socket: see "A held item" above. */
  held?: HeldItem
  /** Garments bound to this body (`garmentProxy`): see "Garments" above. */
  garments?: GarmentProxy[]
  /** Tuck the skin the garments cover, drop what they list (default true). */
  cover?: boolean
  /**
   * Bakes each garment's look into its picture: pass cloth-bake's
   * `bakeClothLook` and a recoloured cloth's texture is written recoloured,
   * so any engine draws what the builder shows. Without it the pictures are
   * written as they are, the look only as factors. Passed in rather than
   * imported so a writer that bakes nothing does not carry an image decoder.
   */
  bake?: ClothBaker | false
  /** Clips to write: see "Clips" above. */
  clips?: ClipOut[]
  /**
   * The eyes' picture (one eye, as eye-art draws it: `recolourEyePng`), laid
   * on both eyeballs by `gltfEyeUvs`. Without it the eyes are plain white.
   */
  eyeTexture?: { bytes: Uint8Array; mimeType: string } | null
}

/** A clip for `riggedBodyGlb`: one of a file's (`readGlbClips`), retargeted. */
export interface ClipOut {
  from: GlbClipSource
  /** The clip's name in `from`, or the clip. */
  clip: string | GlbClip
  /** Its name in the file (default its own). */
  name?: string
  /** Keys a second (default 30). */
  fps?: number
  /** Spread the arms (see retarget's `armSpaceDeg`). */
  armSpaceDeg?: number
  /** Turn the feet (see retarget's `footTurnDeg`). */
  footTurnDeg?: number
  /** Left to right (see retarget's `mirror`). */
  mirror?: boolean
  /** The animation's `extras`: its licence. */
  extras?: Record<string, unknown>
}

/** What a hand holds, for `riggedBodyGlb`'s `held`. */
export interface HeldItem {
  /** The grip: a point and a turn in the hand's socket frame, and a scale. */
  grip: Grip
  /** Which hand (default the right). */
  side?: 'r' | 'l'
  /** The socket joint's name (default `weapon_r` or `weapon_l`). */
  name?: string
  /** The item, in its own frame: left out, the file carries the socket alone. */
  item?: BodyTriangles
  /** Where the item is held, in its frame (default `gripPoint` of it). */
  gripPoint?: HandVec3
  /** The item mesh's `extras` (its licence). */
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
/** A rotation matrix (column vectors, row-major 3x3) as a quaternion. */
function matrixQuat(m: number[]): Q {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m
  const t = m00 + m11 + m22
  if (t > 0) {
    const s = 0.5 / Math.sqrt(t + 1)
    return qnorm([(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s])
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
    return qnorm([0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s])
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
    return qnorm([(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s])
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
  return qnorm([(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s])
}

/*
THE SOCKET IS WORKED OUT WHERE IT WAS CALIBRATED. hand-socket's numbers are
Babylon's world, which is the file's frame under the glTF loader's root (x
negated), so the hand's joints go there, the socket and grip are composed
there, and the root comes off again: world · root⁻¹, the columns' x negated.
(The calibration is a reflection, det -1, because Babylon's hand carries the
root's mirror; with the root off, the socket is a plain turn again.)
*/
function heldSocket(
  sk: Skeleton,
  at: V3[],
  held: HeldItem
): { name: string; hand: number; position: V3; rotation: Q } {
  const side = held.side ?? 'r'
  const ix = (n: string) => {
    const i = sk.names.indexOf(n)
    if (i < 0)
      throw new Error(`riggedBodyGlb: held needs ${n}, not in the skeleton`)
    return i
  }
  const hand = ix(`hand_${side}`)
  const mirror = (p: V3): HandVec3 => ({ x: -p[0], y: p[1], z: p[2] })
  const socket = socketWorld(
    side,
    mirror(at[hand]),
    mirror(at[ix(`lowerarm_${side}`)]),
    mirror(at[ix(`thumb_01_${side}`)])
  )
  if (socket == null)
    throw new Error(
      `riggedBodyGlb: the ${side} hand cannot be read (thumb in line with the forearm)`
    )
  const w = mat4Multiply(gripMatrix(held.grip), socket)
  const r = [-1, 1, 1, 1]
  const f = w.map((v, k) => v * r[k % 4])
  // Row vectors: row i is where axis i goes. Columns of the rotation, unscaled.
  const axis = (i: number) => {
    const l = Math.hypot(f[i * 4], f[i * 4 + 1], f[i * 4 + 2]) || 1
    return [f[i * 4] / l, f[i * 4 + 1] / l, f[i * 4 + 2] / l]
  }
  const [ax, ay, az] = [axis(0), axis(1), axis(2)]
  return {
    name: held.name ?? `weapon_${side}`,
    hand,
    position: [f[12], f[13], f[14]],
    rotation: matrixQuat([
      ax[0],
      ay[0],
      az[0],
      ax[1],
      ay[1],
      az[1],
      ax[2],
      ay[2],
      az[2],
    ]),
  }
}

/**
 * The held item's mesh, placed on its socket and skinned wholly to the joint
 * at `jointIndex`, with its materials (indices from `materialBase`); its
 * pictures are appended to `images`.
 */
function heldMesh(
  held: HeldItem,
  socket: { position: V3; rotation: Q },
  jointIndex: number,
  materialBase: number,
  images: GlbImage[]
): { mesh: GlbMesh; materials: GlbMaterial[] } {
  const item = held.item!
  const gp = held.gripPoint ?? gripPoint(item.positions) ?? { x: 0, y: 0, z: 0 }
  const k = held.grip.scale ?? 1
  const pos = new Float32Array(item.positions.length)
  for (let i = 0; i < pos.length; i += 3) {
    const v = qrot(socket.rotation, [
      (item.positions[i] - gp.x) * k,
      (item.positions[i + 1] - gp.y) * k,
      (item.positions[i + 2] - gp.z) * k,
    ])
    pos[i] = socket.position[0] + v[0]
    pos[i + 1] = socket.position[1] + v[1]
    pos[i + 2] = socket.position[2] + v[2]
  }
  const runs = item.surfaces?.length
    ? item.surfaces.map((s) => [s.start, s.count])
    : [[0, item.indices.length]]
  const { materials } = materialsOf(
    item.surfaces,
    runs.length,
    item.uvs != null,
    'held',
    images
  )
  const n = pos.length / 3
  const jw = new Uint16Array(n * 4).fill(jointIndex)
  const ww = Float32Array.from({ length: n * 4 }, (_, i) =>
    i % 4 === 0 ? 1 : 0
  )
  const normals = smoothNormals(pos, item.indices)
  return {
    mesh: {
      name: 'held',
      primitives: runs.map(([start, count], r) =>
        primitive(
          start,
          count,
          item.indices,
          pos,
          normals,
          jw,
          ww,
          item.uvs,
          undefined,
          materialBase + r
        )
      ),
      ...(held.extras ? { extras: held.extras } : {}),
    },
    materials,
  }
}

/** A skeleton's joint at rest: its local transform and model-space position. */
export interface RestJoint {
  name: string
  /** Index of the parent joint, -1 for a root. */
  parent: number
  translation: V3
  rotation: Q
  position: V3
}

/** A held item's parts, to add to a GLB whose skeleton is `joints`. */
export interface HeldParts {
  /** The socket joint: append it after the skeleton's joints. */
  joint: {
    name: string
    /** The hand's index. */
    parent: number
    translation: V3
    rotation: Q
    /** Column-major, 16 numbers. */
    inverseBind: Float32Array
  }
  /** The item's mesh, skinned to the joint (index `joints.length`); null for a socket alone. */
  mesh: GlbMesh | null
  /** Its materials; the mesh's material indices count from `materialBase`. */
  materials: GlbMaterial[]
  /** Its pictures; the materials' image indices count from `imageBase`. */
  images: GlbImage[]
}

/**
 * A held item for ANY skeleton at rest, as `riggedBodyGlb` writes one: the
 * socket joint under the hand (hand-socket's socket times the grip) and, with
 * `held.item`, its mesh skinned to that joint, its materials and pictures.
 * For a writer whose skeleton `riggedBodyGlb` did not make. The skeleton needs
 * `hand_<side>`, `lowerarm_<side>` and `thumb_01_<side>`; it throws when the
 * hand cannot be read.
 */
export function heldParts(
  joints: readonly RestJoint[],
  held: HeldItem,
  bases: { materialBase?: number; imageBase?: number } = {}
): HeldParts {
  const sk: Skeleton = {
    names: joints.map((j) => j.name),
    parents: joints.map((j) => j.parent),
    rest: joints.map((j) => j.position),
  }
  const socket = heldSocket(sk, sk.rest, held)
  // Each joint's model-space turn at rest.
  const world: Q[] = []
  joints.forEach((j, i) => {
    world[i] =
      j.parent < 0 ? j.rotation : qnorm(qmul(world[j.parent], j.rotation))
  })
  const handQ = world[socket.hand]
  const translation = qrot(
    qconj(handQ),
    sub(socket.position, sk.rest[socket.hand])
  )
  const r = qmatrix(qconj(socket.rotation))
  const t = qrot(qconj(socket.rotation), socket.position)
  const joint = {
    name: socket.name,
    parent: socket.hand,
    translation,
    rotation: qnorm(qmul(qconj(handQ), socket.rotation)),
    inverseBind: Float32Array.from([
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
    ]),
  }
  if (!held.item) return { joint, mesh: null, materials: [], images: [] }
  const images: GlbImage[] = []
  const { mesh, materials } = heldMesh(
    held,
    socket,
    joints.length,
    bases.materialBase ?? 0,
    images
  )
  const imageBase = bases.imageBase ?? 0
  if (imageBase)
    for (const m of materials)
      for (const key of Object.keys(m) as (keyof GlbMaterial)[]) {
        const v = m[key] as { image?: number } | undefined
        if (v && typeof v === 'object' && typeof v.image === 'number')
          (m as any)[key] = { ...v, image: v.image + imageBase }
      }
  return { joint, mesh, materials, images }
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

/** What `bake` takes: cloth-bake's `bakeClothLook`, or one of the same shape. */
export type ClothBaker = (
  picture: { bytes: Uint8Array; mimeType: string },
  look: GarmentProxyMaterial['look']
) => { bytes: Uint8Array; mimeType: string } | null

const isGltfMaterial = (m: unknown): m is GltfSurfaceMaterial =>
  m != null && Array.isArray((m as GltfSurfaceMaterial).baseColorFactor)

let warnedNoBaker = false

/** The body's materials as glTF, their pictures collected once each. */
/** A garment's material (garment-proxy's data) as glTF's. */
function garmentMaterial(
  m: GarmentProxyMaterial,
  name: string,
  images: GlbImage[],
  bake?: ClothBaker | false
): GlbMaterial {
  const image = (
    t: { bytes: Uint8Array; mimeType: string } | null | undefined,
    as: string
  ) => {
    if (t?.bytes == null) return undefined
    if (t.mimeType !== 'image/png' && t.mimeType !== 'image/jpeg')
      return undefined
    let i = images.findIndex((im) => im.bytes === t.bytes)
    if (i < 0) {
      images.push({
        name: `${name}_${as}`,
        mimeType: t.mimeType,
        bytes: t.bytes,
      })
      i = images.length - 1
    }
    return { image: i }
  }
  const gltf = m.gltf ?? {}
  const out: GlbMaterial = {
    name,
    baseColorFactor: gltf.baseColorFactor ?? m.baseColor ?? [0.8, 0.8, 0.8, 1],
    metallicFactor: gltf.metallicFactor ?? m.metallic ?? 0,
    roughnessFactor: gltf.roughnessFactor ?? m.roughness ?? 0.8,
    alphaMode: m.alphaMode ?? 'OPAQUE',
    ...(m.alphaMode === 'MASK' ? { alphaCutoff: m.alphaCutoff ?? 0.5 } : {}),
    doubleSided: m.twoSided,
  }
  if (
    typeof bake !== 'function' &&
    bake !== false &&
    m.look != null &&
    m.baseColorTexture?.bytes != null &&
    !warnedNoBaker
  ) {
    // Until 0.13 the writer baked by default; a caller relying on that now
    // gets the pictures as they are.
    warnedNoBaker = true
    console.warn(
      "riggedBodyGlb: a garment has a look but no baker, so its picture is written unrecoloured. Pass `bake: bakeClothLook` (from 'tosijs-3d/cloth-bake'), or `bake: false` to say so."
    )
  }
  const baked =
    typeof bake === 'function' && m.baseColorTexture?.bytes != null
      ? bake(m.baseColorTexture, m.look)
      : null
  const base = image(baked ?? m.baseColorTexture, 'baseColor')
  if (base) out.baseColorTexture = base
  const mr = image(m.metallicRoughnessTexture, 'metallicRoughness')
  if (mr) out.metallicRoughnessTexture = mr
  const normal = image(m.normalTexture, 'normal')
  if (normal) out.normalTexture = { ...normal, scale: m.normalScale ?? 1 }
  if (gltf.sheenColorFactor)
    out.sheen = {
      colorFactor: gltf.sheenColorFactor,
      roughnessFactor: gltf.sheenRoughnessFactor ?? 0.5,
    }
  return out
}

function materialsOf(
  surfaces: BodyTriangles['surfaces'],
  surfaceCount: number,
  textured: boolean,
  prefix = 'body',
  images: GlbImage[] = []
): { materials: GlbMaterial[]; images: GlbImage[] } {
  const seen = new Map<Uint8Array, number>()
  images.forEach((im, i) => seen.set(im.bytes, i))
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
    const name = s === 0 ? prefix : `${prefix}_${s + 1}`
    const m = surfaces?.[s]?.material
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
  const strands = addStrands(sk, options.recipe)
  const nVerts = body.positions.length / 3

  // Influences onto the profile's joints.
  const joints = new Uint16Array(nVerts * 4)
  for (let i = 0; i < joints.length; i++)
    joints[i] = Math.max(0, sk.from[body.weights.indices[i]] ?? 0)
  const weights = body.weights.weights

  // Garments fitted on the body at rest, and the skin they cover tucked.
  const worn = (options.garments ?? []).map((g) => {
    const drawn = drawnPositions(g, fitProxy(g, body.positions))
    if (g.slot === 'armour') {
      const n = vertexNormals(drawn, g.triangles)
      for (let i = 0; i < drawn.length; i++) drawn[i] += n[i] * 0.005
    }
    // A rigid piece (hair) follows one joint wholly, as the builder hangs it.
    const joint = g.follows
      ? body.rig.joints.findIndex((j) => j.name === g.follows)
      : -1
    const w =
      joint >= 0
        ? {
            indices: Float32Array.from(
              { length: (drawn.length / 3) * 4 },
              (_, k) => (k % 4 === 0 ? joint : 0)
            ),
            weights: Float32Array.from(
              { length: (drawn.length / 3) * 4 },
              (_, k) => (k % 4 === 0 ? 1 : 0)
            ),
          }
        : proxyWeights(g, body.weights)
    return { g, drawn, w }
  })
  let rest: ArrayLike<number> = body.positions
  let indices: ArrayLike<number> = body.indices
  let runs: number[][] = body.surfaces?.length
    ? body.surfaces.map((s) => [s.start, s.count])
    : [[0, body.indices.length]]
  // The skin is tucked under clothes only, as the builder does (hair and
  // brows sit on it).
  const clothing = worn.filter((x) => x.g.category === 'clothes')
  if (clothing.length > 0 && options.cover !== false) {
    const covered = coverSkin(
      body.positions,
      vertexNormals(body.positions, body.indices), // unit: coverSkin measures along them
      body.indices,
      Uint32Array.from({ length: nVerts }, (_, i) => i),
      clothing.map((x) => x.g as unknown as HumanProxy),
      { drawn: new Map(clothing.map((x) => [x.g.name, x.drawn])) }
    )
    rest = covered.positions
    if (covered.deleted.size > 0) {
      const kept: number[] = []
      runs = runs.map(([start, count]) => {
        const from = kept.length
        for (let t = start; t < start + count; t += 3) {
          const a = body.indices[t]
          const b = body.indices[t + 1]
          const c = body.indices[t + 2]
          if (
            covered.deleted.has(a) ||
            covered.deleted.has(b) ||
            covered.deleted.has(c)
          )
            continue
          kept.push(a, b, c)
        }
        return [from, kept.length - from]
      })
      indices = Uint32Array.from(kept)
    }
  }

  // Into the rest pose.
  const pose = restPose === 't-pose' ? tPose(sk) : sourcePose(sk)
  const posed = skinTo(rest, joints, weights, sk.rest, pose)
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

  const tubes = strands.map((st) => {
    const t = strandTube(st, sk.rest)
    return {
      ...t,
      posed: skinTo(t.positions, t.joints, t.weights, sk.rest, pose),
    }
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

  const names = [...sk.names]
  const parents = [...sk.parents]
  const held = options.held && heldSocket(sk, at, options.held)
  if (held) {
    names.push(held.name)
    parents.push(held.hand)
    frames.push(held.rotation)
    at.push(held.position)
  }

  const glbJoints: GlbJoint[] = names.map((name, i) => {
    const p = parents[i]
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
  const ibm = new Float32Array(names.length * 16)
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
  const normals = smoothNormals(positions, indices)
  const { materials, images } = materialsOf(
    body.surfaces,
    runs.length,
    body.uvs != null
  )
  const meshes = [
    {
      name: 'body',
      primitives: runs
        .map(([start, count], s) =>
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
        )
        .filter((p) => p.indices.length > 0), // a surface wholly covered goes
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
    // The picture is laid on by where each point is on its eyeball at rest.
    const eyeArt = options.eyeTexture
    const textured =
      eyeArt != null &&
      (eyeArt.mimeType === 'image/png' || eyeArt.mimeType === 'image/jpeg')
    if (textured)
      images.push({
        name: 'eyes',
        mimeType: eyeArt.mimeType as 'image/png' | 'image/jpeg',
        bytes: eyeArt.bytes,
      })
    const eyeUvs = textured
      ? gltfEyeUvs(body.eyes!.flatMap((e) => Array.from(e.positions)))
      : null
    materials.push({
      name: 'eyes',
      baseColorFactor: textured ? [1, 1, 1, 1] : [0.95, 0.95, 0.95, 1],
      ...(textured ? { baseColorTexture: { image: images.length - 1 } } : {}),
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
          uvs: eyeUvs,
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

  tubes.forEach((t, k) => {
    const pos = placeAll(t.posed)
    materials.push({
      name: t.name,
      baseColorFactor: [...hexColour(t.color), 1],
      metallicFactor: 0,
      roughnessFactor: 0.7,
      alphaMode: 'OPAQUE',
      doubleSided: true,
    })
    meshes.push({
      name: t.name,
      primitives: [
        {
          positions: Float32Array.from(pos),
          normals: smoothNormals(pos, t.indices),
          uvs: null,
          colors: null,
          joints: t.joints,
          weights: t.weights,
          indices: t.indices,
          material: materials.length - 1,
        },
      ],
    })
    void k
  })

  worn.forEach(({ g, drawn, w }) => {
    const gj = new Uint16Array(w.indices.length)
    for (let i = 0; i < gj.length; i++)
      gj[i] = Math.max(0, sk.from[w.indices[i]] ?? 0)
    const pos = placeAll(skinTo(drawn, gj, w.weights, sk.rest, pose))
    materials.push(
      garmentMaterial(
        g.material,
        `${g.slot ?? 'garment'}_${g.name}`,
        images,
        options.bake
      )
    )
    meshes.push({
      name: `${g.slot ?? 'garment'}: ${g.name}`,
      primitives: [
        {
          positions: Float32Array.from(pos),
          normals: smoothNormals(pos, g.triangles),
          // A garment's uvs are OBJ's (v up), as MakeHuman's and readGarment
          // hold them; glTF's v runs down.
          uvs:
            g.uvs.length === (pos.length / 3) * 2
              ? Float32Array.from(g.uvs, (v, i) => (i % 2 ? 1 - v : v))
              : null,
          colors: null,
          joints: gj,
          weights: w.weights,
          indices: Uint32Array.from(g.triangles),
          material: materials.length - 1,
        },
      ],
    })
  })

  if (held && options.held!.item) {
    const own = heldMesh(
      options.held!,
      held,
      names.length - 1,
      materials.length,
      images
    )
    materials.push(...own.materials)
    meshes.push(own.mesh)
  }

  const chains = springChains(sk, strands, options.recipe, {
    at,
    frames,
    scale,
    height: (hi - lo) * scale,
  })
  const extensions = chains.length ? springExtensions(chains, at) : undefined

  // Clips, retargeted onto the skeleton as written.
  const animations: GlbAnimation[] = []
  if (options.clips?.length) {
    const bones = glbJoints.map((j) => ({
      name: j.name,
      parent: j.parent < 0 ? null : glbJoints[j.parent].name,
      rotation: {
        x: j.rotation[0],
        y: j.rotation[1],
        z: j.rotation[2],
        w: j.rotation[3],
      },
      position: {
        x: j.translation[0],
        y: j.translation[1],
        z: j.translation[2],
      },
    }))
    const target = { bones, roles: humanoidRoles(bones) }
    const index = new Map(glbJoints.map((j, i) => [j.name, i]))
    for (const c of options.clips) {
      const baked = bakeClip(c.from, c.clip, target, {
        fps: c.fps,
        armSpaceDeg: c.armSpaceDeg,
        footTurnDeg: c.footTurnDeg,
        mirror: c.mirror,
        name: c.name,
      })
      const channels: GlbAnimation['channels'] = []
      for (const [name, values] of baked.rotations) {
        const joint = index.get(name)
        if (joint != null)
          channels.push({ joint, path: 'rotation', times: baked.times, values })
      }
      const hips =
        target.roles.hips != null ? index.get(target.roles.hips) : undefined
      if (baked.hips && hips != null)
        channels.push({
          joint: hips,
          path: 'translation',
          times: baked.times,
          values: baked.hips,
        })
      animations.push({
        name: baked.name,
        channels,
        ...(c.extras ? { extras: c.extras } : {}),
      })
    }
  }

  return writeSkinnedGlb({
    ...(animations.length ? { animations } : {}),
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
    ...(extensions ? { extensions } : {}),
  })
}

/** A strand baked into the skeleton: its joints, hung from its anchor. */
interface Strand {
  name: string
  recipe: StrandSpringRecipe
  anchor: number
  /** Its joints' indices in the skeleton, root first. */
  joints: number[]
}

const strandName = (s: StrandSpringRecipe, i: number) =>
  `${(s.name ?? 'strand').replace(/[^A-Za-z0-9_]/g, '_') || 'strand'}_${i + 1}`

/**
 * Each strand of the recipe as joints in the skeleton, at rest. Its points
 * are in the character's frame (left on -X) from its anchor; the file's
 * frame has the left on +X.
 */
function addStrands(sk: Skeleton, recipe?: Partial<RigRecipe>): Strand[] {
  const out: Strand[] = []
  ;(recipe?.springs ?? []).forEach((spring, i) => {
    if (spring.kind !== 'strand') return
    const s = { ...STRAND_DEFAULTS, ...spring }
    const anchor = sk.names.indexOf(s.anchor)
    if (anchor < 0)
      throw new Error(
        `riggedBodyGlb: strand anchor ${s.anchor} is not in the skeleton`
      )
    const name = strandName(s, i)
    const base = sk.rest[anchor]
    const joints: number[] = []
    strandPoints(s).forEach((p, k) => {
      sk.names.push(`${name}_${String(k + 1).padStart(2, '0')}`)
      sk.parents.push(k === 0 ? anchor : sk.names.length - 2)
      sk.rest.push([base[0] - p.x, base[1] + p.y, base[2] + p.z])
      joints.push(sk.names.length - 1)
    })
    out.push({ name, recipe: s, anchor, joints })
  })
  return out
}

/** A strand's tube at rest: rings round its joints, each ring on the joint before it. */
function strandTube(
  st: Strand,
  rest: V3[]
): {
  name: string
  color: string
  positions: Float64Array
  indices: Uint32Array
  joints: Uint16Array
  weights: Float32Array
} {
  const SIDES = 8
  const pts = st.joints.map((j) => rest[j])
  const r0 = st.recipe.radius
  const r1 = st.recipe.tipRadius ?? r0
  const pos: number[] = []
  const jts: number[] = []
  const wts: number[] = []
  const ix: number[] = []
  pts.forEach((p, k) => {
    const along = sub(
      pts[Math.min(k + 1, pts.length - 1)],
      pts[Math.max(k - 1, 0)]
    )
    const l = Math.hypot(...along) || 1
    const d: V3 = [along[0] / l, along[1] / l, along[2] / l]
    // Two directions square to the strand.
    const ref: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const u = cross(d, ref)
    const ul = Math.hypot(...u) || 1
    const a: V3 = [u[0] / ul, u[1] / ul, u[2] / ul]
    const b = cross(d, a)
    const radius = r0 + (r1 - r0) * (k / Math.max(1, pts.length - 1))
    const joint = st.joints[Math.max(0, k - 1)]
    for (let s = 0; s < SIDES; s++) {
      const t = (s / SIDES) * Math.PI * 2
      const c = Math.cos(t) * radius
      const n = Math.sin(t) * radius
      pos.push(
        p[0] + a[0] * c + b[0] * n,
        p[1] + a[1] * c + b[1] * n,
        p[2] + a[2] * c + b[2] * n
      )
      jts.push(joint, 0, 0, 0)
      wts.push(1, 0, 0, 0)
    }
  })
  for (let k = 0; k + 1 < pts.length; k++)
    for (let s = 0; s < SIDES; s++) {
      const a = k * SIDES + s
      const b = k * SIDES + ((s + 1) % SIDES)
      const c = a + SIDES
      const d = b + SIDES
      ix.push(a, c, b, b, c, d)
    }
  // A cap at the tip.
  const tip = pos.length / 3
  const last = pts[pts.length - 1]
  pos.push(last[0], last[1], last[2])
  jts.push(st.joints[st.joints.length - 2] ?? st.joints[0], 0, 0, 0)
  wts.push(1, 0, 0, 0)
  const ring = (pts.length - 1) * SIDES
  for (let s = 0; s < SIDES; s++)
    ix.push(ring + s, tip, ring + ((s + 1) % SIDES))
  return {
    name: st.name,
    color: st.recipe.color ?? '#73401a',
    positions: Float64Array.from(pos),
    indices: Uint32Array.from(ix),
    joints: Uint16Array.from(jts),
    weights: Float32Array.from(wts),
  }
}

const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/** `#rrggbb` as linear RGB. */
function hexColour(hex: string): V3 {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1], 16) : 0x73401a
  const lin = (c: number) => {
    const x = c / 255
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)]
}

/**
 * The recipe's springs as chains of the written skeleton: a bone spring
 * from its root down each first child, a strand its baked joints; their
 * colliders on their bones (`auto`: the head, chest and clavicles, sized to
 * the body), offsets in each joint's own frame.
 */
function springChains(
  sk: Skeleton,
  strands: Strand[],
  recipe: Partial<RigRecipe> | undefined,
  placed: { at: V3[]; frames: Q[]; scale: number; height: number }
): SpringChainOut[] {
  const { at, frames, scale } = placed
  const k = Math.max(0.1, placed.height) / 1.8
  const index = (name: string) => sk.names.indexOf(name)
  const local = (joint: number, v: V3): [number, number, number] => {
    const l = qrot(qconj(frames[joint]), v)
    return [l[0], l[1], l[2]]
  }
  const auto = (): SpringColliderOut[] => {
    const out: SpringColliderOut[] = []
    const head = index('Head')
    if (head >= 0)
      out.push({
        node: head,
        radius: 0.12 * k,
        offset: local(head, [0, 0.09 * k, 0]),
      })
    const chest = index('spine_03')
    if (chest >= 0)
      out.push({ node: chest, radius: 0.17 * k, offset: [0, 0, 0] })
    for (const c of ['clavicle_l', 'clavicle_r']) {
      const i = index(c)
      if (i >= 0) out.push({ node: i, radius: 0.09 * k, offset: [0, 0, 0] })
    }
    return out
  }
  const collidersOf = (s: SpringRecipe): SpringColliderOut[] => {
    const c = s.colliders ?? 'auto'
    if (c === 'none') return []
    if (c === 'auto') return auto()
    return c.map((r) => {
      const i = index(r.bone)
      if (i < 0)
        throw new Error(
          `riggedBodyGlb: collider bone ${r.bone} is not in the skeleton`
        )
      const o = r.offset ?? { x: 0, y: 0, z: 0 }
      return {
        node: i,
        radius: r.radius * scale,
        offset: local(i, [-o.x * scale, o.y * scale, o.z * scale]),
      }
    })
  }
  const settingsOf = (s: SpringRecipe, radius: number) => {
    const d = s.kind === 'strand' ? STRAND_DEFAULTS.params! : {}
    return {
      stiffness:
        s.params?.stiffness ?? d.stiffness ?? SPRING_DEFAULTS.stiffness,
      damping: s.params?.damping ?? d.damping ?? SPRING_DEFAULTS.damping,
      gravity: s.params?.gravity ?? d.gravity ?? -SPRING_DEFAULTS.gravity.y,
      radius,
    }
  }
  const out: SpringChainOut[] = []
  ;(recipe?.springs ?? []).forEach((s, i) => {
    if (s.kind === 'bones') {
      const root = index(s.root)
      if (root < 0)
        throw new Error(
          `riggedBodyGlb: spring bone ${s.root} is not in the skeleton`
        )
      const joints = [root]
      for (let at = root; joints.length < 64; ) {
        const next = sk.parents.indexOf(at)
        if (next < 0) break
        joints.push(next)
        at = next
      }
      if (joints.length < 2)
        throw new Error(
          `riggedBodyGlb: spring bone ${s.root} has no bones below it`
        )
      out.push({
        name: s.name ?? s.root,
        kind: 'bones',
        joints,
        settings: settingsOf(s, SPRING_DEFAULTS.radius * scale),
        colliders: collidersOf(s),
      })
      return
    }
    const st = strands.find((t) => t.name === strandName(s, i))!
    const anchorAt = at[st.anchor]
    out.push({
      name: st.name,
      kind: 'strand',
      joints: st.joints,
      settings: settingsOf(s, st.recipe.radius * scale),
      colliders: collidersOf(s),
      strand: {
        anchor: st.anchor,
        path: st.joints.map((j) => {
          const p = sub(at[j], anchorAt)
          return [p[0], p[1], p[2]] as [number, number, number]
        }),
        radius: st.recipe.radius * scale,
        tipRadius: (st.recipe.tipRadius ?? st.recipe.radius) * scale,
        color: st.recipe.color ?? '#73401a',
      },
    })
  })
  return out
}
