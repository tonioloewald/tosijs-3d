import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import {
  readGarment,
  writeGarmentGlb,
  type GarmentMeta,
} from './garment-file.js'
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
  positions: Float32Array.from([
    0, 0, 0.02, 1, 0, 0.02, 0, 1, 0.02, 1, 1, 0.02,
  ]),
  triangles: Uint32Array.from([0, 1, 2, 2, 1, 3]),
  uvs: Float32Array.from([0, 0, 1, 0, 0, 1, 1, 1]),
}
const body = {
  positions: Float32Array.from([0, 0, 0, 2, 0, 0, 0, 2, 0]),
  triangles: Uint32Array.from([0, 1, 2]),
}

describe('garment proxy', () => {
  test('a file bound to its body is a proxy that follows the body', () => {
    const p = garmentProxy(
      readGarment(writeGarmentGlb({ garment, meta })),
      body
    )
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
    const skirt = {
      ...meta,
      cut: { shapes: [], thickness: 0.005, skirt: true },
    }
    const p = garmentProxy(
      readGarment(
        writeGarmentGlb({ garment, meta: skirt as GarmentMeta, material })
      ),
      body
    )
    expect(Array.from(p.material.baseColorTexture!.bytes)).toEqual(
      Array.from(png)
    )
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
    expect(garmentLook({ ...meta, look: { colour: '#00ff00' } })!.type).toBe(
      'cloth'
    )
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

const PACK = new URL(
  '../../static-assets/assets/makehuman/hm08/hm08.json',
  import.meta.url
).pathname

describe('MakeHuman clothes out on the skin a body draws', () => {
  test.skipIf(!existsSync(PACK))(
    'a suit bound to the body proxy sits where it is drawn, its deletes on the skin, and goes out in the GLB',
    async () => {
      const { loadHumanPack } = await import('./human-pack.js')
      const { humanBodyMaker, bodyDetailProxy } = await import('./human-rig.js')
      const { drawnPositions } = await import('./proxy-fit.js')
      const { onSkin, packGarmentMaterial } = await import('./garment-proxy.js')
      const { riggedBodyGlb } = await import('./rigged-body-glb.js')
      const { readGlb } = await import('./glb-chunks.js')
      const { pngEncode } = await import('./png.js')
      const pack = await loadHumanPack(PACK, async (u) => {
        const b = readFileSync(u)
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
      })
      const proxyName = bodyDetailProxy('medium', 0.5)
      const skinProxy = proxyName ? await pack.proxy(proxyName) : null
      const maker = await humanBodyMaker(pack, {}, { proxy: skinProxy })
      const body = await maker.body({ weight: 0.8 })
      const suit = (await pack.proxy('male_casualsuit01'))!
      const drawn = drawnPositions(suit, fitProxy(suit, body.full))
      const bound = onSkin(suit, drawn, {
        positions: body.positions,
        triangles: body.indices,
        vertices: body.skin.vertices,
      })
      // Fitted on the skin, it is where it was drawn on the pack.
      const again = drawnPositions(bound, fitProxy(bound, body.positions))
      let worst = 0
      for (let i = 0; i < drawn.length; i++)
        worst = Math.max(worst, Math.abs(again[i] - drawn[i]))
      expect(worst).toBeLessThan(0.002)
      // What it deletes from the pack is deleted from the skin.
      if (suit.delete?.length) expect(bound.delete!.length).toBeGreaterThan(0)
      const grey = new Uint8Array(4 * 4 * 4).fill(150)
      const garment = {
        ...bound,
        slot: 'outfit',
        material: packGarmentMaterial(suit, {
          diffuse: { bytes: pngEncode(grey, 4, 4), mimeType: 'image/png' },
        }),
      }
      const { json } = readGlb(riggedBodyGlb(body, { garments: [garment] }))
      const mesh = json.meshes.find(
        (m: any) => m.name === 'outfit: male_casualsuit01'
      )
      expect(mesh).toBeDefined()
      expect(
        json.materials[mesh.primitives[0].material].pbrMetallicRoughness
          .baseColorTexture
      ).toBeDefined()
    },
    120000
  )
})
