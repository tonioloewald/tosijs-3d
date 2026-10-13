# caustics

**Light through a moving surface, dancing on what is under it:** the single
strongest "this is underwater" cue after the colour (tosijs-3d#16, board
#198). `b3d-water` turns it on with `caustics`; this module is the mechanism.

It is the projected-texture technique, the same one `cloud-shadows` uses: a
material plugin samples a tiling caustic pattern by WORLD position, so it lands
on terrain, hulls, the player, anything, with no per-mesh setup. Only below the
water surface; projected along the sun, so the pattern slants as the sun does;
two layers scrolling at different rates combined with `min`, which is what makes
caustics shimmer rather than slide; and fading with depth, and with the fog,
because a fully fogged fragment must stay fog.

The pattern is a pure function (`causticPattern`): a seeded cellular (Worley)
field on a torus, so it tiles by construction, bright along the cell EDGES the
way real caustic networks are. No file, no network.
