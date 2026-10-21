import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { loadHumanPack } from './human-pack.js'
import {
  DEFAULT_HUMAN_BODY,
  ageCorners,
  ageYears,
  humanHeight,
  humanJoint,
  macroWeights,
  morphHuman,
  type MacroBody,
} from './human-morph.js'

describe('macro corners', () => {
  test('age lands on its anchors: 1, 11, 25 and 90 years', () => {
    expect(ageYears(0)).toBe(1)
    expect(ageYears(0.1875)).toBe(11)
    expect(ageYears(0.5)).toBe(25)
    expect(ageYears(1)).toBe(90)
    expect(ageCorners(0.5)).toEqual([
      ['young', 1],
      ['old', 0],
    ])
  })

  test('each family of targets sums to one, so a body is a true mix', () => {
    const body: MacroBody = {
      ...DEFAULT_HUMAN_BODY,
      gender: 0.3,
      age: 0.7,
      muscle: 0.8,
      weight: 0.2,
      african: 2,
      asian: 0,
      caucasian: 1,
    }
    const w = macroWeights(body)
    const sum = (re: RegExp) =>
      [...w].filter(([n]) => re.test(n)).reduce((s, [, v]) => s + v, 0)
    expect(sum(/^macrodetails\/(african|asian|caucasian)-/)).toBeCloseTo(1, 9)
    expect(sum(/^macrodetails\/universal-/)).toBeCloseTo(1, 9)
    // The ancestry mix is normalised: 2 : 0 : 1.
    expect(sum(/^macrodetails\/african-/)).toBeCloseTo(2 / 3, 9)
    expect(sum(/^macrodetails\/asian-/)).toBe(0)
  })

  test('height and proportions at 0.5 add nothing', () => {
    const w = macroWeights(DEFAULT_HUMAN_BODY)
    expect([...w.keys()].some((n) => n.includes('/height/'))).toBe(false)
    expect([...w.keys()].some((n) => n.includes('/proportions/'))).toBe(false)
  })
})

/*
The real pack, where static-assets is checked out beside this repo and its
converter has run (`bun bin/makehuman-pack.ts`). Skipped otherwise.
*/
const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const havePack = existsSync(PACK)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe.skipIf(!havePack)('hm08, morphed', () => {
  const body = async (over: Partial<MacroBody>) => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const p = await morphHuman(
      pack,
      macroWeights({ ...DEFAULT_HUMAN_BODY, ...over }, (n) => pack.has(n))
    )
    return { pack, p, height: humanHeight(p, pack.triangles) }
  }

  test('people stand at human heights, in metres', async () => {
    const man = await body({ gender: 1, caucasian: 1, african: 0, asian: 0 })
    const woman = await body({ gender: 0, caucasian: 1, african: 0, asian: 0 })
    const baby = await body({ age: 0 })
    expect(man.height).toBeGreaterThan(1.65)
    expect(man.height).toBeLessThan(1.85)
    expect(woman.height).toBeGreaterThan(1.5)
    expect(woman.height).toBeLessThan(man.height)
    expect(baby.height).toBeGreaterThan(0.5)
    expect(baby.height).toBeLessThan(0.75)
  })

  test('the height slider runs from short to tall', async () => {
    const short = await body({ height: 0 })
    const tall = await body({ height: 1 })
    expect(tall.height - short.height).toBeGreaterThan(0.2)
  })

  test('the weight slider runs from thin to heavy (waist width)', async () => {
    // Width of the torso a metre above the feet. MakeHuman's weight targets
    // are gentle (a vertex moves at most 3 cm at the heaviest), so this is
    // about +29%, not a doubling.
    const waist = (p: Float32Array, tris: Uint32Array) => {
      let foot = Infinity
      for (const i of tris) foot = Math.min(foot, p[i * 3 + 1])
      let lo = Infinity
      let hi = -Infinity
      for (const i of tris) {
        const x = p[i * 3]
        if (Math.abs(p[i * 3 + 1] - foot - 1) < 0.01 && Math.abs(x) < 0.25) {
          lo = Math.min(lo, x)
          hi = Math.max(hi, x)
        }
      }
      return hi - lo
    }
    const thin = await body({ weight: 0 })
    const heavy = await body({ weight: 1 })
    expect(waist(heavy.p, heavy.pack.triangles)).toBeGreaterThan(
      waist(thin.p, thin.pack.triangles) * 1.2
    )
  })

  test('the joints follow the body', async () => {
    const short = await body({ height: 0 })
    const tall = await body({ height: 1 })
    const head = (b: typeof short) =>
      humanJoint(b.p, b.pack.manifest.joints['head____head'])[1]
    expect(head(tall)).toBeGreaterThan(head(short) + 0.15)
  })
})

