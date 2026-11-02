/*#
# character core

**The character creator's working parts, for any engine.** Twenty modules
make a character without Babylon or a DOM: they read MakeHuman's body, shape
it, fit and bind a skeleton, retarget clips, fit hair and clothes, and save
the result. Each is its own subpath, so a three.js app (or a server, or a
test) imports only what it uses and never pulls in Babylon:

```javascript
import { loadHumanPack } from 'tosijs-3d/human-pack'
import { macroWeights, morphHuman } from 'tosijs-3d/human-morph'
import { humanBodyMaker } from 'tosijs-3d/human-rig'
```

| subpath | what it does |
| --- | --- |
| [`human-pack`](/human-pack/) | MakeHuman's body as data: the base mesh, its rig and its morph targets |
| [`human-morph`](/human-morph/) | sliders (gender, age, muscle, weight, height, ancestry) to a shaped body |
| [`human-rig`](/human-rig/) | UAL's skeleton placed on a shaped body, and skin weights |
| [`rigged-body`](/rigged-body/) | the one shape a rigged body takes, whoever made it |
| `rig-fit` | a skeleton fitted to any mesh from eight markers |
| `bone-heat` | skin weights by bone heat |
| `rig-recipe` | a rig recipe as data |
| [`retarget`](/retarget/) | clips from one skeleton played on another |
| [`spatial-transform`](/spatial-transform/) | the vector and quaternion maths under them |
| [`proxy-fit`](/proxy-fit/), [`proxy-rigid`](/proxy-rigid/) | clothes bound to a body (MakeHuman's `.mhclo`), and rigid parts in them |
| [`hair-fit`](/hair-fit/) | a hairstyle warped onto a head |
| [`garment-cut`](/garment-cut/), [`uv-unwrap`](/uv-unwrap/), [`garment-file`](/garment-file/) | the tailor: garments cut from a body, unwrapped, saved as GLB or OBJ |
| [`skin-tone`](/skin-tone/) | skin colour from one dial |
| [`character-file`](/character-file/) | a character as one versioned JSON document |
| [`character-settings`](/character-settings/) | every setting a character has, with its default; the slots; hair colours; the body pack's URL |
| [`proxy-cover`](/proxy-cover/) | the skin under what is worn, tucked in and hidden |
| [`asset-url`](/asset-url/) | where hosted assets (the body pack, the hair) are fetched from |

What makes it a promise: `pure-core.test.ts` walks their import graph, type
imports included, and fails if any of them reaches `@babylonjs` or a module
outside the list; `no-dom.test.ts` imports each with no DOM, and the packed
tarball is checked the same way under plain Node. The barrel still exports
all of it, unchanged.

Where a body carries something an engine loaded (a file's own materials on
`RiggedBody.surfaces`), the core types it by name only (`SurfaceMaterial`):
it is a handle, never data.
*/
/*{ "parent": "b3d-biped", "order": 65 }*/
export {};
//# sourceMappingURL=character-core.js.map