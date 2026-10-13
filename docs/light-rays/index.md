# light-rays

The pure half of light shafts (WEATHER-DESIGN stage 4, board #1084): when a
shaft exists, how bright it is along its length and toward the sun, how it
widens, and how sunlight bends entering water. No Babylon;
[[b3d-light-shafts]] draws it, under the cloud deck and under the water with
the SAME model.

**The model** (Tonio, 2026-09-27):

- A shaft STARTS at the edge the light comes through (the underside of the
  cloud, the underside of the water) and runs away from it along the light.
- It is an additive fill of the light's colour, flat across and NOT blurred:
  `edge` (0.35) at the source, falling linearly to 0 at its far end.
- It is RECTANGULAR by default (`spread` 0): parallel to the sun's light,
  so perspective alone makes a set of them radiate from the sun and widen
  toward you. `spread` adds real widening if wanted.
- It is most prominent looking TOWARD the sun: light scattered forward by
  the medium, a phase term on the angle between your view and the sun.
- Under cloud it only makes sense for a broken sky: coverage 0.5 or more, but
  not closed (1+). And the gaps set the width: broad shafts from the ragged
  sky at the threshold, very narrow ones as the cover closes toward 1.
