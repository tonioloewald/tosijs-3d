# bvh

Motion capture files (BVH, Biovision Hierarchy) as clips. Decades of mocap
are in this format (the CMU library, Bandai Namco's research set, most
capture suites), and a BVH read here is the same thing as a clip read from a
GLB ([glb-clips](/glb-clips/)): a `GlbClipSource`, its own skeleton and its
clip. So it plays on any body through `bakeClip` or `retargetClip`, which read
which bone is which from the names (CMU's and Mixamo's spellings both work).

- `readBvh(text)` reads one. Rotations are Euler angles in the order each
  joint's CHANNELS line lists them (BVH's rule), turned into quaternions.
  Units are guessed from the skeleton's height (a person stands 1 to 2.5 m;
  centimetres and inches are scaled to metres; anything else is scaled to a
  1.8 m person), or set with `scale`.
- `writeBvh(source, clip)` writes any clip source out (a capture, a UAL clip)
  for Blender, MotionBuilder and other tools. Rest is BVH's: every joint
  unturned, offsets along the world axes, so a skeleton whose joints are
  turned at rest (UAL's, any glTF's) is written as its turns since rest.

Pure, no engine.
