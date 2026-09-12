import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_HEIGHTS,
  bearingIndex,
  exposure,
  inShelter,
  makeSurroundings,
  muzzleClearance,
  peekSide,
  sampleAt,
  setSample,
  shelterFrom,
  shuffleToward,
  stanceFor,
  type Surroundings,
} from './surroundings.js'

/**
 * A wall on one bearing, blocking every height up to `top`.
 *
 * Worth having as a helper rather than inline: every test here is "what does
 * this arrangement of walls afford", and the arrangement should be readable at
 * a glance or the test is testing the setup.
 */
function wall(
  surr: Surroundings,
  bearingDeg: number,
  top: number,
  distance = 0.8,
  spreadBuckets = 1
): void {
  const step = 360 / surr.bearings.length
  for (let k = -spreadBuckets; k <= spreadBuckets; k++) {
    for (let h = 0; h < surr.heights.length; h++) {
      if (surr.heights[h] > top) break
      setSample(surr, bearingDeg + k * step, h, distance)
    }
  }
}

describe('the read itself', () => {
  test('starts completely clear', () => {
    const s = makeSurroundings()
    for (let b = 0; b < s.bearings.length; b++) {
      for (let h = 0; h < s.heights.length; h++) {
        expect(sampleAt(s, b, h)).toBe(Infinity)
      }
    }
  })

  test('bearings wrap, so 359 and 1 are the same bucket', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    expect(bearingIndex(s, 359)).toBe(bearingIndex(s, -1))
    expect(bearingIndex(s, 361)).toBe(bearingIndex(s, 1))
    expect(bearingIndex(s, 720)).toBe(bearingIndex(s, 0))
  })

  test('a non-finite bearing does not index off the end', () => {
    const s = makeSurroundings()
    expect(bearingIndex(s, NaN)).toBe(0)
    expect(sampleAt(s, 9999, 9999)).toBe(Infinity)
  })

  test('samples round-trip through the flat buffer', () => {
    const s = makeSurroundings({ bearingCount: 8 })
    setSample(s, 90, 2, 1.3)
    expect(sampleAt(s, bearingIndex(s, 90), 2)).toBeCloseTo(1.3, 5)
    // and did not scribble on a neighbour
    expect(sampleAt(s, bearingIndex(s, 90), 1)).toBe(Infinity)
    expect(sampleAt(s, bearingIndex(s, 135), 2)).toBe(Infinity)
  })
})

describe('shelterFrom', () => {
  test('nothing there is no shelter', () => {
    const s = makeSurroundings()
    const sh = shelterFrom(s, 0)
    expect(sh.height).toBe(0)
    expect(sh.distance).toBe(Infinity)
  })

  test('a chest-high wall between you and the threat shelters you', () => {
    const s = makeSurroundings()
    wall(s, 0, 1.2)
    const sh = shelterFrom(s, 0)
    expect(sh.height).toBeCloseTo(1.2, 5)
    expect(sh.distance).toBeCloseTo(0.8, 5)
  })

  test('a wall BEHIND you shelters you from nothing in front', () => {
    const s = makeSurroundings()
    wall(s, 180, 2.0)
    expect(shelterFrom(s, 0).height).toBe(0)
    // ...and shelters you from something behind, which is the same wall.
    expect(shelterFrom(s, 180).height).toBeCloseTo(2.0, 5)
  })

  test('a railing with a gap underneath is NOT cover', () => {
    // The rule that makes this a shelter measurement rather than a clutter
    // measurement: blocked at chest height, wide open at the knees.
    const s = makeSurroundings()
    for (let h = 0; h < s.heights.length; h++) {
      if (s.heights[h] >= 1.0 && s.heights[h] <= 1.4) setSample(s, 0, h, 0.7)
    }
    expect(shelterFrom(s, 0).height).toBe(0)
  })

  test('geometry out of reach is scenery, not cover', () => {
    const s = makeSurroundings()
    wall(s, 0, 2.0, 6)
    expect(shelterFrom(s, 0).height).toBe(0)
    // Reachable if you are generous about what "behind" means.
    expect(shelterFrom(s, 0, { maxRange: 8 }).height).toBeCloseTo(2.0, 5)
  })

  test('searches an arc, so cover off to one side still counts', () => {
    // Pressed into a corner: the wall doing the work is 30 degrees off the
    // shooter, which a single-bearing lookup would miss entirely.
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, 30, 1.4, 0.8, 0)
    expect(shelterFrom(s, 0, { arcDeg: 45 }).height).toBeCloseTo(1.4, 5)
    expect(shelterFrom(s, 0, { arcDeg: 0 }).height).toBe(0)
  })

  test('reports the BEST column in the arc, not the first', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, -30, 0.6, 0.8, 0)
    wall(s, 30, 1.7, 0.8, 0)
    const sh = shelterFrom(s, 0, { arcDeg: 45 })
    expect(sh.height).toBeCloseTo(1.7, 5)
    expect(sh.bearing).toBeCloseTo(30, 5)
  })

  test('the threat direction wraps like any other bearing', () => {
    const s = makeSurroundings()
    wall(s, 0, 1.2)
    expect(shelterFrom(s, 360).height).toBeCloseTo(1.2, 5)
    expect(shelterFrom(s, -720).height).toBeCloseTo(1.2, 5)
  })
})

