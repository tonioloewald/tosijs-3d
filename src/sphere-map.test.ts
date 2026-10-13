import { describe, expect, test } from 'bun:test'
import { SphereSampler } from './surface-sampler.js'
import {
  climateForGlobe,
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

describe('the ground is the globe, not its mirror image', () => {
  test('+z is north: latitude rises as z does', () => {
    const a = groundToLatLon(100, 200, frame).lat
    const b = groundToLatLon(100, 400, frame).lat
    expect(b).toBeGreaterThan(a)
  })

  test('+x is east: longitude rises as x does', () => {
    const a = groundToLatLon(100, 200, frame).lon
    const b = groundToLatLon(300, 200, frame).lon
    expect(b).toBeGreaterThan(a)
  })

  test('east, north and up turn the same way on the ground and on the globe', () => {
    const cross = (p: number[], q: number[]) => [
      p[1] * q[2] - p[2] * q[1],
      p[2] * q[0] - p[0] * q[2],
      p[0] * q[1] - p[1] * q[0],
    ]
    // On the ground: east × north, against up (+y).
    const ground = cross([1, 0, 0], [0, 0, 1])[1]
    // On the globe: the same two steps, against outward.
    const o = groundToDirection(500, -300, frame)
    const e = groundToDirection(501, -300, frame)
    const n = groundToDirection(500, -299, frame)
    const c = cross(
      [e.x - o.x, e.y - o.y, e.z - o.z],
      [n.x - o.x, n.y - o.y, n.z - o.z]
    )
    const globe = c[0] * o.x + c[1] * o.y + c[2] * o.z
    expect(Math.sign(globe)).toBe(Math.sign(ground))
  })
})

describe('a ground climate on a globe', () => {
  const ground = {
    equatorTemp: 0.85,
    temperateTemp: 0.55,
    poleTemp: 0.05,
    lapseRate: 0.004,
    mapMoisture: 0.45,
    tNoiseScale: 0.013,
    tNoiseAmp: 0.1,
    mNoiseScale: 0.001,
    mNoiseAmp: 0.5,
    latWarpScale: 1 / 4000,
    latWarpAmp: 0.12,
    moistureDryHeight: 170,
    rainShadow: 0.25,
    windAzimuth: 0.8,
    volcanism: 0,
    volcanicScale: 0.09,
    season: 0.25,
    seasonality: 0,
  }

  test('noise is read at the same place: scale times radius is unchanged', () => {
    const globe = climateForGlobe(ground, 4000, 40, 2)
    expect(globe.mNoiseScale * 40).toBeCloseTo(ground.mNoiseScale * 4000, 10)
    expect(globe.tNoiseScale * 40).toBeCloseTo(ground.tNoiseScale * 4000, 10)
    expect(globe.latWarpScale * 40).toBeCloseTo(ground.latWarpScale * 4000, 10)
  })

  test('what is measured against height follows the exaggerated relief', () => {
    const globe = climateForGlobe(ground, 4000, 40, 2)
    // 100 m of ground is 100 / 100 * 2 = 2 units of globe.
    const groundCooling = ground.lapseRate * 100
    expect(globe.lapseRate * 2).toBeCloseTo(groundCooling, 10)
    expect(100 / ground.moistureDryHeight).toBeCloseTo(
      2 / globe.moistureDryHeight,
      10
    )
  })

  test('everything else is the same number', () => {
    const globe = climateForGlobe(ground, 4000, 40, 2)
    expect(globe.equatorTemp).toBe(0.85)
    expect(globe.mNoiseAmp).toBe(0.5)
    expect(globe.windAzimuth).toBe(0.8)
  })
})
