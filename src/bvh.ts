/*#
# bvh

Motion capture files (BVH, Biovision Hierarchy) as clips. Decades of mocap
are in this format (the CMU library, Bandai Namco's research set, most
capture suites), and a BVH read here is the same thing as a clip read from a
GLB ([glb-clips](/glb-clips/)): a `GlbClipSource`, its own skeleton and its
clip. So it plays on any body through `bakeClip` or `retargetClip`, which read
which bone is which from the names (CMU's and Mixamo's spellings both work).

- `readBvh(text)` reads one. Rotations are Euler angles in the order each
  joint's CHANNELS line lists them (BVH's rule), turned into quaternions.
  Units are guessed from the skeleton's height (a person stands 1 to 2.5 m;
  centimetres and inches are scaled to metres; anything else is scaled to a
  1.8 m person), or set with `scale`.
- `writeBvh(source, clip)` writes any clip source out (a capture, a UAL clip)
  for Blender, MotionBuilder and other tools. Rest is BVH's: every joint
  unturned, offsets along the world axes, so a skeleton whose joints are
  turned at rest (UAL's, any glTF's) is written as its turns since rest.

Pure, no engine.
*/
/*{ "parent": "glb-clips", "order": 10 }*/

import { humanoidRoles, type RestBone } from './retarget.js'
import type { GlbClip, GlbClipChannel, GlbClipSource } from './glb-clips.js'
import { sampleChannel } from './glb-clips.js'
import type { Quat, Vec3 } from './spatial-transform.js'

type Q = [number, number, number, number]
const qmul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const qconj = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]]
const qrot = (q: Q, v: [number, number, number]): [number, number, number] => {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q))
  return [p[0], p[1], p[2]]
}
const axisQ = (axis: 'X' | 'Y' | 'Z', deg: number): Q => {
  const h = (deg * Math.PI) / 360
  const s = Math.sin(h)
  return axis === 'X'
    ? [s, 0, 0, Math.cos(h)]
    : axis === 'Y'
    ? [0, s, 0, Math.cos(h)]
    : [0, 0, s, Math.cos(h)]
}
const toQ = (q: Quat): Q => [q.x, q.y, q.z, q.w]

interface BvhJoint {
  name: string
  parent: number
  offset: [number, number, number]
  channels: string[]
  /** An End Site's offset, for a joint with nothing below it. */
  end?: [number, number, number]
}

export interface ReadBvhOptions {
  /** Metres per file unit. Default: guessed from the skeleton's height. */
  scale?: number
  /** The clip's name. Default `bvh`. */
  name?: string
}

