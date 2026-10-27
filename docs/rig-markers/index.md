# rig markers

**Where the auto-rig's eight markers go, dragged over the mesh.** Mixamo's
auto-rigger asks for eight points on a front view (chin, wrists, elbows,
knees, groin) and works the skeleton out from them. `markerField3d` is that
step: the mesh's front silhouette with the markers on it, dragged where the
joints are. A tail tip, which a front view cannot see, gets a side view
beside it. Symmetry is on by default, so a wrist placed on one side places
the other.

It is an ordinary scene-panel control, so it works on a page, in the scene
and in a headset alike. The [rig tool](/rig-tool/) uses it to bind a
mesh with no skeleton: drag a marker and the mesh is fitted and bound again
when you let go.

## Usage

```javascript
import { markerField3d, fitSkeleton, meshQuery } from 'tosijs-3d'

const field = markerField3d({
  positions, indices,        // the mesh, as triangles (objTriangles reads an OBJ)
  value: markers,            // or leave it out: guessMarkers places them
  tail: { x: 0, y: 0.5, z: -0.9 },   // a tail tip, or leave it out
  handleCommit: (markers, tail) => refit(markers, tail),
})
```

`handleChange` fires as a marker moves; `handleCommit` once, when it is let
go. Fitting and binding take a fraction of a second, so they belong on commit.

## The guess

`guessMarkers(silhouette)` reads the front silhouette:
- **groin:** the crotch, the first filled point going up the centre line;
- **wrists and elbows:** the widest row of the upper body (the arms of a
  T-pose);
- **knees:** the middle of each leg, a little over halfway from the floor to
  the crotch;
- **chin:** the narrowest row between the arms and the top of the head (the
  neck).

It is a starting point to drag from, not a fit. A tail that hangs between
the legs hides the crotch, and an A-pose has no widest row of arms; both
fall back to proportions.

## Coordinates

Markers are in the mesh's own units and frame, as `fitSkeleton` takes them:
the character faces +Z with its left on +X, so in the front view its left is
on your right. The side view has +Z (the front) on the right.
