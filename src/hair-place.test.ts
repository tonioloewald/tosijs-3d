import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  closestHead,
  hairFitFor,
  moustacheLip,
  readHairLibrary,
  referenceHeads,
  withoutLashes,
} from './hair-place.js'

/** Quaternius' hair library, where static-assets is checked out beside this repo. */
const LIBRARY = join(
  import.meta.dir,
  '../../static-assets/public/quaternius/libraries/hairstyles.glb'
)

describe('hair-place, by itself', () => {
  test('brows and beards go on the face, hair on the scalp', () => {
    expect(hairFitFor('Eyebrows_Thick', 'eyebrows')).toBe('face')
    expect(hairFitFor('Hair_Beard', 'hair')).toBe('face')
    expect(hairFitFor('Hair_Moustache', 'hair')).toBe('face')
    expect(hairFitFor('Hair_Long', 'hair')).toBe('scalp')
  })

  test("a brow piece's lash strip, the lower island, is dropped", () => {
    // Two triangles: a brow at 1.70 m, a lash strip under it at 1.66 m.
    const positions = new Float32Array([
      0, 1.7, 0, 0.02, 1.7, 0, 0.01, 1.71, 0,
      0, 1.66, 0, 0.02, 1.66, 0, 0.01, 1.665, 0,
    ])
    const indices = new Uint32Array([0, 1, 2, 3, 4, 5])
    expect(Array.from(withoutLashes({ positions, indices }))).toEqual([0, 1, 2])
  })

  test("a moustache's lip line is the lowest point of its middle", () => {
    const positions = new Float32Array([
      -0.03, 1.5, 0.1, 0, 1.52, 0.11, 0.005, 1.51, 0.105, 0.03, 1.49, 0.1,
    ])
    const lip = moustacheLip({ positions, indices: new Uint32Array([0, 1, 2, 1, 2, 3]) })
    expect(lip).toEqual({ y: Math.fround(1.51), z: Math.fround(0.105) })
  })
})

describe.skipIf(!existsSync(LIBRARY))('the hair library, with no engine', () => {
  const bytes = existsSync(LIBRARY) ? new Uint8Array(readFileSync(LIBRARY)) : new Uint8Array(0)
  const pieces = existsSync(LIBRARY) ? readHairLibrary(bytes) : []

  test('reads its pieces and the two heads they were made on', () => {
    const names = pieces.map((p) => p.name)
    expect(names).toContain('Reference_Head_Male')
    expect(names).toContain('Reference_Head_Female')
    expect(pieces.some((p) => p.category === 'eyebrows')).toBe(true)
    const heads = referenceHeads(pieces)
    expect(heads.map((h) => h.name).sort()).toEqual([
      'Reference_Head_Female',
      'Reference_Head_Male',
    ])
    expect(heads.some((h) => h.lip != null)).toBe(true)
  })

  test("agrees with human-hair's Babylon loader, piece for piece", async () => {
    const BABYLON = await import('@babylonjs/core')
    await import('@babylonjs/loaders')
    const { loadHairLibrary } = await import('./human-hair.js')
    const engine = new BABYLON.NullEngine()
    const scene = new BABYLON.Scene(engine)
    const library = await loadHairLibrary(
      scene,
      'data:;base64,' + Buffer.from(bytes).toString('base64')
    )
    const heads = referenceHeads(pieces)
    const byName = new Map(pieces.map((p) => [p.name, p]))
    for (const name of library.names()) {
      const ours = byName.get(name)!
      const theirs = library.piece(name)!
      expect(ours.parts.length).toBe(theirs.length)
      // The same vertices in the same frame (Babylon's copy has its own order
      // of parts only if the file does), and the same triangles kept.
      const key = (p: { positions: Float32Array; indices: Uint32Array }) =>
        `${p.positions.length}:${p.indices.length}`
      expect(ours.parts.map(key).sort()).toEqual(theirs.map(key).sort())
      for (const a of ours.parts) {
        const b = theirs.find((t) => key(t) === key(a))!
        let worst = 0
        for (let i = 0; i < a.positions.length; i++)
          worst = Math.max(worst, Math.abs(a.positions[i] - b.positions[i]))
        expect(worst).toBeLessThan(1e-5)
      }
      // And each piece goes to the same head.
      expect(closestHead(ours.parts, heads).name).toBe(library.headFor(name).name)
    }
    const lip = (hs: { name: string; lip?: unknown }[]) =>
      hs.find((h) => h.lip != null)
    expect(lip(heads)?.name).toBe(lip(library.heads)?.name)
    engine.dispose()
  }, 60000)
})