describe.skipIf(!havePack)('hm08, rigged from its joint cubes', () => {
  test("UAL's 65 joints, every one placed, the left on +X", async () => {
    const { humanRig, humanSkin } = await import('./human-rig.js')
    const pack = await loadHumanPack(PACK, fromDisk)
    const p = await morphHuman(pack, macroWeights(DEFAULT_HUMAN_BODY))
    const rig = humanRig(pack.manifest, p)
    expect(rig.joints.length).toBe(65)
    const at = (n: string) => rig.at(n)!
    expect(at('hand_l').x).toBeGreaterThan(0.3)
    expect(at('hand_r').x).toBeLessThan(-0.3)
    expect(at('Head').y).toBeGreaterThan(at('pelvis').y + 0.5)
    // The root is on the floor, under the pelvis.
    expect(at('root').y).toBeLessThan(at('foot_l').y)
    expect(at('root').x).toBeCloseTo(at('pelvis').x, 6)
    // Toes point forward (+Z).
    expect(at('ball_leaf_l').z).toBeGreaterThan(at('foot_l').z + 0.1)
    expect(humanSkin(pack).vertices.length).toBe(13380)
  })
})

describe('skin tone', () => {
  test('the dial runs from very fair to very dark, steadily', async () => {
    const { skinLinear } = await import('./skin-tone.js')
    const lum = (t: number) => {
      const c = skinLinear(t)
      return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
    }
    expect(lum(0)).toBeGreaterThan(lum(1) * 10)
    // Never lighter as the dial goes up (tone 3 of the scale is a hair
    // lighter than 2 in red, so measure luminance, which is monotone).
    for (let t = 0.2; t <= 1; t += 0.05) expect(lum(t)).toBeLessThanOrEqual(lum(t - 0.2) + 1e-9)
  })

  test('the ends are the scale’s own tones, and redness warms', async () => {
    const { skinColor, MONK_TONES } = await import('./skin-tone.js')
    const hex = (c: { r: number; g: number; b: number }) =>
      '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
    expect(hex(skinColor(0))).toBe(MONK_TONES[0])
    expect(hex(skinColor(1))).toBe(MONK_TONES[9])
    const ruddy = skinColor(0.4, 1)
    const sallow = skinColor(0.4, 0)
    expect(ruddy.r / ruddy.g).toBeGreaterThan(sallow.r / sallow.g)
  })
})

describe.skipIf(!havePack)("MakeHuman's weights, folded onto UAL", () => {
  test('every skin vertex sums to one, and the upper back follows the spine', async () => {
    const { humanRig, humanSkin, humanWeights } = await import('./human-rig.js')
    const pack = await loadHumanPack(PACK, fromDisk)
    const p = await morphHuman(pack, macroWeights(DEFAULT_HUMAN_BODY))
    const rig = humanRig(pack.manifest, p)
    const skin = humanSkin(pack)
    const source = await pack.weights()
    expect(source).not.toBeNull()
    const w = humanWeights(source!, skin, rig)
    const n = skin.vertices.length
    for (let i = 0; i < n; i += 97) {
      const s = w.weights[i * 4] + w.weights[i * 4 + 1] + w.weights[i * 4 + 2] + w.weights[i * 4 + 3]
      expect(s).toBeCloseTo(1, 5)
    }
    // The back's centre line between the shoulder blades: bone heat gave it
    // to the collarbones, which folded it into a V.
    const sp = skin.positions(p)
    const chest = rig.at('spine_03')!
    let best = -1
    let bz = Infinity
    for (let i = 0; i < n; i++) {
      if (Math.abs(sp[i * 3]) < 0.01 && Math.abs(sp[i * 3 + 1] - (chest.y + 0.05)) < 0.015 && sp[i * 3 + 2] < bz) {
        bz = sp[i * 3 + 2]
        best = i
      }
    }
    const names = rig.joints.map((j) => j.name)
    let spine = 0
    for (let k = 0; k < 4; k++) {
      if (/^spine_|^neck/.test(names[w.indices[best * 4 + k]])) spine += w.weights[best * 4 + k]
    }
    expect(spine).toBeGreaterThan(0.6)
  })
})
