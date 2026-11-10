import { beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { glbRigTriangles } from './glb-rig.js'
import { bodyFromMarkers } from './rigged-body.js'
import { readGlb } from './glb-chunks.js'

const ASSETS = join(import.meta.dir, '..', '..', 'static-assets', 'assets')
const UAL = join(ASSETS, 'quaternius', 'UAL1.glb')
const AI = join(ASSETS, 'tonio', 'ai', 'african-american-female-10k.glb')
const CMU_WALK = join(ASSETS, 'cmu', 'bvh', '02_01.bvh')

// body-export brings its panel rows (tosijs), which want a DOM.
let exportBody: typeof import('./body-export.js').exportBody
let exportClip: typeof import('./body-export.js').exportClip
beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  g.document ??= win.document
  ;({ exportBody, exportClip } = await import('./body-export.js'))
})

describe.skipIf(!existsSync(UAL) || !existsSync(AI))(
  'body-export: the clip playing goes out with the body',
  () => {
    const body = () =>
      bodyFromMarkers(glbRigTriangles(new Uint8Array(readFileSync(AI))))
    const animations = async (clip: import('./body-export.js').ExportClip) => {
      const { bytes, note } = await exportBody(
        { body: body(), name: 'test', clip },
        { naming: 'ue', restPose: 't-pose', height: 0, animation: 'playing' }
      )
      return { animations: readGlb(bytes).json.animations ?? [], note }
    }

    test("a GLB's clip, by name, with its licence", async () => {
      const { animations: a, note } = await animations({
        name: 'Walk_Loop',
        kind: 'glb',
        bytes: new Uint8Array(readFileSync(UAL)),
        extras: { license: 'CC0' },
      })
      expect(note).not.toContain('clip')
      expect(a.map((x: any) => x.name)).toEqual(['Walk_Loop'])
      expect(a[0].extras).toEqual({ license: 'CC0' })
      expect(a[0].channels.length).toBeGreaterThan(20)
    })

    test.skipIf(!existsSync(CMU_WALK))('a BVH capture', async () => {
      const { animations: a } = await animations({
        name: '02_01',
        kind: 'bvh',
        bytes: new Uint8Array(readFileSync(CMU_WALK)),
      })
      expect(a.map((x: any) => x.name)).toEqual(['02_01'])
      expect(a[0].channels.length).toBeGreaterThan(10)
    })

    test('a clip the file does not have: none, and the note says so', async () => {
      const { animations: a, note } = await animations({
        name: 'No_Such_Clip',
        kind: 'glb',
        bytes: new Uint8Array(readFileSync(UAL)),
      })
      expect(a).toEqual([])
      expect(note).toContain('no clip to put in')
      expect(
        await exportClip({
          name: 'No_Such_Clip',
          kind: 'glb',
          bytes: new Uint8Array(readFileSync(UAL)),
        })
      ).toBeNull()
    })

    test("animation 'none' leaves it out", async () => {
      const { bytes } = await exportBody(
        {
          body: body(),
          name: 'test',
          clip: {
            name: 'Walk_Loop',
            kind: 'glb',
            bytes: new Uint8Array(readFileSync(UAL)),
          },
        },
        { naming: 'ue', restPose: 't-pose', height: 0 }
      )
      expect(readGlb(bytes).json.animations ?? []).toEqual([])
    })
  }
)
