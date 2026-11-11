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

- `<tosi-b3d-crowd>`: `setFigure(i, { x, y, z, yaw, clip, speed })` moves, turns or re-clips a figure; changes are uploaded once per frame however many figures moved. `clipNames` lists the clips. The doc page has a demo of walkers crossing a field.
- `aimSpine(chain, held, target)` turns a spine after the clips have posed it so a held item points along an aim.

### Changed

- `<tosi-b3d-biped>` holding a weapon in `gunplay` points it along its aim: the spine is turned after the animations. Crouched, the gun used to point about 45° low, and standing 11° low.
- `viewMenu` leaves the system bar during a headset session; in VR the camera is your head.
- The character builder has an **Animation** menu on the system bar (play/pause and the clip) and a separate **Playback** panel for scrubbing and speed.

### Fixed

- `<tosi-b3d-hud>`: changing `size` resizes the HUD straight away; it used to wait for the next window resize. Any `handleResize()` call made after setting it can go.
- `<tosi-b3d-sound>` removed while its file loads no longer throws an unhandled rejection ("No volume subnode"); it is disposed once Babylon has finished loading it, and never starts playing.
- Removing a `<tosi-b3d>` no longer warns "WebGL context LOST": the teardown loses the context on purpose. An unexpected loss still warns.
- A skybox with its own `<tosi-b3d-moon>`s takes its night light from the brightest moon above the horizon. A moon that has set no longer lights the ground from below, and with every moon set the night has only ambient light.
- In a headset, a press on the hand that is not pointing now counts on every way into VR (`enterXR` and the biped's own XR camera), not only `<tosi-b3d>`'s.
- A popup whose content changes shape after it opens follows the new shape. It used to be drawn stretched or squashed until it was closed and opened again.
- The tailor: an outline that lies past the outline field (one carried over from another body) is clipped to the field, and its points are drawn at the field's edge so you can drag them back. It used to draw over the panel's buttons.
- In a headset, the vehicle chase camera keeps its seat through a brief moment with nothing piloted. It used to take wherever you were looking as forward again, a re-seat you did not ask for.

## 0.12.6

The latest release. BVH clips kept and carried in character files; MakeHuman's body exports dressed, with hair, skin and eyes; tailored garments fit any body; feet stay planted under retargeting; marker rigs place pelvis, neck and knees as the mannequins do. See [0.12.6](/v0.12.6/).

## Every version

<!-- toc -->
- [0.12.2](/v0.12.2/)
- [0.12.1](/v0.12.1/)
- [0.12.0](/v0.12.0/)
- [0.11.6](/v0.11.6/)
- [0.11.5](/v0.11.5/)
- [0.11.4](/v0.11.4/)
- [0.11.3](/v0.11.3/)
- [0.11.2](/v0.11.2/)
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
