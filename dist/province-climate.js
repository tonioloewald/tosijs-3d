/*#
# Province climate

**What a province does to the weather** — water, temperature and volcanism, each
a curve over normalised distance from the province's centre. Pure: no DOM, no
Babylon, so a consumer can validate and serialise one in a headless runner.

## The channels BIAS; they do not declare

A province is a local authority over a base field, so its climate channels
modify what the terrain already computed rather than replacing it. That needs a
**neutral point**, so all three use the bipolar convention Tonio set for exactly
this case:

> `0.5` leaves the base alone, `0` pushes it down, `1` pushes it up.

Same convention as a light program's `hue`, and for the same reason: an
absolute mapping throws away the value the base spent effort computing. A
province saying "a bit warmer than wherever this is" composes with latitude,
altitude and season; one saying "18 degrees" does not.

Each channel carries its own **amount** — how far its extremes reach — because
the natural sizes differ by an order of magnitude. A volcanic province wants to
dominate volcanism and barely touch moisture.

## Water is TWO questions, and a curve only answers one

`water` biases wetness: the ground is damper here, the rain shadow is weaker.
That is a bias and a curve suits it.

Whether there is **a lake** is not a bias. It has a surface at a height, an edge
where the land meets it, and it is either there or it is not — a curve cannot
say "there is water here and its top is at 12 m". So presence and level are
**scalars** on the province, and the curve goes on biasing the climate around
them. Tonio, asking for both in one breath: _"toggle the presence of water and
set its height (or however it's supposed to work)."_ It works as two things.

## Composition, when provinces overlap

Follows PROVINCE-DESIGN's per-layer rules rather than inventing a new one:

- **temperature / water** — SUM the biases. Two damp influences are damper, and
  a bias is already signed so opposing provinces cancel, which is the right
  answer for "a lake next to a lava field".
- **volcanism** — `max`. The most volcanic claim wins; averaging two glow fields
  gives you neither, which is the rule `mergeProvinces` already uses.

## Sea level lives on the TERRAIN, not here

A province cannot move the sea. `BiomeChartConfig.seaLevel` drives the water
plane and the classifier's shoreline together — it is a global fact, and a local
authority that could shift it would be authoring a different planet rather than
a place on this one. A province may add a lake at its own level; that is what
`waterLevel` is for.
*/
/*{ "parent": "Environment", "order": 130 }*/
import { canonicalCurve, curveSchema, evaluateCurve, validateCurve, } from './curve';
export const DEFAULT_AMOUNTS = {
    water: 0.35,
    temperature: 0.3,
    volcanism: 1,
};
/** The identity — what a province with no climate layer contributes. */
export const NO_CLIMATE = {
    water: 0,
    temperature: 0,
    volcanism: 0,
};
const CHANNELS = ['water', 'temperature', 'volcanism'];
function sampleCurve(curve, at, fallback) {
    if (curve == null)
        return fallback;
    if (typeof curve === 'number')
        return curve;
    if (curve.length === 0)
        return fallback;
    return evaluateCurve(curve, at);
}
/**
 * Sample a province's climate at a normalised distance from its centre.
 *
 * `t` is `0` at the centre and `1` at the rim — the same coordinate every other
 * province layer reads, which is what keeps the layers from disagreeing by
 * accident (PROVINCE-DESIGN: "they are all speaking the same coordinates").
 *
 * An absent channel contributes exactly zero, so a province with no climate
 * layer is free rather than subtly warm.
 */
export function sampleClimate(climate, t) {
    if (climate == null)
        return NO_CLIMATE;
    const amounts = { ...DEFAULT_AMOUNTS, ...climate.amounts };
    const out = { water: 0, temperature: 0, volcanism: 0 };
    for (const key of CHANNELS) {
        const curve = climate[key];
        if (curve == null)
            continue;
        // Bipolar about 0.5 — see the doc. `- 0.5) * 2` maps [0,1] to [-1,1].
        out[key] = (sampleCurve(curve, t, 0.5) - 0.5) * 2 * amounts[key];
    }
    /*
    Volcanism is reported as a 0..1 CLAIM rather than a signed offset, because it
    composes by max and a negative maximum is meaningless. A province that wants
    to suppress volcanism cannot: max is the rule, and "less molten than the
    planet" is not a thing a place can be.
    */
    out.volcanism = Math.max(0, Math.min(1, out.volcanism));
    return out;
}
/**
 * Compose several provinces' contributions at one point.
 *
 * Temperature and water SUM — biases are signed, so a lake beside a lava field
 * cancels rather than one silently winning. Volcanism takes the MAX, the rule
 * `mergeProvinces` already uses: blending two glow fields gives you neither.
 */