/** Read a BVH file as a clip source: its skeleton at rest and its one clip. */
export function readBvh(
  text: string,
  options: ReadBvhOptions = {}
): GlbClipSource {
  const tokens = text.split(/\s+/).filter((t) => t.length > 0)
  let at = 0
  const next = () => {
    if (at >= tokens.length) throw new Error('readBvh: the file ends early')
    return tokens[at++]
  }
  const num = () => {
    const t = next()
    const v = Number(t)
    if (!Number.isFinite(v))
      throw new Error(`readBvh: expected a number, found ${t}`)
    return v
  }
  if (next().toUpperCase() !== 'HIERARCHY')
    throw new Error('readBvh: not a BVH file (no HIERARCHY)')

  const joints: BvhJoint[] = []
  const readJoint = (parent: number) => {
    const name = next()
    const index = joints.length
    const joint: BvhJoint = { name, parent, offset: [0, 0, 0], channels: [] }
    joints.push(joint)
    if (next() !== '{') throw new Error(`readBvh: expected { after ${name}`)
    for (;;) {
      const t = next()
      const key = t.toUpperCase()
      if (key === 'OFFSET') joint.offset = [num(), num(), num()]
      else if (key === 'CHANNELS') {
        const n = num()
        for (let i = 0; i < n; i++) joint.channels.push(next())
      } else if (key === 'JOINT') readJoint(index)
      else if (key === 'END') {
        next() // Site
        next() // {
        next() // OFFSET
        joint.end = [num(), num(), num()]
        next() // }
      } else if (t === '}') return
      else throw new Error(`readBvh: unexpected ${t} in ${name}`)
    }
  }
  while (at < tokens.length && tokens[at].toUpperCase() === 'ROOT') {
    next()
    readJoint(-1)
  }
  if (!joints.length) throw new Error('readBvh: no ROOT')
  if (next().toUpperCase() !== 'MOTION') throw new Error('readBvh: no MOTION')
  next() // Frames:
  const frames = num()
  next() // Frame
  next() // Time:
  const frameTime = num()
  const width = joints.reduce((s, j) => s + j.channels.length, 0)

  // World rest positions (unscaled), for the height and the end sites.
  const world: [number, number, number][] = []
  joints.forEach((j, i) => {
    const p = j.parent < 0 ? [0, 0, 0] : world[j.parent]
    world[i] = [p[0] + j.offset[0], p[1] + j.offset[1], p[2] + j.offset[2]]
  })
  let lo = Infinity
  let hi = -Infinity
  joints.forEach((j, i) => {
    lo = Math.min(lo, world[i][1])
    hi = Math.max(hi, world[i][1])
    if (j.end) hi = Math.max(hi, world[i][1] + j.end[1])
  })
  const height = hi - lo
  const scale =
    options.scale ??
    (height >= 1 && height <= 2.5
      ? 1
      : height >= 100 && height <= 250
      ? 0.01
      : height >= 40 && height <= 100
      ? 0.0254
      : height > 0
      ? 1.8 / height
      : 1)

  const bones: RestBone[] = joints.map((j, i) => ({
    name: j.name,
    parent: j.parent < 0 ? null : joints[j.parent].name,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    position: {
      x: j.offset[0] * scale,
      y: j.offset[1] * scale,
      z: j.offset[2] * scale,
    },
    ...(j.end
      ? {
          end: {
            x: (world[i][0] + j.end[0]) * scale,
            y: (world[i][1] + j.end[1]) * scale,
            z: (world[i][2] + j.end[2]) * scale,
          },
        }
      : {}),
  }))

  // The keys, joint by joint.
  const times = Float64Array.from({ length: frames }, (_, f) => f * frameTime)
  const rot = joints.map(() => new Float64Array(frames * 4))
  const pos = joints.map((j) =>
    j.channels.some((c) => /position$/i.test(c))
      ? new Float64Array(frames * 3)
      : null
  )
  for (let f = 0; f < frames; f++) {
    const row: number[] = []
    for (let k = 0; k < width; k++) row.push(num())
    let c = 0
    joints.forEach((j, i) => {
      let q: Q = [0, 0, 0, 1]
      const p = [j.offset[0], j.offset[1], j.offset[2]]
      for (const ch of j.channels) {
        const v = row[c++]
        const axis = ch[0].toUpperCase() as 'X' | 'Y' | 'Z'
        const k = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2
        if (/rotation$/i.test(ch)) q = qmul(q, axisQ(axis, v))
        else if (/position$/i.test(ch)) p[k] = v
      }
      rot[i].set(q, f * 4)
      const pi = pos[i]
      if (pi) pi.set([p[0] * scale, p[1] * scale, p[2] * scale], f * 3)
    })
  }
  const channels: GlbClipChannel[] = []
  joints.forEach((j, i) => {
    if (j.channels.some((c) => /rotation$/i.test(c)))
      channels.push({
        node: j.name,
        path: 'rotation',
        interpolation: 'LINEAR',
        times,
        values: rot[i],
      })
    const pi = pos[i]
    if (pi)
      channels.push({
        node: j.name,
        path: 'translation',
        interpolation: 'LINEAR',
        times,
        values: pi,
      })
  })
  const clip: GlbClip = {
    name: options.name ?? 'bvh',
    start: 0,
    end: Math.max(0, frames - 1) * frameTime,
    channels,
  }
  return {
    bones,
    roles: humanoidRoles(bones),
    above: new Map(),
    aboveMatrix: new Map(),
    clips: [clip],
  }
}

