# camera-fit

**Where a chase camera is allowed to be.** Pure — distances and heights, no
Babylon, no rays — so the rules can be tested without a scene.

Two problems that look unrelated and are the same problem:

- **A wall between you and the camera.** The camera sits behind the character;
  the character backs into a corner; now you are looking at the inside of a
  wall, or through it at nothing.
- **The camera at a medium boundary.** Half the frame should be underwater and
  is not, because fog is one value per frame (`MEDIUM-DESIGN.md` §6a).

Both are *the camera is somewhere it should not be*, and both are fixed by
moving it — pull it in, or push it out of the band. Tonio, joining them up:
*"The same sort of correction could handle the medium boundary issue."* So this
module is a list of corrections applied to a desired position, rather than two
features that each own a camera.

## Snap IN, ease OUT — and that asymmetry is the whole feel

A wall arrives between you and the camera in one frame, and you must be inside
it **that frame**: easing in means one or two frames of looking through
geometry, which is the artifact every third-person camera is judged on.

Coming back out is the opposite. The ray that found the wall will flicker at
its edge — a pillar, a doorway, a railing — and easing out is what stops the
camera pumping in and out at 60Hz while you stand still. Different rates for
the two directions is not a polish detail; it is the difference between a
camera that works and one that makes people ill.

## The band case IS the Manta flip

`MEDIUM-DESIGN` §6a records how Manta solved the waterline on an iPhone 3G:
flip the camera from decidedly above to decidedly below, so the state never
arises. Expressed here, that is one more constraint — *stay out of this band* —
and it composes with the wall correction instead of being a second mode with
its own camera code.

Which side it goes to is decided by **the subject**, not by the camera: if the
swimmer is under, the camera goes under. A camera that picked the nearer side
would cross the surface every time the character bobbed.
