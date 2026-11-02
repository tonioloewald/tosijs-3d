import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  accessorBytes,
  accessorValues,
  BinBuilder,
  GLB_MAGIC,
  readGlb,
  readVec3,
  writeGlb,
} from './glb-chunks.js'
import { type SkinnedGlb, writeSkinnedGlb } from './skinned-glb.js'

const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

/** A GLB from raw chunks, in the order given, no checks: for files no writer makes. */
function rawGlb(chunks: Array<[number, Uint8Array]>): Uint8Array {
  const total = 12 + chunks.reduce((n, [, b]) => n + 8 + b.byteLength, 0)
  const out = new Uint8Array(total)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, GLB_MAGIC, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  let at = 12
  for (const [type, body] of chunks) {
    dv.setUint32(at, body.byteLength, true)
    dv.setUint32(at + 4, type, true)
    out.set(body, at + 8)
    at += 8 + body.byteLength
  }
  return out
}

const text = (json: unknown): Uint8Array => {
  let s = JSON.stringify(json)
  while (s.length % 4) s += ' '
  return new TextEncoder().encode(s)
}

const f32 = (a: number[]): Uint8Array =>
  new Uint8Array(Float32Array.from(a).buffer)

describe('one GLB container module', () => {
  test('the GLB magic is spelled out only where it already was', async () => {
    // Every new reader and writer comes through here; a second copy of the
    // container code is how Dramatis's gate came to check exports with a
    // reader the exporter did not use. garment-file and glb-manifest predate
    // this module and still carry their own (to fold in: board #3736); the
    // list may shrink, never grow. (Built, so this file does not match itself.)
    const magic = new RegExp(['0x', '46546c67'].join(''), 'i')
    const root = join(import.meta.dir, '..')
    const hits: string[] = []
    for (const dir of ['src', 'bin'])
      for await (const f of new Bun.Glob('**/*.{ts,js,mjs}').scan({
        cwd: join(root, dir),
      }))
        if (magic.test(await Bun.file(join(root, dir, f)).text()))
          hits.push(`${dir}/${f}`)
    expect(hits.sort()).toEqual([
      'src/garment-file.test.ts',
      'src/garment-file.ts',
      'src/glb-chunks.ts',
      'src/glb-manifest.test.ts',
      'src/glb-manifest.ts',
    ])
  })
})

describe('readGlb', () => {
  test('the first JSON chunk wins over a later one', () => {
    const bytes = rawGlb([
      [JSON_CHUNK, text({ asset: { version: '2.0' }, which: 'first' })],
      [BIN_CHUNK, new Uint8Array([1, 2, 3, 4])],
      [JSON_CHUNK, text({ asset: { version: '2.0' }, which: 'second' })],
    ])
    const g = readGlb(bytes)
    expect(g.json.which).toBe('first')
    expect(Array.from(g.bin!)).toEqual([1, 2, 3, 4])
  })

  test('the first BIN chunk wins too', () => {
    const g = readGlb(
      rawGlb([
        [JSON_CHUNK, text({})],
        [BIN_CHUNK, new Uint8Array([1, 1, 1, 1])],
        [BIN_CHUNK, new Uint8Array([2, 2, 2, 2])],
      ])
    )
    expect(Array.from(g.bin!)).toEqual([1, 1, 1, 1])
  })

  test('under 12 bytes is a clean "not a GLB", not a RangeError', () => {
    for (const n of [0, 3, 11]) {
      const bytes = new Uint8Array(n)
      if (n >= 4) new DataView(bytes.buffer).setUint32(0, GLB_MAGIC, true)
      expect(() => readGlb(bytes)).toThrow(/^not a GLB: \d+ bytes/)
    }
  })

  test('bad magic, a glTF 1.0 binary and no JSON chunk throw', () => {
    const good = writeGlb({ asset: { version: '2.0' } }, null)
    const bad = good.slice()
    bad[0] = 0
    expect(() => readGlb(bad)).toThrow('not a GLB (bad magic)')
    const v1 = good.slice()
    new DataView(v1.buffer).setUint32(4, 1, true)
    expect(() => readGlb(v1)).toThrow('not a glTF 2.0 GLB (version 1)')
    expect(() => readGlb(rawGlb([[BIN_CHUNK, new Uint8Array(4)]]))).toThrow(
      'no JSON chunk'
    )
  })

  test('a short read throws "truncated", it does not return part of a chunk', () => {
    const whole = writeGlb({ asset: { version: '2.0' } }, new Uint8Array(64))
    expect(() => readGlb(whole.subarray(0, whole.byteLength - 1))).toThrow(
      'truncated GLB: the header says'
    )
    // The header's length agrees with the file but a chunk overruns it.
    const lying = whole.slice()
    new DataView(lying.buffer).setUint32(12, 4096, true)
    expect(() => readGlb(lying)).toThrow(/runs \d+ bytes past the end/)
  })

  test('the binary chunk is optional', () => {
    const g = readGlb(writeGlb({ a: 1 }, null))
    expect(g.json).toEqual({ a: 1 })
    expect(g.bin).toBeNull()
  })
})

