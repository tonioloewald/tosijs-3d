/*#
# medium

**What is this stuff, where does it end, and how far in am I?** A pure,
Babylon-free description of the *substance* a thing is moving through — air,
water, vacuum, liquid mercury — and the boundary between one and the next.

It answers three questions and does nothing else:

- **how deep** am I in it (`depthIn`)
- **how much** of me is in it (`submergence`, smoothed across a band)
- **did I just cross** its surface (`crossing`)

Everything else — drag, fog, buoyancy, the splash, the regime switch — is the
CALLER's business. This module owns no rendering, no physics and no Babylon
types, so it can be unit-tested and shared by the water, the projectiles, the
vehicles and the shader without any of them depending on each other.

```javascript
import { medium } from 'tosijs-3d'

const sea = medium.plane({ name: 'water', y: 0, band: 0.4, drag: 40, maxSpeed: 12 })

const w = medium.submergence({ x: 0, y: -3, z: 0 }, sea) // 1 — fully under
const c = medium.crossing({ x: 0, y: 2, z: 0 }, { x: 0, y: -1, z: 0 }, sea)
// → 'entered'  (the splash, the whiteout, the regime change: yours to dress)
```

## Two geometries, because there are two real cases

- **`plane`** — a horizontal surface at some `y`. A sea, a fog bank, a smoke
  layer, the top of a mercury vat. Inside is below.
- **`sphere`** — a shell around a centre. A planet's ocean, its atmosphere, the
  edge of space. Inside is within `radius`.

A plane is *not* modelled as a very large sphere. It could be, and it would be
worse: at a 6371 km radius the arithmetic loses the centimetres that decide
whether you are above or below a wave, and every flat scene would pay for a
planet it does not have.

## Stacking: space → air → water

Media nest, and `innermost` picks the one you are actually in — the deepest
match in the list, so an ocean inside an atmosphere inside vacuum resolves the
way you would say it out loud. Nothing here blends *properties* between media;
a caller that wants "half in, half out" has `submergence` for exactly that,
which is the same band-weight the fog compositor already uses (see
[[atmosphere]]) so a surface crossing looks like one event rather than three
subsystems changing their minds at slightly different depths.

## Why a band and not a plane

A hard boundary produces the "thunk": the shader recompiles, the fog jumps, the
drag doubles between one frame and the next. `band` is the thickness over which
the transition happens (metres), smoothstepped — tight enough that entering
water is *obvious*, wide enough that it is not a discontinuity. Tuned from
[[b3d-water]]'s `fogTransition`, which learned this the hard way.
*/
/*{ "parent": "utilities" }*/
/** A horizontal medium — a sea, a fog bank, the top of a mercury vat. */
export function plane(spec) {
    return { kind: 'plane', ...spec };
}
/** A spherical medium — a planet's ocean or atmosphere, the edge of space. */
export function sphere(spec) {
    return { kind: 'sphere', ...spec };
}
/**
 * How far INSIDE the medium a point is, in metres. Negative outside.
 *
 * This is the one primitive everything else is built from, and it is signed on
 * purpose: "depth" and "height above the surface" are the same measurement, and
 * splitting them into two functions is how two subsystems end up disagreeing
 * about where the surface is.
 */
export function depthIn(p, m) {
    if (m.kind === 'plane')
        return m.y - p.y;
    const d = Math.hypot(p.x - m.centre.x, p.y - m.centre.y, p.z - m.centre.z);
    return m.radius - d;
}
/** Smoothstep, matching `atmosphere.band` so a crossing looks like ONE event. */
function smooth(t) {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * (3 - 2 * c);
}
/**
 * How much of you is in it: 0 outside, 1 fully inside, smoothed across `band`.
 *
 * Use this for anything continuous — drag, fog density, a colour blend, how
 * much of the regime has changed over. A caller that wants a boolean can
 * threshold it, but should ask itself why: the boolean is where the thunk
 * comes from.
 */
export function submergence(p, m) {
    const d = depthIn(p, m);
    const b = Math.max(1e-6, m.band);
    return smooth(d / b + 0.5);
}
/**
 * Did the step from `from` to `to` cross the surface?
 *
 * Deliberately a *step* test rather than a state flag: at 200 m/s a projectile
 * can be above the water one frame and 3 m under it the next, so anything that
 * waits to observe a point *inside the band* will miss the splash entirely. The
 * comparison is on the sign of `depthIn`, which is exact at any speed.
 */
export function crossing(from, to, m) {
    const a = depthIn(from, m);
    const b = depthIn(to, m);
    if (a <= 0 && b > 0)
        return 'entered';
    if (a > 0 && b <= 0)
        return 'exited';
    return null;
}
/**
 * The medium a point is actually in: the DEEPEST match, or null for none.
 *
 * Media nest — an ocean inside an atmosphere inside vacuum — and "deepest"
 * resolves that the way you would say it aloud, without the caller having to
 * order the list or name a priority. Vacuum is simply the absence of a match,
 * which is also what it is.
 */
export function innermost(p, media) {
    let best = null;
    let bestDepth = 0;
    for (const m of media) {
        const d = depthIn(p, m);
        if (d > 0 && (best == null || d < bestDepth)) {
            // SMALLER positive depth = a tighter shell = further in. An ocean sits
            // inside an atmosphere, so the point is barely inside the ocean's
            // boundary while being kilometres inside the atmosphere's.
            best = m;
            bestDepth = d;
        }
    }
    return best;
}
/**
 * A projectile's drag coefficient in whatever it is currently passing through.
 *
 * `ballistics.ballisticStep` already folds air density and area into one
 * `dragCoeff`, so a medium is just a different multiplier on it — which is why
 * depth charges and torpedoes need no new integrator, only this number. Blended
 * by `submergence`, so entry is a ramp rather than a wall.
 */
export function dragAt(p, base, media) {
    let k = 1;
    for (const m of media) {
        if (m.drag == null)
            continue;
        k += (m.drag - 1) * submergence(p, m);
    }
    return base * k;
}
/**
 * ⚠️ EXPERIMENTAL. The fog contribution of being inside this medium, at this
 * point — or null when you are outside it or it has no optics.
 *
 * Weight is `submergence`, so the fog and anything else keyed off the same
 * medium (the sky, the underside shader, a regime) cannot disagree about where
 * the surface is. That single shared weight is the entire point.
 */
export function fogLayerFor(p, m) {
    const o = m.optics;
    if (o == null)
        return null;
    const w = submergence(p, m);
    if (w <= 0)
        return null;
    const depth = Math.max(0, depthIn(p, m));
    const deeper = Math.min(1, depth / Math.max(1e-6, o.murkDepth ?? 30));
    const density = (o.density ?? 0) + (o.murk ?? 0) * deeper;
    return {
        weight: w,
        color: o.color,
        density,
        start: 0,
        // Contribute an `end` too: a LINEAR fog mode ignores density entirely, so a
        // density-only layer tints without ever thickening.
        end: Math.max(o.minVisibility ?? 6, density > 0 ? 3 / density : 1e6),
    };
}
//# sourceMappingURL=medium.js.map