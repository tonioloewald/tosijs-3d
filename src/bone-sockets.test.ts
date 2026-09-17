import { describe, expect, test } from 'bun:test'
import { BONE_SOCKETS, findBone, type BoneNode } from './bone-mask.js'

/*
A SOCKET HAS TO FIND THE JOINT ON RIGS THAT DISAGREE ABOUT ITS NAME.

Quaternius says `hand_r`, Kenney's character kit says `RightHand`, Mixamo says
`mixamorig:RightHand`. A consumer writes `socket: 'right-hand'` and should not
have to know which rig they loaded — so the table is the contract, and this is
what pins it.

It matters because the failure is quiet: a socket that resolves to nothing falls
back to the holder's root, which is precisely the bug sockets exist to fix
("it kind of drifts relative to the hand"). A weapon in roughly the right place
that does not track the hand looks like a tuning problem, not a lookup miss.
*/
const bones = (...names: string[]): BoneNode[] =>
  names.map((name) => ({ name, parent: null }))

/** The three rigs this project actually meets. */
const QUATERNIUS = bones(
  'root',
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'neck_01',
  'Head',
  'hand_l',
  'hand_r'
)
const KENNEY = bones('Root', 'Hips', 'Spine', 'Head', 'LeftHand', 'RightHand')
const MIXAMO = bones(
  'mixamorig:Hips',
  'mixamorig:Spine2',
  'mixamorig:Head',
  'mixamorig:RightHand',
  'mixamorig:LeftHand'
)

describe('BONE_SOCKETS resolves across rigs', () => {
  test('right hand, all three', () => {
    expect(findBone(QUATERNIUS, BONE_SOCKETS['right-hand'])).toBe('hand_r')
    expect(findBone(KENNEY, BONE_SOCKETS['right-hand'])).toBe('RightHand')
    expect(findBone(MIXAMO, BONE_SOCKETS['right-hand'])).toBe(
      'mixamorig:RightHand'
    )
  })

  test('left hand, all three', () => {
    expect(findBone(QUATERNIUS, BONE_SOCKETS['left-hand'])).toBe('hand_l')
    expect(findBone(KENNEY, BONE_SOCKETS['left-hand'])).toBe('LeftHand')
    expect(findBone(MIXAMO, BONE_SOCKETS['left-hand'])).toBe(
      'mixamorig:LeftHand'
    )
  })

  test('left and right never resolve to each other', () => {
    // The one mistake that would look almost right and be completely wrong.
    for (const rig of [QUATERNIUS, KENNEY, MIXAMO]) {
      const r = findBone(rig, BONE_SOCKETS['right-hand'])
      const l = findBone(rig, BONE_SOCKETS['left-hand'])
      expect(r).not.toBe(l)
      expect(r).not.toBe(null)
      expect(l).not.toBe(null)
    }
  })

  test('head and hips resolve where the rig has them', () => {
    expect(findBone(QUATERNIUS, BONE_SOCKETS.head)).toBe('Head')
    expect(findBone(KENNEY, BONE_SOCKETS.hips)).toBe('Hips')
    expect(findBone(QUATERNIUS, BONE_SOCKETS.hips)).toBe('pelvis')
  })

  test('a rig without the joint returns null rather than something near it', () => {
    /*
    The important negative. `null` sends the caller down the documented fallback
    with a warning; a fuzzy match that grabbed a twist or IK bone would attach a
    weapon to something that moves ALMOST right, which is far harder to notice
    and far harder to explain.
    */
    const armless = bones('root', 'pelvis', 'spine_01', 'Head')
    expect(findBone(armless, BONE_SOCKETS['right-hand'])).toBe(null)
  })

  test('every socket names at least one candidate', () => {
    for (const [socket, names] of Object.entries(BONE_SOCKETS)) {
      expect(names.length, `${socket} has no candidates`).toBeGreaterThan(0)
    }
  })
})
