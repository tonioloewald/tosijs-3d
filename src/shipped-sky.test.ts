import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { SHIPPED_SKY } from './skybox-baker.js'

/*
The shipped sky is served at TWO kinds of path (tosijs-3d#90):

- `/sky/stars` + `/sky/nebula` — LATEST, what the demos load. A rebake changes it.
- `/sky/<version>/…` — PINNED, what a document should load. Never rewritten.

A document that depends on the sky it was authored against has to be able to
pin one, and has to be able to read the decode parameters from beside the data
(`starfieldDataSize` must match what encoded it). These tests hold the two
kinds of path to each other, so "latest" can never drift from every version.
*/

const SKY = path.resolve(import.meta.dir, '..', 'static/sky')
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
const versions = readdirSync(SKY)
  .filter((f) => statSync(path.join(SKY, f)).isDirectory())
  .sort((a, b) => {
    const [x, y] = [a, b].map((v) => v.split('.').map(Number))
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
    return 0
  })
const pngWidth = (file: string) => readFileSync(file).readUInt32BE(16)
const manifest = (v: string) =>
  JSON.parse(readFileSync(path.join(SKY, v, 'manifest.json'), 'utf8'))

describe('the shipped sky is versioned', () => {
  test('there is at least one pinned version', () => {
    expect(versions.length).toBeGreaterThan(0)
  })

  test.each(versions)('%s has all twelve faces and a manifest', (v) => {
    const m = manifest(v)
    expect(m.version).toBe(v)
    for (const kind of [m.stars, m.nebula])
      for (const f of FACES)
        expect(
          statSync(path.join(SKY, v, `${kind}_${f}.png`)).size
        ).toBeGreaterThan(0)
    // The decode parameter a document must match travels with the data.
    expect(pngWidth(path.join(SKY, v, `${m.stars}_px.png`))).toBe(
      m.starfieldDataSize
    )
  })

  test('LATEST is byte-identical to the newest pinned version', () => {
    // So a rebake that forgets to add a version folder fails here, rather than
    // silently changing every document that thought it had pinned the sky.
    const newest = versions[versions.length - 1]
    for (const kind of ['stars', 'nebula'])
      for (const f of FACES)
        expect(
          readFileSync(path.join(SKY, `${kind}_${f}.png`)).equals(
            readFileSync(path.join(SKY, newest, `${kind}_${f}.png`))
          )
        ).toBe(true)
  })

  test('the newest manifest records the current recipe', () => {
    const m = manifest(versions[versions.length - 1])
    expect(m.starfieldDataSize).toBe(SHIPPED_SKY.dataSize)
    expect(m.starfieldTilt).toBe(SHIPPED_SKY.tilt)
    expect(m.recipe.voxel).toEqual({ ...SHIPPED_SKY.voxel })
    expect(m.recipe.seed).toBe(SHIPPED_SKY.seed)
  })
})
