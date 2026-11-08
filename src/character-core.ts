/*#
# character core

**The character creator's working parts, for any engine.** Twenty-nine modules
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
| [`skin-paint`](/skin-paint/) | the lips and stubble over the skin, as vertex colours (glTF's `COLOR_0`) |
| [`cloth-bake`](/cloth-bake/) | a recoloured garment's texture, baked to a picture |
| [`character-sources`](/character-sources/) | the bodies besides MakeHuman's, with Tonio's hand-placed rigs for the AI cast |
| [`eye-art`](/eye-art/) | Tonio's eye art with its iris recoloured, and UVs that map both eyes onto it |
| `png` | PNG read and written, byte for byte, with no canvas |
| [`character-file`](/character-file/) | a character as one versioned JSON document |
| [`character-settings`](/character-settings/) | every setting a character has, with its default; the slots; hair colours; the body pack's URL |
| [`proxy-cover`](/proxy-cover/) | the skin under what is worn, tucked in and hidden |
| [`skinned-glb`](/skinned-glb/), [`glb-chunks`](/glb-chunks/) | a rigged, morphing body out as a GLB (validator-clean); GLB chunks read and written |
| [`glb-rig`](/glb-rig/) | a mesh file's triangles for rigging from its bytes (frame, skin at rest, surfaces with their materials and pictures, eyes): `bodyFromMarkers` with no scene |
| [`rigged-body-glb`](/rigged-body-glb/), `ual-rest` | any rigged body out as a skinned GLB in Dramatis's export profile (UAL's 65 joints and frames, T-pose, root at the feet, its own materials), so UAL's clips play on it by name; Mixamo names as an option |
| [`spring-vrm`](/spring-vrm/), `spring-chain` | springs (tails, strands) as `VRMC_springBone` for every VRM loader, plus `TOSIJS_spring_chains` with our own settings; how the two models differ |
| [`hair-place`](/hair-place/) | Quaternius' hairstyles placed on a body's head, and the library read from its GLB |
| [`mesh-sdf`](/mesh-sdf/) | signed distance to a triangle mesh: inside, and how deep |
| [`remesh`](/remesh/) | an even surface laid over a mesh with bad triangles (the tailor's dummy) |
| [`cloth-drape`](/cloth-drape/) | cloth cut to an outline laid over a body, sewn, settled and bound to it |
| [`fit-extremes`](/fit-extremes/) | every garment and hairstyle on the bodies at the sliders' corners, checked for penetration and bone sanity |
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

export {}
