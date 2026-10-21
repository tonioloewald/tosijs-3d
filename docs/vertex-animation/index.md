# vertex-animation

**Animation baked into a texture, replayed in the vertex shader.** Pure — no
Babylon, no GPU — so the layout and the phase maths can be tested without a
renderer.

The substrate for things there are MANY of: **flocks of birds, swarms of
insects, shoals, herds, a field of fauna, a bed of carnivorous plants**, and any
crowd larger than a handful of actors. A skinned rig gets nasty at about 20 on a
Quest 3, so everything past that is this ([[b3d-crowd]] has the readings).

The budget has two terms — total vertices AND how finely divided they are, since
a packed field of sub-pixel figures pays overdraw and wasted shading quads on
top. Both are what a decimated re-bake (the LOD note below) buys back.

Not a cheaper biped — a different primitive. A skinned `b3d-biped` carries a skeleton, an `AnimationGroup`, a
collision ellipsoid, a camera rig and two thousand lines of per-instance
JavaScript. At two hundred of them the question is not which part is slow.

A vertex-animated figure has none of it. Positions for every frame live in a
texture, the vertex shader samples the row for "now", and what varies per
instance is three numbers — which clip, what phase, how fast. So N figures are
one mesh, one material, one draw call, and no per-instance work on the CPU at
all.

## It is the MD2 idea, with the frames on the GPU

Between tiny bitmap animation frames with two or three states and a fully
articulated biped there is a lot of ground, and this is it. Quake II shipped vertex keyframes with linear interpolation
between them in 1997; the only thing that has changed is that the keyframes fit
in a texture and the interpolation is free.

## Two things get called blending, and they are different

| | fixes | cost |
| --- | --- | --- |
| **frame interpolation** | jerkiness INSIDE a clip | 2 samples instead of 1 |
| **clip blending** | the pop when walk becomes run | 4 samples |

Frame interpolation is the one that matters for wildlife, and it pays for itself
twice: with it on you can bake at a LOW frame rate and still look smooth, which
is the direct answer to the memory arithmetic below. Bake a bird at 30fps with
interpolation; bake a soldier at 10fps without, since a little jerkiness in
two hundred soldiers goes unnoticed. So it is a per-asset choice, and the crowd
pays nothing for the wildlife's smoothness.

## The bake is the LOD

"Can we algorithmically produce a lower resolution set of animations?" — with
this, that question dissolves. Decimate the mesh and re-bake against the same
clip table. The derivation is an offline pipeline step (where `static-assets`
already drives conversion from `metadata.json`), not a runtime system: cacheable,
inspectable, and free at 60fps. Fewer joints is not a thing you can ask for
because there are no joints; fewer VERTICES and fewer FRAMES are, and both are
just numbers you bake at.

## What you give up

No skeleton means no bone to hang a helmet on. The answer is to bake a handful
of **socket** transforms per frame alongside the vertices — see `SocketLayout` —
so equipment rides as its own instanced mesh sampling the same frame. Two
hundred soldiers in two hundred helmets carrying two hundred spears stays three
draw calls.

The other cost is real and worth stating: a figure that is promoted to a named
character has to cross from here to a skinned rig. That seam should be designed,
not discovered.
