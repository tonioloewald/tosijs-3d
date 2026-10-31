import { describe, expect, test } from 'bun:test'
import { joinBlobs, splitBlobs } from './character-store.js'
import { writeCharacter } from './character-file.js'

describe('a character stored apart from its bytes', () => {
  const doc = writeCharacter({
    name: 'Ada',
    settings: { source: 'weasel.obj' },
    cloth: {},
    tailor: [],
    garments: { cape: new Uint8Array([1, 2, 3]) },
    bodies: {
      'weasel.obj': {
        file: { name: 'weasel.obj', bytes: new Uint8Array([9, 8, 7, 6]) },
      },
      'Blender: male': { url: 'https://example.com/male.glb' },
    },
  })

  test('the bytes come out, and go back the same', () => {
    const { doc: bare, blobs } = splitBlobs(doc)
    expect(Object.keys(blobs).sort()).toEqual([
      'bodies/weasel.obj',
      'garments/cape',
    ])
    expect(JSON.stringify(bare)).not.toContain(doc.bodies!['weasel.obj'].data!)
    expect(bare.bodies!['Blender: male'].url).toBe(
      'https://example.com/male.glb'
    )
    expect(joinBlobs(bare, blobs)).toEqual(doc)
  })

  test('a missing blob leaves that piece out rather than inventing it', () => {
    const { doc: bare, blobs } = splitBlobs(doc)
    const back = joinBlobs(bare, { ...blobs, 'garments/cape': undefined })
    expect(back.garments).toEqual({})
    expect(back.bodies!['weasel.obj'].data).toBe(doc.bodies!['weasel.obj'].data)
  })
})
