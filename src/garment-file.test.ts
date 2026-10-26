import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { bindGarment, closestOnTriangle } from './garment-bind.js'
import {
  garmentRigidity,
  readGarment,
  writeGarmentGlb,
  writeGarmentObj,
  type GarmentMeta,
} from './garment-file.js'
import { cutGarment } from './garment-cut.js'
import { drawnPositions, fitProxy } from './proxy-fit.js'
import { similarityFit, type MeshPart } from './proxy-rigid.js'
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
    // Smooth normals, though none were given: without them a glTF is flat
    // shaded and Blender splits every face.
    expect(Array.from(back.garment.normals!.subarray(0, 3))).toEqual([0, 0, 1])
    // The body is marked as a helper for the modeller.
    const glb = writeGarmentGlb({ garment, body, meta })
    const len = new DataView(glb.buffer).getUint32(12, true)
    const json = JSON.parse(
      new TextDecoder().decode(glb.subarray(20, 20 + len))
    )
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

  test('parts come back with their rigidity, and a per-vertex dial', () => {
    const two = {
      positions: Float32Array.from([
        ...garment.positions,
        ...garment.positions.map((v, i) => (i % 3 === 2 ? v + 1 : v)),
      ]),
      triangles: Uint32Array.from([
        ...garment.triangles,
        ...garment.triangles.map((v) => v + 4),
      ]),
      parts: [
        { name: 'cloth', first: 0, count: 4 },
        { name: 'plate', first: 4, count: 4, rigid: 'helmet' },
      ] as MeshPart[],
    }
    const back = readGarment(writeGarmentGlb({ garment: two, body, meta }))
    expect(
      back.garment.parts!.map((p) => [
        p.name,
        p.first,
        p.count,
        p.rigid ?? null,
      ])
    ).toEqual([
      ['cloth', 0, 4, null],
      ['plate', 4, 4, 'helmet'],
    ])
    const r = garmentRigidity(back.garment)!
    expect(Array.from(r.group)).toEqual([-1, -1, -1, -1, 0, 0, 0, 0])
    // A dial per vertex, written as _RIGID.
    const dialled = readGarment(
      writeGarmentGlb({
        garment: {
          ...garment,
          rigid: Float32Array.from([0, 0.5, 1, 1]),
          parts: [{ name: 'g', first: 0, count: 4 }],
        },
        meta,
      })
    )
    expect(Array.from(dialled.garment.rigid!)).toEqual([0, 0.5, 1, 1])
    // An OBJ says it with the name.
    const obj = readGarment(
      writeGarmentObj({
        garment: {
          ...two,
          parts: [two.parts[0], { ...two.parts[1], rigid: true }],
        },
        meta,
      })
    )
    expect(obj.garment.parts!.map((p) => p.rigid ?? null)).toEqual([null, true])
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

/** A box: 8 corners, 12 triangles, outward. */
function box(c: number[], size: number[]) {
  const positions: number[] = []
  for (let i = 0; i < 8; i++)
    positions.push(
      c[0] + (i & 1 ? 0.5 : -0.5) * size[0],
      c[1] + (i & 2 ? 0.5 : -0.5) * size[1],
      c[2] + (i & 4 ? 0.5 : -0.5) * size[2]
    )
  const triangles = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0,
    4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
  ]
  return { positions, triangles }
}

/** How far a set of points is from its rest shape, once moved and sized to fit. */
function shapeError(
  rest: ArrayLike<number>,
  now: ArrayLike<number>,
  rows: number[]
) {
  const place = similarityFit(
    rest,
    now,
    rows,
    new Float32Array(rest.length / 3).fill(1)
  )
  let worst = 0
  for (const r of rows) {
    const q = place([rest[r * 3], rest[r * 3 + 1], rest[r * 3 + 2]])
    worst = Math.max(
      worst,
      Math.hypot(
        q[0] - now[r * 3],
        q[1] - now[r * 3 + 1],
        q[2] - now[r * 3 + 2]
      )
    )
  }
  return worst
}

describe.skipIf(!existsSync(PACK))('hm08: geometry added in an editor', () => {
  test('a pocket follows the cloth; a knee pad marked rigid keeps its shape', async () => {
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
    // The front of the left knee and of the left thigh.
    const front = (y0: number, y1: number) => {
      let best = [0, 0, -Infinity]
      for (let i = 0; i < worn.length; i += 3)
        if (
          worn[i] > 0.06 &&
          worn[i] < 0.14 &&
          worn[i + 1] > y0 &&
          worn[i + 1] < y1 &&
          worn[i + 2] > best[2]
        )
          best = [worn[i], worn[i + 1], worn[i + 2]]
      return best
    }
    const knee = front(-0.42, -0.32)
    const thigh = front(-0.2, -0.1)
    const pad = box([knee[0], knee[1], knee[2] + 0.012], [0.09, 0.11, 0.02])
    const pocket = box(
      [thigh[0], thigh[1], thigh[2] + 0.004],
      [0.1, 0.12, 0.006]
    )
    const n = worn.length / 3
    const garment = {
      positions: Float32Array.from([
        ...worn,
        ...pocket.positions,
        ...pad.positions,
      ]),
      triangles: Uint32Array.from([
        ...cut.triangles,
        ...pocket.triangles.map((v) => v + n),
        ...pad.triangles.map((v) => v + n + 8),
      ]),
      parts: [
        { name: 'trousers', first: 0, count: n + 8 },
        { name: 'knee-pad', first: n + 8, count: 8, rigid: true },
      ] as MeshPart[],
    }
    const back = readGarment(writeGarmentGlb({ garment, meta }))
    const flexible = bindGarment(made, pack.triangles, back.garment.positions)
    const rigid = bindGarment(
      made,
      pack.triangles,
      back.garment.positions,
      garmentRigidity(back.garment)
    )
    const heavy = await morphHuman(
      pack,
      macroWeights({ ...DEFAULT_HUMAN_BODY, weight: 1, muscle: 1 }, has)
    )
    const pocketRows = Array.from({ length: 8 }, (_, i) => n + i)
    const padRows = Array.from({ length: 8 }, (_, i) => n + 8 + i)
    const flex = fitProxy(flexible, heavy)
    const hard = fitProxy(rigid, heavy)
    const padFlex = shapeError(back.garment.positions, flex, padRows)
    const padHard = shapeError(back.garment.positions, hard, padRows)
    const pocketFlex = shapeError(back.garment.positions, flex, pocketRows)
    console.log(
      `knee pad bent by ${(padFlex * 1000).toFixed(1)} mm flexible, ${(
        padHard * 1000
      ).toFixed(2)} mm rigid; pocket by ${(pocketFlex * 1000).toFixed(1)} mm`
    )
    expect(padHard).toBeLessThan(0.0005)
    expect(padFlex).toBeGreaterThan(padHard * 5)
    // The pocket goes with the cloth: still on the trousers.
    expect(Array.from(hard.subarray(0, n * 3))).toEqual(
      Array.from(flex.subarray(0, n * 3))
    )
    // The rigid pad sits where the flexible one would have, on average.
    let shift = 0
    for (const r of padRows)
      shift += Math.hypot(
        hard[r * 3] - flex[r * 3],
        hard[r * 3 + 1] - flex[r * 3 + 1],
        hard[r * 3 + 2] - flex[r * 3 + 2]
      )
    expect(shift / 8).toBeLessThan(Math.max(padFlex, 0.002))
  })
})
