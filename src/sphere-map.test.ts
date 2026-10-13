import { describe, expect, test } from 'bun:test'
import { SphereSampler } from './surface-sampler.js'
import {
  directionToGround,
  directionToLatLon,
  directionToUv,
  groundToDirection,
  groundToLatLon,
  groundToUv,
  latLonToDirection,
  latLonToGround,
  uvToDirection,
} from './sphere-map.js'

const frame = { radius: 6000, worldU: 0.1, worldV: 0.25 }

describe('sphere-map', () => {
  test('agrees with the sampler the terrain actually uses', () => {
    const s = new SphereSampler(frame.radius)
    for (const [u, v] of [
      [0.1, 0.25],
      [0.6, 0.5],
      [0.93, 0.8],
    ]) {
      const p = s.sample(u, v)
      const d = uvToDirection(u, v)
      expect(d.x * frame.radius).toBeCloseTo(p.x, 6)
      expect(d.y * frame.radius).toBeCloseTo(p.y, 6)
      expect(d.z * frame.radius).toBeCloseTo(p.z, 6)
    }
  })

  test('ground → globe → ground comes back to the same spot', () => {
    for (const [x, z] of [
      [0, 0],
      [1500, -900],
      [-4000, 2500],
    ]) {
      const back = directionToGround(groundToDirection(x, z, frame), frame)
      expect(back.x).toBeCloseTo(x, 5)
      expect(back.z).toBeCloseTo(z, 5)
    }
  })

  test('going east wraps: all the way round is where you started', () => {
    const around = 2 * Math.PI * frame.radius
    const a = groundToDirection(300, 50, frame)
    const b = groundToDirection(300 + around, 50, frame)
    expect(b.x).toBeCloseTo(a.x, 9)
    expect(b.z).toBeCloseTo(a.z, 9)
    // …and the way back names the nearer copy, never the far one.
    expect(Math.abs(directionToGround(b, frame).x)).toBeLessThan(around / 2)
  })

  test('latitude and longitude: north is +Y, the equator is flat', () => {
    expect(latLonToDirection(90, 0).y).toBeCloseTo(1, 9)
    expect(latLonToDirection(0, 0)).toEqual({
      x: 1,
      y: expect.closeTo(0, 9),
      z: 0,
    })
    const ll = directionToLatLon(latLonToDirection(-33.5, 151.2))
    expect(ll.lat).toBeCloseTo(-33.5, 6)
    expect(ll.lon).toBeCloseTo(151.2, 6)
    expect(directionToLatLon(latLonToDirection(10, -120)).lon).toBeCloseTo(
      -120,
      6
    )
  })

  test('a pin is the same place whichever way it is named', () => {
    const g = latLonToGround(12, 40, frame)
    const ll = groundToLatLon(g.x, g.z, frame)
    expect(ll.lat).toBeCloseTo(12, 6)
    expect(ll.lon).toBeCloseTo(40, 6)
  })

  test("the terrain's origin is at its own worldU, worldV", () => {
    expect(groundToUv(0, 0, frame)).toEqual({ u: 0.1, v: 0.25 })
    expect(directionToUv(groundToDirection(0, 0, frame)).u).toBeCloseTo(0.1, 9)
  })

  test('a metre north is a metre of arc', () => {
    const a = groundToDirection(0, 0, frame)
    const b = groundToDirection(0, 100, frame)
    const angle = Math.acos(a.x * b.x + a.y * b.y + a.z * b.z)
    expect(angle * frame.radius).toBeCloseTo(100, 4)
  })
})
