/*#
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

A rigged body is plain data, Babylon-free:

- **`positions`, `indices`**: the rest mesh, right-handed (as glTF and OBJ
  are): metres, +Y up, facing +Z, its left on +X, standing on y = 0 or near.
- **`rig`**: UAL's 65 joints (`rig.at(name)`), from `fitSkeleton` or MakeHuman's
  joint cubes.
- **`weights`**: four joints and weights per vertex, indexing `rig.joints`.
- **`regions`**: masks, one value per vertex from 0 to 1, where the maker
  knows them: `lips` and `nipples` from MakeHuman. A consumer that wants one
  and finds none does without (or works it out from the shape).
- **`made`**: how it was made, enough to make it again: the markers (and
  where the mesh came from), or MakeHuman's slider values.

`buildBody` (in [auto-rig](/rig-build/)) makes it a Babylon skeleton.
*/
/*{ "parent": "b3d-biped", "order": 70 }*/

import type { Vec3 } from './spatial-transform.js'
import {
  fitSkeleton,
  guessMarkers,
  meshQuery,
  rigSilhouette,
  skinSegments,
  type FittedRig,
  type Markers,
} from './rig-fit.js'
import { boneHeat, type SkinWeights } from './bone-heat.js'

/** How a rigged body was made: enough to make it again. */
export type RiggedBodyOrigin =
  | {
      by: 'markers'
      /** Where the mesh came from (a URL or file name), if known. */
      source?: string
      markers: Markers
      tail?: Vec3 | null
    }
  | {
      by: 'makehuman'
      /** The pack's base (`hm08`) and version. */
      base: string
      version: number | string
      /** The slider values. */
      body: Record<string, number>
    }

export interface RiggedBody {
  positions: Float32Array
  indices: Uint32Array
  rig: FittedRig
  weights: SkinWeights
  /** Per-vertex masks (0 to 1) the maker knows: `lips`, `nipples`. */
  regions: Record<string, Float32Array>
  made: RiggedBodyOrigin
}

/** A mesh as triangles, in its file's own (right-handed) frame. */
export interface BodyTriangles {
  positions: ArrayLike<number>
  indices: ArrayLike<number>
}

/**
 * A mesh rigged from markers (the rig tool's way): UAL's skeleton fitted to
 * them, the skin bound by bone heat. Markers are guessed from the front
 * outline when not given. About a second for 20,000 vertices.
 */
export function bodyFromMarkers(
  tris: BodyTriangles,
  options: {
    markers?: Markers
    /** A tail's tip (seen from the side), for a tail chain. */
    tail?: Vec3 | null
    tailBones?: number
    source?: string
  } = {}
): RiggedBody {
  const positions = Float32Array.from(tris.positions)
  const indices = Uint32Array.from(tris.indices)
  const markers =
    options.markers ?? guessMarkers(rigSilhouette(positions, indices, 'front'))
  const rig = fitSkeleton(markers, meshQuery(positions, indices), {
    tail: options.tail ?? undefined,
    tailBones: options.tailBones,
  })
  return {
    positions,
    indices,
    rig,
    weights: boneHeat(positions, indices, skinSegments(rig)),
    regions: {},
    made: {
      by: 'markers',
      source: options.source,
      markers,
      tail: options.tail ?? null,
    },
  }
}
