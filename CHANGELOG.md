# Changelog

<!--{ "parent": "upgrading", "order": 20 }-->

All notable changes to **tosijs-3d**, one page per version: each lives in
`changelog/v<version>.md` (on the site at `/v<version>/`), and this page is the
index: the latest release below, then every version, newest first (that list is
generated from each page's `parent`). This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes. Each is called out in a
**⚠️ Breaking** block on its version's page, with what a consumer must do.
Upgrading across a minor? Start with [Migration](/Migration/).

## Unreleased

### Added

- **A new glass gamepad**, laid out like a pair of VR controllers held flat: on each side a trigger, bumper, stick and two face buttons (X and Y on the left, A and B on the right, in Xbox colours), with view and menu between them at the bottom. It is one SVG sheet (`static/glass-gamepad.svg`) that the pad cuts into three clusters along the bottom; on a narrow screen the centre cluster tucks in between the others when it fits and sits above them when it does not.
- **Stick clicks (L3, R3)**: `leftStickPress` and `rightStickPress` on `VirtualGamepad`. The glass pad has a button under each stick, a hardware pad's buttons 10 and 11 feed them, and so does clicking a thumbstick in a headset. On the biped, a left-stick click sneaks (as L3 does in GTA V).
- **View and menu on the headset's system bar**, when the glass pad's `controls` name them. `pad.pulse('view' | 'menu')` presses one from code.

### Changed

- **The glass gamepad hides its d-pad unless you name it** (`controls="…,dpad"`). View and menu are still shown by default, but will become opt-in in a future release: name them if you use them.
- **In a headset, clicking a thumbstick is a stick press**, not view (right) or menu (left). Y still toggles the camera view, and the system bar carries view and menu when a scene asks for them.
- **A hardware pad's view and menu buttons (8 and 9) now reach `view` and `menu`**; they were read but dropped.
- The glass pad's `clusters.top` is now `clusters.center` (`top` still works).

### Fixed

- **The full-screen button on an iPhone.** iPhone Safari has no Fullscreen API for anything but video, so the button hid itself. It now maximises the scene instead: in the top layer as a popover (iOS 17+, so a doc page's card cannot trap it), filling what is visible.
- **The glass gamepad demo goes full screen with its pad**, which is now inside the scene as `gamepad: true` mounts it; beside the scene it was left behind.

## 0.11.1

The latest release. Three defaults that loaded files only our doc site serves
now work on yours (the glass gamepad's art, the XR reticle, the crowd's
skinned baseline), and the docs are reorganised: helper pages folded into the
pages that use them, complete attribute tables, a changelog page per version.
No other code changed. [Read 0.11.1](/v0.11.1/).

## Every version

<!-- toc -->
- [0.11.1](/v0.11.1/)
- [0.11.0](/v0.11.0/)
- [0.10.20](/v0.10.20/)
- [0.10.19](/v0.10.19/)
- [0.10.18](/v0.10.18/)
- [0.10.17](/v0.10.17/)
- [0.10.16](/v0.10.16/)
- [0.10.15](/v0.10.15/)
- [0.10.14](/v0.10.14/)
- [0.10.13](/v0.10.13/)
- [0.10.12](/v0.10.12/)
- [0.10.11](/v0.10.11/)
- [0.10.10](/v0.10.10/)
- [0.10.9](/v0.10.9/)
- [0.10.8](/v0.10.8/)
- [0.10.7](/v0.10.7/)
- [0.10.6](/v0.10.6/)
- [0.10.5](/v0.10.5/)
- [0.10.4](/v0.10.4/)
- [0.10.3](/v0.10.3/)
- [0.10.2](/v0.10.2/)
- [0.10.1](/v0.10.1/)
- [0.10.0](/v0.10.0/)
- [0.9.0](/v0.9.0/)
- [0.8.15](/v0.8.15/)
- [0.8.14](/v0.8.14/)
- [0.8.13](/v0.8.13/)
- [0.8.12](/v0.8.12/)
- [0.8.11](/v0.8.11/)
- [0.8.10](/v0.8.10/)
- [0.8.9](/v0.8.9/)
- [0.8.8](/v0.8.8/)
- [0.8.7](/v0.8.7/)
- [0.8.6](/v0.8.6/)
- [0.8.5](/v0.8.5/)
- [0.8.4](/v0.8.4/)
- [0.8.3](/v0.8.3/)
- [0.8.2](/v0.8.2/)
- [0.8.1](/v0.8.1/)
- [0.8.0](/v0.8.0/)
- [0.7.8](/v0.7.8/)
- [0.7.7](/v0.7.7/)
- [0.7.6](/v0.7.6/)
- [0.7.5](/v0.7.5/)
- [0.7.4](/v0.7.4/)
- [0.7.3](/v0.7.3/)
- [0.7.2](/v0.7.2/)
- [0.7.1](/v0.7.1/)
- [0.7.0](/v0.7.0/)
- [0.7.0-rc.1](/v0.7.0-rc.1/)
- [0.6.2](/v0.6.2/)
- [0.6.1](/v0.6.1/)
- [0.6.0](/v0.6.0/)
- [0.5.2](/v0.5.2/)
- [0.5.1](/v0.5.1/)
- [0.5.0](/v0.5.0/)
<!-- /toc -->
