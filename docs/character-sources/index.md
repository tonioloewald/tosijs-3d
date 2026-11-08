# character sources

**The bodies a character can have besides MakeHuman's**, as data: where each
mesh is on the asset CDN, which node to take, and for Tonio's AI-made cast
(CC0, `tonio/ai`) the rig he placed by hand in the [rig tool](/rig-tool/):
the front markers, joints moved after the fit, and how much hand to rig (the
spacesuits' gloves are mittens). Engine-free, so an exporter or another engine
rigs the cast the way the [character builder](/character-builder/) does:

```javascript
import { AI_CHARACTER_SOURCES } from 'tosijs-3d/character-sources'
import { glbRigTriangles } from 'tosijs-3d/glb-rig'
import { bodyFromMarkers } from 'tosijs-3d/rigged-body'
import { riggedBodyGlb } from 'tosijs-3d/rigged-body-glb'

const source = AI_CHARACTER_SOURCES['eurasian-male-spacesuit']
const bytes = new Uint8Array(await (await fetch(source.url)).arrayBuffer())
const body = bodyFromMarkers(glbRigTriangles(bytes, { pick: source.pick }), source.recipe.binding)
const glb = riggedBodyGlb(body, { recipe: source.recipe })
```

A source's `url` is read when it is used, under the asset base
(`assetUrl`), so set the base first. `rigFromMarkers` is how a hand-placed rig
is written down: the left side, mirrored to the right.

Pure: no DOM, no Babylon.
