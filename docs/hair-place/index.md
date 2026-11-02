# hair place

**Hair placed on a body, with no engine**: the geometry half of
[human-hair](/human-hair/). Quaternius' CC0 hairstyles are each modelled in
place on one of Quaternius' heads, so a piece is carried from THAT head to a
body's head: `headScalp` measures the body's head and warps the library
head's skin onto it ([hair-fit](/hair-fit/)), and `placeHair` takes a piece
through the warp, keeps each vertex's height above the skin, lays a
moustache's lower edge on the top of this upper lip, applies any hand
`nudge`, and pushes anything left inside the skin back out.

```javascript
import { readHairLibrary, referenceHeads, closestHead, headScalp, placeHair, hairFitFor } from 'tosijs-3d/hair-place'
const pieces = readHairLibrary(glbBytes)            // the library, read from its GLB
const heads = referenceHeads(pieces)                // the heads it was modelled on
const scalp = headScalp(pack.manifest, positions, triangles, { lips })
const piece = pieces.find((p) => p.name === 'Hair_Buzzed')
const head = closestHead(piece.parts, heads)
const placed = piece.parts.map((part) => placeHair(scalp, part, { head, on: hairFitFor(piece.name, piece.category) }))
```

[human-hair](/human-hair/) loads the same library into Babylon and places
it with these functions, so an exporter (or another engine) puts every piece
exactly where the character builder does.
