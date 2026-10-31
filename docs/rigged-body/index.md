# rigged-body

**One shape for a character's body, whoever made it.** A rigged body is a
rest mesh on UAL's skeleton with its skin weights: what the
[rig tool](/rig-tool/) makes of any mesh and its markers, and what
[human-rig](/human-rig/) makes of MakeHuman's body and its sliders. Everything
the [character builder](/character-builder/) does with a body (play clips,
stand it on the floor, cut garments, fit hair, dress it) takes a rigged body,
so it works the same on either.

```javascript
import { bodyFromMarkers, buildBody, objTriangles } from 'tosijs-3d'

const body = bodyFromMarkers(objTriangles(text))   // markers guessed
const built = buildBody(scene, 'weasel', body)     // a Babylon skeleton on it
```

THREE PRODUCERS: `bodyFromMarkers` (any mesh and its markers), `humanBodyMaker`
(MakeHuman's sliders), and `loadSkinnedBody` (in [auto-rig](/rig-build/)): a
file already skinned to UAL's skeleton, as Quaternius' characters are or as
you can bind a mesh to it in Blender, taken as it is: its joints, its weights,
no markers. The skeleton to bind to comes with Quaternius'
[Universal Animation Library](https://quaternius.itch.io/universal-animation-library)
and [Universal Base Characters](https://quaternius.itch.io/universal-base-characters)
(CC0, pay what you want; the Blender sources are in the paid tiers): get it
there rather than from the copies this site's demos load.

A rigged body is plain data, Babylon-free:

- **`positions`, `indices`**: the rest mesh, right-handed (as glTF and OBJ
  are): metres, +Y up, facing +Z, its left on +X, in its maker's own frame
  (a file's, standing on y = 0 or near; MakeHuman's is centred on the hips).
  `rig.at('root')` says where its feet are.
- **`rig`**: UAL's 65 joints (`rig.at(name)`), from `fitSkeleton` or MakeHuman's
  joint cubes.
- **`weights`**: four joints and weights per vertex, indexing `rig.joints`.
- **`regions`**: masks, one value per vertex from 0 to 1, where the maker
  knows them: `lips` and `nipples` from MakeHuman. A consumer that wants one
  and finds none does without (or works it out from the shape).
- **`made`**: how it was made, enough to make it again: the markers (and
  where the mesh came from), MakeHuman's slider values, or `skin` (the file's
  own).
- **`uvs`, `colors`, `surfaces`** (a file's, when it has them): its texture
  coordinates, vertex colours (RGBA), and its triangles in runs, one per
  material, each with the file's own material. A consumer draws each surface
  as made or puts its own material on it (the builder's skin).

`buildBody` (in [auto-rig](/rig-build/)) makes it a Babylon skeleton.
