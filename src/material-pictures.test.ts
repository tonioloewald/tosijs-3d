import { describe, expect, test } from 'bun:test'
import {
  addPicture,
  isPictureKey,
  pictureData,
  picturesIn,
  pictureUrl,
  registerPicture,
} from './material-pictures.js'

describe('material pictures', () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4])

  test('a picture is kept under a key from its bytes and name; the same picture twice is one key', async () => {
    const a = await addPicture(bytes, 'my print.png', 'image/png')
    const b = await addPicture(bytes.slice(), 'C:\\pics\\my print.png')
    expect(a).toBe(b)
    expect(isPictureKey(a)).toBe(true)
    expect(a).toMatch(/^picture:[0-9a-f]{12}\/my_print\.png$/)
    expect(pictureData(a)).toBe(btoa(String.fromCharCode(...bytes)))
    expect(pictureUrl(a)).toBeTruthy()
  })

  test('a URL passes through; a key this page does not have is null', () => {
    expect(pictureUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png')
    expect(pictureUrl('picture:000000000000/missing.png')).toBeNull()
  })

  test('picturesIn finds every key in a recipe or settings, once', () => {
    const key = 'picture:abcdef012345/cloth.jpg'
    const settings = {
      tailorLook: { type: 'cloth', inputs: { albedo: { image: key } } },
      surfaces: { body: { skin: { type: 'pbr', inputs: { albedo: { image: key } } } } },
      other: 'picture-ish but not a key',
    }
    expect(picturesIn(settings)).toEqual([key])
  })

  test('a carried picture is put back under its key', () => {
    const key = 'picture:0123456789ab/carried.png'
    registerPicture(key, 'AAAA')
    expect(pictureData(key)).toBe('AAAA')
    expect(pictureUrl(key)).toBeTruthy()
  })
})
