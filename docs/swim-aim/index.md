# swim-aim

**Where a swimmer is pointing.** The pure half of look-directed swimming: turning
an aim input into a body pitch, easing it, and unwinding it when you stand up
again. Babylon-free, deterministic, unit tested.

## Why the body pitches at all

Swimming forward while standing bolt upright is the same class of wrongness as
standing on the seabed under six metres of water — the animation says one thing
and the geometry says another. Once the body pitches, **movement follows for
free**: the biped already swims along its own forward vector, so tilting the body
tilts the stroke. One rotation, no separate vertical term for the stroke, and no
way for aim and motion to disagree.

## Where the aim comes from, and why it differs by device

- **In a headset it is your HEAD.** That is what "look-directed" means when you
  have a neck, and it needs no control at all.
- **Flat, there is nothing to read.** The biped's follow camera is a
  `FollowCamera` with a fixed height offset — it tracks the character and the
  player never aims it. So flat has to *integrate a stick* rather than sample a
  direction, which is why this module has two entry points rather than one.

They converge on the same stored value, so the rest of the code — and the
character — cannot tell which one is driving.

## Degrees, positive DOWN

Positive is nose-down, matching `RotationYawPitchRoll`'s pitch argument, so the
value drops straight into a quaternion with no sign flip at the call site. Every
sign bug in this repo's orientation code has come from a conversion at a
boundary; this one does not have a boundary.
