# 0.11.3

<!--{ "parent": "CHANGELOG", "order": 9988997 }-->

## Added

- **`blendSeconds` on `<tosi-b3d-biped>`** (default 0.25): how long each animation change eases over. `0` cuts.
- The panel page's system-bar demo has a "New journal entry" button that blinks the Journal button (`attention()`).

## Changed

- **The biped eases every animation change** instead of cutting: walk to run, standing to crouch, the gun coming up and going down, aim up/level/down. The blend is timed, so it lasts the same at any frame rate. A crouch at rest plays a transition clip if the states name one (`sneakEnter` / `sneakExit`, e.g. UAL's `Crouch_Enter` / `Crouch_Exit`); the defaults have none, so it blends.
- **The sun's shadow bias defaults are now `shadowBias` 0.002 and `shadowNormalBias` 0.04**, which clears the fine acne stripes on plain lit surfaces. If a small caster's shadow detaches, set them lower on your `<tosi-b3d-sun>`.
- **In the biped mapping, clicking the right stick (R3) toggles the weapon**, as the right bumper does. The playground's glass pad shows both stick clicks.

## Fixed

- **XR thumbsticks have the hardware pad's 0.15 per-axis deadzone**, so a stick pushed sideways to turn no longer drifts the biped's look pitch (its aim). Raising the weapon now levels the aim in a headset too.
- In the glass gamepad demo, the cube moves away from you on left stick up, and the readout sits top centre, clear of the system bar.

Size: barrel (min, packages external) 1245.8 KB raw / 426.2 KB gz, +0.08% on 0.11.2.
