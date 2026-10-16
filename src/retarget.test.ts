import { describe, test, expect } from 'bun:test'
import {
  humanoidRoles,
  retargeter,
  rotationBetween,
  type RestBone,
  type Skeleton,
} from './retarget.js'
import { quatFromAxisAngle, rotateVector } from './spatial-transform.js'

/*
Real skeletons, names and parents only, dumped from: UAL1.glb (Quaternius,
the UE mannequin), static/omnidude.glb (Mixamo) and Kenney Mini Characters'
character-female-a.glb. Embedded so the test needs no sibling repo.
*/
const ualBones: Array<[string, string | null]> = [["root", null], ["pelvis", "root"], ["spine_01", "pelvis"], ["spine_02", "spine_01"], ["spine_03", "spine_02"], ["neck_01", "spine_03"], ["Head", "neck_01"], ["clavicle_l", "spine_03"], ["upperarm_l", "clavicle_l"], ["lowerarm_l", "upperarm_l"], ["hand_l", "lowerarm_l"], ["index_01_l", "hand_l"], ["index_02_l", "index_01_l"], ["index_03_l", "index_02_l"], ["index_04_leaf_l", "index_03_l"], ["middle_01_l", "hand_l"], ["middle_02_l", "middle_01_l"], ["middle_03_l", "middle_02_l"], ["middle_04_leaf_l", "middle_03_l"], ["pinky_01_l", "hand_l"], ["pinky_02_l", "pinky_01_l"], ["pinky_03_l", "pinky_02_l"], ["pinky_04_leaf_l", "pinky_03_l"], ["ring_01_l", "hand_l"], ["ring_02_l", "ring_01_l"], ["ring_03_l", "ring_02_l"], ["ring_04_leaf_l", "ring_03_l"], ["thumb_01_l", "hand_l"], ["thumb_02_l", "thumb_01_l"], ["thumb_03_l", "thumb_02_l"], ["thumb_04_leaf_l", "thumb_03_l"], ["clavicle_r", "spine_03"], ["upperarm_r", "clavicle_r"], ["lowerarm_r", "upperarm_r"], ["hand_r", "lowerarm_r"], ["index_01_r", "hand_r"], ["index_02_r", "index_01_r"], ["index_03_r", "index_02_r"], ["index_04_leaf_r", "index_03_r"], ["middle_01_r", "hand_r"], ["middle_02_r", "middle_01_r"], ["middle_03_r", "middle_02_r"], ["middle_04_leaf_r", "middle_03_r"], ["pinky_01_r", "hand_r"], ["pinky_02_r", "pinky_01_r"], ["pinky_03_r", "pinky_02_r"], ["pinky_04_leaf_r", "pinky_03_r"], ["ring_01_r", "hand_r"], ["ring_02_r", "ring_01_r"], ["ring_03_r", "ring_02_r"], ["ring_04_leaf_r", "ring_03_r"], ["thumb_01_r", "hand_r"], ["thumb_02_r", "thumb_01_r"], ["thumb_03_r", "thumb_02_r"], ["thumb_04_leaf_r", "thumb_03_r"], ["thigh_l", "pelvis"], ["calf_l", "thigh_l"], ["foot_l", "calf_l"], ["ball_l", "foot_l"], ["ball_leaf_l", "ball_l"], ["thigh_r", "pelvis"], ["calf_r", "thigh_r"], ["foot_r", "calf_r"], ["ball_r", "foot_r"], ["ball_leaf_r", "ball_r"]]
const mixamoBones: Array<[string, string | null]> = [["mixamorig:Hips", null], ["mixamorig:Spine", "mixamorig:Hips"], ["mixamorig:Spine1", "mixamorig:Spine"], ["mixamorig:Spine2", "mixamorig:Spine1"], ["mixamorig:Neck", "mixamorig:Spine2"], ["mixamorig:Head", "mixamorig:Neck"], ["mixamorig:HeadTop_End", "mixamorig:Head"], ["mixamorig:LeftShoulder", "mixamorig:Spine2"], ["mixamorig:LeftArm", "mixamorig:LeftShoulder"], ["mixamorig:LeftForeArm", "mixamorig:LeftArm"], ["mixamorig:LeftHand", "mixamorig:LeftForeArm"], ["mixamorig:LeftHandThumb1", "mixamorig:LeftHand"], ["mixamorig:LeftHandThumb2", "mixamorig:LeftHandThumb1"], ["mixamorig:LeftHandThumb3", "mixamorig:LeftHandThumb2"], ["mixamorig:LeftHandThumb4", "mixamorig:LeftHandThumb3"], ["mixamorig:LeftHandIndex1", "mixamorig:LeftHand"], ["mixamorig:LeftHandIndex2", "mixamorig:LeftHandIndex1"], ["mixamorig:LeftHandIndex3", "mixamorig:LeftHandIndex2"], ["mixamorig:LeftHandIndex4", "mixamorig:LeftHandIndex3"], ["mixamorig:RightShoulder", "mixamorig:Spine2"], ["mixamorig:RightArm", "mixamorig:RightShoulder"], ["mixamorig:RightForeArm", "mixamorig:RightArm"], ["mixamorig:RightHand", "mixamorig:RightForeArm"], ["mixamorig:RightHandThumb1", "mixamorig:RightHand"], ["mixamorig:RightHandThumb2", "mixamorig:RightHandThumb1"], ["mixamorig:RightHandThumb3", "mixamorig:RightHandThumb2"], ["mixamorig:RightHandThumb4", "mixamorig:RightHandThumb3"], ["mixamorig:RightHandIndex1", "mixamorig:RightHand"], ["mixamorig:RightHandIndex2", "mixamorig:RightHandIndex1"], ["mixamorig:RightHandIndex3", "mixamorig:RightHandIndex2"], ["mixamorig:RightHandIndex4", "mixamorig:RightHandIndex3"], ["mixamorig:LeftUpLeg", "mixamorig:Hips"], ["mixamorig:LeftLeg", "mixamorig:LeftUpLeg"], ["mixamorig:LeftFoot", "mixamorig:LeftLeg"], ["mixamorig:LeftToeBase", "mixamorig:LeftFoot"], ["mixamorig:LeftToe_End", "mixamorig:LeftToeBase"], ["mixamorig:RightUpLeg", "mixamorig:Hips"], ["mixamorig:RightLeg", "mixamorig:RightUpLeg"], ["mixamorig:RightFoot", "mixamorig:RightLeg"], ["mixamorig:RightToeBase", "mixamorig:RightFoot"], ["mixamorig:RightToe_End", "mixamorig:RightToeBase"]]
const kenneyMiniBones: Array<[string, string | null]> = [["root", null], ["leg-left", "root"], ["leg-right", "root"], ["torso", "root"], ["arm-left", "torso"], ["arm-right", "torso"], ["head", "torso"]]

