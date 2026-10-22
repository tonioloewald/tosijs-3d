# human-rig

UAL's 65-joint skeleton on a [human pack](/human-pack/)'s body, placed from
the body itself: every joint is the centre of one of MakeHuman's **joint
cubes**, small groups of vertices inside the mesh that the shape targets move
along with the skin. So a morphed body carries its own joint positions, and
nothing is fitted or guessed.


The [character builder](/character-builder/) shows it: the body walking while its sliders move.

## How it works

MakeHuman's own 163-bone skeleton is not used, only where its joints are. The
result is a `FittedRig`, the same thing the auto-rig produces from markers, so
the rest of that pipeline applies unchanged: `skinSegments` and `boneHeat`
bind the skin, `buildRig` makes the Babylon skeleton, and `retargetClip` plays
UAL's clips on it. The skin weights depend only on the mesh's topology, so
they are computed once per base and reused for every body.

`HM08_UAL` is the table, a row per UAL joint: its parent and the joint cube
it sits at (`bone____head` or `bone____tail`, in MakeHuman's naming), or a
rule for the two that have no cube (`root` is on the floor under the pelvis).
A base with different joint cubes brings its own table.

The pack is right-handed and a character faces +Z with its left on +X, as
`rig-fit` assumes, so MakeHuman's `.L` is UAL's `_l`.
