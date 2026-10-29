import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { bindGarment, closestOnTriangle } from './garment-bind.js'
import {
  garmentRigidity,
  metaFromName,
  readGarment,
  referenceName,
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
    expect(json.nodes[1].name).toBe('body-reference_hm08_p15')
    expect(json.nodes[1].extras.helper).toBe(true)
  })

  test('the material comes back with its maps, as Blender would export it', () => {
    const png = (n: number) => ({
      bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, n]),
      mimeType: 'image/png',
    })
    const material = {
      name: 'denim',
      baseColor: [0.5, 0.4, 0.3, 1] as [number, number, number, number],
      baseColorTexture: png(1),
      normalTexture: png(2),
      normalScale: 0.7,
      metallicRoughnessTexture: { ...png(3), mimeType: 'image/jpeg' },
      roughness: 0.8,
      metallic: 0,
      alphaMode: 'MASK' as const,
      alphaCutoff: 0.3,
      doubleSided: true,
    }
    const back = readGarment(writeGarmentGlb({ garment, body, meta, material }))
    expect(back.materialCount).toBe(1)
    const m = back.material!
    expect(Array.from(m.baseColorTexture!.bytes)).toEqual([
      0x89, 0x50, 0x4e, 0x47, 1,
    ])
    expect(Array.from(m.normalTexture!.bytes).at(-1)).toBe(2)
    expect(m.metallicRoughnessTexture!.mimeType).toBe('image/jpeg')
    const {
      baseColorTexture: _bc,
      normalTexture: _nt,
      metallicRoughnessTexture: _mr,
      ...rest
    } = m
    const {
      baseColorTexture: _b,
      normalTexture: _n,
      metallicRoughnessTexture: _r,
      ...want
    } = material
    expect(rest).toEqual(want)
    // The geometry is unharmed by the images in the same buffer.
    expect(Array.from(back.garment.uvs!)).toEqual(Array.from(garment.uvs))
    // Without one: the plain colour, opaque, one-sided.
    const plain = readGarment(writeGarmentGlb({ garment, meta })).material!
    expect(plain.baseColorTexture).toBeNull()
    expect(plain.alphaMode).toBe('OPAQUE')
    expect(plain.doubleSided).toBe(false)
    // An OBJ carries none.
    expect(
      readGarment(writeGarmentObj({ garment, meta })).material
    ).toBeUndefined()
  })

  test('the body alone: what is modelled beside it comes back with its metadata', () => {
    const glb = writeGarmentGlb({ body, meta })
    expect(() => readGarment(glb)).toThrow(/only the body/)
    // One node, the helper, and it carries the metadata: an editor that drops
    // the scene's extras still keeps an object's.
    const len = new DataView(glb.buffer).getUint32(12, true)
    const json = JSON.parse(
      new TextDecoder().decode(glb.subarray(20, 20 + len))
    )
    expect(json.nodes.length).toBe(1)
    expect(json.nodes[0].extras.helper).toBe(true)
    expect(json.nodes[0].extras.tosijs.body).toEqual(meta.body)
    expect(writeGarmentObj({ body, meta })).toContain('o body-reference')
  })

  test('the helper NAME carries the body, for an OBJ through Blender', () => {
    const shaped = { ...meta, body: { weight: 0.72, muscle: 1, age: 0.5 } }
    const name = referenceName(shaped)
    // Only what is not the default.
    expect(name).toBe('body-reference_hm08_p15_weight72_muscle100')
    // Blender appends .001 to a duplicate.
    const back = metaFromName(name + '.001')!
    expect(back.base).toBe('hm08')
    expect(back.pack).toBe(15)
    expect(back.body!.weight).toBe(0.72)
    expect(back.body!.muscle).toBe(1)
    expect(back.body!.age).toBe(0.5)
    expect(metaFromName('Cube')).toBeNull()
    // A mesh's body: no base, no sliders (it is worn on the body shown).
    const mesh = referenceName({ format: 'tosijs-garment', version: 1, source: 'weasel.glb' })
    expect(mesh).toBe('body-reference_mesh')
    expect(metaFromName(mesh)).toEqual({ format: 'tosijs-garment', version: 1 })
    // An OBJ whose comment was dropped still says which body it was.
    const obj = writeGarmentObj({ garment, body, meta: shaped })
      .split('\n')
      .filter((l) => !l.startsWith('#'))
      .join('\n')
    expect(readGarment(obj).meta!.body!.weight).toBe(0.72)
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

  test('an OBJ written by hand or by a quick script reads as it would anywhere', () => {
    // OBJ is the escape hatch for shapes made by your own code, so the
    // reader takes what such code writes, mess included.
    const messy = [
      '# written by hand',
      'o crown_rigid\r',
      'v 0 1.7 0  1 0 0', // a colour after the position
      'v   0.1 1.7 0',
      'v 0.1 1.8 0',
      'v 0 1.8 0',
      'vn 0 0 1',
      'f 1//1 2//1 3//1 4//1', // a quad, normals and no UVs
      'g strap', // a group, not an object
      'v 0 1.6 0',
      'v 0.1 1.6 0',
      'v 0.1 1.65 0',
      'f -3 -2 -1', // counted back from the end
      's off',
      'usemtl gold',
    ].join('\n')
    const { garment: g, meta } = readGarment(messy)
    expect(meta).toBeNull()
    expect(g.positions.length / 3).toBe(7)
    expect(g.triangles.length / 3).toBe(3)
    expect(g.parts!.map((p) => [p.name, p.count, p.rigid])).toEqual([
      ['crown_rigid', 4, true],
      ['strap', 3, null],
    ])
    // The colour after the position is not taken for a coordinate.
    expect(g.positions[1]).toBeCloseTo(1.7, 6)
    expect(g.positions[3]).toBeCloseTo(0.1, 6)
    // The strap's triangle is its own three vertices.
    expect(Array.from(g.triangles.subarray(6))).toEqual([4, 5, 6])
    expect(g.uvs).toBeNull()
  })

  test('a broken OBJ fails with the line and what is wrong, never NaN', () => {
    const fails = (text: string, why: RegExp) =>
      expect(() => readGarment(text)).toThrow(why)
    const tri = 'v 0 0 0\nv 1 0 0\nv 0 1 0\n'
    fails(tri + 'f 1 2 4', /line 4: a face uses vertex 4, but the file has 3/)
    fails(tri + 'f 0 1 2', /line 4: corner "0": vertex "0" is not an index/)
    fails(tri + 'f 1 2 x', /line 4: corner "x"/)
    fails(
      tri + 'f -1 -2 -4',
      /line 4: corner "-4": vertex -4 counts back past the first \(3 so far\)/
    )
    fails(tri + 'f 1 2', /line 4: a face needs at least 3 corners, got 2/)
    fails('v 0 zero 0\nf 1 1 1', /line 1: "v" needs 3 numbers, got "0 zero 0"/)
    fails('v 0 0\n', /line 1: "v" needs 3 numbers/)
    fails(
      tri + 'vt 0 0\nf 1/1 2/2 3/1',
      /a face uses texture coordinate 2, but the file has 1/
    )
    fails('# empty\n', /no faces in the OBJ/)
    fails('o body-reference\n' + tri + 'f 1 2 3', /only the body/)
    // Not an OBJ at all.
    fails('{"asset": {"version": "2.0"}}', /\.gltf \(JSON\).*\.glb/)
    expect(() =>
      readGarment(Uint8Array.from([0x4b, 0x61, 0x79, 0, 0, 1, 2]))
    ).toThrow(/not a GLB or an OBJ/)
    // Faces may come before the vertices they use.
    expect(readGarment('f 1 2 3\n' + tri).garment.triangles.length).toBe(3)
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