const named = (list: Array<[string, string | null]>) =>
  list.map(([name, parent]) => ({ name, parent }))

describe('humanoidRoles on real skeletons', () => {
  test('UAL (UE mannequin)', () => {
    const r = humanoidRoles(named(ualBones))
    expect(r.hips).toBe('pelvis')
    expect(r.spine).toBe('spine_01')
    expect(r.chest).toBe('spine_03')
    expect(r.head).toBe('Head')
    expect(r['l-clavicle']).toBe('clavicle_l')
    expect(r['l-upperArm']).toBe('upperarm_l')
    expect(r['r-lowerArm']).toBe('lowerarm_r')
    expect(r['l-hand']).toBe('hand_l')
    expect(r['l-upperLeg']).toBe('thigh_l')
    expect(r['r-lowerLeg']).toBe('calf_r')
    expect(r['l-foot']).toBe('foot_l')
    expect(r['r-toes']).toBe('ball_r')
  })

  test('Mixamo (omnidude)', () => {
    const r = humanoidRoles(named(mixamoBones))
    expect(r.hips).toBe('mixamorig:Hips')
    expect(r.spine).toBe('mixamorig:Spine')
    expect(r.chest).toBe('mixamorig:Spine2')
    expect(r.head).toBe('mixamorig:Head')
    // Mixamo's "Shoulder" is the clavicle and its "Arm" the upper arm.
    expect(r['l-clavicle']).toBe('mixamorig:LeftShoulder')
    expect(r['l-upperArm']).toBe('mixamorig:LeftArm')
    expect(r['l-lowerArm']).toBe('mixamorig:LeftForeArm')
    // UpLeg is the thigh, so plain Leg is the shin.
    expect(r['r-upperLeg']).toBe('mixamorig:RightUpLeg')
    expect(r['r-lowerLeg']).toBe('mixamorig:RightLeg')
  })

  test('Kenney Mini (seven bones)', () => {
    const r = humanoidRoles(named(kenneyMiniBones))
    expect(r.chest).toBe('torso')
    expect(r.spine).toBeUndefined()
    expect(r.head).toBe('head')
    expect(r['l-upperArm']).toBe('arm-left')
    expect(r['r-upperArm']).toBe('arm-right')
    // A lone leg is the whole leg.
    expect(r['l-upperLeg']).toBe('leg-left')
    expect(r['l-lowerLeg']).toBeUndefined()
  })

  test('an override wins', () => {
    const r = humanoidRoles(named(kenneyMiniBones), { hips: 'root' })
    expect(r.hips).toBe('root')
  })
})

