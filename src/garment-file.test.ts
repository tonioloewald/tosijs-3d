import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { bindGarment, closestOnTriangle } from './garment-bind.js'
import {
  readGarment,
  writeGarmentGlb,
  writeGarmentObj,
  type GarmentMeta,
} from './garment-file.js'
import { cutGarment } from './garment-cut.js'
import { drawnPositions, fitProxy } from './proxy-fit.js'
import { loadHumanPack } from './human-pack.js'
import { DEFAULT_HUMAN_BODY, macroWeights, morphHuman } from './human-morph.js'

const meta: GarmentMeta = {
  format: 'tosijs-garment',
  version: 1,
  base: 'hm08',
  pack: 15,
  body: { weight: 0.5 },
  name: 'test',
  slot: 'top',
}

describe('garment-bind', () => {
  test('the closest point on a triangle', () => {
    const a = [0, 0, 0]
    const b = [1, 0, 0]
    const c = [0, 1, 0]
    expect(closestOnTriangle([0.25, 0.25, 1], a, b, c)).toEqual([
      0.5, 0.25, 0.25,
    ])
    expect(closestOnTriangle([-1, -1, 0], a, b, c)).toEqual([1, 0, 0])
    const edge = closestOnTriangle([0.5, -1, 0], a, b, c)
    expect(edge[0]).toBeCloseTo(0.5)
    expect(edge[1]).toBeCloseTo(0.5)
  })

  test('a point off the skin keeps its offset and follows the skin', () => {
    const body = [0, 0, 0, 1, 0, 0, 0, 1, 0]
    const b = bindGarment(body, [0, 1, 2], [0.25, 0.25, 0.02])
    expect(Array.from(fitProxy(b, body)).map((x) => +x.toFixed(5))).toEqual([
      0.25, 0.25, 0.02,
    ])
    // The body moves up: the point goes with it.
    const moved = body.map((x, i) => (i % 3 === 1 ? x + 1 : x))
    expect(fitProxy(b, moved)[1]).toBeCloseTo(1.25, 5)
  })
})

describe('garment-file', () => {
  const garment = {
    positions: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
    triangles: Uint32Array.from([0, 1, 2, 2, 1, 3]),
    uvs: Float32Array.from([0, 0, 1, 0, 0, 1, 1, 1]),
  }
  const body = {
    positions: Float32Array.from([0, 0, -1, 1, 0, -1, 0, 1, -1]),
    triangles: Uint32Array.from([0, 1, 2]),
  }

  test('a GLB comes back as it went: the garment, its UVs and the metadata, without the body', () => {
    const back = readGarment(writeGarmentGlb({ garment, body, meta }))
    expect(Array.from(back.garment.positions)).toEqual(
      Array.from(garment.positions)
    )
    expect(Array.from(back.garment.triangles)).toEqual(
      Array.from(garment.triangles)
    )
    expect(Array.from(back.garment.uvs!)).toEqual(Array.from(garment.uvs))
    expect(back.meta).toEqual(meta)
    // The body is marked as a helper for the modeller.
    const glb = writeGarmentGlb({ garment, body, meta })
    const len = new DataView(glb.buffer).getUint32(12, true)
    const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + len)))
    expect(json.nodes[1].name).toBe('body-reference')
    expect(json.nodes[1].extras.helper).toBe(true)
  })

  test('a node transform an editor added is applied', () => {
    const bytes = writeGarmentGlb({ garment, meta })
    // Move the garment node 2 m up, as an editor would on re-export.
    const dv = new DataView(bytes.buffer)
    const len = dv.getUint32(12, true)
    const json = JSON.parse(
      new TextDecoder().decode(bytes.subarray(20, 20 + len))
    )
    json.nodes[0].translation = [0, 2, 0]
    const text = new TextEncoder().encode(JSON.stringify(json))
    // Rebuild the GLB around the new JSON.
    const pad = (4 - (text.length % 4)) % 4
    const jsonLen = text.length + pad
    const total = 12 + 8 + jsonLen + (bytes.length - 20 - len)
    const glb = new Uint8Array(total)
    const g = new DataView(glb.buffer)
    g.setUint32(0, 0x46546c67, true)
    g.setUint32(4, 2, true)
    g.setUint32(8, total, true)
    g.setUint32(12, jsonLen, true)
    g.setUint32(16, 0x4e4f534a, true)
    glb.set(text, 20)
    glb.fill(0x20, 20 + text.length, 20 + jsonLen)
    glb.set(bytes.subarray(20 + len), 20 + jsonLen)
    const back = readGarment(glb)
    expect(back.garment.positions[1]).toBeCloseTo(2)
    expect(back.garment.positions[10]).toBeCloseTo(3)
  })

  test('an OBJ comes back too, metadata in its comment', () => {
    const back = readGarment(writeGarmentObj({ garment, body, meta }))
    expect(back.garment.triangles.length).toBe(6)
    expect(back.garment.positions.length).toBe(12)
    expect(back.meta).toEqual(meta)
  })
})

const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe.skipIf(!existsSync(PACK))('hm08: out and back in', () => {
  test('trousers exported, read back and rebound fit a heavy body as the cut did', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const has = (n: string) => pack.has(n)
    const made = await morphHuman(pack, macroWeights(DEFAULT_HUMAN_BODY, has))
    const cut = cutGarment(made, pack.triangles, {
      front: [
        [
          [-0.3, -0.7],
          [0.3, -0.7],
          [0.3, 0.15],
          [-0.3, 0.15],
        ],
      ],
    })
    const worn = drawnPositions(cut, fitProxy(cut, made))
    const file = writeGarmentGlb({
      garment: { positions: worn, triangles: cut.triangles, uvs: cut.uvs },
      body: { positions: made, triangles: pack.triangles },
      meta,
    })
    const back = readGarment(file)
    const rebound = bindGarment(made, pack.triangles, back.garment.positions)
    const heavy = await morphHuman(
      pack,
      macroWeights({ ...DEFAULT_HUMAN_BODY, weight: 1, muscle: 0.2 }, has)
    )
    const a = drawnPositions(cut, fitProxy(cut, heavy))
    const b = fitProxy(rebound, heavy)
    let sum = 0
    let worst = 0
    for (let i = 0; i < a.length; i += 3) {
      const d = Math.hypot(
        a[i] - b[i],
        a[i + 1] - b[i + 1],
        a[i + 2] - b[i + 2]
      )
      sum += d
      worst = Math.max(worst, d)
    }
    // Within a few millimetres on average: the rebinding is the binding.
    expect(sum / (a.length / 3)).toBeLessThan(0.003)
    expect(worst).toBeLessThan(0.03)
  })
})
