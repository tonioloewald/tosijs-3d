# cloud-field

**One cloud field, sampled by everything that needs it.** BILLOW noise, not
fBm — the absolute value creases the field at every zero crossing, which is what
makes cloud read as cauliflower instead of swell. A deck you can see, a
shadow on the ground, and a whiteout when you fly through it are three views of
the same weather — so they are three reads of one array rather than three
systems that have to be kept in agreement.

That agreement is the whole point. Recycling blobs cannot give it: the shadow
map is painted from where the blobs happen to be, so the shade underfoot never
quite belongs to the cloud overhead. Tonio: *"having a single decal (even if it
has less coverage) that is driven by the cloud shader logic seems like a
performance and appearance win."* It is both, and the appearance half is the
one you notice.

## Baked once, not evaluated per pixel

`cloudField` returns a **tileable** density array. Both consumers sample that
texture by world XZ rather than re-implementing the noise — which matters more
than it sounds, because the alternative is a pure TypeScript version and a GLSL
version that have to produce identical output forever. They would not. Every
"why is the shadow slightly off the cloud" bug lives in that gap, and baking
removes the gap rather than narrowing it.

`coverage` is deliberately NOT baked in. It is a threshold applied at sample
time, so weather is a live uniform on both the deck and its shadow and they
cannot disagree about it — clear to overcast with nothing regenerated.

## Cirrus vs cumulus is one dial

`cirrus` runs from rounded heaps to long wispy streaks, and it moves two things
together because one alone does not read: the noise domain is STRETCHED along a
heading (long), and the billow fold is inverted and narrowed into filaments
(wispy). Stretch on its own makes sausages; filaments on their own make a
scribble. Tonio asked for "more long and wispy vs more rounded" — those are the
two axes of the same request, so they are one control.

The stretch is free of seams because the two torus radii are independent: the
wrap comes from going round a circle, so any radii tile. **Which WAY the
streaks run is not baked at all** — rotating inside the bake does not tile
(`u` advances by `2π·cos θ` across the field, which only closes at right
angles), so the heading is a rotation of the sampler's UVs instead. A wrapped
texture read through a rotated UV has no seam, the repeat lattice simply sits
at an angle to the world — and changing the wind direction costs no rebake.

## Tileable by construction

Sampled on a torus, the same trick `water-normal` uses: the 2D position is
mapped onto two circles in 4D and read from 3D noise, so the field wraps in both
axes with no seam to hide. A cloud deck has to repeat — it covers the sky — and
a visible tile boundary is worse than no clouds.
