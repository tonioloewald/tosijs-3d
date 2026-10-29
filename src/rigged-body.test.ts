import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bodyFromMarkers, eyeCentre, eyeUvs, isEyeName, splitEyes, type RiggedBody } from './rigged-body.js'
import { humanBodyMaker } from './human-rig.js'
import { loadHumanPack } from './human-pack.js'
import { objTriangles } from './rig-fit.js'

/*
THE CONTRACT both makers keep: whatever made a body, a consumer can read it
the same way. Checked on a mesh rigged from markers (Tonio's weasel) and on
MakeHuman's body, where the files are checked out beside this repo.
*/
function keepsTheContract(body: RiggedBody) {
  const n = body.positions.length / 3
  expect(Number.isInteger(n)).toBe(true)
  expect(body.indices.length % 3).toBe(0)
  for (const i of body.indices) expect(i).toBeLessThan(n)
  // UAL's skeleton, each joint's parent before it.
  expect(body.rig.joints.length).toBeGreaterThanOrEqual(65)
  const seen = new Set<string>()
  for (const j of body.rig.joints) {
    if (j.parent != null) expect(seen.has(j.parent)).toBe(true)
    seen.add(j.name)
  }
  for (const name of ['root', 'pelvis', 'Head', 'hand_l', 'foot_r'])
    expect(body.rig.at(name)).toBeDefined()
  // Four weights a vertex, summing to one, on joints that exist.
  expect(body.weights.indices.length).toBe(n * 4)
  expect(body.weights.weights.length).toBe(n * 4)
  for (let v = 0; v < n; v += 97) {
    let sum = 0
    for (let k = 0; k < 4; k++) {
      sum += body.weights.weights[v * 4 + k]
      expect(body.weights.indices[v * 4 + k]).toBeLessThan(body.rig.joints.length)
    }
    expect(sum).toBeCloseTo(1, 3)
  }
  for (const mask of Object.values(body.regions)) expect(mask.length).toBe(n)
}

const RIGGING = join(import.meta.dir, '../../static-assets/assets/tonio/rigging')
const PACK = join(import.meta.dir, '../../static-assets/assets/makehuman/hm08/hm08.json')
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe('rigged body', () => {
  test.skipIf(!existsSync(RIGGING))('from markers: the weasel', () => {
    const tris = objTriangles(readFileSync(join(RIGGING, 'weasel.obj'), 'utf8'), ['Body'])
    const body = bodyFromMarkers(tris, { source: 'weasel.obj' })
    keepsTheContract(body)
    expect(body.made.by).toBe('markers')
    if (body.made.by === 'markers') expect(body.made.markers.chin).toBeDefined()
  })

  test.skipIf(!existsSync(RIGGING))('joints moved by hand win over the fit, and are kept', () => {
    const tris = objTriangles(readFileSync(join(RIGGING, 'weasel.obj'), 'utf8'), ['Body'])
    const fitted = bodyFromMarkers(tris)
    const t = fitted.rig.at('thumb_01_l')!
    const moved = { x: t.x + 0.02, y: t.y - 0.01, z: t.z + 0.03 }
    const body = bodyFromMarkers(tris, {
      markers: (fitted.made as { markers: any }).markers,
      joints: { thumb_01_l: moved },
    })
    keepsTheContract(body)
    expect(body.rig.at('thumb_01_l')).toEqual(moved)
    expect(body.rig.joints.find((j) => j.name === 'thumb_01_l')!.position).toEqual(moved)
    // The others are where the fit put them.
    expect(body.rig.at('thumb_01_r')).toEqual(fitted.rig.at('thumb_01_r'))
    expect(body.made).toMatchObject({ by: 'markers', joints: { thumb_01_l: moved } })
  })

  test.skipIf(!existsSync(RIGGING))("a file's uvs, colours and surfaces are carried onto the body", () => {
    const tris = objTriangles(readFileSync(join(RIGGING, 'weasel.obj'), 'utf8'), ['Body'])
    const n = tris.positions.length / 3
    const uvs = Array.from({ length: n * 2 }, (_, i) => i / (n * 2))
    const colors = new Array(n * 4).fill(0.5)
    const half = Math.floor(tris.indices.length / 6) * 3
    const surfaces = [
      { start: 0, count: half, name: 'fur' },
      { start: half, count: tris.indices.length - half, name: 'glass' },
    ]
    const body = bodyFromMarkers({ ...tris, uvs, colors, surfaces })
    keepsTheContract(body)
    expect(Array.from(body.uvs!)).toEqual(Array.from(Float32Array.from(uvs)))
    expect(body.colors!.length).toBe(n * 4)
    expect(body.surfaces).toEqual(surfaces)
    // A copy: the body's surfaces are its own.
    expect(body.surfaces![0]).not.toBe(surfaces[0])
    // None given, none made up.
    const plain = bodyFromMarkers(tris)
    expect(plain.uvs).toBeUndefined()
    expect(plain.surfaces).toBeUndefined()
  })

  test.skipIf(!existsSync(PACK))('from MakeHuman: two shapes, one set of weights', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const maker = await humanBodyMaker(pack)
    keepsTheContract(maker.first)
    expect(Object.keys(maker.first.regions).sort()).toEqual(['lips', 'nipples'])
    const heavy = await maker.body({ weight: 1, muscle: 1 })
    keepsTheContract(heavy)
    expect(heavy.weights).toBe(maker.first.weights)
    expect(heavy.made).toMatchObject({ by: 'makehuman', base: pack.manifest.base })
    // A different shape: the same vertices, somewhere else.
    expect(heavy.positions.length).toBe(maker.first.positions.length)
    expect(heavy.positions).not.toEqual(maker.first.positions)
  })
})

