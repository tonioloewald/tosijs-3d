# spring-vrm

**Our spring chains as glTF: `VRMC_springBone`, plus our own record of
them.** A rigged body's springs (a tail, a ponytail, a strand hung from a
bone) go out in the standard every VRM loader reads (three-vrm's
`VRMSpringBoneLoaderPlugin`, UniVRM, Godot's VRM importer), so they swing
in those engines with no setup. Beside it goes `TOSIJS_spring_chains`, which
holds the springs exactly as our model has them, so a file read back here
swings as it did when it was made. `riggedBodyGlb` writes both (pass it the
rig recipe); this module is the conversion and the schema, pure.

## Where the two models differ

Our chain (`spring-chain`) is Verlet at a fixed 120 Hz: velocity kept at
`1 - damping` per second, gravity an acceleration, and each point PULLED
toward its rest place by a fraction that grows with `stiffness`, so the
restoring force grows with how far it is out. VRM's (three-vrm's
`VRMSpringBoneJoint.update`, once a frame) adds the last frame's movement
times `1 - dragForce`, then `stiffness × dt` metres along the bone's rest
axis and `gravityPower × dt` metres along `gravityDir`, then keeps the
length. So:

- **Drag** is per FRAME there, per second here: `dragForce = 1 - (1 -
  damping)^(1/60)`, exact at 60 frames a second. VRM's motion depends on the
  frame rate (the specification says so); ours does not.
- **Gravity** adds displacement times `dt` there, so it acts like an
  acceleration of `gravityPower / dt`: `gravityPower = gravity / 60`, exact
  at 60 frames a second.
- **Stiffness** cannot be matched exactly: VRM pushes the tip back with the
  same force however far it is out, ours with a force in proportion. We
  match how far a LEVEL segment droops under gravity: ours settles where the
  pull balances gravity, VRM's where `tan θ = gravityPower / stiffness`.
  Swings away from that settle differently (VRM's springs come back at a
  constant speed and do not ring as ours do).
- **Measured on the weasel's tail** (five joints, our default settings, the
  file read by three-vrm with nothing set up by hand): standing, the tip
  settles 26 cm lower in three-vrm and 43 cm lower in ours; run sideways at
  3 m/s for half a second and stopped, it swings about as far and as long in
  both (still ±0.3 m two seconds later, which is what our defaults are).
  VRM bends each joint from its parent's current direction, ours from the
  anchor's, so a long chain droops less there.
- **Colliders** are spheres in both, on a joint, with an offset in the
  joint's own frame; VRM gives each spring the collider GROUPS it meets.
  Our chain radius is VRM's `hitRadius`.