/** A rotation as Euler degrees, applied Z then X then Y (BVH's usual order). */
function zxyDegrees(q: Q): [number, number, number] {
  const [x, y, z, w] = q
  // Rotation matrix entries used by R = Rz · Rx · Ry.
  const m21 = 2 * (y * z + x * w)
  const m20 = 2 * (x * z - y * w)
  const m22 = 1 - 2 * (x * x + y * y)
  const m01 = 2 * (x * y - z * w)
  const m11 = 1 - 2 * (x * x + z * z)
  const ex = Math.asin(Math.max(-1, Math.min(1, m21)))
  let ez: number
  let ey: number
  if (Math.abs(m21) < 0.999999) {
    ez = Math.atan2(-m01, m11)
    ey = Math.atan2(-m20, m22)
  } else {
    // Gimbal: X at ±90°, Z and Y share one turn; give it all to Z.
    const m00 = 1 - 2 * (y * y + z * z)
    const m10 = 2 * (x * y + z * w)
    ez = Math.atan2(m10, m00)
    ey = 0
  }
  const d = 180 / Math.PI
  return [ez * d, ex * d, ey * d]
}

export interface WriteBvhOptions {
  /** Frames a second. Default 30. */
  fps?: number
  /** File units per metre. Default 100 (centimetres). */
  unitsPerMetre?: number
}

/**
 * A clip as a BVH file: the source's skeleton with BVH's rest (unturned
 * joints, offsets along the world axes), each frame's turns since rest, and
 * the hips' travel.
 */