describe('a file\'s eyes', () => {
  // An octahedron of radius r at c: front pole (+Z) first.
  const ball = (c: number[], r: number) => {
    const p = [[0, 0, 1], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [0, 0, -1]]
    const positions = p.flatMap((v) => v.map((x, k) => c[k] + x * r))
    const indices = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4]
    return { positions, indices }
  }

  test('objects named as eyes are eyes; brows and lashes are not', () => {
    for (const n of ['GEO-body_male_realistic.eye.L', 'male_v008Eyes', 'Eyeball_R', 'eyes']) expect(isEyeName(n)).toBe(true)
    for (const n of ['eyebrow001', 'Eyelashes', 'body', 'GEO-body_male_realistic', 'Monkey']) expect(isEyeName(n)).toBe(false)
  })

  test('eye triangles split by side, left (+X) first', () => {
    const l = ball([0.03, 1.57, 0.12], 0.012)
    const r = ball([-0.03, 1.57, 0.12], 0.012)
    const eyes = splitEyes([...r.positions, ...l.positions], [...r.indices, ...l.indices.map((i) => i + 6)])
    expect(eyes.length).toBe(2)
    expect(eyeCentre(eyes[0]).centre.x).toBeCloseTo(0.03)
    expect(eyeCentre(eyes[1]).centre.x).toBeCloseTo(-0.03)
    expect(eyeCentre(eyes[0]).radius).toBeCloseTo(0.012)
  })

  test('the front of an eye is the iris centre, and the iris is ~29° round it', () => {
    const b = ball([0.03, 1.57, 0.12], 0.012)
    const eye = { positions: Float32Array.from(b.positions), indices: Uint32Array.from(b.indices) }
    const at = { u: 0.7, v: 0.7 }
    const uv = eyeUvs(eye, { at, iris: 0.1 }, { irisDeg: 30 })
    // Front pole: the iris centre.
    expect(uv[0]).toBeCloseTo(0.7)
    expect(uv[1]).toBeCloseTo(0.7)
    // A side point (90°) would be three iris radii out: held at the back ring (2.5).
    expect(Math.hypot(uv[2] - 0.7, uv[3] - 0.7)).toBeCloseTo(0.25)
    // The upper point is above the centre in the texture.
    expect(uv[5]).toBeGreaterThan(0.7)
  })
})
