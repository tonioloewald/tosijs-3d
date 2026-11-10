import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readBvh, writeBvh } from './bvh.js'
import {
  bakeClip,
  clipPose,
  readGlbClips,
  type GlbClipSource,
  type GlbClip,
} from './glb-clips.js'
import type { Quat } from './spatial-transform.js'

const CMU_WALK = join(
  import.meta.dir,
  '..',
  '..',
  'static-assets',
  'assets',
  'cmu',
  'bvh',
  '02_01.bvh'
)
const UAL = join(
  import.meta.dir,
  '..',
  '..',
  'static-assets',
  'assets',
  'quaternius',
  'UAL1.glb'
)

// A small hand-written file: CMU's spelling, centimetres, a ZXY elbow bend.
const SMALL = `HIERARCHY
ROOT Hips
{
  OFFSET 0 95 0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Spine
  {
    OFFSET 0 10 0
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT Head
    {
      OFFSET 0 70 0
      CHANNELS 3 Zrotation Xrotation Yrotation
      End Site
      {
        OFFSET 0 20 0
      }
    }
  }
  JOINT LeftUpLeg
  {
    OFFSET 10 0 0
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT LeftLeg
    {
      OFFSET 0 -45 0
      CHANNELS 3 Zrotation Xrotation Yrotation
      End Site
      {
        OFFSET 0 -45 0
      }
    }
  }
}
MOTION
Frames: 2
Frame Time: 0.5
0 95 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
10 95 0 90 0 0 0 0 0 0 0 0 0 0 0 0 90 0
`

type Q = [number, number, number, number]
const qmul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const qconj = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]]
const toQ = (q: Quat): Q => [q.x, q.y, q.z, q.w]

/** Every joint's world turn since rest at `t`. */
function sinceRest(src: GlbClipSource, clip: GlbClip, t: number) {
  const pose = clipPose(src, clip, t).rotations
  const byName = new Map(src.bones.map((b) => [b.name, b]))
  const W = new Map<string, Q>()
  const R = new Map<string, Q>()
  const world = (name: string): [Q, Q] => {
    if (W.has(name)) return [W.get(name)!, R.get(name)!]
    const b = byName.get(name)!
    const local = pose.get(name) ? toQ(pose.get(name)!) : toQ(b.rotation)
    const rest = toQ(b.rotation)
    const [pw, pr] =
      b.parent && byName.has(b.parent)
        ? world(b.parent)
        : [[0, 0, 0, 1] as Q, [0, 0, 0, 1] as Q]
    W.set(name, qmul(pw, local))
    R.set(name, qmul(pr, rest))
    return [W.get(name)!, R.get(name)!]
  }
  const out = new Map<string, Q>()
  for (const b of src.bones) {
    const [w, r] = world(b.name)
    out.set(b.name, qmul(w, qconj(r)))
  }
  return out
}
const angleDeg = (a: Q, b: Q) => {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])
  return (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI
}

