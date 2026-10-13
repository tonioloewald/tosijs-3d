# glb-manifest

**Reading the catalogue a curated library carries inside itself.** A GLB's JSON
chunk holds attribution (`asset.extras`) and, for libraries built by
`static-assets`, a per-item manifest at `scenes[0].extras.library` — name,
category, tags and bounding size for every model in the kit. Pure, dependency
free, unit tested.

## Read it off the LOADED NODES first — this is the fallback

**Babylon surfaces per-NODE extras and drops per-SCENE extras.** Its
`ExtrasAsMetadata` loader extension (registered by default when you import
`@babylonjs/loaders`) copies `extras` onto `metadata.gltf.extras` for nodes,
cameras, materials and animations — and scenes are not in that list. Verified
by loading a real library headlessly, not inferred:

    node "grass" → metadata.gltf.extras {category:"grass", tags:["grass"]}   ✅
    any node carrying scenes[0].extras.library                    → NONE      ❌

And the libraries already write per-item extras onto every item's own node, so
**`manifestFromNodes` is the route that works with no parsing at all** — the data
is sitting on the node you were going to query anyway. Use it.

This module's GLB parsing exists for the case that route cannot serve: reading a
library's contents WITHOUT loading it into a scene. It is also how `size` is
obtained until the builder writes it per node (today it lives only in the scene
index, where Babylon cannot reach it).

Recorded because the discovery went the wrong way round first: I found
`scenes[0].extras.library`, confirmed Babylon dropped it, and wrote a parser —
before checking the nodes, which had carried the same data all along. The
container format was the last place to look, not the first.

## Why the catalogue lives INSIDE the artifact

Deliberate, and a policy rather than a convenience. cdn.tosijs.net vends only
explicitly curated files: no sidecar manifests, no index, no directory listings.
Tonio: _"making all this cheaply discoverable would facilitate piracy and it's
not my content."_ Most of it is Kenney and Quaternius work, some of it paid — a
curated library is a use of the licence, a machine-readable catalogue of
everything is a mirror.

Metadata carried inside the GLB respects that line exactly: it helps whoever
already holds the artifact and publishes nothing to anyone who does not. That is
why this reads from the file and why there will never be a `.json` beside it.

## What a size is good for

`size` is the model's bounding box in metres, at library scale. It answers
"what fits here" without instantiating anything — the question placement code
actually asks, and the reason this beats measuring after the fact.
