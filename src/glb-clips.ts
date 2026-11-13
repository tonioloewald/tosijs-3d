/*#
# glb clips

**A GLB's animations, read and retargeted with no engine.** Any skinned GLB
carries its clips (Mixamo's, Meshy's, UAL's) as keyframes on its skeleton.
`readGlbClips` reads them, and the skeleton they were made on, from the bytes;
`bakeClip` samples one through [[retarget]] onto another skeleton as
keyframes; `riggedBodyGlb`'s `clips` writes them into an exported body, so a
character leaves with its walk cycle.

```javascript
import { readGlbClips, bakeClip } from 'tosijs-3d/glb-clips'
import { riggedBodyGlb } from 'tosijs-3d/rigged-body-glb'

const ual = readGlbClips(new Uint8Array(await (await fetch(ualUrl)).arrayBuffer()))
ual.clips.map((c) => c.name) // ['Walk_Loop', 'Jog_Fwd_Loop', …]
const glb = riggedBodyGlb(body, {
  clips: [{ from: ual, clip: 'Walk_Loop', extras: { license: 'CC0 1.0' } }],
})
```

The skeleton is read as Babylon's `readSkeleton` reads a loaded one, so a
clip retargets the same here as in the [character builder](/character-builder/):
each joint's rest is its node's own transform; a top joint's takes in every
node above it (an armature's turn, and its scale, which every joint below is
put in the model root's units by: Mixamo's centimetres under a 0.01), and so
do its keys. Rotations are sampled with `LINEAR`'s slerp, `STEP` as steps and
`CUBICSPLINE` at its keys' values.

A clip's licence travels with it in its animation's `extras`: UAL's are CC0;
Mixamo's are Adobe's, usable in a project and not to be redistributed on
their own; Meshy's are licensed only with their model.

Pure: no DOM, no Babylon.
*/
/*{ "parent": "retarget" }*/

import { readGlb, accessorValues, type Glb } from './glb-chunks.js'
import {
  humanoidRoles,
  retargeter,
  type RestBone,
  type Skeleton,
} from './retarget.js'
import type { Quat, Vec3 } from './spatial-transform.js'

/** One animated property of one node. */
export interface GlbClipChannel {
  /** The node's name. */
  node: string
  path: 'rotation' | 'translation' | 'scale' | 'weights'
  interpolation: 'LINEAR' | 'STEP' | 'CUBICSPLINE'
  /** Seconds. */
  times: Float64Array
  /** Values per key (CUBICSPLINE: in-tangent, value, out-tangent per key). */
  values: Float64Array
}

export interface GlbClip {
  name: string
  /** Seconds, from the first key to the last. */
  start: number
  end: number
  channels: GlbClipChannel[]
}

/** The skeleton a file's clips were made on, and the clips. */
export interface GlbClipSource extends Skeleton {
  /** For a top joint, the turn from the model root to its parent node. */
  above: Map<string, Quat>
  /** For a top joint, its parent node's transform into the model root (column-major). */
  aboveMatrix: Map<string, number[]>
  clips: GlbClip[]
}

type M = number[]
const IDENT: M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
// Column-major, as glTF writes them.
const mul = (a: M, b: M): M => {
  const o = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
function trs(n: any): M {
  if (Array.isArray(n.matrix)) return [...n.matrix]
  const [tx, ty, tz] = n.translation ?? [0, 0, 0]
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = n.scale ?? [1, 1, 1]
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ]
}
const point = (m: M, p: Vec3): Vec3 => ({
  x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
  y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
  z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
})
/** A matrix's scale (x column's length), turn and move. */
function decompose(m: M): { scale: number; rotation: Quat; position: Vec3 } {
  const col = (c: number) => [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]]
  const len = (v: number[]) => Math.hypot(v[0], v[1], v[2]) || 1
  const [x, y, z] = [col(0), col(1), col(2)]
  const [lx, ly, lz] = [len(x), len(y), len(z)]
  const r = [
    [x[0] / lx, y[0] / ly, z[0] / lz],
    [x[1] / lx, y[1] / ly, z[1] / lz],
    [x[2] / lx, y[2] / ly, z[2] / lz],
  ]
  const t = r[0][0] + r[1][1] + r[2][2]
  let q: [number, number, number, number]
  if (t > 0) {
    const s = 0.5 / Math.sqrt(t + 1)
    q = [
      (r[2][1] - r[1][2]) * s,
      (r[0][2] - r[2][0]) * s,
      (r[1][0] - r[0][1]) * s,
      0.25 / s,
    ]
  } else if (r[0][0] > r[1][1] && r[0][0] > r[2][2]) {
    const s = 2 * Math.sqrt(1 + r[0][0] - r[1][1] - r[2][2])
    q = [
      0.25 * s,
      (r[0][1] + r[1][0]) / s,
      (r[0][2] + r[2][0]) / s,
      (r[2][1] - r[1][2]) / s,
    ]
  } else if (r[1][1] > r[2][2]) {
    const s = 2 * Math.sqrt(1 + r[1][1] - r[0][0] - r[2][2])
    q = [
      (r[0][1] + r[1][0]) / s,
      0.25 * s,
      (r[1][2] + r[2][1]) / s,
      (r[0][2] - r[2][0]) / s,
    ]
  } else {
    const s = 2 * Math.sqrt(1 + r[2][2] - r[0][0] - r[1][1])
    q = [
      (r[0][2] + r[2][0]) / s,
      (r[1][2] + r[2][1]) / s,
      0.25 * s,
      (r[1][0] - r[0][1]) / s,
    ]
  }
  const l = Math.hypot(...q) || 1
  return {
    scale: lx,
    rotation: { x: q[0] / l, y: q[1] / l, z: q[2] / l, w: q[3] / l },
    position: { x: m[12], y: m[13], z: m[14] },
  }
}
const qmul = (a: Quat, b: Quat): Quat => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
})

