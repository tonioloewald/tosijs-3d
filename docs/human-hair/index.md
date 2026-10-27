# human-hair

Hairstyles, beards and eyebrows from a library made for another head, worn
by a [character builder](/character-builder/) body. The library is
Quaternius' CC0 hairstyles (`quaternius/libraries/hairstyles.glb` on the
CDN: 19 adult styles, their teen versions and six pairs of eyebrows), each
modelled in place on Quaternius' base head.

`loadHairLibrary(scene, url)` reads the library once: each piece's vertices
in the file's own frame (right-handed, +Z forward, the frame a human pack
uses), its UVs, its triangles and its material, and the HEAD it was
modelled on (`Reference_Head`, Quaternius' Regular_Male). `headScalp(...)`
warps that head's skin onto a body's ([hair-fit](/hair-fit/)): a per-axis
fit, then each skin point's own correction, the scalp and the face
separately. `humanHair(...)` carries any piece through the warp, so every
hair keeps its height above the scalp under it, and hangs it on the Head
bone so it moves with the clip.

Fitting the hair itself to the skin does not work: a style is one outer
shell with no underside, so laid on the skin it sinks by its own thickness.

The library's hair texture is a neutral grey meant to be tinted, so
`hairMaterial` gives one material per colour from `hairColor`: black to
platinum, plus red.
