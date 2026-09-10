import { describe, test, expect } from 'bun:test'
import {
  UPPER_BODY_ROOTS,
  boneMask,
  complementMask,
  descendantDepths,
  findBone,
  maskIsEmpty,
  type BoneNode,
} from './bone-mask.js'

/*
"Technically not hard, but having it not look terrible is a whole other thing."

So these tests are mostly about the ways it looks terrible, because those are
the requirements. A hard boundary kinks the torso at one joint; an override
layer deletes the walk's counter-rotation and the legs swing under a dead trunk;
a mask whose root was not found animates nothing and looks like a clip that
failed to load. None of the three is a crash, and none is visible in a log.
*/

/** A humanoid rig, the shape every one of them roughly is. */
const RIG: BoneNode[] = [
  { name: 'hips', parent: null },
  { name: 'thigh_L', parent: 'hips' },
  { name: 'shin_L', parent: 'thigh_L' },
  { name: 'thigh_R', parent: 'hips' },
  { name: 'shin_R', parent: 'thigh_R' },
  { name: 'spine_01', parent: 'hips' },
  { name: 'spine_02', parent: 'spine_01' },
  { name: 'chest', parent: 'spine_02' },
  { name: 'neck', parent: 'chest' },
  { name: 'head', parent: 'neck' },
  { name: 'clavicle_L', parent: 'chest' },
  { name: 'upperarm_L', parent: 'clavicle_L' },
  { name: 'hand_L', parent: 'upperarm_L' },
]

describe('the subtree, and its depths', () => {
  test('a split root owns itself and everything under it', () => {
    const d = descendantDepths(RIG, 'spine_02')
    expect(d.get('spine_02')).toBe(0)
    expect(d.get('chest')).toBe(1)
    expect(d.get('head')).toBe(3) // chest → neck → head
    expect(d.get('hand_L')).toBe(4) // chest → clavicle → upperarm → hand
  })

  test('and nothing above or beside it', () => {
    const d = descendantDepths(RIG, 'spine_02')
    for (const bone of ['hips', 'spine_01', 'thigh_L', 'shin_R']) {
      expect(d.has(bone), bone).toBe(false)
    }
  })

  test('an unknown root finds nothing rather than guessing', () => {
    expect(descendantDepths(RIG, 'Spine2').size).toBe(0)
  })

  test('a CYCLE does not hang — exported rigs contain them', () => {
    // Breadth-first with a visited set, so a loop terminates instead of
    // recursing until the stack goes. A hang in a bake is indistinguishable
    // from a slow one.
    const looped: BoneNode[] = [
      { name: 'a', parent: 'c' },
      { name: 'b', parent: 'a' },
      { name: 'c', parent: 'b' },
    ]
    const d = descendantDepths(looped, 'a')
    expect(d.get('a')).toBe(0)
    expect(d.get('b')).toBe(1)
    expect(d.get('c')).toBe(2)
  })
})

