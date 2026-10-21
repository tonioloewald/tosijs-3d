# 0.10.1

<!--{ "parent": "CHANGELOG", "order": 9989999 }-->

Five requests from manta-recon. Nothing changes unless you set the new dials,
with two exceptions marked **(behaviour)**.

## Added

- **`<tosi-b3d-aircraft climbCost>`** (default `0.4`): what a climb costs in
  speed as a fraction of `maxSpeed`. It was fixed, so the only way to make a
  craft hold speed uphill was `acceleration`, which also changes spool-up. The
  `maxPitch` row now says which climbs cannot be sustained.
- **`<tosi-b3d-aircraft chaseLookAhead>`** (default `0`): metres ahead of the
  craft the chase camera aims at. `0` aims at the craft, as before (22.6° down
  with the default camera, which puts anything level with you at the top of the
  screen).
- **`<tosi-b3d-hud blend opacity>`**, also `--hud-blend` and `--hud-opacity`:
  the flat overlay was additive at half opacity with no way to change it, and
  went faint over a black sky.
- **`pad.suppress(reason)` / `pad.release(reason)`** on the glass gamepad, for
  a menu drawn in the scene.

## Fixed

- **(behaviour) The glass gamepad steps aside while the scene is paused,
  while a death panel is up and while a modal popup is open.** It sat over
  them and took the taps meant for their buttons. This reaches a pad inside
  the scene element or directly beside it. There is no attribute to opt out;
  `pad.release('pause')` from a `pause` listener puts it back.
- **Popups open at the same time no longer flicker through each other.** Each
  was meant to sit a step nearer the viewer than the one behind it, and
  pressing one brings it to the front. Three faults undid that: a new popup
  took no place in the stack until something was pressed, the step was applied
  in the tilted panel's own axes, and two restacks in one frame cancelled out.
- **(behaviour) In a headset, the chase view has a HUD.** The flat overlay is
  DOM, which a headset does not show, and the in-scene plane was cockpit-only.
  In a session the plane now also shows in chase: level, ahead of the craft,
  scaled to cover the angle it covers from the cockpit. `hudChaseOff` still
  keeps the chase view bare. Checked in the emulated headset, not on a device.

Size: barrel (min, packages external) 972.0 KB raw / 327.7 KB gz, +0.17% on 0.10.0.
