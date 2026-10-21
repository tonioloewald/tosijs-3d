/*#
# weather

**The one question every weather consumer asks: what is the weather here,
now?** `weatherAt(base, cells, x, z)` answers it from the scene's base weather
plus every weather CELL that reaches the point. A cell is a region that differs
(a lee behind a ridge, a storm), the climate layer of a province, and a
moving cell is a weather system. The design is in
[WEATHER-DESIGN.md](https://github.com/tonioloewald/tosijs-3d/blob/main/WEATHER-DESIGN.md).

Composition is per quantity, and a province's climate
([province-climate](/province-climate/)) uses the same rules for the
quantities they share:

| quantity | rule | why |
| --- | --- | --- |
| `wind` | vector SUM | a lee subtracts, a gust adds |
| `temperature` | signed SUM | opposing regions cancel |
| `coverage` | SUM, clamped 0–2 | a storm thickens the sky, a clear cell thins it; past 1 is THICKNESS (a storm tower), as on the deck's own dial |
| `precipitation` | MAX | two storms overlapping do not rain twice as hard |
| `storminess` | MAX | the worst one wins |

Pure and Babylon-free, so the simulation (and a driver) can ask the same
question the renderer does.
*/
/*{ "parent": "b3d-weather-cell", "order": 10 }*/
import { addWind, NO_WIND, scaleWind } from './wind.js';
export const CALM = {
    wind: { ...NO_WIND },
    coverage: null,
    precipitation: 0,
    temperature: 0,
    storminess: 0,
};
const smooth = (t) => {
    const u = 1 - Math.min(1, Math.max(0, t));
    return u * u * (3 - 2 * u);
};
/** How strongly a cell acts at a point, 0–1 (strength included). */
export function cellInfluence(cell, x, z) {
    if (!(cell.radius > 0))
        return 0;
    const t = Math.hypot(x - cell.at.x, z - cell.at.z) / cell.radius;
    if (t >= 1)
        return 0;
    const s = Math.min(1, Math.max(0, cell.strength ?? 1));
    return (cell.falloff ?? smooth)(t) * s;
}
/** The weather at (x, z): the base, plus every cell that reaches it. */
export function weatherAt(base, cells, x, z) {
    let wind = { ...base.wind };
    let coverage = base.coverage;
    let coverageTouched = false;
    let precipitation = base.precipitation;
    let temperature = base.temperature;
    let storminess = base.storminess;
    for (const c of cells) {
        const k = cellInfluence(c, x, z);
        if (k === 0)
            continue;
        if (c.wind)
            wind = addWind(wind, scaleWind(c.wind, k));
        if (c.coverage != null) {
            coverage = (coverage ?? 0) + c.coverage * k;
            coverageTouched = true;
        }
        if (c.precipitation != null)
            precipitation = Math.max(precipitation, c.precipitation * k);
        if (c.temperature != null)
            temperature += c.temperature * k;
        if (c.storminess != null)
            storminess = Math.max(storminess, c.storminess * k);
    }
    if (coverageTouched && coverage != null)
        coverage = Math.min(2, Math.max(0, coverage));
    return {
        wind,
        coverage,
        precipitation: Math.min(1, Math.max(0, precipitation)),
        temperature,
        storminess: Math.min(1, Math.max(0, storminess)),
    };
}
/**
 * A cell's strength over its life: grows over the first `grow` fraction,
 * holds, and dies over the last `decay` fraction. A storm should arrive and
 * leave, not pop.
 */
export function lifeEnvelope(age, lifetime, grow = 0.2, decay = 0.3) {
    if (!(lifetime > 0))
        return 1;
    const u = age / lifetime;
    if (u <= 0 || u >= 1)
        return 0;
    if (u < grow)
        return smooth(1 - u / grow);
    if (u > 1 - decay)
        return smooth((u - (1 - decay)) / decay);
    return 1;
}
//# sourceMappingURL=weather.js.map