describe('the ramp — why it is weights and not a set', () => {
  test('authority builds along the chain rather than switching at a joint', () => {
    /*
    THE MANNEQUIN-SAWN-IN-HALF TEST. With a hard boundary `spine_02` takes its
    rotation from the aim clip while `spine_01` takes it from the walk, and the
    torso kinks at exactly one joint. Distributing it over a few bones is what
    a rig would do.
    */
    const m = boneMask(RIG, { root: 'spine_02', falloff: 2 })
    expect(m.get('spine_02')).toBeCloseTo(1 / 3, 9)
    expect(m.get('chest')).toBeCloseTo(2 / 3, 9)
    expect(m.get('neck')).toBe(1)
    expect(m.get('head')).toBe(1)
    // Strictly increasing along the chain — that IS the gradient.
    expect(m.get('spine_02')!).toBeLessThan(m.get('chest')!)
    expect(m.get('chest')!).toBeLessThan(m.get('neck')!)
  })

  test('the lower body is left entirely alone', () => {
    const m = boneMask(RIG, { root: 'spine_02' })
    for (const bone of ['hips', 'spine_01', 'thigh_L', 'shin_R']) {
      expect(m.get(bone), bone).toBe(0)
    }
  })

  test('falloff 0 is the hard cut, and is available on purpose', () => {
    // Sometimes you do want it — a reload that must look the same whatever the
    // legs are doing. It is simply not the default.
    const m = boneMask(RIG, { root: 'spine_02', falloff: 0 })
    expect(m.get('spine_02')).toBe(1)
    expect(m.get('spine_01')).toBe(0)
  })

  test('a longer falloff spreads the twist further', () => {
    const soft = boneMask(RIG, { root: 'spine_02', falloff: 4 })
    const hard = boneMask(RIG, { root: 'spine_02', falloff: 1 })
    expect(soft.get('chest')!).toBeLessThan(hard.get('chest')!)
  })

  test('every bone in the rig is accounted for', () => {
    // A bone missing from the mask is a bone whose weight is whatever the
    // consumer happens to default to, which is how these drift.
    const m = boneMask(RIG, { root: 'spine_02' })
    expect(m.size).toBe(RIG.length)
  })
})

describe('an unfound root must be LOUD', () => {
  test('it produces an empty mask, and the mask says so', () => {
    /*
    The failure that looks like nothing: an all-zero mask animates correctly,
    costs nothing, and is indistinguishable from a clip that did not load. Rigs
    disagree about names — this repo already finds bones with `/^head$/i`
    regexes and has `biped-mapping.test.ts` because of it.
    */
    const m = boneMask(RIG, { root: 'mixamorig:Spine1' })
    expect(maskIsEmpty(m)).toBe(true)
  })

  test('a found root is not empty', () => {
    expect(maskIsEmpty(boneMask(RIG, { root: 'spine_02' }))).toBe(false)
  })
})

describe('findBone — because rigs disagree about spelling', () => {
  test('it takes the first spelling the rig actually has', () => {
    expect(findBone(RIG, ['spine_02', 'spine2'])).toBe('spine_02')
    expect(findBone(RIG, ['nope', 'chest'])).toBe('chest')
  })

  test('case does not matter', () => {
    expect(findBone(RIG, ['SPINE_02'])).toBe('spine_02')
  })

  test('a Mixamo prefix matches the bare name', () => {
    const mixamo: BoneNode[] = [
      { name: 'mixamorig:Hips', parent: null },
      { name: 'mixamorig:Spine1', parent: 'mixamorig:Hips' },
    ]
    expect(findBone(mixamo, ['spine1'])).toBe('mixamorig:Spine1')
  })

  test('nothing found is NULL, not a substitute', () => {
    // Returning `hips` for a missing spine would mask the whole body and look
    // deliberate.
    expect(findBone(RIG, ['tail', 'wing'])).toBeNull()
  })

  test('the shipped candidates find a root on a normal rig', () => {
    expect(findBone(RIG, UPPER_BODY_ROOTS)).toBeTruthy()
  })
})

describe('complementMask — and why additive has no complement', () => {
  test('an OVERRIDE layer takes authority away, so the base gets the rest', () => {
    const m = boneMask(RIG, { root: 'spine_02', falloff: 2 })
    const c = complementMask(m, 'override')
    expect(c.get('head')).toBe(0)
    expect(c.get('chest')).toBeCloseTo(1 / 3, 9)
    expect(c.get('hips')).toBe(1)
  })

  test('an ADDITIVE layer takes nothing away — that is the point of it', () => {
    /*
    Additive is a DELTA on top of whatever is underneath, so the walk's torso
    counter-rotation survives and the legs still look attached to a body.
    Complementing one would subtract motion that was never replaced.
    */
    const m = boneMask(RIG, { root: 'spine_02', falloff: 2 })
    const c = complementMask(m, 'additive')
    for (const w of c.values()) expect(w).toBe(1)
  })
})