const Q0 = { x: 0, y: 0, z: 0, w: 1 }
const Z = { x: 0, y: 0, z: 1 }

/** hips → upper arm → forearm, the arm pointing along `armDir` at rest. */
function arm(armDir: { x: number; y: number; z: number }, len = 1): Skeleton {
  const down = { x: 0, y: -1, z: 0 }
  const q = rotationBetween(down, armDir)
  const bones: RestBone[] = [
    { name: 'hips', parent: null, rotation: Q0, position: { x: 0, y: 1, z: 0 } },
    { name: 'upperarm_l', parent: 'hips', rotation: q, position: { x: 0.2, y: 0.5, z: 0 } },
    {
      name: 'lowerarm_l',
      parent: 'upperarm_l',
      rotation: Q0,
      position: { x: 0, y: -len, z: 0 },
    },
    {
      name: 'hand_l',
      parent: 'lowerarm_l',
      rotation: Q0,
      position: { x: 0, y: -len, z: 0 },
    },
  ]
  return { bones, roles: humanoidRoles(bones) }
}

/** Where the elbow points (world), given a skeleton and local rotations. */
function elbowDir(sk: Skeleton, rot: Map<string, any>) {
  const ua = sk.bones[1]
  const q = { ...(rot.get(ua.name) ?? ua.rotation) }
  return rotateVector(q, { x: 0, y: -1, z: 0 })
}