describe('stanceFor', () => {
  test('a full-height wall lets you stand', () => {
    expect(stanceFor(2.0)).toBe('standing')
  })

  test('a low wall makes you crouch', () => {
    expect(stanceFor(1.0)).toBe('crouched')
  })

  test('a kerb is not cover at all', () => {
    expect(stanceFor(0.3)).toBe(null)
  })

  test('a braver character needs less of itself hidden', () => {
    // Same wall, different policy — which is why this is not baked into the
    // measurement.
    expect(stanceFor(1.3, { needed: 0.8 })).toBe('crouched')
    expect(stanceFor(1.3, { needed: 0.7 })).toBe('standing')
  })

  test('a smaller character finds cover where a big one does not', () => {
    const small = { standing: 1.2 }
    expect(stanceFor(1.0)).toBe('crouched')
    expect(stanceFor(1.0, small)).toBe('standing')
  })
})

describe('exposure', () => {
  test('no shelter is fully exposed, full shelter is not exposed at all', () => {
    expect(exposure(0)).toBe(1)
    expect(exposure(1.8)).toBe(0)
    expect(exposure(3)).toBe(0)
  })

  test('half a body hidden is half exposed', () => {
    expect(exposure(0.9)).toBeCloseTo(0.5, 5)
  })

  test('crouching behind the same wall hides all of you', () => {
    // Two correct facts adding up to a wrong one: "crouch" and "exposed" were
    // reported together, because exposure measured a body that was about to
    // stop standing.
    expect(exposure(1.1, {}, 'standing')).toBeGreaterThan(0.3)
    expect(exposure(1.1, {}, 'crouched')).toBe(0)
  })

  test('a crouched body still shows above a kerb', () => {
    expect(exposure(0.3, {}, 'crouched')).toBeGreaterThan(0.6)
  })
})

describe('inShelter', () => {
  test('needs more to enter than to stay', () => {
    // The whole point of the band: creeping up to 0.5 does not put you in
    // cover, but dropping to 0.5 does not throw you out of it.
    expect(inShelter(0.5, false)).toBe(false)
    expect(inShelter(0.5, true)).toBe(true)
  })

  test('clearly covered and clearly exposed agree whatever you were', () => {
    expect(inShelter(0.9, false)).toBe(true)
    expect(inShelter(0.9, true)).toBe(true)
    expect(inShelter(0.1, true)).toBe(false)
    expect(inShelter(0.1, false)).toBe(false)
  })

  test('does not flicker when a value sits exactly on the boundary', () => {
    // The `isSwimming` failure, reproduced in miniature: a masked fraction
    // hovering at the enter threshold must not alternate every frame.
    let state = false
    const seen = new Set<boolean>()
    for (let i = 0; i < 20; i++) {
      state = inShelter(0.6 + (i % 2 === 0 ? 1e-6 : -1e-6), state)
      seen.add(state)
    }
    // It latched on and stayed on.
    expect(state).toBe(true)
    expect(seen.size).toBe(1)
  })
})

