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
*/
/*{ "parent": "b3d-biped", "order": 70 }*/

import type { Material } from '@babylonjs/core'
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
      tailBase?: Vec3 | null
      /** Joints moved by hand after the fit, by name. */
      joints?: Record<string, Vec3>
    }
  | {
      /**
       * Skinned to UAL's skeleton already (in a modeller, or as Quaternius'
       * characters come): its own joints and weights, no markers.
       */
      by: 'skin'
      source?: string
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
  /** Texture coordinates, two per vertex (a file's). */
  uvs?: Float32Array
  /** Vertex colours, RGBA per vertex (a file's). */
  colors?: Float32Array
  /** Its triangles in runs, one per material (a file's). */
  surfaces?: BodySurface[]
  /** Its eyeballs (a file's), left first, not part of the mesh above. */
  eyes?: BodyEye[]
}

/** An eyeball: its own triangles, in the body's frame. */
export interface BodyEye {
  positions: Float32Array
  indices: Uint32Array
}

/**
 * A run of a body's triangles drawn with one material: `start` and `count`
 * are in `indices`, `name` is the material's (unique within the body), and
 * `material` the file's own, loaded (a handle, not data: it is not saved).
 */
export interface BodySurface {
  start: number
  count: number
  name: string
  material?: Material
}

/** A mesh as triangles, in its file's own (right-handed) frame. */
export interface BodyTriangles {
  positions: ArrayLike<number>
  indices: ArrayLike<number>
  uvs?: ArrayLike<number>
  colors?: ArrayLike<number>
  surfaces?: BodySurface[]
  eyes?: BodyEye[]
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
    /** Where the tail starts, if not the back of the pelvis. */
    tailBase?: Vec3 | null
    tailBones?: number
    source?: string
    /**
     * Joints moved by hand after the fit (a thumb, a toe, a shoulder): name
     * → where it is. They win over where the fit put them.
     */
    joints?: Record<string, Vec3>
  } = {}
): RiggedBody {
  const positions = Float32Array.from(tris.positions)
  const indices = Uint32Array.from(tris.indices)
  const markers =
    options.markers ?? guessMarkers(rigSilhouette(positions, indices, 'front'))
  const fitted = fitSkeleton(markers, meshQuery(positions, indices), {
    tail: options.tail ?? undefined,
    tailStart: options.tail != null ? options.tailBase ?? undefined : undefined,
    tailBones: options.tailBones,
  })
  const moved = options.joints ?? {}
  const rig: FittedRig = Object.keys(moved).length
    ? (() => {
        const joints = fitted.joints.map((j) =>
          moved[j.name] != null ? { ...j, position: { ...moved[j.name] } } : j
        )
        const byName = new Map(joints.map((j) => [j.name, j.position]))
        return { ...fitted, joints, at: (name: string) => byName.get(name) }
      })()
    : fitted
  return {
    positions,
    indices,
    rig,
    weights: boneHeat(positions, indices, skinSegments(rig)),
    regions: {},
    ...surfaceOf(tris),
    made: {
      by: 'markers',
      source: options.source,
      markers,
      tail: options.tail ?? null,
      ...(options.tail != null && options.tailBase != null ? { tailBase: options.tailBase } : {}),
      ...(Object.keys(moved).length ? { joints: { ...moved } } : {}),
    },
  }
}

/** A file's uvs, colours and surfaces, carried onto the body made from it. */
export function surfaceOf(
  tris: BodyTriangles
): Pick<RiggedBody, 'uvs' | 'colors' | 'surfaces' | 'eyes'> {
  return {
    ...(tris.eyes?.length ? { eyes: tris.eyes } : {}),
    ...(tris.uvs ? { uvs: Float32Array.from(tris.uvs) } : {}),
    ...(tris.colors ? { colors: Float32Array.from(tris.colors) } : {}),
    ...(tris.surfaces?.length ? { surfaces: tris.surfaces.map((s) => ({ ...s })) } : {}),
  }
}

/** An object is an eye when its name says so (`eye`, `eyes`, `eyeball`; not a brow or lash). */
export function isEyeName(name: string): boolean {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z]+/)
    .some((w) => /^eye(s|ball|balls)?$/i.test(w))
}

/**
 * Eye triangles (one object or several) as one eye per side: each triangle
 * goes to the side its centre is on (left is +X). Left first; a side with
 * none is left out.
 */
export function splitEyes(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>
): BodyEye[] {
  const sides = [1, -1].map((sign) => {
    const remap = new Map<number, number>()
    const pos: number[] = []
    const ix: number[] = []
    for (let t = 0; t < indices.length; t += 3) {
      const x = positions[indices[t] * 3] + positions[indices[t + 1] * 3] + positions[indices[t + 2] * 3]
      if (x * sign <= 0) continue
      for (let k = 0; k < 3; k++) {
        const v = indices[t + k]
        let at = remap.get(v)
        if (at == null) {
          at = pos.length / 3
          remap.set(v, at)
          pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2])
        }
        ix.push(at)
      }
    }
    return { positions: Float32Array.from(pos), indices: Uint32Array.from(ix) }
  })
  return sides.filter((e) => e.indices.length > 0)
}

/** An eye's centre (the middle of its bounds) and radius. */
export function eyeCentre(eye: BodyEye): { centre: Vec3; radius: number } {
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  const p = eye.positions
  for (let i = 0; i < p.length; i += 3)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[i + k])
      hi[k] = Math.max(hi[k], p[i + k])
    }
  const c = lo.map((l, k) => (l + hi[k]) / 2)
  let r = 0
  for (let i = 0; i < p.length; i += 3)
    r = Math.max(r, Math.hypot(p[i] - c[0], p[i + 1] - c[1], p[i + 2] - c[2]))
  return { centre: { x: c[0], y: c[1], z: c[2] }, radius: r }
}

/*
AN EYE'S UVS ARE MADE, NOT READ: a file's eye can be mapped any way, so it is
mapped the same way every time. Each point goes by its angle from straight
ahead (+Z, where the body faces) and its direction round that axis: the iris
(about 29° across the radius, a real iris on a real eyeball) lands on the
disc an eye texture paints, and the sclera round it, to a ring where the back
of the eye, unseen in the socket, gathers.
*/
/**
 * UVs for an eye on an eye texture's layout: the iris centred on `at` (u, v
 * from the bottom), `iris` its radius in UV.
 */
export function eyeUvs(
  eye: BodyEye,
  layout: { at: { u: number; v: number }; iris: number },
  options: { irisDeg?: number; back?: number } = {}
): Float32Array {
  const irisAngle = ((options.irisDeg ?? 29) * Math.PI) / 180
  const back = options.back ?? layout.iris * 2.5
  const { centre } = eyeCentre(eye)
  const p = eye.positions
  const out = new Float32Array((p.length / 3) * 2)
  for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
    const x = p[i] - centre.x
    const y = p[i + 1] - centre.y
    const z = p[i + 2] - centre.z
    const side = Math.hypot(x, y)
    const r = Math.min(back, (layout.iris * Math.atan2(side, z)) / irisAngle)
    // Left is +X: seen from the front, the eye's +X is the picture's left.
    const cos = side > 1e-9 ? -x / side : 0
    const sin = side > 1e-9 ? y / side : 0
    out[j] = layout.at.u + r * cos
    out[j + 1] = layout.at.v + r * sin
  }
  return out
}
