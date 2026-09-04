import { describe, expect, test } from 'bun:test'
import {
  glbAttribution,
  glbJsonByteLength,
  itemsFitting,
  itemsInCategory,
  itemsWithTags,
  libraryManifest,
  manifestFromNodes,
  parseGlbJson,
  type LibraryManifest,
} from './glb-manifest.js'

/** Build a real GLB container around a JSON payload. */
const makeGlb = (json: any, { truncate = 0 } = {}): Uint8Array => {
  const text = new TextEncoder().encode(JSON.stringify(json))
  const pad = (4 - (text.byteLength % 4)) % 4
  const jsonLen = text.byteLength + pad
  const out = new Uint8Array(20 + jsonLen)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, 0x46546c67, true) // glTF
  dv.setUint32(4, 2, true)
  dv.setUint32(8, out.byteLength, true)
  dv.setUint32(12, jsonLen, true)
  dv.setUint32(16, 0x4e4f534a, true) // JSON
  out.set(text, 20)
  out.fill(0x20, 20 + text.byteLength) // spec says pad JSON with spaces
  return truncate > 0 ? out.subarray(0, out.byteLength - truncate) : out
}

// Shaped exactly like the real thing — checked against
// cdn.tosijs.net/kenney/libraries/nature-kit-core.glb
const REAL_SHAPE = {
  asset: {
    version: '2.0',
    generator: 'tosijs static-assets/library-glb',
    extras: {
      credit: 'Kenney',
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      link: 'https://kenney.nl',
    },
  },
  scenes: [
    {
      extras: {
        library: {
          count: 3,
          categories: { tree: 2, rock: 1 },
          items: [
            {
              name: 'tree_tall',
              category: 'tree',
              tags: ['tree', 'tall'],
              size: [0.4, 1.688, 0.461],
            },
            {
              name: 'tree_small',
              category: 'tree',
              tags: ['tree', 'small'],
              size: [0.355, 1.11, 0.409],
            },
            {
              name: 'rock_smallA',
              category: 'rock',
              tags: ['rock', 'small', 'a'],
              size: [0.361, 0.191, 0.361],
            },
          ],
        },
      },
    },
  ],
}

describe('parseGlbJson — never throws, on anything', () => {
  test('reads the JSON chunk of a real GLB', () => {
    expect(parseGlbJson(makeGlb(REAL_SHAPE))?.asset?.version).toBe('2.0')
  })

  test('null for a non-GLB — an HTML error page served with a 200', () => {
    expect(parseGlbJson(new TextEncoder().encode('<!doctype html>…'))).toBe(
      null
    )
  })

  test('null for a TRUNCATED read rather than a throw', () => {
    // The ranged-fetch case: header intact, chunk cut short. Must be
    // recoverable by widening the range, so it cannot be an exception.
    expect(parseGlbJson(makeGlb(REAL_SHAPE, { truncate: 40 }))).toBe(null)
  })

  test('null for a runt, and for a GLB whose JSON does not parse', () => {
    expect(parseGlbJson(new Uint8Array(8))).toBe(null)
    const bad = makeGlb(REAL_SHAPE)
    // Clobber the opening of the JSON so it cannot parse. (A single byte is
    // not enough — the first attempt flipped one character deep inside a
    // string value and the document stayed perfectly valid, which is a fair
    // reminder that "corrupted" and "unparseable" are different things.)
    bad.fill(0x7b, 20, 28)
    expect(parseGlbJson(bad)).toBe(null)
  })
})

describe('glbJsonByteLength — so a fetch can start small', () => {
  test('reports how far to read, from just the header', () => {
    const glb = makeGlb(REAL_SHAPE)
    const need = glbJsonByteLength(glb.subarray(0, 20))
    expect(need).not.toBe(null)
    // Enough to parse the whole chunk, and less than the whole file would be
    // for a real library (the point of the exercise).
    expect(parseGlbJson(glb.subarray(0, need!))).not.toBe(null)
  })

  test('null when it cannot tell yet', () => {
    expect(glbJsonByteLength(new Uint8Array(12))).toBe(null)
    expect(glbJsonByteLength(new TextEncoder().encode('nope'))).toBe(null)
  })
})

