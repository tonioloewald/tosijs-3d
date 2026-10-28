import { describe, test, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
The acknowledgements page names every source we use. This keeps it true for
the CDN: each pack the source loads (`assetUrl('kenney/…')`,
`cdn.tosijs.net/quaternius/…`) must be credited on the page, by the name its
creator goes by. A new pack fails here until it is acknowledged.
*/

/** Who each CDN pack is credited to on the page. */
const CREDITS: Record<string, string> = {
  kenney: 'Kenney',
  quaternius: 'Quaternius',
  makehuman: 'MakeHuman',
  nasa: 'NASA',
  noaa: 'NOAA',
  tonio: 'Tonio Loewald',
  thebasemesh: 'The Base Mesh',
  blender: 'Blender Studio',
  // Our own demo geometry: nothing to credit.
  'tosijs-3d': '',
}

const SRC = join(import.meta.dir)
const page = readFileSync(join(SRC, 'docs/acknowledgements.md'), 'utf8')

function packsUsed(): Set<string> {
  const packs = new Set<string>()
  // A call, a full URL, or a path held in a constant first
  // (`PREVIEW_MESH = 'thebasemesh/kitchen/teapot.glb'`).
  const pattern =
    /(?:assetUrl\(\s*['`]|cdn\.tosijs\.net\/|['`](?=[a-z0-9_-]+\/[^'`\s]*\.(?:glb|gltf|png|jpg|json|m4a|mp3)['`]))([a-z0-9_-]+)\//g
  for (const name of readdirSync(SRC)) {
    if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue
    for (const m of readFileSync(join(SRC, name), 'utf8').matchAll(pattern)) {
      packs.add(m[1])
    }
  }
  return packs
}

describe('acknowledgements', () => {
  const used = packsUsed()

  test('the scan finds the packs (positive control)', () => {
    expect(used.has('kenney')).toBe(true)
    expect(used.has('quaternius')).toBe(true)
  })

  test('every CDN pack the source uses is credited on the page', () => {
    const missing = [...used].filter((pack) => {
      const credit = CREDITS[pack]
      if (credit === '') return false
      return credit == null || !page.includes(credit)
    })
    expect(missing).toEqual([])
  })

  test('the page says how to ask for a correction or a takedown', () => {
    expect(page).toContain('## Corrections and takedowns')
    expect(page).toContain('github.com/tonioloewald/tosijs-3d/issues')
  })
})