/** An accessor's numbers, normalised integers as fractions. */
function values(glb: Glb, index: number): Float64Array {
  const a = glb.json.accessors[index]
  const v = accessorValues(glb, index)
  if (!a.normalized) return v
  const max: Record<number, number> = {
    5120: 127,
    5121: 255,
    5122: 32767,
    5123: 65535,
  }
  const k = max[a.componentType] ?? 1
  return v.map((x) => Math.max(-1, x / k))
}

/**
 * A GLB's skeleton (its first skin's, or `skin`) and its animations. Throws
 * when the bytes are not a GLB or it has no skin.
 */
export function readGlbClips(
  bytes: Uint8Array,
  options: { skin?: number } = {}
): GlbClipSource {
  const glb = readGlb(bytes)
  const json = glb.json
  const nodes: any[] = json.nodes ?? []
  const skin = json.skins?.[options.skin ?? 0]
  if (skin == null) throw new Error('readGlbClips: the file has no skin')
  const nameOf = (i: number) => nodes[i].name || `node${i}`
  const parentOf = new Map<number, number>()
  nodes.forEach((n, i) => {
    for (const c of n.children ?? []) parentOf.set(c, i)
  })
  const world = (i: number | undefined): M =>
    i == null ? IDENT : mul(world(parentOf.get(i)), trs(nodes[i]))
  const joints: number[] = skin.joints
  const isJoint = new Set(joints)
  const above = new Map<string, Quat>()
  const aboveMatrix = new Map<string, number[]>()
  const bones: RestBone[] = joints.map((j) => {
    const name = nameOf(j)
    let p = parentOf.get(j)
    while (p != null && !isJoint.has(p)) p = parentOf.get(p)
    let rest = trs(nodes[j])
    if (p == null && parentOf.get(j) != null) {
      // A top joint: everything between the model root and it.
      const toParent = world(parentOf.get(j))
      above.set(name, decompose(toParent).rotation)
      aboveMatrix.set(name, toParent)
      rest = mul(toParent, rest)
    }
    const d = decompose(rest)
    return {
      name,
      parent: p != null ? nameOf(p) : null,
      rotation: d.rotation,
      position: d.position,
    }
  })
  // One unit throughout (see the page): below a scaled top joint, into the root's.
  const byName = new Map(bones.map((b) => [b.name, b]))
  const topOf = (b: RestBone) => {
    let at = b
    for (let i = 0; i < 512 && at.parent != null; i++) {
      const p = byName.get(at.parent)
      if (p == null) break
      at = p
    }
    return at
  }
  for (const b of bones) {
    if (b.parent == null) continue
    const m = aboveMatrix.get(topOf(b).name)
    const k = m ? decompose(m).scale : 1
    if (Math.abs(k - 1) < 1e-9) continue
    b.position = {
      x: b.position.x * k,
      y: b.position.y * k,
      z: b.position.z * k,
    }
  }
  const clips: GlbClip[] = (json.animations ?? []).map((a: any, i: number) => {
    let start = Infinity
    let end = -Infinity
    const channels: GlbClipChannel[] = []
    for (const c of a.channels ?? []) {
      if (c.target?.node == null) continue
      const sampler = a.samplers[c.sampler]
      const times = values(glb, sampler.input)
      start = Math.min(start, times[0] ?? 0)
      end = Math.max(end, times[times.length - 1] ?? 0)
      channels.push({
        node: nameOf(c.target.node),
        path: c.target.path,
        interpolation: sampler.interpolation ?? 'LINEAR',
        times,
        values: values(glb, sampler.output),
      })
    }
    return {
      name: a.name ?? `clip${i}`,
      start: Number.isFinite(start) ? start : 0,
      end: Number.isFinite(end) ? end : 0,
      channels,
    }
  })
  return { bones, roles: humanoidRoles(bones), above, aboveMatrix, clips }
}

