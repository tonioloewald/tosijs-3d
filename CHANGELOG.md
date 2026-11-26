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

- Added: holding both bumpers (L1 and R1) for half a second opens the system ring, held by them (a stick points, letting go picks), unless the game has the bumpers (a driven player, or a hold given to one), as a headset's grips do. In a headset the grips chord no longer dies when a hand moves 3 cm (squeezing a grip moves the controller that much); only in passthrough, where both grips drag the room, must it stay within 6 cm.
- Changed (headset): a ring no press opened (a hold, the grips, code) is drawn straight ahead of your eyes, not in front of the body frame (after a reseat that left the rig askew it opened off to the side). A ring keeps the same size in view wherever it is drawn (about 23° across); one opened on something far off is drawn no further than 2 m along the ray.
- Changed: after a level opens by resting, the slice you are pointing at does not light until you move off it; any other choice is one move away (it waited for the pointing to come back to the middle).

- Fixed: a radial menu's pick blink is seen. A panel redrew changes its content made by itself only on its 400 ms timer, so the whole blink (133 ms) passed unseen and a pick looked instant. Content dispatches `panelrepaint` on its SVG to be drawn on the next frame (a radial menu does on every highlight), and a redraw asked for while one is in flight follows it.
- Changed: a keyboard ring's choices and middle are drawn at the keys' weight and a little smaller (`fontWeight` on `radialMenuSvg`). The inventory says "items", not "things" (an empty slot's info, a chest's count). `svgTextureCache.pictures` and `.bytes` say what is kept.

- Changed (headset): the system bar sits in view, 15° above the horizon, or lower when the headset's view does not reach that high (measured from the headset on its first frame); it was 66° up, out of view even on a Quest. Panels opened from it and the settings panel hang under it, lifted to stay in view on a short display, never over the bar. Frame panels take `setAnchor`.

- Added (headset): a panel that would go out of view is drawn as its header, a rounded tab at the edge of the view on the side it went; turn back and it opens where it was, tap the tab and it comes to where you are looking. System panels and the settings panel do it; any frame panel takes `edgeTab`.

- Fixed (headset): tapping a text field opens the scene keyboard. It followed the shared preference, which a headset's browser does not seed (it is not a touch screen) and closing the keyboard with its × turns off, so in a session a tapped field did nothing.

