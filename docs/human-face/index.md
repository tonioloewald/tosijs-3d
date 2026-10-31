# human-face

Eyes and eyelashes for a [character builder](/character-builder/) body, and
a gaze that looks at something.

A pack's eyes are not a separate model fitted into the sockets: MakeHuman's
base mesh carries the eyeballs and eyelash cards as helper vertices, which
every shape target moves with the face, and the pack's `eyes` and
`eyelashes` PARTS are faces (and the eyes' UVs) over those vertices. So any
body has eyes that fit it, with nothing to fit.

`humanFace(scene, built, rig, pack, positions, parts)` hangs them on the
skeleton's head: each eye on its own pivot at the eyeball's centre (MakeHuman's
`eye` joint), so turning the pivot turns the eye. `eyeTexture` draws the eye
in code (sclera, a striated iris of any colour from `irisColor`, the pupil)
on MakeHuman's eye UV layout, so the iris is a dial and no image is shipped.

`eyeGaze(scene, face, target)` points both eyes at a world point every frame,
after the clip has posed the head: they converge on it, stop at `maxDeg`
from straight ahead, and make small saccades, the jumps eyes really make
(they never glide), so a held gaze looks alive.

A FILE'S EYES work the same way: `bodyEyes(scene, built, eyes, material)`
hangs a rigged body's `eyes` (eyeballs that are objects of their own in the
file, as in Blender's Human Base Meshes) on pivots at their centres under the
head, mapped onto the same eye texture (`eyeUvs`), so the iris dial and
`eyeGaze` work on them too. Such a body has no lid targets, so its blink is
made from its shape: `lidBlink(positions, eye)` finds the opening in the
skin round the eyeball and turns the lids over it, a morph the same
`blinker` drives (and `lidsFollow` half-closes when the eyes look down). The
character builder gives lids to bodies rigged from markers, not to files
that come skinned.