describe('peekSide', () => {
  test('cover with open ground to the right is a right-hand peek', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    // Wall dead ahead and to the LEFT; open to the right.
    wall(s, 0, 1.4, 0.8, 0)
    wall(s, -30, 1.4, 0.8, 0)
    wall(s, -60, 1.4, 0.8, 0)
    expect(peekSide(s, 0)).toBe('right')
  })

  test('a lone pillar can be leaned past either way', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, 0, 1.8, 0.8, 0)
    expect(peekSide(s, 0)).toBe('both')
  })

  test('standing in the open there is nothing to peek PAST', () => {
    // Every bearing is clear, so the naive answer is "both" — which reads as an
    // affordance and is the opposite of one.
    const s = makeSurroundings({ bearingCount: 12 })
    expect(peekSide(s, 0)).toBe(null)
  })

  test('a long wall offers no peek at all', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    for (const b of [-90, -60, -30, 0, 30, 60, 90]) wall(s, b, 1.8, 0.8, 0)
    expect(peekSide(s, 0)).toBe(null)
  })

  test('a low wall does not block a lean — you lean, you do not crawl', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, 0, 1.8, 0.8, 0)
    // Knee-high clutter either side; irrelevant to leaning out.
    wall(s, -30, 0.6, 0.8, 0)
    wall(s, 30, 0.6, 0.8, 0)
    expect(peekSide(s, 0)).toBe('both')
  })
})

describe('muzzleClearance', () => {
  test('a clear line needs nothing', () => {
    const s = makeSurroundings()
    expect(muzzleClearance(s, 0, 1.5)).toBe(0)
  })

  test('crouched behind a wall, the shot needs the muzzle raised', () => {
    const s = makeSurroundings()
    wall(s, 0, 1.2)
    // Muzzle at a crouch: blocked, and it must clear 1.2.
    const needed = muzzleClearance(s, 0, 0.9)
    expect(needed).toBeGreaterThan(1.2)
  })

  test('standing behind the same wall, the shot is already out', () => {
    const s = makeSurroundings()
    wall(s, 0, 1.2)
    expect(muzzleClearance(s, 0, 1.5)).toBe(0)
  })

  test('answers about the AIM direction, not the threat', () => {
    // Cover on the left, shooting right. The wall sheltering you is not in the
    // way of this shot, and saying it was would pin a character down for no
    // reason.
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, -90, 1.8, 0.8, 0)
    expect(muzzleClearance(s, 90, 1.0)).toBe(0)
    expect(muzzleClearance(s, -90, 1.0)).toBeGreaterThan(0)
  })

  test('a railing blocks a chest-height shot even though it is not cover', () => {
    // The case that showed the first implementation was asking the wrong
    // question: nothing from the ground up, and it will still stop a bullet.
    const s = makeSurroundings()
    for (let h = 0; h < s.heights.length; h++) {
      if (s.heights[h] >= 1.0 && s.heights[h] <= 1.4) setSample(s, 0, h, 0.7)
    }
    expect(shelterFrom(s, 0).height).toBe(0)
    expect(muzzleClearance(s, 0, 1.2)).toBeGreaterThan(1.4)
  })

  test('a wall blocked all the way up reports NO SHOT, not a reachable height', () => {
    const s = makeSurroundings()
    wall(s, 0, 99)
    const needed = muzzleClearance(s, 0, 1.5)
    expect(needed).toBeGreaterThan(s.heights[s.heights.length - 1])
  })

  test('distant geometry does not block the muzzle', () => {
    const s = makeSurroundings()
    wall(s, 0, 2.0, 9)
    expect(muzzleClearance(s, 0, 1.0)).toBe(0)
  })
})

