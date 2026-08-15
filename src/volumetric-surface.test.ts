import { describe, test, expect } from 'bun:test'
import { extractChunk } from './sdf-lattice'
import { terrainDensity } from './patch-field'

/*
THE GO/NO-GO MEASUREMENT FOR VOLUMETRIC TERRAIN — AS A UNIT TEST.

TUNNEL-DESIGN proposes that the finest terrain LOD stops refining the surface
and starts adding VOLUME, with the volume being *surface minus cavities*. TODO
says not to build any of it until two numbers exist, the first being: **does a
volumetrically-extracted tile reproduce the heightfield tile it replaces?**

If it does not, the ground visibly shifts every time a tile changes LOD — a
ripple orbiting the player at fixed radius, which is worse than any seam we have
today. That single number decides the whole direction.

It was written down as "an afternoon's experiment". It isn't: `sdf-lattice` and
`patch-field` are pure and Babylon-free, so the measurement is a test — which is
the point Tonio made about the volumetric work generally, and it is right.

RESULT, 2026-08-15 — **it passes.** Against 6 m sine hills:

| cell | max deviation | mean    |
| ---- | ------------- | ------- |
| 8 m  | 0.189 m       | 0.068 m |
| 4 m  | 0.049 m       | 0.025 m |
| 2 m  | 0.0096 m      | 0.005 m |
| 1 m  | 0.0011 m      | 0.0008 m|

Flat ground comes out at 3.7e-17 (machine epsilon) and a plane at 6.7e-7 — both
exact for any purpose. The error is **quadratic in cell size** (halve the cell,
quarter the error), which is ordinary discretisation rather than drift: it is
curvature *within* a cell, which no single vertex can represent.

At the finest LOD — the only place this would be used — a 2 m lattice is already
sub-centimetre, which was the stated bar. So the ground does not shift when a
tile changes representation, and the direction is alive.

**The honest caveat:** these are smooth sine hills. Real fBm terrain carries
higher-frequency content, so the deviation at a given cell size will be worse in
proportion to how much detail sits below that scale. The quadratic convergence is
the durable finding; the absolute numbers are a floor, not a promise.
*/

/** Every extracted vertex, against the height field it should be lying on. */
const deviation = (
  heightAt: (x: number, z: number) => number,
  spacing: number,
  jitter = 0.25
) => {
  const mesh = extractChunk(
    terrainDensity(heightAt),
    { ix: 0, iy: -4, iz: 0, nx: 8, ny: 8, nz: 8 },
    { spacing, jitter, seed: 7 }
  )
  let max = 0
  let sum = 0
  let n = 0
  for (let i = 0; i < mesh.vertexCount; i++) {
    const x = mesh.positions[i * 3]
    const y = mesh.positions[i * 3 + 1]
    const z = mesh.positions[i * 3 + 2]
    const d = Math.abs(y - heightAt(x, z))
    max = Math.max(max, d)
    sum += d
    n++
  }
  return { max, mean: n > 0 ? sum / n : 0, vertices: n }
}

describe('a volumetric tile must reproduce the heightfield it replaces', () => {
  test('FLAT ground: the surface lands where the heightfield says', () => {
    const d = deviation(() => 0, 4)
    expect(d.vertices).toBeGreaterThan(50) // it actually extracted something
    expect(d.max).toBeLessThan(0.01) // sub-centimetre against a 4m cell
  })

  test('a SLOPE is reproduced too — planes are the easy case, but check', () => {
    const d = deviation((x, z) => 0.25 * x - 0.1 * z, 4)
    expect(d.vertices).toBeGreaterThan(50)
    expect(d.max).toBeLessThan(0.05)
  })

  test('CURVED ground deviates, and that is the number that matters', () => {
    // Real terrain is not a plane. Surface nets places one vertex per cell, so
    // curvature within a cell cannot be represented — this is the honest error.
    const hills = (x: number, z: number) =>
      6 * Math.sin(x * 0.05) + 4 * Math.cos(z * 0.04)
    const d = deviation(hills, 4)
    expect(d.vertices).toBeGreaterThan(50)
    // Report-style assertions: loose bounds, so a REGRESSION fails but the
    // measurement is what the test exists to expose.
    expect(d.max).toBeLessThan(0.06) // measured 0.049 at a 4m cell
    expect(d.mean).toBeLessThan(0.03) // measured 0.025
  })

  test('the error SHRINKS with the lattice, so it is discretisation not drift', () => {
    // The property that makes this fixable rather than fundamental: halve the
    // cell, and the deviation falls. If it did not, something structural would
    // be wrong and no amount of detail would help.
    const hills = (x: number, z: number) =>
      6 * Math.sin(x * 0.05) + 4 * Math.cos(z * 0.04)
    const coarse = deviation(hills, 8)
    const fine = deviation(hills, 2)
    expect(fine.mean).toBeLessThan(coarse.mean)
    // QUADRATIC, not merely smaller: a 4x cell reduction gave ~13x the accuracy
    // (0.068 -> 0.005 mean). That is discretisation, which more detail fixes.
    expect(coarse.mean / fine.mean).toBeGreaterThan(8)
    // …and 2m is already inside the sub-centimetre bar the TODO set.
    expect(fine.max).toBeLessThan(0.01)
  })

  test('JITTER does not move the surface off the heightfield', () => {
    // The lattice is hash-jittered so chunks weld bit-identically. That jitter
    // must not cost surface accuracy, or the welding guarantee is bought with
    // the very thing this measurement is about.
    const slope = (x: number, z: number) => 0.2 * x + 0.05 * z
    const regular = deviation(slope, 4, 0)
    const jittered = deviation(slope, 4, 0.3)
    expect(jittered.max).toBeLessThan(Math.max(0.05, regular.max * 3 + 0.01))
  })
})
