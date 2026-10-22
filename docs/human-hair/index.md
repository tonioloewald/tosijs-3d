# human-hair

Hairstyles, beards and eyebrows from a library made for another head, worn
by a [character builder](/character-builder/) body. The library is
Quaternius' CC0 hairstyles (`quaternius/libraries/hairstyles.glb` on the
CDN: 19 adult styles, their teen versions and six pairs of eyebrows), each
modelled in place on Quaternius' base head.

`loadHairLibrary(scene, url)` reads the library once: each piece's vertices
in the file's own frame (right-handed, +Z forward, the frame a human pack
uses), its UVs, its triangles and its material. `headScalp(...)` measures a
body's head and fits the library's buzz cut onto its scalp
([hair-fit](/hair-fit/)), and `humanHair(...)` puts any piece on that head
through the same fit, pushed out of the skin wherever the shapes differ, and
hangs it on the Head bone so it moves with the clip.

The library's hair texture is a neutral grey meant to be tinted, so
`hairMaterial` gives one material per colour from `hairColor`: black to
platinum, plus red.