describe('retargetPose', () => {
  test('a skeleton onto itself reproduces the pose', () => {
    const sk = arm({ x: 1, y: 0, z: 0 })
    const rt = retargeter(sk, sk)
    const lift = quatFromAxisAngle(Z, 0.7)
    const pose = new Map([['upperarm_l', lift]])
    const out = rt.pose(pose).rotations.get('upperarm_l')!
    for (const k of ['x', 'y', 'z', 'w'] as const)
      expect(out[k]).toBeCloseTo(lift[k], 9)
  })

  test('an A-pose clip on a T-pose body: the arm goes where the clip puts it', () => {
    // Source rests with the arm 45° down (A); target straight out (T).
    const a = arm({ x: Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 })
    const t = arm({ x: 1, y: 0, z: 0 })
    const rt = retargeter(a, t)
    // The clip at its rest has the arm 45° down, so the target's arm is
    // 45° down: poses come across as the clip shows them, not offset by
    // the difference in rest poses.
    const d0 = elbowDir(t, rt.pose(new Map()).rotations)
    expect(d0.x).toBeCloseTo(Math.SQRT1_2, 6)
    expect(d0.y).toBeCloseTo(-Math.SQRT1_2, 6)
    // The clip raises the arm to horizontal: so does the target.
    const raise = quatFromAxisAngle(Z, Math.PI / 4)
    const posed = new Map([['upperarm_l', multiply(raise, a.bones[1].rotation)]])
    const d1 = elbowDir(t, rt.pose(posed).rotations)
    expect(d1.x).toBeCloseTo(1, 6)
    expect(d1.y).toBeCloseTo(0, 6)
  })

  test('hips move in proportion to hip height', () => {
    const tall = arm({ x: 1, y: 0, z: 0 })
    const short = arm({ x: 1, y: 0, z: 0 })
    // Feet: give both a foot so hip height is measurable.
    const withFoot = (sk: Skeleton, hipY: number): Skeleton => {
      const bones: RestBone[] = sk.bones.map((b) =>
        b.name === 'hips' ? { ...b, position: { x: 0, y: hipY, z: 0 } } : b
      )
      bones.push({
        name: 'foot_l',
        parent: 'hips',
        rotation: Q0,
        position: { x: 0, y: -hipY, z: 0 },
      })
      return { bones, roles: humanoidRoles(bones) }
    }
    const rt = retargeter(withFoot(tall, 1), withFoot(short, 0.5))
    expect(rt.scale).toBeCloseTo(0.5, 9)
    const out = rt.pose(new Map(), { x: 0.4, y: 1, z: 0 })
    expect(out.hips!.x).toBeCloseTo(0.2, 9)
    expect(out.hips!.y).toBeCloseTo(0.5, 9)
  })
})

function multiply(a: any, b: any) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  }
}

describe('a collapsed chain (one target bone for several source bones)', () => {
  test('a one-bone leg aims at the source FOOT, not the knee', () => {
    const Q0 = { x: 0, y: 0, z: 0, w: 1 }
    // Source: hips → thigh → calf → foot, a leg 2 long hanging down.
    const sBones: RestBone[] = [
      { name: 'pelvis', parent: null, rotation: Q0, position: { x: 0, y: 2, z: 0 } },
      { name: 'thigh_l', parent: 'pelvis', rotation: Q0, position: { x: 0.2, y: 0, z: 0 } },
      { name: 'calf_l', parent: 'thigh_l', rotation: Q0, position: { x: 0, y: -1, z: 0 } },
      { name: 'foot_l', parent: 'calf_l', rotation: Q0, position: { x: 0, y: -1, z: 0 } },
    ]
    // Target: a chibi leg, one bone, pointing down by its flesh.
    const tBones: RestBone[] = [
      { name: 'root', parent: null, rotation: Q0, position: { x: 0, y: 0, z: 0 } },
      {
        name: 'leg-left',
        parent: 'root',
        rotation: Q0,
        position: { x: 0.1, y: 0.5, z: 0 },
        end: { x: 0.1, y: 0.2, z: 0 },
      },
    ]
    const source = { bones: sBones, roles: humanoidRoles(sBones) }
    const target = { bones: tBones, roles: humanoidRoles(tBones) }
    const rt = retargeter(source, target)
    // Thigh 90° forward (-90° about +X takes -Y to +Z), knee bent 90° back
    // down: the knee is out in front at hip height, the foot below it.
    const X = { x: 1, y: 0, z: 0 }
    const out = rt.pose(
      new Map([
        ['thigh_l', quatFromAxisAngle(X, -Math.PI / 2)],
        ['calf_l', quatFromAxisAngle(X, Math.PI / 2)],
      ])
    )
    const leg = rotateVector(out.rotations.get('leg-left')!, { x: 0, y: -1, z: 0 })
    // Hip (0,0,0) → foot (0,-1,1): 45° forward and down, not straight ahead.
    expect(leg.y).toBeCloseTo(-Math.SQRT1_2, 6)
    expect(leg.z).toBeCloseTo(Math.SQRT1_2, 6)
  })
})
