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

- Added: a radial menu item can take a `weight` (its share of the ring) and be set `apart`: narrower, pointing down opposite the rest, with dead space either side, for a choice you should not make by accident. A `gated` item is reached like reverse gear: pushing straight out at it lights nothing, so you go out to a neighbour and sweep round the rim into it (drawn as that path: no inner part, an arm along the rim each way). An inventory thing's ring sets drop apart and gated.
- Changed: a radial menu is picked with the right stick only, so the left stick keeps moving you. `b3d.holdMenu(button, …)` gives any pad button a tap and a ring on a hold. In a panel, holding B on a control with a `menu()` opens its ring; a thing in the inventory offers the places it can go ([radial menu](/radial-menu/)).
- Added: rumble. `b3d.rumble('hit')` (or `{ strong, weak, ms }`) buzzes the player's gamepad and a headset's controllers; the player's biped rumbles when hurt, landing hard, firing and landing a blow, a driven vehicle when it hits something, and the pad's UI focus ticks as it moves. `rumble-strength` scales it (0 is off) ([rumble](/rumble/)).
- Added: radial menus. `b3d.setDpad(direction, { tap, menu, handleSelect })` gives a D-pad direction a tap and a ring of choices on a hold, picked by pointing a stick or the mouse; `b3d.openRadialMenu(...)` opens one from code; `radialMenuSvg` is the drawing ([radial menu](/radial-menu/)).
- Changed: clicking the left stick (C on a keyboard) cycles a biped's pace through walk, jog and run, and pushing forward then moves at that pace (`pace`, `ControlInput.gait`). The right trigger still sprints. The left stick no longer sneaks; the left bumper still does.
- Fixed: the player's sword strokes now hurt what they reach (`meleeDamage`, `meleeReach`, `meleeArc` on the biped); before, the swing was only an animation.
- Added: sword strokes chain. A press early in a stroke restarts it, a late one queues or starts the next, and a held trigger skips the follow-through. Tune it with `strokeRules` ([melee stroke](/melee-stroke/)).
- Added: a strand spring with `reach` draws no tube; it takes the model's own vertices near it instead, so a rag or hem that is part of the mesh swings ([strand skin](/strand-skin/)). `riggedBodyGlb` applies it on export.
- Added: a biped loaded from a GLB runs the springs the file carries (`springs`, default `'on'`), as the rig tool or `riggedBodyGlb` wrote them. `bakedSprings(recipe)` turns an exported recipe into the bone springs `applyRigRecipe` runs on the loaded file.

## 0.13.2

The latest release. The test checklist on every scene's system bar (answer it in a headset), one **Export…** for the character builder whose GLB also carries the whole character and its rig, smaller exported pictures, held things on either side or the forearm, gamepad and keyboard focus in panels, `pager3d`, and fields that wrap. See [0.13.2](/v0.13.2/).

## Every version

<!-- toc -->
- [0.13.0](/v0.13.0/)
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
