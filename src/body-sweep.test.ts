import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loftGarment, type Loft } from './body-sweep.js'
import { humanBodyMaker } from './human-rig.js'
import { loadHumanPack } from './human-pack.js'
import { fitProxy } from './proxy-fit.js'
import type { RiggedBody } from './rigged-body.js'

const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

let made: Promise<{ body: RiggedBody; heavy: RiggedBody }> | null = null
const bodies = () =>
  (made ??= (async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const maker = await humanBodyMaker(pack)
    return { body: maker.first, heavy: await maker.body({ weight: 1 }) }
  })())

const LEG = ['thigh_l', 'calf_l', 'foot_l', 'ball_l']
const at = (body: RiggedBody, name: string) => {
  const p = body.rig.at(name)!
  return [p.x, p.y, p.z]
}

/** A loft's points on a body. */
const placed = (loft: Loft, body: RiggedBody) => fitProxy(loft, body.positions)

/** A ring's mean distance from its own centre. */
function ringRadius(pts: Float32Array, ring: number[]) {
  const c = [0, 1, 2].map(
    (k) => ring.reduce((s, r) => s + pts[r * 3 + k], 0) / ring.length
  )
  return (
    ring.reduce(
      (s, r) =>
        s +
        Math.hypot(
          pts[r * 3] - c[0],
          pts[r * 3 + 1] - c[1],
          pts[r * 3 + 2] - c[2]
        ),
      0
    ) / ring.length
  )
}

