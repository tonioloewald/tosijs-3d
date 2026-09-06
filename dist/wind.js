/*#
# wind

**One wind for the scene, and provinces that bend it.** Pure — no DOM, no
Babylon — so the composition rule can be tested without a sky.

Today `b3d-clouds` has `windX`/`windZ`, `b3d-water` has
`windForce`/`windDirectionX`/`windDirectionY`, and `ambient-leaves` has nothing
at all. So an author sets the wind **three times, in three spellings**, and they
can silently disagree — clouds streaming north-east over water whose waves run
south. That is the same class of defect as three drifting copies of the theme
table, which is what `w3d-theme` exists to prevent.

## Demo

One dial, and the clouds and the water agree. Turn `wind` off on either and it
falls back to its own attributes — which is what every scene did before this
existed.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dWater, b3dClouds, angle3d, slider3d, label3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

let scene = null

const panel = () => [
  label3d({ text: 'Weather' }),
  angle3d({
    label: 'bearing',
    value: 45,
    size: 150,
    handleChange: (v) => { if (scene) scene.windBearingDeg = v },
  }),
  slider3d({
    label: 'speed', value: 6, min: 0, max: 20, step: 0.5, showValue: 'always',
    handleChange: (v) => { if (scene) scene.windSpeed = v },
  }),
  slider3d({
    label: 'gust', value: 0.3, min: 0, max: 1, step: 0.05, showValue: 'always',
    handleChange: (v) => { if (scene) scene.windGust = v },
  }),
]

scene = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: panel,
    // ONE wind. Clouds and water both read it.
    windSpeed: 6,
    windBearingDeg: 45,
    windGust: 0.3,
    sceneCreated(el) {
      orbitCam(el, { alpha: -1.2, beta: 1.32, radius: 120, target: [0, 30, 0] })
    },
  },
  b3dSun({}),
  b3dSkybox({ timeOfDay: 15 }),
  b3dLight({ intensity: 0.4 }),
  // Low and close, so the drift is legible in a small preview.
  b3dClouds({ coverage: 0.6, altitude: 60, spread: 300, size: 40, count: 24 }),
  b3dWater({ y: 0, waterSize: 200, waveHeight: 0.5, twoSided: true })
)

preview.append(scene)
```
```css
.preview { height: 100%; }
```

## Cartesian inside, degrees at the edge

Stored and composed as a vector in world XZ. Authored as `windSpeed` and
`windBearingDeg`, per this library's degrees convention, converted at the edge.

That is not a formatting preference — it is the whole composition rule. The
first draft of this design stored speed + bearing and concluded that bearings
could not be summed, needing a weighted circular mean. Tonio: *"Vectors sum fine
don't they?"* They do, and the difficulty was an artifact of the representation:

| a province that... | contributes | and the result |
| --- | --- | --- |
| funnels a valley | a vector along the valley | sums |
| shelters a lee | a vector opposing the base | sums; the magnitude falls out |
| curls round a headland | a crosswise vector | sums; the DIRECTION falls out |

The case that looked like a paradox — two provinces each "turning the wind 90°"
— is not one. Two equal perpendicular contributions give a 45° resultant at √2
the magnitude, which is right, and free. It only looks paradoxical if you
average angles, and nobody would if the type is a vector.

So wind uses **the same rule the existing scalar climate channels use**:
temperature and water SUM, and so does this. A vector layer is just three scalar
sums that happen to travel together — which also answers whether the province
architecture generalises past scalars. It does, unchanged.

## Bearing is where the wind is going

Not where it comes from. Meteorology says a "northerly" blows FROM the north,
and that convention exists for forecasting rather than for rendering: every
consumer here wants to know which way the clouds drift and which way the waves
run. Naming it `bearing` rather than `direction` is the hint, and it matches the
sense [[arc|angle3d]] dials — **north is +Z, and it grows clockwise**.

## The neutral contribution is ZERO, not 0.5

The scalar climate channels are BIPOLAR over `0..1` with `0.5` meaning "leave
the base alone", because a curve has to be able to say "less than the base" and
a curve's range is closed. A vector has no such problem: the neutral
contribution is the zero vector, which needs no midpoint convention at all.

## Gusts are a curve over time, not noise you cannot reproduce

`gustAt` takes an explicit `t`, so the same second of the same scene gives the
same gust — the determinism rule every model here follows. It is separate from
the steady wind on purpose: a consumer that wants a dead-steady breeze simply
does not call it.
*/
/*{ "parent": "Environment", "order": 137 }*/
import { PerlinNoise } from './perlin-noise.js';
/** The identity — no wind, and what an absent province contributes. */
export const NO_WIND = { x: 0, z: 0 };
const DEG = Math.PI / 180;
/**
 * Build a wind from speed and bearing.
 *
 * Bearing is where the wind is GOING, north-up and clockwise: `0` blows toward
 * +Z, `90` toward +X. Same sense as `angle3d`, so a dial wired to this points
 * where the weather goes.
 */
