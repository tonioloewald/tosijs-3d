# 0.11.2

<!--{ "parent": "CHANGELOG", "order": 9988998 }-->

## Added

- **A new glass gamepad**, laid out like a pair of VR controllers held flat: on each side a trigger, bumper, stick and two face buttons (X and Y on the left, A and B on the right, in Xbox colours), with view and menu between them at the bottom. It is one SVG sheet (`static/glass-gamepad.svg`) that the pad cuts into three clusters along the bottom; on a narrow screen the centre cluster tucks in between the others when it fits and sits above them when it does not.
- **Stick clicks (L3, R3)**: `leftStickPress` and `rightStickPress` on `VirtualGamepad`. The glass pad has a button under each stick, a hardware pad's buttons 10 and 11 feed them, and so does clicking a thumbstick in a headset. On the biped, a left-stick click sneaks (as L3 does in GTA V).
- **View and menu on the headset's system bar**, when the glass pad's `controls` name them. `pad.pulse('view' | 'menu')` presses one from code.

## Changed

- **The glass gamepad hides its d-pad unless you name it** (`controls="…,dpad"`). View and menu are still shown by default, but will become opt-in in a future release: name them if you use them.
- **In a headset, clicking a thumbstick is a stick press**, not view (right) or menu (left). Y still toggles the camera view, and the system bar carries view and menu when a scene asks for them.
- **A hardware pad's view and menu buttons (8 and 9) now reach `view` and `menu`**; they were read but dropped.
- The glass pad's `clusters.top` is now `clusters.center` (`top` still works).

## Fixed

- **The full-screen button on an iPhone.** iPhone Safari has no Fullscreen API for anything but video, so the button hid itself. It now maximises the scene instead: in the top layer as a popover (iOS 17+, so a doc page's card cannot trap it), filling what is visible.
- **The glass gamepad demo goes full screen with its pad**, which is now inside the scene as `gamepad: true` mounts it; beside the scene it was left behind.

Size: barrel (min, packages external) 1244.9 KB raw / 425.9 KB gz, +0.27% on 0.11.1.