describe('bvh', () => {
  test('reads a skeleton, its units and its keys', () => {
    const src = readBvh(SMALL)
    expect(src.bones.map((b) => b.name)).toEqual([
      'Hips',
      'Spine',
      'Head',
      'LeftUpLeg',
      'LeftLeg',
    ])
    // 230 units tall: centimetres, read as metres.
    expect(src.bones[0].position.y).toBeCloseTo(0.95, 6)
    expect(src.bones[4].end!.y).toBeCloseTo(0.05, 6)
    expect(src.roles.hips).toBe('Hips')
    expect(src.roles['l-upperLeg']).toBe('LeftUpLeg')
    expect(src.roles['l-lowerLeg']).toBe('LeftLeg')
    const clip = src.clips[0]
    expect(clip.end).toBeCloseTo(0.5, 9)
    // Frame 2: hips 10 cm over, turned 90° about Z; the knee 90° about X.
    const pose = clipPose(src, clip, 0.5)
    expect(pose.hips!.x).toBeCloseTo(0.1, 6)
    const hips = pose.rotations.get('Hips')!
    expect(
      angleDeg(toQ(hips), [0, 0, Math.SQRT1_2, Math.SQRT1_2])
    ).toBeLessThan(1e-6)
    const knee = pose.rotations.get('LeftLeg')!
    expect(
      angleDeg(toQ(knee), [Math.SQRT1_2, 0, 0, Math.SQRT1_2])
    ).toBeLessThan(1e-6)
  })

  test('channel order is the order listed', () => {
    const a = readBvh(
      SMALL.replace(
        'Zrotation Xrotation Yrotation\n  JOINT Spine',
        'Zrotation Xrotation Yrotation\n  JOINT Spine'
      )
    )
    const b = readBvh(
      SMALL.replace(
        'CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation',
        'CHANNELS 6 Xposition Yposition Zposition Xrotation Yrotation Zrotation'
      )
    )
    // The same numbers in another order are another turn (Z 90 read as X 90).
    const qa = toQ(clipPose(a, a.clips[0], 0.5).rotations.get('Hips')!)
    const qb = toQ(clipPose(b, b.clips[0], 0.5).rotations.get('Hips')!)
    expect(angleDeg(qa, qb)).toBeGreaterThan(80)
  })

  test('writes what it reads', () => {
    const src = readBvh(SMALL)
    const again = readBvh(writeBvh(src, src.clips[0], { fps: 2 }))
    expect(again.bones.map((b) => b.name)).toEqual(src.bones.map((b) => b.name))
    for (const t of [0, 0.5]) {
      const a = sinceRest(src, src.clips[0], t)
      const b = sinceRest(again, again.clips[0], t)
      for (const [name, q] of a)
        expect(angleDeg(q, b.get(name)!)).toBeLessThan(0.01)
    }
  })

  test.skipIf(!existsSync(UAL))(
    "UAL's own clips survive a round trip through BVH (turned rest frames and all)",
    () => {
      const ual = readGlbClips(new Uint8Array(readFileSync(UAL)))
      const names = ['Walk_Loop', 'Idle_Loop', 'Jump_Start']
      const clips = ual.clips.filter((c) => names.includes(c.name))
      expect(clips.length).toBeGreaterThan(0)
      let worst = 0
      for (const clip of clips) {
        const back = readBvh(writeBvh(ual, clip, { fps: 30 }))
        for (const t of [
          clip.start,
          (clip.start + clip.end) / 2,
          clip.end - 0.01,
        ]) {
          const a = sinceRest(ual, clip, t)
          // The BVH's times start at 0.
          const b = sinceRest(back, back.clips[0], t - clip.start)
          for (const [name, q] of a) {
            const r = b.get(name)
            if (r) worst = Math.max(worst, angleDeg(q, r))
          }
        }
      }
      // Within a frame's sampling of the original keys.
      console.log(`bvh round trip: worst ${worst.toFixed(3)}°`)
      expect(worst).toBeLessThan(2)
    }
  )

  test.skipIf(!existsSync(UAL) || !existsSync(CMU_WALK))(
    "a CMU walk (its own units, ZYX channels) plays on UAL's skeleton",
    () => {
      const walk = readBvh(readFileSync(CMU_WALK, 'utf8'))
      // Scaled to a person: hips about a metre up.
      expect(walk.bones[0].name).toBe('Hips')
      expect(walk.roles['l-upperLeg']).toBe('LeftUpLeg')
      expect(walk.roles['r-lowerArm']).toBe('RightForeArm')
      const ual = readGlbClips(new Uint8Array(readFileSync(UAL)))
      const baked = bakeClip(walk, walk.clips[0], ual, { fps: 30 })
      const thigh = baked.rotations.get(ual.roles['l-upperLeg']!)!
      // The thigh swings: its turn ranges widely over the walk.
      let widest = 0
      const first: Q = [thigh[0], thigh[1], thigh[2], thigh[3]]
      for (let k = 0; k < thigh.length; k += 4) {
        for (const x of thigh.subarray(k, k + 4))
          expect(Number.isFinite(x)).toBe(true)
        widest = Math.max(
          widest,
          angleDeg(first, [thigh[k], thigh[k + 1], thigh[k + 2], thigh[k + 3]])
        )
      }
      expect(widest).toBeGreaterThan(20)
      expect(widest).toBeLessThan(120)
      // And the hips travel, a few metres over three seconds (in UAL's hips'
      // parent frame, which is Z-up, so the whole displacement).
      const h = baked.hips!
      const n = h.length - 3
      const travel = Math.hypot(h[n] - h[0], h[n + 1] - h[1], h[n + 2] - h[2])
      expect(travel).toBeGreaterThan(1)
      expect(travel).toBeLessThan(8)
    }
  )
})