export function composeClimate(samples) {
    const out = { water: 0, temperature: 0, volcanism: 0 };
    for (const s of samples) {
        out.water += s.water;
        out.temperature += s.temperature;
        out.volcanism = Math.max(out.volcanism, s.volcanism);
    }
    return out;
}
/**
 * Apply a composed sample to the axes a biome chart computed.
 *
 * Clamped into the chart's `[0,1]`, because the classifier indexes a table with
 * these — an out-of-range axis reads off the end of the chart and returns
 * whatever biome happens to be at the edge, which looks like a content bug
 * rather than an arithmetic one.
 */
export function applyClimate(axes, sample) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    return {
        temperature: clamp(axes.temperature + sample.temperature),
        moisture: clamp(axes.moisture + sample.water),
    };
}
// --- Serialisation: the same contract curves and lights follow ---------------
/** JSON Schema for a province's climate layer, as ONE field. */
export function provinceClimateSchema(extra = {}) {
    const channel = (title) => ({
        ...curveSchema('falloff'),
        title,
        description: '0.5 leaves the base alone; 0 pushes down, 1 pushes up.',
    });
    return {
        type: 'object',
        title: 'Climate',
        properties: {
            water: channel('Wetness bias'),
            temperature: channel('Temperature bias'),
            volcanism: channel('Volcanism'),
            amounts: {
                type: 'object',
                properties: {
                    water: { type: 'number', minimum: 0 },
                    temperature: { type: 'number', minimum: 0 },
                    volcanism: { type: 'number', minimum: 0, maximum: 1 },
                },
            },
            hasWater: { type: 'boolean', title: 'Standing water' },
            waterLevel: { type: 'number', title: 'Water level', 'x-unit': 'm' },
        },
        'x-widget': 'province-climate',
        ...extra,
    };
}
/** Canonical bytes — rounded, fixed key order. Same rule as `canonicalCurve`. */
export function canonicalClimate(c) {
    const r = (v) => Math.round(v * 1e4) / 1e4 + 0;
    const out = {};
    for (const key of CHANNELS) {
        const curve = c[key];
        if (curve == null)
            continue;
        out[key] = typeof curve === 'number' ? r(curve) : canonicalCurve(curve);
    }
    if (c.amounts != null) {
        const a = {};
        for (const key of CHANNELS) {
            const v = c.amounts[key];
            if (v != null)
                a[key] = r(v);
        }
        if (Object.keys(a).length > 0)
            out.amounts = a;
    }
    if (c.hasWater != null)
        out.hasWater = c.hasWater;
    if (c.waterLevel != null)
        out.waterLevel = r(c.waterLevel);
    return out;
}
/** Report what is wrong without throwing or fixing it. Paths are RELATIVE. */
export function validateClimate(value) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return [
            {
                severity: 'error',
                code: 'climate/not-an-object',
                message: 'A climate layer is an object of curves and scalars.',
                path: '',
            },
        ];
    }
    const c = value;
    const issues = [];
    for (const key of CHANNELS) {
        const curve = c[key];
        if (curve == null || typeof curve === 'number')
            continue;
        for (const i of validateCurve(curve, 'falloff')) {
            issues.push({ ...i, path: `/${key}${i.path}` });
        }
    }
    /*
    A level with no water is a WARNING, not an error: it runs (the level is simply
    unused), and it is what an author leaves behind after unticking the box —
    losing their number on the way out would be worse than mentioning it.
    */
    if (c.waterLevel != null && c.hasWater !== true) {
        issues.push({
            severity: 'warning',
            code: 'climate/level-without-water',
            message: 'waterLevel is set but hasWater is not; the level is unused.',
            path: '/waterLevel',
        });
    }
    if (c.hasWater === true && typeof c.waterLevel !== 'number') {
        issues.push({
            severity: 'warning',
            code: 'climate/water-without-level',
            message: 'hasWater is set with no waterLevel; the surface defaults to 0.',
            path: '/waterLevel',
        });
    }
    return issues;
}
//# sourceMappingURL=province-climate.js.map