describe('writeGlb', () => {
  test('an empty binary chunk is left out, as a null one is', () => {
    const none = writeGlb({ a: 1 }, null)
    const empty = writeGlb({ a: 1 }, new Uint8Array(0))
    expect(Buffer.from(empty).equals(Buffer.from(none))).toBe(true)
    // Header + JSON chunk header + '{"a":1}' padded to 8: no BIN chunk header.
    expect(empty.byteLength).toBe(12 + 8 + 8)
    expect(readGlb(empty).bin).toBeNull()
  })

  test('pads the JSON with spaces and the binary with zeros; round-trips', () => {
    const bytes = writeGlb({ a: 1 }, new Uint8Array([9, 9, 9]))
    expect(bytes.byteLength % 4).toBe(0)
    expect(new DataView(bytes.buffer).getUint32(8, true)).toBe(bytes.byteLength)
    expect(new TextDecoder().decode(bytes.subarray(20, 28))).toBe('{"a":1} ')
    const g = readGlb(bytes)
    expect(Array.from(g.bin!)).toEqual([9, 9, 9, 0])
  })
})

describe('accessors', () => {
  /** Positions of 4 vertices and a sparse target moving vertices 1 and 3. */
  function sparseGlb(dense: boolean) {
    const bin = new BinBuilder()
    const base = bin.add(f32([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]))
    const indices = bin.add(new Uint8Array(Uint16Array.from([1, 3]).buffer))
    const values = bin.add(f32([0, 0.5, 0, 0, 0, -0.25]))
    const json = {
      asset: { version: '2.0' },
      accessors: [
        { bufferView: base, componentType: 5126, count: 4, type: 'VEC3' },
        {
          ...(dense ? { bufferView: base } : {}),
          componentType: 5126,
          count: 4,
          type: 'VEC3',
          sparse: {
            count: 2,
            indices: { bufferView: indices, componentType: 5123 },
            values: { bufferView: values },
          },
        },
      ],
      bufferViews: bin.views,
      buffers: [{ byteLength: bin.bytes().byteLength }],
    }
    return readGlb(writeGlb(json, bin.bytes()))
  }

  test('a sparse morph accessor with no bufferView: zeros, then the substitutions', () => {
    const g = sparseGlb(false)
    expect(Array.from(readVec3(g, 1))).toEqual([
      0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, -0.25,
    ])
  })

  test('a sparse accessor over a bufferView substitutes into its values', () => {
    const g = sparseGlb(true)
    expect(Array.from(readVec3(g, 1))).toEqual([
      0, 0, 0, 0, 0.5, 0, 1, 1, 0, 0, 0, -0.25,
    ])
    expect(Array.from(accessorValues(g, 0))).toEqual([
      0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
    ])
  })

  test('the exporter’s own sparse morph targets read back', () => {
    const positions = Float32Array.from([0, 0, 0, 1, 0, 0, 1, 1, 0])
    const scene: SkinnedGlb = {
      asset: { generator: 'test' },
      joints: [
        {
          name: 'root',
          parent: -1,
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
        },
      ],
      skinName: 'skeleton',
      skeletonRoot: 0,
      inverseBindMatrices: Float32Array.from([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]),
      meshes: [
        {
          name: 'tri',
          targetNames: ['JawDrop'],
          primitives: [
            {
              positions,
              normals: Float32Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1]),
              joints: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              weights: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
              indices: [0, 1, 2],
              material: 0,
              targets: [
                {
                  positions: Float32Array.from([0, 0, 0, 0, 0, 0, 0, -0.5, 0]),
                },
              ],
            },
          ],
        },
      ],
      materials: [
        {
          name: 'flat',
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
          alphaMode: 'OPAQUE',
          doubleSided: false,
        },
      ],
      images: [],
    }
    const g = readGlb(writeSkinnedGlb(scene))
    const prim = g.json.meshes[0].primitives[0]
    expect(g.json.accessors[prim.targets[0].POSITION].sparse).toBeDefined()
    expect(Array.from(readVec3(g, prim.targets[0].POSITION))).toEqual([
      0, 0, 0, 0, 0, 0, 0, -0.5, 0,
    ])
    expect(Array.from(readVec3(g, prim.attributes.POSITION))).toEqual(
      Array.from(positions)
    )
  })

  test('a strided view is de-interleaved', () => {
    // Two VEC2 floats per 16-byte element (the other 8 bytes another attribute's).
    const interleaved = f32([1, 2, 9, 9, 3, 4, 9, 9])
    const json = {
      accessors: [
        { bufferView: 0, componentType: 5126, count: 2, type: 'VEC2' },
      ],
      bufferViews: [{ buffer: 0, byteLength: 32, byteStride: 16 }],
    }
    const g = readGlb(writeGlb(json, interleaved))
    expect(Array.from(accessorValues(g, 0))).toEqual([1, 2, 3, 4])
    expect(accessorBytes(g, 0).byteLength).toBe(16)
  })

  test('a read past its bufferView throws instead of reading the neighbour', () => {
    const json = {
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      ],
      bufferViews: [{ buffer: 0, byteLength: 24 }],
    }
    const g = readGlb(writeGlb(json, new Uint8Array(64)))
    expect(() => accessorBytes(g, 0)).toThrow('runs past bufferView 0')
  })
})
