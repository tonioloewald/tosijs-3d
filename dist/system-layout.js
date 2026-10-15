/*#
# system-layout

**Where everything in a star system goes**, as numbers: how far out each
planet is drawn, how big, how fast it goes round, its moons, and the
asteroid belt. Pure: the [star system](/b3d-star-system/) draws what this
says.

A real system is almost all empty space: drawn to scale, the planets are
specks a long way apart and there is nothing to look at. So this lies, in
documented ways:

- **Distances are logarithmic.** Each doubling of distance from the star
  adds the same step, so an inner system of rocks and an outer one of giants
  both fit on screen. The order is kept, and so is "much further out".
- **Sizes are compressed by a square root.** A giant is still visibly bigger
  than a rock, but not so big that the rock vanishes beside it.
- **Planets never crowd.** Each takes as much room as its moons need, and the
  next planet out starts beyond that.
- **The belt is wildly overpopulated.** A real asteroid belt is so sparse
  that you would see nothing from inside it; this one is a band of rock you
  can see, with its few large bodies picked out as bodies of their own.
- **Time is not squeezed.** Every period is the real one, in seconds: an
  Earth year is 365.26 days, Jupiter's day under ten hours, the Moon's month
  27.3 days. A planet's year follows Kepler from its true distance; a moon's
  month follows Kepler from its true distance in planet radii (`moonPeriod`).
  How fast it all runs is the star system's `timeScale`.

Everything follows from each body's seed, so the same system lays out the
same way every time.
*/
/*{ "parent": "b3d-star-system", "order": 10 }*/
import { PRNG } from './mersenne-twister.js';
/** Seconds in an Earth day (a solar day: periods in days are multiplied by it). */
export const DAY_SECONDS = 86400;
/** Seconds in an Earth year (sidereal). */
export const YEAR_SECONDS = 365.256 * DAY_SECONDS;
/**
 * How far round a body has turned (radians, west to east) after `time`
 * seconds, for a day `day` Earth days long: negative turns backwards, 0 does
 * not turn.
 */
export function spinAngle(time, day) {
    if (day === 0)
        return 0;
    const turns = time / (day * DAY_SECONDS);
    return (turns - Math.trunc(turns)) * Math.PI * 2;
}
/**
 * Seconds for a moon `radii` planet radii out to go round, by Kepler. The
 * planet's size cancels: only its density is left (a rock's 5.5 g/cm³, a
 * giant's 1.3), so the Moon at 60 Earth radii takes 27 days and Io at 5.9
 * Jupiter radii 1.8.
 */
export function moonPeriod(radii, giant) {
    const density = giant ? 1300 : 5500;
    const G = 6.674e-11;
    return 2 * Math.PI * Math.sqrt((3 * radii ** 3) / (4 * Math.PI * G * density));
}
/** Drawn radius from a true one: Earth is `earthSize`, the rest by a square root. */
export function visualRadius(radiusKm, earthSize = 1) {
    return earthSize * Math.min(5, Math.max(0.2, Math.sqrt(radiusKm / 6371)));
}
/** Scene distance for a true one: the same step per doubling. */
export function logDistance(au, base, spacing) {
    return base + spacing * Math.log2(1 + au / 0.25);
}
function moonsFor(p, vr, earthSize) {
    const prng = new PRNG(p.seed * 31 + 7);
    const giant = p.classification !== 'rocky';
    let count = 0;
    if (p.moons)
        count = p.moons.length;
    else if (giant)
        count = 2 + prng.range(0, 2);
    else if (p.radius > 4000 && prng.probability(0.45))
        count = prng.probability(0.25) ? 2 : 1;
    const moons = [];
    // Clear of the planet and of any ring (a ring reaches ~2.3 radii).
    let d = vr * (p.rings > 0 ? 2.8 : 2.0);
    for (let i = 0; i < count; i++) {
        const rolled = giant
            ? prng.realRange(700, 2700)
            : p.radius * prng.realRange(0.12, 0.3);
        const radiusKm = p.moons ? p.moons[i] : rolled;
        const mr = visualRadius(radiusKm, earthSize);
        d += mr * 1.6 + vr * 0.25;
        moons.push({
            seed: prng.range(1, 99999),
            radiusKm,
            visualRadius: mr,
            distance: d,
            // Its real month, or Kepler from a true distance made up from the
            // drawn one (drawn moons sit 2-5 radii out, real ones 5-60).
            period: p.moonDays?.[i]
                ? p.moonDays[i] * DAY_SECONDS
                : moonPeriod(4 * (d / vr) ** 2, giant),
            phase: prng.realRange(0, Math.PI * 2),
        });
        d += mr * 1.6;
    }
    return moons;
}
/**
 * Lay out a system: planets in order out from the star, each with its moons,
 * and an asteroid belt in the widest gap between the rocky planets and the
 * first giant (none if the gap is narrow or there is no giant).
 */
export function layoutSystem(planets, opts) {
    const spacing = opts.spacing ?? 30;
    const earthSize = opts.earthSize ?? 2;
    const year = opts.year ?? YEAR_SECONDS;
    const base = opts.starRadius * 2;
    const out = [];
    // The belt, if any, goes in a wide gap before the first giant: its room
    // is kept when the planets are placed, so the giant's moons never crowd it.
    const giant = planets.findIndex((p) => p.classification !== 'rocky');
    const beltAt = giant > 0 &&
        (opts.belt != null ||
            planets[giant].orbitalRadius / planets[giant - 1].orbitalRadius > 1.8)
        ? giant
        : -1;
    const beltHalf = spacing * 0.35;
    let belt = null;
    let edge = opts.starRadius * 1.5;
    for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        if (i === beltAt) {
            const a = planets[i - 1];
            const au = Math.sqrt(a.orbitalRadius * p.orbitalRadius);
            const mid = Math.max(logDistance(au, base, spacing), edge + beltHalf * 1.2);
            const prng = new PRNG(a.seed * 13 + p.seed);
            const notable = [];
            const count = opts.belt ? opts.belt.length : 2 + prng.range(0, 2);
            for (let k = 0; k < count; k++) {
                const rolled = prng.realRange(200, 500);
                const radiusKm = opts.belt ? opts.belt[k] : rolled;
                notable.push({
                    name: `(${k + 1})`,
                    seed: prng.range(1, 99999),
                    radiusKm,
                    visualRadius: visualRadius(radiusKm, earthSize),
                    distance: mid + prng.realRange(-0.7, 0.7) * beltHalf,
                    period: year * Math.pow(au, 1.5),
                    phase: prng.realRange(0, Math.PI * 2),
                });
            }
            belt = { inner: mid - beltHalf, outer: mid + beltHalf, au, notable };
            edge = mid + beltHalf * 1.2;
        }
        const vr = visualRadius(p.radius, earthSize);
        const moons = moonsFor(p, vr, earthSize);
        const last = moons[moons.length - 1];
        const reach = Math.max(vr * (p.rings > 0 ? 2.5 : 1.3), last ? last.distance + last.visualRadius : 0);
        const distance = Math.max(logDistance(p.orbitalRadius, base, spacing), edge + reach * 1.2);
        edge = distance + reach * 1.2;
        out.push({
            distance,
            visualRadius: vr,
            period: year * Math.pow(Math.max(0.05, p.orbitalRadius), 1.5),
            phase: ((Math.abs(p.seed) % 1000) / 1000) * Math.PI * 2,
            moons,
            reach,
        });
    }
    return { planets: out, belt };
}
//# sourceMappingURL=system-layout.js.map