import { describe, expect, test } from 'bun:test'
import {
  RIG_RECIPE_VERSION,
  STRAND_DEFAULTS,
  strandDirection,
  validateRigRecipe,
} from './rig-recipe.js'

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9)

describe('rig recipe', () => {
  test('a strand at yaw 0 hangs backward; positive yaw turns it to the left', () => {
    const back = strandDirection(0, 0)
    close(back.z, -1)
    close(back.x, 0)
    const down = strandDirection(0, -90)
    close(down.y, -1)
    // The character's left is -X in Babylon's frame (glTF's +X, mirrored).
    close(strandDirection(90, 0).x, -1)
  })

  test('a good recipe has no problems, and the defaults make a good strand', () => {
    expect(
      validateRigRecipe({
        version: RIG_RECIPE_VERSION,
        roles: { head: 'Head', 'l-index1': '' },
        armSpaceDeg: 10,
        springs: [
          { ...STRAND_DEFAULTS, anchor: 'Head' },
          { kind: 'bones', root: 'tail_01', colliders: [{ bone: 'pelvis', radius: 0.1 }] },
        ],
      })
    ).toEqual([])
  })

  test('says what is wrong, where', () => {
    const problems = validateRigRecipe({
      version: 0,
      springs: [
        { kind: 'strand', anchor: 'Head', offset: { x: 0 }, yawDeg: 0, pitchDeg: 0, length: -1, segments: 0, radius: 0.1 },
        { kind: 'wing' },
        { kind: 'bones', root: 'tail', colliders: [{ radius: 1 }] },
      ],
    })
    expect(problems).toContain(`version is 0, expected ${RIG_RECIPE_VERSION}`)
    expect(problems).toContain('springs[0].offset is not {x, y, z}')
    expect(problems).toContain('springs[0].segments is not 1 to 64')
    expect(problems).toContain('springs[0].length is not positive')
    expect(problems).toContain("springs[1].kind is not 'bones' or 'strand'")
    expect(problems).toContain('springs[2].colliders[0] needs a bone and a radius')
    expect(validateRigRecipe(null)).toEqual(['not an object'])
  })
})
