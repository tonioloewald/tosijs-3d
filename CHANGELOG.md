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

- **Changed:** the sun's shadow bias defaults are now `shadowBias` 0.002 and `shadowNormalBias` 0.04, which clears the fine acne stripes on plain lit surfaces. If a small caster's shadow detaches, set them lower on your `<tosi-b3d-sun>`.
- **Changed:** the biped eases every animation change (a quarter of a second at any frame rate; set `blendSeconds` to change it, `0` cuts) instead of cutting: walk to run, standing to crouch, the gun coming up and going down, aim up/level/down. A crouch at rest plays a transition clip if the states name one (`sneakEnter` / `sneakExit`, e.g. UAL's `Crouch_Enter` / `Crouch_Exit`); the defaults have none, so it blends.
- **Changed:** in the biped mapping, clicking the right stick (R3) toggles the weapon, as the right bumper does. The playground's glass pad shows both stick clicks.
- **Fixed:** XR thumbsticks now have the hardware pad's 0.15 per-axis deadzone, so a stick pushed sideways to turn no longer drifts the biped's look pitch (its aim). Raising the weapon now levels the aim in a headset too.
- **Added:** the panel page's system-bar demo has a "New journal entry" button that blinks the Journal button (`attention()`).
- **Fixed:** in the glass gamepad demo, the cube now moves away from you on left stick up, and the readout sits top centre, clear of the system bar.

## 0.11.2

The latest release. A new glass gamepad, laid out like a pair of VR
controllers held flat, with stick clicks (L3, R3) that a hardware pad and a
headset's thumbsticks now report too; view and menu on the headset's system bar
when a scene asks for them; and the full-screen button on an iPhone.
[Read 0.11.2](/v0.11.2/).

## Every version

<!-- toc -->
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
