import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bodyFromMarkers, type RiggedBody } from './rigged-body.js'
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
