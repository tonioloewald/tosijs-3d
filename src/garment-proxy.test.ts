import { describe, expect, test } from 'bun:test'
import { readGarment, writeGarmentGlb, type GarmentMeta } from './garment-file.js'
import {
  garmentLook,
  garmentMadeOn,
  garmentProxy,
  lookGltf,
} from './garment-proxy.js'
import { fitProxy } from './proxy-fit.js'
import { DEFAULT_HUMAN_BODY } from './human-morph.js'

const meta: GarmentMeta = {
  format: 'tosijs-garment',
  version: 1,
  base: 'hm08',
  body: { weight: 0.75 },
  name: 'smock',
  slot: 'outfit',
}
const garment = {
  positions: Float32Array.from([0, 0, 0.02, 1, 0, 0.02, 0, 1, 0.02, 1, 1, 0.02]),
  triangles: Uint32Array.from([0, 1, 2, 2, 1, 3]),
  uvs: Float32Array.from([0, 0, 1, 0, 0, 1, 1, 1]),
}
const body = {
  positions: Float32Array.from([0, 0, 0, 2, 0, 0, 0, 2, 0]),
  triangles: Uint32Array.from([0, 1, 2]),
}

describe('garment proxy', () => {
  test('a file bound to its body is a proxy that follows the body', () => {
    const p = garmentProxy(readGarment(writeGarmentGlb({ garment, meta })), body)
    expect([p.name, p.slot, p.category]).toEqual(['smock', 'outfit', 'clothes'])
    expect(Array.from(p.triangles)).toEqual(Array.from(garment.triangles))
    expect(p.delete).toBeNull()
    const moved = body.positions.map((x, i) => (i % 3 === 2 ? x + 1 : x))
    const fitted = fitProxy(p, moved)
    expect(fitted[2]).toBeCloseTo(1.02, 4)
  })

  test('its material is data: pictures as bytes, two-sided for a skirt', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1])
    const material = {
      baseColorTexture: { bytes: png, mimeType: 'image/png' },
      roughness: 0.8,
      metallic: 0,
      alphaMode: 'OPAQUE' as const,
      doubleSided: false,
    }
    const skirt = { ...meta, cut: { shapes: [], thickness: 0.005, skirt: true } }
    const p = garmentProxy(
      readGarment(writeGarmentGlb({ garment, meta: skirt as GarmentMeta, material })),
      body
    )
    expect(Array.from(p.material.baseColorTexture!.bytes)).toEqual(Array.from(png))
    expect(p.material.twoSided).toBe(true)
    expect(p.material.roughness).toBeCloseTo(0.8, 5)
  })

  test("the look it was saved with, and that look's glTF reading", () => {
    const material = {
      type: 'cloth',
      inputs: { albedo: '#ff0000', roughness: 0.6, sheen: 0.5, recolour: 1 },
    }
    expect(garmentLook({ ...meta, look: { material } } as GarmentMeta)).toEqual(
      material
    )
    // An older file's look is read as a cloth recipe.
    expect(garmentLook({ ...meta, look: { colour: '#00ff00' } })!.type).toBe('cloth')
    expect(garmentLook(meta)).toBeNull()
    const plain = lookGltf(material, false)
    expect(plain.baseColorFactor).toEqual([1, 0, 0, 1])
    expect(plain.roughnessFactor).toBeCloseTo(0.6, 5)
    expect(plain.sheenColorFactor![0]).toBeCloseTo(0.5, 5)
    // On a garment with its own picture a recolour has no factor reading.
    expect(lookGltf(material, true).baseColorFactor).toBeUndefined()
  })

  test('the body it was made on: MakeHuman sliders, or none for a mesh', () => {
    expect(garmentMadeOn(meta)).toEqual({ ...DEFAULT_HUMAN_BODY, weight: 0.75 })
    expect(garmentMadeOn({ ...meta, source: 'eurasian-male' })).toBeNull()
    expect(garmentMadeOn({ ...meta, body: undefined })).toBeNull()
  })
})
