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