describe('shuffleToward', () => {
  test('nothing to gain returns null, not a direction', () => {
    const s = makeSurroundings()
    expect(shuffleToward(s, 0)).toBe(null)
  })

  test('points at the nook rather than at the open ground', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    // Nothing between you and the shooter; a tall wall 60 degrees off, still
    // broadly toward them.
    wall(s, 60, 1.8, 1.0, 0)
    expect(shuffleToward(s, 0)).toBeCloseTo(60, 5)
  })

  test('will not send you toward cover BEHIND the shooter', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, 180, 2.0, 1.0, 0)
    expect(shuffleToward(s, 0)).toBe(null)
  })

  test('does not suggest walking into what you are already pressed against', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, 0, 1.8, 0.2, 0)
    expect(shuffleToward(s, 0)).toBe(null)
  })

  test('already better covered than anything nearby: stay put', () => {
    const s = makeSurroundings({ bearingCount: 12 })
    wall(s, 0, 2.0, 0.8, 0)
    wall(s, 60, 0.6, 1.0, 0)
    expect(shuffleToward(s, 0)).toBe(null)
  })
})

describe('the whole loop: pressing into a nook', () => {
  test('walk up to a low wall, crouch, and be in cover', () => {
    const s = makeSurroundings()
    const stature = { standing: 1.8 }
    // Out in the open.
    let covered = inShelter(1 - exposure(shelterFrom(s, 0).height, stature))
    expect(covered).toBe(false)

    // Now a low wall is between us and the shooting.
    wall(s, 0, 1.2)
    const sh = shelterFrom(s, 0)
    const masked = 1 - exposure(sh.height, stature)
    covered = inShelter(masked, covered)

    // 1.2 of 1.8 is two-thirds hidden — enough to count, and it demands a
    // crouch to be properly behind it.
    expect(masked).toBeCloseTo(2 / 3, 2)
    expect(covered).toBe(true)
    expect(stanceFor(sh.height, stature)).toBe('crouched')
    expect(exposure(sh.height, stature, 'crouched')).toBe(0)
    // And from there the shot is blocked until you rise or lean.
    expect(muzzleClearance(s, 0, 0.9)).toBeGreaterThan(0)
    expect(peekSide(s, 0)).not.toBe(null)
  })

  test('walking away from it leaves cover with nothing to un-set', () => {
    // Derived, not entered: the same call that put us in cover takes us out,
    // and there is no state to get stuck in.
    const s = makeSurroundings()
    wall(s, 0, 1.2)
    const stature = { standing: 1.8 }
    let covered = inShelter(1 - exposure(shelterFrom(s, 0).height, stature))
    expect(covered).toBe(true)

    const gone = makeSurroundings()
    covered = inShelter(
      1 - exposure(shelterFrom(gone, 0).height, stature),
      covered
    )
    expect(covered).toBe(false)
  })

  test('the same wall, a threat from the other side, is no cover at all', () => {
    const s = makeSurroundings()
    wall(s, 0, 1.4)
    expect(shelterFrom(s, 0).height).toBeGreaterThan(0)
    expect(shelterFrom(s, 180).height).toBe(0)
  })
})

describe('DEFAULT_HEIGHTS', () => {
  test('ascends, which every column walk assumes', () => {
    for (let i = 1; i < DEFAULT_HEIGHTS.length; i++) {
      expect(DEFAULT_HEIGHTS[i]).toBeGreaterThan(DEFAULT_HEIGHTS[i - 1])
    }
  })

  test('brackets the stances that matter', () => {
    // A crouch and a shoulder have to fall INSIDE the sampled band or the
    // measurement cannot tell those cases apart.
    expect(DEFAULT_HEIGHTS[0]).toBeLessThan(0.9)
    expect(DEFAULT_HEIGHTS[DEFAULT_HEIGHTS.length - 1]).toBeGreaterThan(1.8)
  })
})
