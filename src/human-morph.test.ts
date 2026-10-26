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

describe.skipIf(!havePack)('hm08 chest and bust', () => {
  // How far forward the chest reaches, at pec height, on the midline band.
  const chestFront = (p: Float32Array, tris: Uint32Array) => {
    let lo = Infinity
    let hi = -Infinity
    for (const v of tris) {
      lo = Math.min(lo, p[v * 3 + 1])
      hi = Math.max(hi, p[v * 3 + 1])
    }
    const y0 = lo + (hi - lo) * 0.73
    let front = -Infinity
    for (const v of tris) {
      if (Math.abs(p[v * 3 + 1] - y0) > 0.02 || Math.abs(p[v * 3]) > 0.12)
        continue
      front = Math.max(front, p[v * 3 + 2])
    }
    return front
  }
  test('bust size grows a female chest, and leaves a male one alone', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    if (
      !pack.has(
        'breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness'
      )
    )
      return
    const f = async (body: Partial<MacroBody>) =>
      chestFront(
        await morphHuman(
          pack,
          macroWeights({ ...DEFAULT_HUMAN_BODY, ...body }, (n) => pack.has(n))
        ),
        pack.triangles
      )
    expect(await f({ gender: 0, bustSize: 1 })).toBeGreaterThan(
      (await f({ gender: 0, bustSize: 0 })) + 0.02
    )
    expect(await f({ gender: 1, bustSize: 1 })).toBeCloseTo(
      await f({ gender: 1, bustSize: 0 }),
      4
    )
  })
  test('chest depth reaches further forward', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    if (!pack.has('torso/torso-scale-depth-incr')) return
    const f = async (chestDepth: number) =>
      chestFront(
        await morphHuman(
          pack,
          macroWeights({ ...DEFAULT_HUMAN_BODY, gender: 1, chestDepth }, (n) =>
            pack.has(n)
          )
        ),
        pack.triangles
      )
    expect(await f(1)).toBeGreaterThan((await f(0)) + 0.01)
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

  test('eyes and lashes are parts over the body’s own vertices, so shapes move them', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const eyes = (await pack.part('eyes'))!
    const lashes = (await pack.part('eyelashes'))!
    expect(eyes.uvs!.length).toBe(eyes.vertices.length * 2)
    expect(lashes.uvs).toBeNull()
    for (const p of [eyes, lashes]) {
      for (const t of p.triangles) expect(t).toBeLessThan(p.vertices.length)
      for (const v of p.vertices)
        expect(v).toBeLessThan(pack.manifest.vertexCount)
    }
    // Each eye sits around its eye joint: half the eye vertices each side.
    const p = await morphHuman(pack, macroWeights(DEFAULT_HUMAN_BODY))
    const left = [...eyes.vertices].filter((v) => p[v * 3] > 0).length
    expect(left * 2).toBe(eyes.vertices.length)
    const [, eyeY] = humanJoint(p, pack.manifest.joints['eye.L____head'])
    const tall = await morphHuman(
      pack,
      macroWeights({ ...DEFAULT_HUMAN_BODY, height: 1 })
    )
    const [, tallY] = humanJoint(tall, pack.manifest.joints['eye.L____head'])
    expect(tallY).toBeGreaterThan(eyeY + 0.05)
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
    for (let t = 0.2; t <= 1; t += 0.05)
      expect(lum(t)).toBeLessThanOrEqual(lum(t - 0.2) + 1e-9)
  })

  test('the ends are the scale’s own tones, and redness warms', async () => {
    const { skinColor, MONK_TONES } = await import('./skin-tone.js')
    const hex = (c: { r: number; g: number; b: number }) =>
      '#' +
      [c.r, c.g, c.b]
        .map((v) =>
          Math.round(v * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
    expect(hex(skinColor(0))).toBe(MONK_TONES[0])
    expect(hex(skinColor(1))).toBe(MONK_TONES[9])
    const ruddy = skinColor(0.4, 1)
    const sallow = skinColor(0.4, 0)
    expect(ruddy.r / ruddy.g).toBeGreaterThan(sallow.r / sallow.g)
  })

  test('iris colour runs from dark brown to grey, through blue', async () => {
    const { irisColor, IRIS_TONES } = await import('./skin-tone.js')
    const hex = (c: { r: number; g: number; b: number }) =>
      '#' +
      [c.r, c.g, c.b]
        .map((v) =>
          Math.round(v * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
    expect(hex(irisColor(0))).toBe(IRIS_TONES[0])
    expect(hex(irisColor(1))).toBe(IRIS_TONES[IRIS_TONES.length - 1])
    expect(irisColor(0).r).toBeGreaterThan(irisColor(0).b)
    expect(irisColor(0.85).b).toBeGreaterThan(irisColor(0.85).r)
  })

  test('dye keeps the hair\u2019s lightness and turns its hue', async () => {
    const { hairColor, hairDye } = await import('./skin-tone.js')
    const lum = (c: { r: number; g: number; b: number }) =>
      0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
    const natural = hairColor(0.3, 0.2)
    expect(hairDye(natural, 0.6, 0)).toEqual(natural)
    const blue = hairDye(natural, 0.63, 1)
    expect(blue.b).toBeGreaterThan(blue.r)
    expect(lum(blue)).toBeCloseTo(lum(natural), 3)
  })
})

describe.skipIf(!havePack)(
  'hm08 proxies (MakeHuman CC0 clothes), fitted by binding',
  () => {
    test('a garment follows the body: on a heavier body it is wider', async () => {
      const { fitProxy } = await import('./proxy-fit.js')
      const pack = await loadHumanPack(PACK, fromDisk)
      const suit = await pack.proxy('male_casualsuit02')
      if (suit == null) return // an older pack without proxies
      const thin = await morphHuman(
        pack,
        macroWeights({ ...DEFAULT_HUMAN_BODY, gender: 1, weight: 0 })
      )
      const heavy = await morphHuman(
        pack,
        macroWeights({ ...DEFAULT_HUMAN_BODY, gender: 1, weight: 1 })
      )
      // Across the waist (sleeves set the overall width, and barely change).
      const width = (p: Float32Array) => {
        let ylo = Infinity
        let yhi = -Infinity
        for (let i = 1; i < p.length; i += 3) {
          ylo = Math.min(ylo, p[i])
          yhi = Math.max(yhi, p[i])
        }
        const band = [ylo + (yhi - ylo) * 0.5, ylo + (yhi - ylo) * 0.55]
        let lo = Infinity
        let hi = -Infinity
        for (let i = 0; i < p.length; i += 3) {
          if (p[i + 1] < band[0] || p[i + 1] > band[1] || Math.abs(p[i]) > 0.25)
            continue
          lo = Math.min(lo, p[i])
          hi = Math.max(hi, p[i])
        }
        return hi - lo
      }
      const a = fitProxy(suit, thin)
      const b = fitProxy(suit, heavy)
      expect(width(b)).toBeGreaterThan(width(a) * 1.05)
      // Every drawn vertex has a row, every triangle a drawn vertex.
      for (const r of suit.source) expect(r).toBeLessThan(suit.rows)
      for (const t of suit.triangles) expect(t).toBeLessThan(suit.source.length)
      // And it covers skin.
      expect(suit.delete?.length ?? 0).toBeGreaterThan(1000)
    })
  }
)
