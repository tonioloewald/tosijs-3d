# body-sweep

Clothes, shoes and hair as SWEEPS: a profile taken from the body and carried
along a path, with curves along the way. This is the primitive under the
tailor, the barber and the cobbler (see CHARACTER-DESIGN.md, step 11).

`loftGarment` is the LOFT: rings round the body's cross-section, carried
along a chain of bones (a leg, an arm, the foot). Each ring is the convex
HULL of the body's slice there, so it bridges hollows, plus `thickness` and
an `ease` that may change along the sweep (a flared trouser leg, a puffed
sleeve, a bucket top).

- The slice at a station takes only the skin of that station's BONE (its
  skin weights), so a ring round the shin never takes in the foot, and a
  ring round the thigh never the other leg. `piece` narrows it further: the
  body between its cuts.
- Where the chain bends (the ankle, the elbow), rings square to each bone
  would cross. The join is a MITRE: the ring at the joint lies in the plane
  halfway between the bones, and the rings either side are kept behind it,
  as in a pipe elbow. `steps` rounds the bend instead: that many rings
  turning gradually along a curve through the joint. 0 is the clean mitre,
  which is the default because it round-trips to a modelling tool cleanly.
- Each end is `open` (a free edge: it may stand off the body), `sealed`
  (it meets the body or the next piece: the ease fades to nothing there),
  or `cap` (closed, a toe).
- `length` carries the last ring on past the end of the chain (a hem below
  the ankle, a toe allowance).
- UVs come free: u is round the ring, v along the sweep, in metres.

The result is an ordinary garment binding (as [garment-cut](/garment-cut/)
makes), each ring point bound to the skin it was sliced from, so it fits
every body shape and bends with every clip.

Pure: a rigged body in, a binding out.