export function writeBvh(
  source: GlbClipSource,
  clip: GlbClip,
  options: WriteBvhOptions = {}
): string {
  const fps = options.fps ?? 30
  const k = options.unitsPerMetre ?? 100
  const bones = orderedBones(source.bones)
  const index = new Map(bones.map((b, i) => [b.name, i]))
  const parentIx = bones.map((b) =>
    b.parent == null ? -1 : index.get(b.parent) ?? -1
  )
  const children = bones.map((_, i) =>
    parentIx.flatMap((p, c) => (p === i ? [c] : []))
  )

  // Rest in the world: each joint's turn and position.
  const restW: Q[] = []
  const restP: [number, number, number][] = []
  bones.forEach((b, i) => {
    const local = toQ(b.rotation)
    const p: [number, number, number] = [
      b.position.x,
      b.position.y,
      b.position.z,
    ]
    const pi = parentIx[i]
    if (pi < 0) {
      restW[i] = local
      restP[i] = p
    } else {
      restW[i] = qmul(restW[pi], local)
      const o = qrot(restW[pi], p)
      restP[i] = [restP[pi][0] + o[0], restP[pi][1] + o[1], restP[pi][2] + o[2]]
    }
  })

  const hips = source.roles.hips
  const lines: string[] = ['HIERARCHY']
  const fmt = (v: number) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(6))
  const writeJoint = (i: number, depth: number) => {
    const pad = '  '.repeat(depth)
    const b = bones[i]
    const pi = parentIx[i]
    lines.push(`${pad}${pi < 0 ? 'ROOT' : 'JOINT'} ${b.name}`, `${pad}{`)
    const o =
      pi < 0
        ? restP[i]
        : [
            restP[i][0] - restP[pi][0],
            restP[i][1] - restP[pi][1],
            restP[i][2] - restP[pi][2],
          ]
    lines.push(`${pad}  OFFSET ${o.map((v) => fmt(v * k)).join(' ')}`)
    const moves = pi < 0 || b.name === hips
    lines.push(
      `${pad}  CHANNELS ${
        moves ? '6 Xposition Yposition Zposition ' : '3 '
      }Zrotation Xrotation Yrotation`
    )
    if (children[i].length)
      for (const c of children[i]) writeJoint(c, depth + 1)
    else {
      const end = b.end
        ? [b.end.x - restP[i][0], b.end.y - restP[i][1], b.end.z - restP[i][2]]
        : [0, 0.05, 0]
      lines.push(
        `${pad}  End Site`,
        `${pad}  {`,
        `${pad}    OFFSET ${end.map((v) => fmt(v * k)).join(' ')}`,
        `${pad}  }`
      )
    }
    lines.push(`${pad}}`)
  }
  bones.forEach((_, i) => {
    if (parentIx[i] < 0) writeJoint(i, 0)
  })

  // Motion: each frame's world turns, as turns since rest, made local again.
  const byNode = new Map<string, GlbClipChannel>()
  const travel = new Map<string, GlbClipChannel>()
  for (const ch of clip.channels) {
    if (ch.path === 'rotation') byNode.set(ch.node, ch)
    if (ch.path === 'translation') travel.set(ch.node, ch)
  }
  const frames = Math.max(1, Math.round((clip.end - clip.start) * fps) + 1)
  lines.push('MOTION', `Frames: ${frames}`, `Frame Time: ${fmt(1 / fps)}`)
  const order = (i: number, out: number[]) => {
    out.push(i)
    for (const c of children[i]) order(c, out)
    return out
  }
  const written = bones.flatMap((_, i) => (parentIx[i] < 0 ? order(i, []) : []))
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.end, clip.start + f / fps)
    const W: Q[] = []
    const P: [number, number, number][] = []
    bones.forEach((b, i) => {
      const ch = byNode.get(b.name)
      let local: Q = ch ? (sampleChannel(ch, t) as Q) : toQ(b.rotation)
      const a = source.above.get(b.name)
      if (ch && a) local = qmul(toQ(a), local)
      const tr = travel.get(b.name)
      const lp = tr
        ? sampleChannel(tr, t)
        : [b.position.x, b.position.y, b.position.z]
      const pi = parentIx[i]
      if (pi < 0) {
        W[i] = local
        P[i] = [lp[0], lp[1], lp[2]]
      } else {
        W[i] = qmul(W[pi], local)
        const o = qrot(W[pi], [lp[0], lp[1], lp[2]])
        P[i] = [P[pi][0] + o[0], P[pi][1] + o[1], P[pi][2] + o[2]]
      }
    })
    // BVH's world turn is the turn since rest; its local, that under the parent's.
    const since = W.map((w, i) => qmul(w, qconj(restW[i])))
    const row: string[] = []
    for (const i of written) {
      const pi = parentIx[i]
      if (pi < 0 || bones[i].name === hips) {
        const p =
          pi < 0
            ? P[i]
            : qrot(qconj(since[pi]), [
                P[i][0] - P[pi][0],
                P[i][1] - P[pi][1],
                P[i][2] - P[pi][2],
              ])
        row.push(...p.map((v) => fmt(v * k)))
      }
      const local = pi < 0 ? since[i] : qmul(qconj(since[pi]), since[i])
      row.push(...zxyDegrees(local).map(fmt))
    }
    lines.push(row.join(' '))
  }
  return lines.join('\n') + '\n'
}

/** Bones with every parent before its children. */
function orderedBones(bones: readonly RestBone[]): RestBone[] {
  const byName = new Map(bones.map((b) => [b.name, b]))
  const out: RestBone[] = []
  const seen = new Set<string>()
  const visit = (b: RestBone) => {
    if (seen.has(b.name)) return
    seen.add(b.name)
    const p = b.parent != null ? byName.get(b.parent) : undefined
    if (p) visit(p)
    out.push(b)
  }
  for (const b of bones) visit(b)
  return out
}

/** A joint's position in the world at rest (for tests and tools). */
export function restWorld(bones: readonly RestBone[]): Map<string, Vec3> {
  const ordered = orderedBones(bones)
  const W = new Map<string, Q>()
  const P = new Map<string, Vec3>()
  for (const b of ordered) {
    const local = toQ(b.rotation)
    const pw = b.parent != null ? W.get(b.parent) : undefined
    const pp = b.parent != null ? P.get(b.parent) : undefined
    if (!pw || !pp) {
      W.set(b.name, local)
      P.set(b.name, { ...b.position })
    } else {
      W.set(b.name, qmul(pw, local))
      const o = qrot(pw, [b.position.x, b.position.y, b.position.z])
      P.set(b.name, { x: pp.x + o[0], y: pp.y + o[1], z: pp.z + o[2] })
    }
  }
  return P
}
