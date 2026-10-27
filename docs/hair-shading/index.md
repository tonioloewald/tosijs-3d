# hair-shading

Hair coloured the way a colourist describes it: a BASE colour and a
HIGHLIGHT colour. A material plugin tints the hair texture with the base,
leans its brighter strands toward the highlight (so a dark base with caramel
highlights reads as highlighted hair, not a flat tint), and colours the
strand sheen with the highlight too.

`HAIR_COLOURS` are presets in pairs, natural and dyed: each base with the
highlight it usually comes with, which a picker can then move anywhere.

`hairShading(material, { desaturate })` attaches it; `desaturate` reads a
texture that is already coloured (MakeHuman's hair and beards) as grey first,
so the same colours apply to every library's hair.