describe('body-sweep: loft', () => {
  test.skipIf(!existsSync(PACK))(
    'a leg: rings down the leg and along the foot, facing out, bound to the skin',
    async () => {
      const { body } = await bodies()
      const loft = loftGarment(body, { chain: LEG, ends: ['open', 'cap'] })
      const pts = placed(loft, body)
      for (const x of pts) expect(Number.isFinite(x)).toBe(true)
      expect(loft.rings.length).toBeGreaterThan(30)
      expect(loft.triangles.length % 3).toBe(0)
      for (const t of loft.triangles) expect(t).toBeLessThan(loft.rows)
      // The thigh's ring is wider than the ankle's, and the ankle's is a
      // leg, not the foot taken in (the shin's slice is the shin's skin).
      const radii = loft.rings.map((r) => ringRadius(pts, r))
      const knee = at(body, 'calf_l')
      const ankle = at(body, 'foot_l')
      const nearest = (p: number[]) => {
        let best = 0
        let bd = Infinity
        loft.rings.forEach((ring, i) => {
          const c = [0, 1, 2].map(
            (k) => ring.reduce((s, r) => s + pts[r * 3 + k], 0) / ring.length
          )
          const d = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2])
          if (d < bd) {
            bd = d
            best = i
          }
        })
        return best
      }
      expect(radii[1]).toBeGreaterThan(radii[nearest(knee)])
      const aboveAnkle = nearest([ankle[0], ankle[1] + 0.08, ankle[2]])
      expect(radii[aboveAnkle]).toBeLessThan(0.06)
      // The open top is a hem; the toe is capped.
      expect(loft.hems).toEqual([loft.rings[0]])
      // Outward: each triangle's normal points away from the leg's axis
      // more often than not (the cap and the mitre fold aside).
      let out = 0
      const tris = loft.triangles
      for (let t = 0; t < tris.length; t += 3) {
        const p = (k: number) => [0, 1, 2].map((c) => pts[tris[t + k] * 3 + c])
        const a = p(0)
        const b = p(1)
        const c = p(2)
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
        const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
        const nrm = [
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        ]
        // Leg axis: x and z of the hip, for the leg part.
        if (a[1] < ankle[1] + 0.1) continue
        const hip = at(body, 'thigh_l')
        const rad = [a[0] - hip[0], 0, a[2] - hip[2]]
        if (nrm[0] * rad[0] + nrm[2] * rad[2] > 0) out++
        else out--
      }
      expect(out).toBeGreaterThan(0)
    }
  )

  test.skipIf(!existsSync(PACK))(
    'every ring stands off the skin it was sliced from',
    async () => {
      const { body } = await bodies()
      const loft = loftGarment(body, {
        chain: ['thigh_l', 'calf_l', 'foot_l'],
        from: 0.2,
        to: 0.8,
        thickness: 0.004,
      })
      const pts = placed(loft, body)
      // No ring point sits closer to the leg's skin than nothing: each is
      // at least the thickness from every skin vertex it was bound to.
      let close = 0
      for (let r = 0; r < loft.rows; r++) {
        for (let k = 0; k < 3; k++) {
          const v = loft.ref[r * 3 + k]
          const d = Math.hypot(
            pts[r * 3] - body.positions[v * 3],
            pts[r * 3 + 1] - body.positions[v * 3 + 1],
            pts[r * 3 + 2] - body.positions[v * 3 + 2]
          )
          if (d < 0.002) close++
        }
      }
      expect(close / (loft.rows * 3)).toBeLessThan(0.02)
    }
  )

  test.skipIf(!existsSync(PACK))(
    'a mitre at the ankle keeps the shin rings behind it; steps round the bend',
    async () => {
      const { body } = await bodies()
      const chain = ['calf_l', 'foot_l', 'ball_l']
      const mitre = loftGarment(body, { chain })
      const round = loftGarment(body, { chain, steps: 4 })
      // The plane halfway between shin and foot at the ankle: no point of a
      // shin ring lies past it.
      const knee = at(body, 'calf_l')
      const ankle = at(body, 'foot_l')
      const ball = at(body, 'ball_l')
      const unit = (v: number[]) => {
        const l = Math.hypot(v[0], v[1], v[2])
        return v.map((x) => x / l)
      }
      const d1 = unit([0, 1, 2].map((k) => ankle[k] - knee[k]))
      const d2 = unit([0, 1, 2].map((k) => ball[k] - ankle[k]))
      const m = unit([0, 1, 2].map((k) => d1[k] + d2[k]))
      const pts = placed(mitre, body)
      const shinLength = Math.hypot(...[0, 1, 2].map((k) => ankle[k] - knee[k]))
      let past = 0
      mitre.rings.forEach((ring) => {
        for (const r of ring) {
          const q = [0, 1, 2].map((k) => pts[r * 3 + k])
          const fromKnee = [0, 1, 2].map((k) => q[k] - knee[k])
          const s =
            fromKnee[0] * d1[0] + fromKnee[1] * d1[1] + fromKnee[2] * d1[2]
          if (s > shinLength * 0.9) continue // the foot's own rings
          const over =
            (q[0] - ankle[0]) * m[0] +
            (q[1] - ankle[1]) * m[1] +
            (q[2] - ankle[2]) * m[2]
          if (over > 1e-4) past++
        }
      })
      expect(past).toBe(0)
      // Rings turned partway between the shin and the foot: one, the
      // mitre, when sharp; the rounding's steps when rounded.
      const turning = (loft: Loft) => {
        const q = placed(loft, body)
        return loft.rings.filter((ring) => {
          // Newell's normal of the ring.
          const nrm = [0, 0, 0]
          ring.forEach((r, i) => {
            const s = ring[(i + 1) % ring.length]
            const [x0, y0, z0] = [q[r * 3], q[r * 3 + 1], q[r * 3 + 2]]
            const [x1, y1, z1] = [q[s * 3], q[s * 3 + 1], q[s * 3 + 2]]
            nrm[0] += (y0 - y1) * (z0 + z1)
            nrm[1] += (z0 - z1) * (x0 + x1)
            nrm[2] += (x0 - x1) * (y0 + y1)
          })
          const k = unit(nrm)
          const a = Math.abs(k[0] * d1[0] + k[1] * d1[1] + k[2] * d1[2])
          const b = Math.abs(k[0] * d2[0] + k[1] * d2[1] + k[2] * d2[2])
          return a < 0.99 && b < 0.99
        }).length
      }
      expect(turning(mitre)).toBeLessThanOrEqual(1)
      expect(turning(round)).toBeGreaterThanOrEqual(3)
    }
  )

  test.skipIf(!existsSync(PACK))(
    'ease flares toward an open end and fades out at a sealed one',
    async () => {
      const { body } = await bodies()
      const chain = ['thigh_l', 'calf_l', 'foot_l']
      const plain = loftGarment(body, { chain, from: 0.4, to: 0.95 })
      const flare = loftGarment(body, {
        chain,
        from: 0.4,
        to: 0.95,
        ease: (s) => 0.08 * s * s,
        ends: ['sealed', 'open'],
      })
      const a = placed(plain, body)
      const b = placed(flare, body)
      const last = plain.rings.length - 1
      // The hem stands well off; the sealed top does not.
      expect(
        ringRadius(b, flare.rings[last]) - ringRadius(a, plain.rings[last])
      ).toBeGreaterThan(0.06)
      expect(
        Math.abs(ringRadius(b, flare.rings[0]) - ringRadius(a, plain.rings[0]))
      ).toBeLessThan(0.002)
    }
  )

  test.skipIf(!existsSync(PACK))(
    'length carries it past the chain; it refits on another body',
    async () => {
      const { body, heavy } = await bodies()
      const chain = ['thigh_l', 'calf_l']
      const short = loftGarment(body, { chain, from: 0.5 })
      const long = loftGarment(body, { chain, from: 0.5, length: 0.1 })
      expect(long.rings.length).toBeGreaterThan(short.rings.length + 3)
      const thin = placed(long, body)
      const fat = placed(long, heavy)
      for (const x of fat) expect(Number.isFinite(x)).toBe(true)
      const mid = long.rings[Math.floor(long.rings.length / 4)]
      expect(ringRadius(fat, mid)).toBeGreaterThan(ringRadius(thin, mid))
    }
  )
})
