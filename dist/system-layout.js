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
- **Periods follow Kepler** (a cube law in the real distance), sped up so a
  year takes about a minute.

Everything follows from each body's seed, so the same system lays out the
same way every time.
*/
/*{ "parent": "b3d-star-system", "order": 10 }*/
import { PRNG } from './mersenne-twister.js';
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
            period: 12 * Math.pow(d / vr, 1.5),
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
    const year = opts.year ?? 60;
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