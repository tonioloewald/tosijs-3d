import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lipTint, stubbleMask, stubbleTint } from './skin-paint.js'
import { lipAlbedo, skinAlbedo } from './skin-tone.js'

describe('lip and stubble tints', () => {
  test('lips take the lips’ albedo over the skin’s; bare skin stays 1', () => {
    const skin = { vertices: [0, 1] }
    const lips = [0, 1]
    const c = lipTint(skin, lips, 0.3, 0.5)
    expect(Array.from(c.subarray(0, 4))).toEqual([1, 1, 1, 0])
    const s = skinAlbedo(0.3, 0.5)
    const l = lipAlbedo(0.3, 0.5)
    expect(c[4] * s.r).toBeCloseTo(l.r, 5)
    expect(c[5] * s.g).toBeCloseTo(l.g, 5)
    expect(c[6] * s.b).toBeCloseTo(l.b, 5)
  })

  test('stubble darkens only where the mask says, by the amount', () => {
    const c = new Float32Array([1, 1, 1, 0, 1, 1, 1, 0])
    const skin = skinAlbedo(0.3, 0.5)
    const hair = { r: 0.05, g: 0.03, b: 0.02 }
    stubbleTint(c, [0, 1], 0.5, skin, hair)
    expect(Array.from(c.subarray(0, 3))).toEqual([1, 1, 1])
    for (let k = 4; k < 7; k++) {
      expect(c[k]).toBeLessThan(1)
      expect(c[k]).toBeGreaterThan(0.3)
    }
    const none = new Float32Array([1, 1, 1, 0])
    stubbleTint(none, [1], 0, skin, hair)
    expect(Array.from(none)).toEqual([1, 1, 1, 0])
  })
})

const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe.skipIf(!existsSync(PACK))('stubble on hm08', () => {
  test('grows on the chin and jaw, not on the lips or the crown', async () => {
    const { loadHumanPack } = await import('./human-pack.js')
    const { humanSkin } = await import('./human-rig.js')
    const { vertexNormals } = await import('./hair-fit.js')
    const { drawnPositions, fitProxy } = await import('./proxy-fit.js')
    const pack = await loadHumanPack(PACK, fromDisk)
    const positions = pack.positions
    const skin = humanSkin(pack)
    const body = skin.positions(positions)
    const normals = vertexNormals(body, skin.triangles)
    const lips = (await pack.region('lips'))!
    const names = Object.keys(pack.manifest.proxies ?? {})
    const beardName = names.find((n) => /scruffy_beard/.test(n))!
    expect(beardName).toBeDefined()
    const beard = (await pack.proxy(beardName))!
    const mask = stubbleMask({
      skin: body,
      normals,
      vertices: skin.vertices,
      positions,
      lips,
      beard: drawnPositions(beard, fitProxy(beard, positions)),
    })
    // The chin: the front-most skin vertex a few centimetres below the lips.
    let lipY = -Infinity
    for (let v = 0; v < lips.length; v++)
      if (lips[v] > 0.5) lipY = Math.max(lipY, positions[v * 3 + 1])
    let chin = -1
    let crown = 0
    for (let i = 0; i < body.length / 3; i++) {
      const x = body[i * 3]
      const y = body[i * 3 + 1]
      const z = body[i * 3 + 2]
      if (Math.abs(x) < 0.01 && y < lipY - 0.03 && y > lipY - 0.06)
        if (chin < 0 || z > body[chin * 3 + 2]) chin = i
      if (y > body[crown * 3 + 1]) crown = i
    }
    expect(mask[chin]).toBeGreaterThan(0.5)
    expect(mask[crown]).toBe(0)
    for (let i = 0; i < skin.vertices.length; i++)
      if (lips[skin.vertices[i]] > 0.6) expect(mask[i]).toBeLessThan(0.05)
  }, 30000)
})