describe('attribution and manifest', () => {
  const json = parseGlbJson(makeGlb(REAL_SHAPE))!
  const manifest = libraryManifest(json) as LibraryManifest

  test('attribution comes through', () => {
    expect(glbAttribution(json)).toEqual({
      credit: 'Kenney',
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      link: 'https://kenney.nl',
    })
  })

  test('null attribution for a GLB that carries none', () => {
    expect(glbAttribution(parseGlbJson(makeGlb({ asset: {} })))).toBe(null)
  })

  test('manifest is read, and is null for a non-library GLB', () => {
    expect(manifest.count).toBe(3)
    expect(manifest.items).toHaveLength(3)
    expect(libraryManifest(parseGlbJson(makeGlb({ asset: {} })))).toBe(null)
  })

  test('a nameless item is dropped — it cannot be instantiated', () => {
    const m = libraryManifest(
      parseGlbJson(
        makeGlb({
          scenes: [
            { extras: { library: { items: [{ name: '' }, { name: 'ok' }] } } },
          ],
        })
      )
    )
    expect(m?.items.map((i) => i.name)).toEqual(['ok'])
  })
})

describe('manifestFromNodes — the path that needs no parsing', () => {
  // Shaped as Babylon delivers it after ExtrasAsMetadata, verified against a
  // real library loaded headlessly.
  const nodes = [
    {
      name: 'grass',
      metadata: { gltf: { extras: { category: 'grass', tags: ['grass'] } } },
    },
    {
      name: 'tree_tall',
      metadata: {
        gltf: { extras: { category: 'tree', tags: ['tree', 'tall'] } },
      },
    },
    { name: '__root__', metadata: undefined },
  ]

  test('harvests items and counts categories', () => {
    const m = manifestFromNodes(nodes)!
    expect(m.items.map((i) => i.name)).toEqual(['grass', 'tree_tall'])
    expect(m.categories).toEqual({ grass: 1, tree: 1 })
  })

  test('nodes without extras are skipped, not counted', () => {
    expect(manifestFromNodes([{ name: 'x' }])).toBe(null)
  })

  test('queries work identically off either source', () => {
    const m = manifestFromNodes(nodes)!
    expect(itemsWithTags(m, ['tree', 'tall'])).toEqual(['tree_tall'])
    expect(itemsInCategory(m, 'grass')).toEqual(['grass'])
  })
})

describe('queries — what placement code actually asks', () => {
  const manifest = libraryManifest(parseGlbJson(makeGlb(REAL_SHAPE)))!

  test('by category', () => {
    expect(itemsInCategory(manifest, 'tree')).toEqual([
      'tree_tall',
      'tree_small',
    ])
    expect(itemsInCategory(manifest, 'nope')).toEqual([])
  })

  test('by tags, AND not OR', () => {
    expect(itemsWithTags(manifest, ['tree'])).toHaveLength(2)
    expect(itemsWithTags(manifest, ['tree', 'tall'])).toEqual(['tree_tall'])
    // and-semantics: no item has both, so nothing comes back
    expect(itemsWithTags(manifest, ['tree', 'rock'])).toEqual([])
  })

  test('what fits in a gap', () => {
    expect(itemsFitting(manifest, [0.5, 0.5, 0.5])).toEqual(['rock_smallA'])
    expect(itemsFitting(manifest, [1, 2, 1])).toHaveLength(3)
  })

  test('an item with NO recorded size never gets offered', () => {
    // Excluded rather than assumed to fit: a prop that turns out to be a tree
    // is worse than one that was never suggested.
    const m = libraryManifest(
      parseGlbJson(
        makeGlb({
          scenes: [{ extras: { library: { items: [{ name: 'mystery' }] } } }],
        })
      )
    )!
    expect(itemsFitting(m, [99, 99, 99])).toEqual([])
  })
})