- Changed: a radial menu opened by a hold lasts as long as the hold: rest on a chevron to go down a level (still held), on back to go up; letting go picks the lit choice or closes, on a chevron or back too (it used to open the sub-ring to wait for another press). A stick click on a chevron opens it at once.
- Changed: keyboard rings draw their choices larger, and their middle as the key itself (a key's colour, its character large), since a tap there types it. `radialMenuSvg` takes `fontScale` and `centre`; a one-character label is drawn larger.
- Added: an empty loadout slot pointed at or focused says what could go in it (how many, and which), or that nothing you have fits (`slotInfo` on `inventoryPanel`, `info` on `carrySocket`).
- Changed: SVG textures keep the pictures they draw, so going back to one is a copy, not a raster: one cache for every texture, least recently used first, `svgTextureCache.maxPictures` (32) and `.maxBytes` (32 MB). Opt in with `data-texture-cache`; panels, the system bar, bar menus, the inventory dock and radial menus do. It replaces `data-texture-flip`.

- Added: clicking the right stick (either thumbstick in a headset) picks what a radial menu has lit and closes it; with nothing lit it dismisses. A pick blinks before it acts, as a Mac menu's did: off, on, off, on at a thirtieth of a second each (`RADIAL_BLINK_MS`); a keyboard ring's pick blinks off, on (`pickBlinkMs`, 0 to act at once), and a press during it types the pick first.

- Fixed (headset): the pointer moves to a hand as soon as a finger lands on its trigger (or starts pulling it), so that hand's first press acts; Babylon spent it on switching hands, so a left-hand press on a loadout slot did nothing the first time. Not while the pointing hand's trigger is down.

- Fixed (headset): resting on a sub-ring item opens it without recentring first (the ring sat 6 cm toward your eye, so the ray met it low, on the gated drop, and a move toward swap confirmed drop; it now sits back along the ray). A ring held by the trigger no longer lights its middle in the accent over the current colour. Rings are drawn and pointed at in room centimetres at any world scale. Picking from a loadout ring ends the press (the thing stayed carried; `cancelPress` on the carry, inventory panel and dock). A trigger pulled with its ray on a panel, or while a ring is open, does not reach the game (pressing a loadout slot fired the gun).

- Added: `xr-passthrough="offer"`: where the device has VR and passthrough, the bar's VR button is a menu (VR, Passthrough), and a sub-ring in the system ring; in a session it is the Exit button.
- Added: in a headset, both grips held still for half a second open the system ring (a thumbstick points, let go to pick); not while a player is driven or when a page has given a bumper a hold. An open ring has the sticks: they do not also walk or turn. `RadialHold` takes a `test`.
- Added: `xrFrame(centre, radius, { ms })` glides there from what is in front of you. `pointerClaimedByPanel` is exported.
- Fixed: in passthrough the headset's near plane is 1 cm (it was 10 cm): leaning in to a miniature, a solar system or a model, cut away everything within a hand's width.
- Changed: Solar System: a **View** menu on the bar replaces "look at" (each planet's moons in its submenu, the whole system first); click a body (in a headset, point and pull the trigger) to fly to it, the background to fly back out; the camera glides. The VR button offers VR or Passthrough, and passthrough opens on the whole system three metres across.

- Added: a bar menu's button wears the chosen option's icon when it has one (the weather shows on the bar and on its slice in the system ring). The `cloudLightning` icon.
- Fixed: the on-screen keyboard's rings are drawn on a surface of their own, whole and centred on the key, instead of cropped to the keyboard; a ring left open lights the choice under the pointer. Panels on planes pass hover to their SVG, and a press that slides off a plane keeps its true position. A popup's own popups and tips open in front of it (`showOverSurface`, `WidgetHost.showOver`).
- Fixed: holding B on a loadout slot with the pad opens the ring over the slot, not in the middle of the view.

- Fixed: in a headset a ring opened on a panel never closed (the panel's layer took the press, so the scene never heard the release; the ring now reads the trigger). A loadout slot nothing fits opens no ring (it opened one holding only close). A ring on a panel needs a 500 ms hold in a headset, so a trigger click is a click.

- Fixed: in a headset, a ring opened by a press and hold (the loadout, a mesh) is drawn where the press landed, 30 cm wide, and the controller's ray points at it; it hung a metre ahead at modal size and only the thumbsticks reached it. In the loadout an empty slot offers what fits from both halves (it only looked at the slots), and a full slot offers a **swap** sub-ring. A keyboard ring left open lights what the pointer is over. A ring's `handleSelect` hears only its top level.

- Fixed: leaving VR left a black canvas. The session teardown reset the world scale after the session had ended, which threw inside Babylon's exit and stopped it returning to the flat view.

- Changed: holding D-pad up no longer closes the panel you are in; in the system ring a showing panel is ticked (picking it closes it) and **close all** appears at the bottom. A radial menu's centre shows the current (checked) item on its colour. A slice the stick lit a moment before springing back to the middle still picks when the button is let go.

- Changed: in a radial menu, the stick back in the middle (or the mouse) lights nothing, so letting go there picks nothing: the way out without choosing, and out of an armed or confirmed gate. The centre keeps the title while you choose, and a slice with an icon carries its name under it. The keyboard's alternatives ring is centred on its key.

- Changed: the on-screen keyboard's long-press alternatives open as a ring centred on the key (slide toward one, or lift and tap; near an edge it fans over the side on the board); the alpha layout has a full stop beside the spacebar, and holding it offers punctuation (`, ? ! ' " : ; - …`). Holding `?123` gives the digits with the symbols as a sub-ring; holding ⌫ gives forward delete, clear, copy, cut and paste (new `KeyAction`s, which `inputField` handles: copy and cut take the whole field, paste replaces it). `holdChoices(key)` (key-layout) is what a hold offers.

- Added: sub-rings. A radial menu item with `items` opens them in its place, with **back** as a slice at twelve o'clock (`withBack`). Let go on the item and the sub-ring waits: press what opened the ring (or A) again, point, let go, as in the ring above; B goes back unless B opened it. An item's own `handleSelect` is called when it is picked. Resting on a sub-ring item for half a second opens it without letting go (one drag can go down several levels), and resting on back goes back up.
- Changed: holding D-pad up opens the system bar as a radial ring (its buttons as slices, a bar menu as a sub-ring) instead of putting the focus on the bar; `b3d.openSystemRing()` opens it from code. In a ring that stays open, A picks and B goes back or dismisses (B used to pick).

- Added: the inventory dock's rings carry a gated **close** at the top (drop is at the bottom), so the pad can put the loadout away from inside it. A framed dock asks its system panel to close with `panelfocus` (`focus: false`).
- Added: radial menus by pointer. `b3d.meshMenu(mesh, { tap, menu, handleSelect })` opens a ring on a press and hold on a mesh; `openRadialMenu({ …, pointer })` from a `pointerdown` is held by that press (drag toward a slice, let go; let go without dragging and it stays open to click); in a headset, a press and hold on a scene panel control with a `menu()` (an inventory thing) opens its ring. Items take a `color`. The radial menu demo's box opens its ring this way.
- Changed: a shot's rumble is stronger (it was too faint to feel through the trigger).
- Fixed: a D-pad or B hold (`setDpad`, `holdMenu`) waits while the panels' gamepad UI has the pad, so D-pad right in the loadout moves the focus instead of cycling weapons.
- Fixed: primitives (`el.make.*`, `b3dBox`, `b3dSphere`) take any colour `parseColor` reads; a short hex like `'#d33'` drew black (Babylon reads only `#rrggbb`).
- Fixed: clicking the left stick to change pace no longer teleports a biped back to where it started (the pace is kept inside the biped; the `pace` attribute is the starting pace, `currentPace` reads it).
- Changed: the on-screen keyboard's pressed key grows and comes to the front, and a release anywhere on the grown key types it (a ray drifting off the key as the trigger is pulled lost the key). In a headset the hold before accents, caps lock or the spacebar trackpad is 600 ms (350 elsewhere).
- Added: a radial menu item can take a `weight` (its share of the ring) and be set `apart`: narrower, pointing down opposite the rest, with dead space either side, for a choice you should not make by accident. A `gated` item is reached like reverse gear: pull straight out into it (which arms it), then sideways either way to confirm; arriving from another slice never counts. It is narrow, with empty space either side, drawn as a T. An inventory thing's ring sets drop apart and gated, and carries a gated close.
- Changed: either stick picks in a radial menu (the left one keeps moving you until it is pushed past half way); a ring opened by a pointer is drawn where it was pressed. `b3d.holdMenu(button, …)` gives any pad button a tap and a ring on a hold. In a panel, holding B on a control with a `menu()` opens its ring (a press and hold does in a headset; a mouse drags instead); a thing in the inventory, in a list or a slot, offers the places it can go, an empty slot the things that fit, and carrying a thing the D-pad steps only to places ([radial menu](/radial-menu/)).
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
