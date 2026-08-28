/*#
# mantle

**Climbing onto a ledge that is too high to step onto.** The pure decision and
the pure path: given what a probe saw in front of the character, is there a lip
worth climbing, and where does the body travel to get on top of it?
Babylon-free, deterministic, unit tested.

## It is not a water feature

It arrived as one — Tonio, swimming: *"when you swim to the water's edge, you
just pop instantly to the surface onto the land."* But climbing out of a pond is
**mantling a ledge of height h**, and the water is incidental. Written as
`swim_exit` it would be one animation that only ever plays at a shoreline;
written as a mantle it is the bank, the low wall, the crate and the ledge, from
one verb. Quaternius agrees, and says so in its naming: the clips are
`ClimbUp_1m` and `ClimbUp_2m` — indexed by HEIGHT, not by what you were doing
before.

That is also the MOBILITY-DESIGN rule doing its job. A ledge is a fact about
geometry; `_climbable` would be a fact about a level designer, and the design
doc calls that out by name as the thing that makes players stop believing their
eyes.

## The band, and why both ends of it matter

A mantle is what happens BETWEEN two things that already work:

| height              | what happens                             |
| ------------------- | ---------------------------------------- |
| below `stepUp`      | you just walk up it — the step offset    |
| `stepUp` … `reach`  | **mantle**                               |
| above `reach`       | a wall; you stop                         |

So the lower bound is not a tuning choice, it is whatever the walking code
already absorbs — pass it in rather than restating it, or the two disagree and
you get a band of heights that is neither steppable nor climbable and reads as
an invisible wall.

## The path is an ARC, and a lerp is wrong

Straight-lining from the water to the ledge top drives the body THROUGH the lip.
A mantle goes **up first, then in** — that is what the shape of the animation is
— so the path rises early and translates late, with an overlap in the middle so
it is one motion rather than two.

Timing is the one thing here that is a choice rather than a measurement, and it
is expressed as fractions of the clip so it retimes itself when the animation
set changes.
*/
/*{ "parent": "Vehicles" }*/
export const defaultMantleLimits = {
    stepUp: 0.5,
    reach: 2.2,
    grabDistance: 0.8,
    clearance: 1.6,
    minLanding: 0.4,
};
/**
 * Is this something to climb?
 *
 * Every clause is a way of NOT being a ledge, and each one was worth writing
 * separately: too low is a step, too high is a wall, too far is nothing yet, too
 * little headroom is a gap under an overhang, and too little landing is a lip
 * with no floor behind it — which is the one that would strand a character on
 * top of a fence.
 */
export function canMantle(reading, limits = defaultMantleLimits) {
    const l = { ...defaultMantleLimits, ...limits };
    return (reading.height > l.stepUp &&
        reading.height <= l.reach &&
        reading.distance <= l.grabDistance &&
        reading.headroom >= l.clearance &&
        reading.landing >= l.minLanding);
}
/**
 * Where the body should be, `t` of the way (0..1) through the climb.
 *
 * `from` is where it started, `to` the standing spot on top. Rise leads,
 * translation follows, and they overlap — see the note above about why a
 * straight line is wrong.
 */
export function mantlePath(from, to, t, riseEnds = 0.65, moveStarts = 0.35) {
    const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
    const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)); // smoothstep
    const up = ease(c / Math.max(0.01, riseEnds));
    const inward = ease((c - moveStarts) / Math.max(0.01, 1 - moveStarts));
    return {
        x: from.x + (to.x - from.x) * inward,
        y: from.y + (to.y - from.y) * up,
        z: from.z + (to.z - from.z) * inward,
    };
}
/**
 * Which climb clip suits this height, from whatever the rig actually has.
 *
 * Quaternius indexes them by metres (`ClimbUp_1m`, `ClimbUp_2m`), so the choice
 * is a measurement rather than a guess. Takes the available names so a rig with
 * one generic `ClimbLedge` — or none — still gets an answer instead of a
 * missing-animation warning.
 */
export function mantleClip(height, available, fallback = 'jump') {
    const byHeight = available
        .map((name) => {
        const m = /(\d+(?:\.\d+)?)\s*m$/i.exec(name);
        return m ? { name, h: parseFloat(m[1]) } : null;
    })
        .filter((v) => v != null);
    if (byHeight.length > 0) {
        return byHeight.reduce((best, c) => Math.abs(c.h - height) < Math.abs(best.h - height) ? c : best).name;
    }
    const generic = available.find((n) => /climb|ledge|mantle|vault/i.test(n));
    return generic ?? fallback;
}
//# sourceMappingURL=mantle.js.map