export function windFromPolar(speed, bearingDeg) {
    if (!Number.isFinite(speed) || !Number.isFinite(bearingDeg))
        return { ...NO_WIND };
    const t = bearingDeg * DEG;
    return { x: Math.sin(t) * speed, z: Math.cos(t) * speed };
}
/** Speed and bearing of a wind. Bearing is `0..360`, and `0` for a dead calm. */
export function windToPolar(wind) {
    const speed = Math.hypot(wind.x, wind.z);
    // A calm has no direction. Reporting whatever `atan2(0, 0)` gives would be a
    // bearing nobody chose, and it would flicker as the vector crosses zero.
    if (speed < 1e-9)
        return { speed: 0, bearingDeg: 0 };
    const deg = (Math.atan2(wind.x, wind.z) / DEG + 360) % 360;
    return { speed, bearingDeg: deg };
}
/** Add winds. The whole composition rule. */
export function addWind(...winds) {
    let x = 0;
    let z = 0;
    for (const w of winds) {
        if (w == null)
            continue;
        x += w.x;
        z += w.z;
    }
    return { x, z };
}
export const scaleWind = (wind, k) => ({
    x: wind.x * k,
    z: wind.z * k,
});
export const windSpeed = (wind) => Math.hypot(wind.x, wind.z);
/** Smooth shoulder: full at the centre, zero at the rim, no hard edge. */
const smoothFalloff = (t) => {
    const u = 1 - Math.min(1, Math.max(0, t));
    return u * u * (3 - 2 * u);
};
/** How strongly a province acts at a point. `0` outside its radius. */
export function provinceInfluence(province, x, z) {
    if (!(province.radius > 0))
        return 0;
    const d = Math.hypot(x - province.at.x, z - province.at.z);
    const t = d / province.radius;
    if (t >= 1)
        return 0;
    return (province.falloff ?? smoothFalloff)(t);
}
/**
 * The wind at a point: the base, plus every province that reaches it.
 *
 * Vector addition, exactly as temperature and water sum in
 * [[province-climate]]. A province out of range contributes the zero vector, so
 * a scene with no provinces costs one loop over an empty array.
 */
export function windAt(base, provinces, x, z) {
    let out = { ...base };
    for (const p of provinces) {
        const k = provinceInfluence(p, x, z);
        if (k === 0)
            continue;
        out = addWind(out, scaleWind(p.contribution, k));
    }
    return out;
}
/**
 * Gust: the steady wind plus a reproducible wander.
 *
 * `amount` is a fraction of the wind's own speed — `0.3` is a lively breeze,
 * `0` is dead steady. Two independent noise channels, so a gust can back and
 * veer as well as strengthen; one channel would only make the wind pulse along
 * its own axis, which reads as a fan rather than weather.
 *
 * Deterministic in `t` and `seed`: the same second of the same scene gives the
 * same gust, so a replay matches and a test can assert one.
 */
export function gustAt(wind, t, options = {}) {
    const amount = options.amount ?? 0;
    if (amount <= 0)
        return { ...wind };
    const period = options.period ?? 6;
    const speed = windSpeed(wind);
    if (speed < 1e-9)
        return { ...wind };
    const noise = gustNoise(options.seed ?? 1);
    const u = t / Math.max(0.001, period);
    /*
    TWO OFF-LATTICE LINES of the same field — cheaper than two fields, and
    uncorrelated at this separation.
  
    ⚠️ NEITHER LINE MAY BE `y = 0`. Perlin noise is zero at every lattice point,
    so sampling along an integer line gives zero at every integer `u` and mirrors
    either side of it: measured on `y = 0`, eight gust samples produced four
    distinct values, two of them exactly zero, and the x channel pulsed
    symmetrically instead of wandering. It reads as a fan, which is the exact
    failure two channels exist to avoid — and it survives every test that only
    asks whether the value CHANGED.
    */
    const a = noise.noise2D(u, 0.37);
    const b = noise.noise2D(u, 37.53);
    const k = speed * amount;
    return { x: wind.x + a * k, z: wind.z + b * k };
}
/** One noise field per seed — building a PerlinNoise per frame would be silly. */
const gustFields = new Map();
function gustNoise(seed) {
    let field = gustFields.get(seed);
    if (field == null) {
        field = new PerlinNoise(seed);
        gustFields.set(seed, field);
    }
    return field;
}
/**
 * Wind in the spelling `b3d-water` wants.
 *
 * `WaterMaterial` takes a `windForce` and a 2D `windDirection`, where the
 * direction is expected to be roughly unit-length — so the speed cannot simply
 * be folded into the vector.
 */
export function waterWind(wind) {
    const speed = windSpeed(wind);
    if (speed < 1e-9) {
        return { windForce: 0, windDirectionX: 1, windDirectionY: 0 };
    }
    return {
        windForce: speed,
        windDirectionX: wind.x / speed,
        // Water's "Y" is the world Z of a surface lying in XZ.
        windDirectionY: wind.z / speed,
    };
}
//# sourceMappingURL=wind.js.map