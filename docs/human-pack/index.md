# human-pack

A **human pack** is a base body as data: its mesh, its joints and its shape
targets, converted from MakeHuman's CC0 assets by `static-assets`'
`bin/makehuman-pack.ts`. It is what the character creator (CHARACTER-DESIGN.md)
morphs; [human-morph](/human-morph/) says which targets a body uses and sums them.

A pack is a manifest (`hm08.json`) plus binaries named by their content hash,
so the binaries cache forever and a target is fetched the first time a body
asks for it. `loadHumanPack(url)` reads the manifest, the positions and the
body's triangles; `pack.target(name)` fetches one target (once).

What the manifest holds:

- **vertexCount**: every vertex, body and helpers (19,158 for hm08); targets move all of them
- **positions**: float32 xyz, metres, RIGHT-HANDED (as OBJ and glTF are)
- **body**: the triangles to draw (uint32, in threes), indexing the positions
- **joints**: a joint name → the vertices whose centroid it is (MakeHuman's joint cubes)
- **bones**: a bone → its parent, and the joints at its head and tail
- **regions**: a mask name (`lips`) → a uint8 per vertex, for tinting without UVs
- **proxies**: clothes, hair and brows bound to the base (MakeHuman's `.mhclo`: three base vertices, weights and a scaled offset per vertex), with their mesh, UVs, the base vertices they cover, and textures; see [proxy-fit](/proxy-fit/)
- **parts**: extra geometry on the body's own vertices (`eyes`, `eyelashes`), so every target moves it with the body: the pack vertices it uses (uint32), triangles indexing that list (uint32), and UVs (float32 pairs) where it has a texture
- **targets**: a target name → its file, its int16 step (metres), and whether it is dense

A dense target is int16 xyz for every vertex in order; a sparse one is `count`
uint32 vertex indices followed by `count` int16 xyz. Multiply by `step` for
metres.
