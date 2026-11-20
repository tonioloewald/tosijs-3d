import { describe, expect, test } from 'bun:test'
import { readGlb, writeGlb } from './glb-chunks.js'
import { replaceGlbImages } from './glb-textures.js'

const glbWith = () => {
  const bin = new Uint8Array(16)
  bin.set([1, 2, 3, 4, 5, 6, 7, 8], 0) // geometry
  bin.set([9, 9, 9, 9, 9, 9], 8) // an image, 6 bytes
  return writeGlb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: 16 }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 8 },
        { buffer: 0, byteOffset: 8, byteLength: 6 },
      ],
      images: [{ bufferView: 1, mimeType: 'image/png' }],
    },
    bin
  )
}

describe('glb textures', () => {
  test('an image is replaced and the other views keep their bytes', async () => {
    const out = await replaceGlbImages(glbWith(), (img) => {
      expect([...img.bytes]).toEqual([9, 9, 9, 9, 9, 9])
      return { bytes: new Uint8Array([7, 7, 7]), mimeType: 'image/jpeg' }
    })
    const { json, bin } = readGlb(out)
    const v = json.bufferViews
    expect([...bin!.subarray(v[0].byteOffset, v[0].byteOffset + 8)]).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ])
    expect([
      ...bin!.subarray(v[1].byteOffset, v[1].byteOffset + v[1].byteLength),
    ]).toEqual([7, 7, 7])
    expect(json.images[0].mimeType).toBe('image/jpeg')
    expect(v[1].byteOffset % 4).toBe(0)
    expect(json.buffers[0].byteLength).toBe(bin!.byteLength)
  })

  test('kept images leave the file as it was', async () => {
    const before = glbWith()
    expect(await replaceGlbImages(before, () => null)).toBe(before)
  })
})