/** A channel's value at `t` seconds (held before the first key and after the last). */
export function sampleChannel(ch: GlbClipChannel, t: number): number[] {
  const size = ch.path === 'rotation' ? 4 : ch.path === 'weights' ? 0 : 3
  const n = ch.times.length
  const stride = ch.interpolation === 'CUBICSPLINE' ? size * 3 : size
  const at = (k: number) => {
    const o = k * stride + (ch.interpolation === 'CUBICSPLINE' ? size : 0)
    return Array.from(ch.values.subarray(o, o + size))
  }
  if (n === 0 || size === 0) return []
  if (t <= ch.times[0]) return at(0)
  if (t >= ch.times[n - 1]) return at(n - 1)
  let k = 0
  while (k < n - 2 && ch.times[k + 1] <= t) k++
  const a = at(k)
  if (ch.interpolation === 'STEP') return a
  const b = at(k + 1)
  const u = (t - ch.times[k]) / (ch.times[k + 1] - ch.times[k] || 1)
  if (size !== 4) return a.map((x, i) => x + (b[i] - x) * u)
  // Slerp, the short way round.
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  const bb = dot < 0 ? b.map((x) => -x) : b
  dot = Math.abs(dot)
  if (dot > 0.9995) {
    const r = a.map((x, i) => x + (bb[i] - x) * u)
    const l = Math.hypot(...r) || 1
    return r.map((x) => x / l)
  }
  const th = Math.acos(dot)
  const s = Math.sin(th)
  const wa = Math.sin((1 - u) * th) / s
  const wb = Math.sin(u * th) / s
  return a.map((x, i) => x * wa + bb[i] * wb)
}

/**
 * The source's pose at `t`: each animated joint's local rotation (a top
 * joint's from the model root, as its rest), and the hips' position.
 */
export function clipPose(
  source: GlbClipSource,
  clip: GlbClip,
  t: number
): { rotations: Map<string, Quat>; hips?: Vec3 } {
  const rotations = new Map<string, Quat>()
  let hips: Vec3 | undefined
  const hipsName = source.roles.hips
  for (const ch of clip.channels) {
    if (ch.path === 'rotation') {
      const [x, y, z, w] = sampleChannel(ch, t)
      let local: Quat = { x, y, z, w }
      const a = source.above.get(ch.node)
      if (a != null) local = qmul(a, local)
      rotations.set(ch.node, local)
    } else if (ch.path === 'translation' && ch.node === hipsName) {
      const [x, y, z] = sampleChannel(ch, t)
      const m = source.aboveMatrix.get(ch.node)
      hips = m ? point(m, { x, y, z }) : { x, y, z }
    }
  }
  return { rotations, hips }
}

/** A clip baked onto a skeleton: keys at one rate. */
export interface BakedClip {
  name: string
  /** Seconds from 0. */
  times: Float32Array
  /** Local rotations (x, y, z, w per key) by the target's joint name. */
  rotations: Map<string, Float32Array>
  /** The target hips' local position per key, when the clip moves them. */
  hips?: Float32Array
}

/**
 * A clip of `source` sampled onto `target` (a skeleton whose top joints sit
 * at the model root, as an exported body's do) at `fps` keys a second.
 */
export function bakeClip(
  source: GlbClipSource,
  clip: GlbClip | string,
  target: Skeleton,
  options: {
    fps?: number
    armSpaceDeg?: number
    footTurnDeg?: number
    /** See `RetargetOptions.footIk`: false copies the legs' angles only. */
    footIk?: boolean
    name?: string
  } = {}
): BakedClip {
  const c =
    typeof clip === 'string' ? source.clips.find((x) => x.name === clip) : clip
  if (c == null) throw new Error(`bakeClip: no clip "${clip}"`)
  const rt = retargeter(source, target, {
    armSpaceDeg: options.armSpaceDeg,
    footTurnDeg: options.footTurnDeg,
    footIk: options.footIk,
  })
  const fps = options.fps ?? 30
  const frames = Math.max(1, Math.round((c.end - c.start) * fps))
  const moving = rt.roles.map((r) => target.roles[r]!)
  const times = new Float32Array(frames + 1)
  const rotations = new Map(
    moving.map((n) => [n, new Float32Array((frames + 1) * 4)])
  )
  let hips: Float32Array | undefined
  for (let i = 0; i <= frames; i++) {
    const t = c.start + (i / frames) * (c.end - c.start)
    times[i] = t - c.start
    const pose = clipPose(source, c, t)
    const out = rt.pose(pose.rotations, pose.hips)
    for (const name of moving) {
      const r = out.rotations.get(name)
      if (r == null) continue
      rotations.get(name)!.set([r.x, r.y, r.z, r.w], i * 4)
    }
    if (out.hips != null) {
      hips ??= new Float32Array((frames + 1) * 3)
      hips.set([out.hips.x, out.hips.y, out.hips.z], i * 3)
    }
  }
  return {
    name: options.name ?? c.name,
    times,
    rotations,
    ...(hips ? { hips } : {}),
  }
}
