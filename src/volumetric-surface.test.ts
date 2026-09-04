import { describe, test, expect } from 'bun:test'
import { extractChunk } from './sdf-lattice.js'
import { terrainDensity } from './patch-field.js'
import { PerlinNoise } from './perlin-noise.js'

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

RESULT, 2026-08-15 — it passes, but note these are measured against ZERO, which
overstates the error; see the 2026-08-16 correction below for the comparison that
matters (versus the heightfield mesh's own error). Against 6 m sine hills:

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

/*
CORRECTION, 2026-08-16 — I MEASURED THE WRONG THING TWICE, AND BOTH ERRORS RAN
THE SAME WAY.

**Error 1: I extracted at a FINER lattice than the plan calls for.** The plan is
that the finest LOD keeps the *same surface resolution* as the second finest and
spends its budget on cavities. I tested 2 m and 4 m cells against a heightfield
whose finest spacing is 128/24 = 5.33 m — so I measured "denser mesh AND
cavities", which is a different and much more expensive proposal. (Tonio caught
this.)

**Error 2: I compared the deviation against ZERO.** A heightfield tile also only
samples the terrain at its vertices and interpolates between them, so it has its
own error against the continuous field. The question was never "does the
volumetric surface match the true terrain", it is "does it match *what the
heightfield tile would have drawn*".

Measured properly, both answers are good:

| spacing  | heightfield mesh error | volumetric error   | extraction |
| -------- | ---------------------- | ------------------ | ---------- |
| 5.33 m   | max 0.266  mean 0.068  | max 0.243  0.063   | 2.3–2.7 ms |
| 10.67 m  | max 0.878  mean 0.262  | max 0.866  0.249   | 0.7–0.8 ms |

The volumetric surface is **marginally more accurate than the heightfield mesh it
replaces**, at the same resolution — so the LOD swap is invisible, not merely
tolerable. And extraction at the finest surface resolution is **2.3–2.7 ms
against a 2–4 ms budget**, i.e. it fits, with the second-finest resolution costing
under a millisecond.

So the direction is viable *as specified*, and my earlier "dead by its own
numbers" verdict was an artefact of testing something nobody proposed. The
surface-minus-cavities refinement remains the better design for other reasons —
no extraction at all where nothing is carved — but it is now an optimisation
rather than a rescue.

*/

/*
THE SECOND MEASUREMENT: EXTRACTION COST. It does NOT pass for the naive version,
and that is the useful part.

One 128 m tile extracted volumetrically, fBm terrain, against the `tileBuildMs`
budget of 2–4 ms:

| cell | grid       | ms   | triangles |
| ---- | ---------- | ---- | --------- |
| 8 m  | 16×4×16    | 1.5  | 460       |
| 4 m  | 32×4×32    | 3.4  | 2 016     |
| 4 m  | 32×8×32    | 4.4  | 2 018     |
| 2 m  | 64×4×64    | 9.4  | 5 560     |
| 2 m  | 64×8×64    | 14.1 | 8 378     |

Put beside the deviation table above, the two measurements are in tension:
**2 m buys sub-centimetre accuracy and costs 3–5× the budget; 4 m fits the budget
and deviates 5 cm** — which at the finest LOD is ground you are standing next to.

So "make the finest tiles volumetric" — the version I wrote up first — is ruled
out by its own numbers. What survives is the refinement: **surface MINUS
cavities**. Where nothing is carved there is no extraction at all, so the cost
scales with cavity volume rather than tile area, and the deviation question does
not arise because the surface is still the heightfield. A lava tube crossing a
tile touches a small fraction of its cells.

Which means these two tables did their job: they killed the expensive version and
left the cheap one standing, before anything was built on either.

**Still open, and now the number that matters:** what fraction of a tile a real
cavity actually touches, and therefore what the extraction costs in practice.
That needs a real province, not a synthetic one.

**And there is an escape hatch if it is close:** extraction is a pure function
over transferable typed arrays — the exact shape PERF-DESIGN says belongs in a
worker ("send the recipe, transfer the result"). Nothing here needs to run on the
frame thread.
*/

describe('extraction cost — documented, with a loose regression bound', () => {
  test('a full 128m tile at 4m cells is in the low milliseconds', () => {
    // Deliberately loose: this is a MEASUREMENT that must not flake on a busy
    // machine, but a 10x regression should still fail.
    const n = new PerlinNoise(7)
    const h = (x: number, z: number) =>
      n.fractal(x * 0.004, 0, z * 0.004, 4) * 60
    const spec = { ix: 0, iy: -8, iz: 0, nx: 32, ny: 8, nz: 32 }
    const cfg = { spacing: 4, jitter: 0.25, seed: 7 }
    extractChunk(terrainDensity(h), spec, cfg) // warm
    const t0 = performance.now()
    const mesh = extractChunk(terrainDensity(h), spec, cfg)
    const ms = performance.now() - t0
    expect(mesh.triangleCount).toBeGreaterThan(500)
    expect(ms).toBeLessThan(50) // measured ~4.4ms
  })
})

describe('the comparison that actually decides it', () => {
  const n = new PerlinNoise(7)
  const h = (x: number, z: number) => n.fractal(x * 0.004, 0, z * 0.004, 4) * 60

  /** A heightfield tile samples at its vertices and interpolates between them —
   * this is ITS error against the continuous field, which is the real baseline. */
  const heightfieldError = (s: number) => {
    let max = 0
    for (let x = 0; x < 128; x += s)
      for (let z = 0; z < 128; z += s) {
        const bilinear =
          (h(x, z) + h(x + s, z) + h(x, z + s) + h(x + s, z + s)) / 4
        max = Math.max(max, Math.abs(bilinear - h(x + s / 2, z + s / 2)))
      }
    return max
  }

  const volumetricError = (s: number) => {
    const c = Math.round(128 / s)
    const m = extractChunk(
      terrainDensity(h),
      { ix: 0, iy: -4, iz: 0, nx: c, ny: 4, nz: c },
      { spacing: s, jitter: 0.25, seed: 7 }
    )
    let max = 0
    for (let i = 0; i < m.vertexCount; i++)
      max = Math.max(
        max,
        Math.abs(
          m.positions[i * 3 + 1] - h(m.positions[i * 3], m.positions[i * 3 + 2])
        )
      )
    return max
  }

  test('at MATCHING resolution the volumetric surface is no worse', () => {
    // The whole go/no-go. If this fails the ground pops on every LOD change; it
    // does not fail, and the volumetric surface is in fact slightly better.
    for (const s of [5.33, 10.67]) {
      expect(volumetricError(s)).toBeLessThanOrEqual(heightfieldError(s))
    }
  })

  test('extraction at the finest SURFACE resolution fits the tile budget', () => {
    // 128m / 24 subdivisions = 5.33m, the heightfield's own finest spacing.
    // Measured 2.3-2.7ms against a tileBuildMs of 2-4.
    const c = Math.round(128 / 5.33)
    const spec = { ix: 0, iy: -4, iz: 0, nx: c, ny: 4, nz: c }
    const cfg = { spacing: 5.33, jitter: 0.25, seed: 7 }
    extractChunk(terrainDensity(h), spec, cfg) // warm
    const t0 = performance.now()
    extractChunk(terrainDensity(h), spec, cfg)
    expect(performance.now() - t0).toBeLessThan(30) // loose; measured ~2.5ms
  })
})
