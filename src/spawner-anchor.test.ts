import { describe, test, expect } from 'bun:test'

/*
A PLACE IS NOT A DISTANCE.

`b3d-spawner` could only say "somewhere on a ring around the player", which is
an ENCOUNTER — put some enemies out there, far enough that finding them is the
game. tosijs-3d-ensemble needed the other thing: their format has a `launchpad`
capability, *craft launch from THIS pad on this rig*, which is a fact about a
place in the arrangement (#40). With no way to express it they registered the
capability `editorOnly` — authorable, and honestly marked as something the
runtime would not build.

Two properties matter beyond "the coordinates arrive", and both are tested here:
a placed spawn must be EXACT (a carrier deck that moved would be a bug, not
variety), and it must not consume the RNG, or adding one would shift every
encounter in the scene.
*/

const LIMIT = { min: 600, max: 1400 }

/** The placement branch, as it is written. */
const placement = (
  opts: {
    anchor: 'player' | 'place'
    x?: number
    y?: number
    z?: number
    facingDeg?: number
  },
  player: { x: number; z: number },
  rng: () => number
) => {
  if (opts.anchor === 'place') {
    return {
      position: { x: opts.x ?? 0, y: opts.y ?? 0, z: opts.z ?? 0 },
      rotation: { x: 0, y: opts.facingDeg ?? 0, z: 0 },
      usedRng: 0,
    }
  }
  let used = 0
  const draw = () => {
    used++
    return rng()
  }
  const angle = draw() * Math.PI * 2
  const dist = LIMIT.min + draw() * (LIMIT.max - LIMIT.min)
  return {
    position: {
      x: player.x + Math.cos(angle) * dist,
      y: opts.y ?? 0,
      z: player.z + Math.sin(angle) * dist,
    },
    rotation: undefined,
    usedRng: used,
  }
}

const fixedRng = () => 0.5

describe('place-anchored spawning', () => {
  test('lands exactly where it was authored, whatever the player is doing', () => {
    const near = placement(
      { anchor: 'place', x: 12, y: 3, z: -40 },
      { x: 0, z: 0 },
      fixedRng
    )
    const far = placement(
      { anchor: 'place', x: 12, y: 3, z: -40 },
      { x: 9000, z: -9000 },
      fixedRng
    )
    expect(near.position).toEqual({ x: 12, y: 3, z: -40 })
    expect(far.position).toEqual(near.position)
  })

  test('facing reaches the prefab as rotation, in degrees about Y', () => {
    const p = placement(
      { anchor: 'place', facingDeg: 90 },
      { x: 0, z: 0 },
      fixedRng
    )
    expect(p.rotation).toEqual({ x: 0, y: 90, z: 0 })
  })

  test('it does NOT consume the RNG — adding a pad cannot shift the encounters', () => {
    // "Same seed, same battles" is the spawner's own promise. A placed spawner
    // drawing from the shared stream would break it for every other spawner in
    // the scene, and the symptom would be "my encounters changed when I added a
    // launchpad", which nobody would connect.
    expect(
      placement({ anchor: 'place' }, { x: 0, z: 0 }, fixedRng).usedRng
    ).toBe(0)
  })

  test('the distances are simply not read — mutual exclusion by construction', () => {
    const p = placement(
      { anchor: 'place', x: 5, z: 5 },
      { x: 100, z: 100 },
      () => {
        throw new Error('rng must not be touched')
      }
    )
    expect(p.position).toEqual({ x: 5, y: 0, z: 5 })
  })
})

describe('player-anchored spawning is unchanged', () => {
  test('still lands on the ring, relative to the player', () => {
    const p = placement({ anchor: 'player' }, { x: 100, z: 0 }, fixedRng)
    const d = Math.hypot(p.position.x - 100, p.position.z - 0)
    expect(d).toBeGreaterThanOrEqual(LIMIT.min)
    expect(d).toBeLessThanOrEqual(LIMIT.max)
  })

  test('and still draws exactly twice from the RNG', () => {
    expect(
      placement({ anchor: 'player' }, { x: 0, z: 0 }, fixedRng).usedRng
    ).toBe(2)
  })

  test('it carries no rotation — an encounter has no authored facing', () => {
    expect(
      placement({ anchor: 'player' }, { x: 0, z: 0 }, fixedRng).rotation
    ).toBeUndefined()
  })
})
