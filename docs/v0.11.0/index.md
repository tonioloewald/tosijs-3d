# 0.11.0

<!--{ "parent": "CHANGELOG", "order": 9989000 }-->

**0.11 in one paragraph.** Any character plays the Universal Animation
Library: `retarget` reads which bone is which across UE, Mixamo, Kenney and
Blender names and transfers clips across A- and T-poses; a mesh with no
skeleton is auto-rigged from eight markers (`fitSkeleton`, fingers, mittens
and tails found from its shape, `boneHeat` binding, `buildRig`); hair and
tails hang on spring bones; the rig tool does it all in the browser and saves
a recipe (`applyRigRecipe`), and mounts in a host's scene (`mountRigTool`).
Effects are particles, light and sound as layers on one clock
(`<tosi-b3d-effect>`, presets from volcano to sparks, procedural sprites and
voices), edited in the effect tool (`mountEffectTool`). Around them:
`inspectView` (held orthographic views), `seamMaterial`, `barMenu`, slider
stops, landform schemas, the biped's sprint. Nothing was removed; see
Migration.md for the behaviours that changed. Size over the 0.10 line: see
the release's Size line.

## Added

- **System panels from code, and a button that asks to be looked at** (#3436, Manta's objectives list): `<tosi-b3d-panel>` has `show()`, `hide()`, `toggle()` and `isOpen`, and fires `paneltoggle` (`detail.open`) whenever it opens or closes, by code or by its button, so a list can put itself away after a while. `attention(ms?)` blinks its button on the system bar, flat and in a headset (and on the HTML lozenge with `flat-ui="dom"`). Before the scene is up, `show()` means open at start.
- **`systempanels` on `<tosi-b3d>`** (#3436): fires (bubbling) on every system panel opened or closed, with `detail.panel`, `detail.shown`, `detail.byUser` (opened by its button, not by code) and `detail.open` (every open one, `{ panel, byUser }`), so the game decides what it means: `e.detail.open.some((p) => p.byUser)` pauses while the person has one up. A headset session starting or ending is reported once, after it, with `panel` null. `paneltoggle` also carries `byUser`.

## Changed

- **The glass gamepad stands aside only for system panels the person opened** (#3436). One opened by its button hides the pad as before; one opened by code (`show()`, `open` at start) leaves it up, because it is up while they play and on a phone hiding the pad took the controls away. Give one that stays open a `screenAnchor` clear of the pad.

## Fixed

- **The effect tool's `listen from` works in a headset** (Tonio). Flat it pulls the camera back; in a headset you are the camera, so it did nothing. There the effect now moves along the ground, on the line from you to it, to that distance (on entering the session too, so the sound's lateness on the status line is true), and goes back when the session ends.
- **A tool's settings panel shows its changes in a headset** (Tonio, the rig tool in VR: picking a face stopped the clip, but the animate toggle still showed it on, so turning it off and on again was needed to play). `refreshScenePanel()` rebuilt only the flat panel; it now rebuilds the headset's too. The rig tool's doc says what `view` means in a headset (you are the camera: it switches between still and playing) and names the faces it takes.
- **The system bar keeps working after the glass pad** (Tonio, in a headset's flat browser: open and close the inventory, drag the pad's stick twice, and the bar stopped answering until a click elsewhere on the page). Babylon keeps one canvas slot per touch (`navigator.maxTouchPoints`, else 2) and gives a touch it sees move without a press a slot retroactively; when that touch was released on the pad (which captures its own pointer), the canvas never heard it, and with every slot held Babylon ignored new presses ("Max number of touches exceeded"). A touch or pen released anywhere off the canvas is now cancelled on the canvas too, which frees its slot.
- **Effect sounds stop when you leave** (Tonio, in the headset: leaving the effect tool page left its sound playing). A voice lives in the page's audio context, not the scene, and a scene that went away never stopped its voices, so they looped on. Now a disposed scene stops every effect voice it was playing, and the effect audio is suspended while the tab is hidden (a hidden tab draws no frames, so nothing would fade a voice out).
- **The pause panel says "Continue in VR" only where there is VR** (#3431, Manta): with `enterXrOnResume="on"` it said so on an iPhone and a laptop too, where resuming just continues. It now needs the headset helper as well, which is built only when `immersive-vr` is supported.
- **A biped's sprint ends when it stops** (0.11.0 gate): the sprint is held down to 70% of full speed so a trigger near the line does not flicker, but the flag was only updated while running forward, so a stop, swim or sidestep left it set and the next run went straight into the sprint at 75%. The choice is now the pure `forwardGait` (`tosijs-3d/gait`), tested for entering, holding, leaving and a rig with no sprint clip.
- **An effect voice that yielded to the budget stays quiet** (0.11.0 gate): over `effectVoices`, the quietest voice was stopped and then started again on the next frame, as loud as before and so stopped again: a new WebAudio graph every frame for each voice over budget, and for a `url` voice a fetch. It now comes back when the pool has room or when it would clearly outrank the quietest voice playing; turning its layer off and on starts it fresh. A NullEngine test counts the starts (21 where 9 belong, before the fix).
- **`seamOverlay`'s twin casts wherever the mesh did** (0.11.0 gate): the mesh is hidden while its twin is drawn, so it stopped casting and the twin never started. The twin now takes the mesh's place in every shadow map it was in (and receives as it did), and gives it back on dispose; the rig tool's own workaround for the twin is gone.
- **`<tosi-b3d-effect>` builds its player once on mount** (0.11.0 gate): `sceneReady` started it and then `render()`, which starts any effect whose key is new, built it again. Releasing a scene's effect pool also removes its scene-dispose observer, and a frame with no effect lights skips ranking them.
- **The water readiness report stays quiet in a hidden tab** (nothing draws there, so nothing is ready) and says how many frames had drawn and whether a headset session was on.
- **`strandPoints`, `strandPath`, `setStrandPath`, `pathLength`, `quadDiagonals` and `viewSpanAt` are in the barrel**, as this changelog's entries for them implied.
- **The README names the 0.11 features** (0.11.0 gate): retargeting, auto-rig, spring bones and the rig tool; effects and the effect tool. Migration.md has a 0.10 → 0.11 section (nothing removed; the behaviours that changed).
- **A water that is not ready says so** (#3335): eight seconds after its scene is up, a water surface that is missing, disposed, out of the scene, not ready to draw or failing to compile posts what it found to the debug sink (`water-not-ready`), so the next first-visit sighting of missing water can be read rather than guessed at.
- **A sun's shadows follow the camera, whatever order things happen in** (#3420, Tonio: "I'd really like shadows to just work"). Babylon's cascaded shadow generator works out its cascade splits from the camera's near and far planes once, and again only when its own settings change; a camera change never told it, and its `shadowMaxZ` setter ignores a value the camera of the moment does not admit. So a sun made while the camera was unusual kept that camera's splits for good: made during an orthographic face view (whose near plane sits behind the camera), the splits were NaN and the whole scene rendered black, in perspective too. Switching cameras or entering a headset left stale splits the same way. `<tosi-b3d-sun>` now checks, just before its shadow map renders, whether the camera, its near or far plane or its projection changed, and if so splits again and re-applies `shadowMaxZ`; a near plane at or behind the camera is never split from (a small positive one stands in, and the camera gets its own back before anything draws). `cascadesFollowCamera(generator, shadowMaxZ)` does the same for a generator of your own. Reproduced headless in a minimal scene (a late sun, a face view, back to perspective: black before, a shadow after); unit-tested against a stand-in generator.
- **The rig tool casts shadows** (#3420): the standalone page declares a sun in its scene, as the playground does, and hands the character (and, in a face view, its seam twin) to the sun's shadow generator. `inspectStage({ light: false })` leaves out the stage's key light for a scene with a sun of its own; `seamOverlay` returns its twin as `mesh`. Hosted, the figure is in the host's lighting. The failures behind #3420 turned out to be the camera, not the order (see the entry above).

Size: barrel (min, packages external) 1230.0 KB raw / 421.9 KB gz, +0.41% on 0.10.20 (system panels from code, attention, the per-change systempanels event, and the gate's fixes).
