# auto-rig

**Binding a mesh to a skeleton, with no rig to start from.** Eight markers on
a mesh's front view (chin, groin, wrists, elbows, knees) place UAL's 65-bone
skeleton (`fitSkeleton`), bone heat binds the skin to it (`boneHeat`), and
`buildRig` makes a Babylon skeleton of the result, so `retargetClip` plays
UAL's clips on it and `springNodes` swings a tail.

To do this by hand, use the [rig tool](/rig-tool/): load a GLB or OBJ with
no skeleton (or turn off `use its own skeleton` to ignore the one it has),
drag the markers onto its joints (the skeleton follows each time you let go,
and the skin is bound again when you animate or press done). The markers are
saved in its recipe. This page is the code underneath, for doing
the same in your own page or pipeline.

## Usage

```
import {
  objTriangles, guessMarkers, rigSilhouette, fitSkeleton, meshQuery,
  skinSegments, boneHeat, buildRig, readSkeleton, retargetClip,
} from 'tosijs-3d'

// The mesh as triangles, in its file's own (right-handed) frame,
// facing +Z with its left on +X.
const { positions, indices } = objTriangles(await (await fetch(url)).text())

// Markers: guessed from the outline, or from a rig tool recipe's `binding`.
const markers = recipe?.binding?.markers ??
  guessMarkers(rigSilhouette(positions, indices, 'front'))

const rig = fitSkeleton(markers, meshQuery(positions, indices), {
  tail: recipe?.binding?.tail ?? undefined,
})
const weights = boneHeat(positions, indices, skinSegments(rig))
const built = buildRig(scene, 'weasel', positions, indices, rig, weights)
built.root.parent = stand // move it by a parent of root, never root itself

// ualWalk, ualSkin and ualRoot: a clip, skeleton and __root__ from UAL's GLB.
const walk = retargetClip(ualWalk, readSkeleton(ualSkin, ualRoot),
  readSkeleton(built.skeleton, built.root), { scene })
walk.start(true)
```

For a model file, `loadRigTriangles(scene, urlOrFile, { pick })` reads its
triangles (its own skeleton ignored), and `autoRig(scene, name, tris)` does
the rest in one call (markers guessed unless you pass them), returning the
built rig with its `rig` and `markers`:

```
const body = autoRig(scene, 'body', await loadRigTriangles(scene, url))
body.root.parent = stand
```

A tail, when `fitSkeleton` is given its tip, is the bone chain `tail_01` …
`tail_leaf`: hand `built.node(name)` for each to `springNodes` and it swings.
Binding takes about 0.1 to 0.3 s for 1,000 to 6,000 vertices, so do it once
and keep the result.

## How it is built

AUTO-RIG, THE BABYLON SIDE: a fitted skeleton (`rig-fit`) and its skin
weights (`bone-heat`) become a real Babylon skeleton on a mesh, built the way
the glTF loader builds one, so everything that works on a loaded character
works on it: `readSkeleton` and `retargetClip` play UAL clips on it, and
`springNodes` simulates its tail.

The joints are TransformNodes under one container (`root`), each bone LINKED
to its node, with the mesh under the same container: Babylon then reads each
bone from its node, and the skin and the nodes share a frame.

THE DATA IS RIGHT-HANDED, as OBJ and glTF files are (and as `rig-fit`
assumes: a character facing +Z has its left on +X). Babylon is left-handed,
so the container carries the same mirror glTF's `__root__` does (a half turn
about Y and z scaled by -1). Pass `root` to `readSkeleton` as you would
`__root__`: both measure in the file's own frame. Move the character by a
parent of `root`, not `root` itself.
