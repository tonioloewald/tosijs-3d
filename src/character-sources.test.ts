import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  AI_CHARACTER_SOURCES,
  CHARACTER_SOURCES,
  rigFromMarkers,
} from './character-sources.js'
import { glbRigTriangles } from './glb-rig.js'
import { bodyFromMarkers } from './rigged-body.js'
import { riggedBodyGlb } from './rigged-body-glb.js'
import { readGlb } from './glb-chunks.js'

const AI = fileURLToPath(
  new URL('../../static-assets/assets/tonio/ai', import.meta.url)
)

describe('character sources', () => {
  test('a hand-placed rig is its left side, mirrored', () => {
    const r = rigFromMarkers(
      [
        [0, 0.6],
        [0, -0.2],
        [0.5, 0.1],
        [0.36, 0.26],
        [0.15, -0.52],
      ],
      { thumb_01: [0.5, 0.07, 0.14] },
      { neck_01: [0, 0.47, 0.02] },
      'mitten'
    )
    const b = r.binding!
    expect(b.markers!.wristR).toEqual({ x: -0.5, y: 0.1 })
    expect(b.joints!.thumb_01_r).toEqual({ x: -0.5, y: 0.07, z: 0.14 })
    expect(b.joints!.neck_01).toEqual({ x: 0, y: 0.47, z: 0.02 })
    expect(b.hands).toBe('mitten')
  })

  test('the AI cast are sources, each with a hand-placed rig', () => {
    for (const [name, s] of Object.entries(AI_CHARACTER_SOURCES)) {
      expect(CHARACTER_SOURCES[name]).toBe(s)
      expect(s.recipe?.binding?.markers).toBeDefined()
      expect(s.url).toContain(`tonio/ai/${name}-10k.glb`)
    }
  })

  // The card's done-when (#3881): the spacesuit rebuilt with Tonio's mitten
  // rig from nothing but the engine-free modules.
  test.skipIf(!existsSync(`${AI}/eurasian-male-spacesuit-10k.glb`))(
    'eurasian-male-spacesuit, rigged and written with no engine',
    () => {
      const source = AI_CHARACTER_SOURCES['eurasian-male-spacesuit']
      const bytes = new Uint8Array(
        readFileSync(`${AI}/eurasian-male-spacesuit-10k.glb`)
      )
      const binding = source.recipe!.binding!
      const body = bodyFromMarkers(
        glbRigTriangles(bytes, { pick: source.pick }),
        binding
      )
      const thumb = body.rig.at('thumb_01_l')!
      const placed = binding.joints!.thumb_01_l
      expect(thumb.x).toBeCloseTo(placed.x, 4)
      expect(thumb.y).toBeCloseTo(placed.y, 4)
      expect(thumb.z).toBeCloseTo(placed.z, 4)
      // A mitten: no finger but the thumb and middle takes the skin.
      const fingers = body.rig.fingers?.l ?? []
      expect(fingers).not.toContain('index')
      const glb = readGlb(riggedBodyGlb(body, { recipe: source.recipe }))
      expect(glb.json.skins?.[0]?.joints?.length).toBe(65)
    },
    60_000
  )
})
