import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fitCut,
  landmarkWarp,
  outlineLandmarks,
  recutGarment,
  warpOutline,
  type OutlineLandmarks,
  type TailorCut,
} from './tailor-recipe.js'
import { humanBodyMaker } from './human-rig.js'
import { loadHumanPack } from './human-pack.js'
import { fitProxy } from './proxy-fit.js'
import { glbRigTriangles } from './glb-rig.js'
import { bodyFromMarkers, type RiggedBody } from './rigged-body.js'

const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const AI = join(
  import.meta.dir,
  '../../static-assets/assets/tonio/ai/african-american-female-10k.glb'
)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe('tailor-recipe: the warp', () => {
  const from: OutlineLandmarks = {
    pelvis: [0, 1],
    thigh_l: [0.1, 0.95],
    calf_l: [0.1, 0.5],
    foot_l: [0.1, 0.08],
    hand_l: [0.4, 0.8],
  }
  test('exact at the landmarks, mirrored ones too', () => {
    const to: OutlineLandmarks = {
      pelvis: [0, 1.1],
      thigh_l: [0.12, 1.04],
      calf_l: [0.13, 0.56],
      foot_l: [0.12, 0.09],
      hand_l: [0.45, 0.88],
    }
    const warp = landmarkWarp(from, to)
    for (const name of Object.keys(from)) {
      const [x, y] = warp(from[name])
      expect(x).toBeCloseTo(to[name][0], 6)
      expect(y).toBeCloseTo(to[name][1], 6)
    }
    const [x, y] = warp([-0.1, 0.5])
    expect(x).toBeCloseTo(-0.13, 6)
    expect(y).toBeCloseTo(0.56, 6)
  })
  test('the same body leaves an outline where it is', () => {
    const shapes = [
      [
        [0, 1],
        [0.2, 1],
        [0.2, 0.5],
        [0, 0.5],
      ] as [number, number][],
    ]
    const out = warpOutline(shapes, from, from)
    out[0].forEach((p, i) => {
      expect(p[0]).toBeCloseTo(shapes[0][i][0], 9)
      expect(p[1]).toBeCloseTo(shapes[0][i][1], 9)
    })
  })
})

/** Shorts drawn on `body`: a half outline from the waist to just above the knee. */
function shortsOn(body: RiggedBody): TailorCut {
  const L = outlineLandmarks(body.rig)
  const waist = L.spine_01[1]
  const hem = L.calf_l[1] + 0.06
  return {
    shapes: [
      [
        [0, waist],
        [0.3, waist],
        [0.3, hem],
        [0, hem],
      ],
    ],
    thickness: 0.005,
    skirt: false,
    mesh: 'body',
    on: L,
  }
}

/** The lowest point of a garment as worn on `body`. */
function lowest(
  cut: NonNullable<Awaited<ReturnType<typeof recutGarment>>>,
  body: RiggedBody
) {
  const p = fitProxy(cut, body.positions)
  let lo = Infinity
  for (let i = 1; i < p.length; i += 3) lo = Math.min(lo, p[i])
  return lo
}

describe('tailor-recipe: a recipe on other bodies', () => {
  test.skipIf(!existsSync(PACK))(
    'shorts drawn on one MakeHuman body end at the knee on a tall and a short one',
    async () => {
      const pack = await loadHumanPack(PACK, fromDisk)
      const maker = await humanBodyMaker(pack)
      const shorts = shortsOn(maker.first)
      const L0 = outlineLandmarks(maker.first.rig)
      const thigh0 = L0.thigh_l[1] - L0.calf_l[1]
      for (const sliders of [{ height: 1 }, { height: 0, weight: 1 }]) {
        const body = await maker.body(sliders)
        const L = outlineLandmarks(body.rig)
        const knee = L.calf_l[1]
        // 6 cm over the knee on the body it was drawn on is that much of
        // the thigh: scaled with this body's thigh.
        const above = (0.06 * (L.thigh_l[1] - knee)) / thigh0
        const fitted = fitCut(shorts, body.rig)
        const hem = Math.min(...fitted.shapes[0].map((p) => p[1]))
        expect(Math.abs(hem - knee - above)).toBeLessThan(0.01)
        // And the garment cut on it, its hem there too.
        const g = await recutGarment(body, shorts)
        expect(g).not.toBeNull()
        expect(g!.rows).toBeGreaterThan(100)
        expect(Math.abs(lowest(g!, body) - knee - above)).toBeLessThan(0.03)
      }
      // Unwarped (in metres), the tall body's hem misses its knee by far.
      const tall = await maker.body({ height: 1 })
      const raw = await recutGarment(tall, { ...shorts, on: undefined })
      expect(
        Math.abs(lowest(raw!, tall) - tall.rig.at('calf_l')!.y)
      ).toBeGreaterThan(0.12)
    },
    60000
  )

  test.skipIf(!existsSync(PACK) || !existsSync(AI))(
    'and on a mesh rigged from markers (the AI cast)',
    async () => {
      const pack = await loadHumanPack(PACK, fromDisk)
      const maker = await humanBodyMaker(pack)
      const shorts = shortsOn(maker.first)
      const body = bodyFromMarkers(
        glbRigTriangles(new Uint8Array(readFileSync(AI)))
      )
      const g = await recutGarment(body, shorts)
      expect(g!.rows).toBeGreaterThan(100)
      const L0 = outlineLandmarks(maker.first.rig)
      const L = outlineLandmarks(body.rig)
      const knee = L.calf_l[1]
      const above =
        (0.06 * (L.thigh_l[1] - knee)) / (L0.thigh_l[1] - L0.calf_l[1])
      expect(Math.abs(lowest(g!, body) - knee - above)).toBeLessThan(0.03)
    },
    60000
  )
})
