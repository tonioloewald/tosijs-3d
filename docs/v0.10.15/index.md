# 0.10.15

<!--{ "parent": "CHANGELOG", "order": 9989985 }-->

## Added

- **The rig tool** (`/rig-tool/`, `tosijs-3d/rig-tool`; Tonio). Load a demo character (the weasels and the space marine are rigged from markers on the spot, as the auto-rig page does, and a weasel's tail is a spring from the start) or your own GLB, check which bone plays each role (fingers included), set the arm space, hang spring chains on it (a new strand with a tube, such as a ponytail, or bones the model already has, such as a tail), and try any UAL clip beside the mannequin, scaled to the character. It opens in the rest pose with a dot on each role's bone: tap a dot, then the body, to give the role a bone (or hang a spring chain there); drag a strand's root and tip to place it. Save the result as a **rig recipe** (JSON), load it back, or copy it; the working recipe is kept per model in the browser. The element's `.rig` (`recipe`, `applied`, `load`) lets a page or an editor drive it.
- **Rig recipes**: `RigRecipe`, `validateRigRecipe` (headless, says what is wrong and where) and `strandDirection` in `rig-recipe`, and `applyRigRecipe(scene, root, skeleton, recipe)`, which puts a saved recipe on the same model in a game: the skeleton read with the recipe's roles, ready for `retargetClip`, and the springs live.

- **Panning in the default view controls** (Tonio). Shift-drag pans with a mouse, a trackpad's two-finger drag pans (a pinch still zooms), and right-drag and ctrl-drag pan by the same rule as touch: the point you grabbed follows the pointer, at any zoom. `touchOrbit(camera, { trackpadPan: false })` leaves the wheel to Babylon. A trackpad and a mouse wheel send the same event, so `wheelClassifier` (in `touch-gesture`) tells them apart by heuristic: a pinch carries `ctrlKey`, a mouse notch is big, a trackpad moves sideways or starts small. A wheel over a panel is still the panel's.

## Fixed

- **Panels no longer blink when they rebuild.** A frame panel is an SVG drawn into its texture asynchronously, so a new plane is blank until that draw lands; on a headset (and a 4× throttled laptop: seven blank frames per rebuild) every refresh flashed. A rebuild now puts the new element into the SAME plane, and the texture keeps its old picture until the new one is drawn. This applies to the settings panel in a headset, the flat in-scene settings panel, and system panels (`frame-panel`'s new `setSvg`, `SvgTexture.setElement`).
- **The system bar and pinned flat panels are reconciled, not all rebuilt**, when the set of panels changes: the unchanged ones keep their mesh.
- **A rebuilt settings panel keeps its scroll position**: flat in the scene, in the HTML overlay, and in a headset.
- **Retargeted characters keep their heads and hands** (Tonio). Where a bone with no joint below it points (a head, a hand) was measured through the mesh's world matrix, which is wrong under a scaled armature: omnidude's (Mixamo, 0.01) all landed by the origin, so every clip played his head upside down and twisted his hands. It is now measured through each bone's inverse bind matrix and up the rest chain, as the bones are.
- **Fingers and thumbs are retargeted.** `humanoidRoles` finds each finger's three joints across UE, Mixamo and Rigify spellings (never the tip's end bone or a metacarpal), so a clip's grip comes across instead of the fingers staying splayed at rest. A hand is aimed along a finger both rigs have, so the wrist's twist comes across too.
- **A settings-panel rebuild waits for the press to end**, so `refreshScenePanel()` during a slider drag no longer cuts the drag off (`panel3d`'s new read-only `pressing`).

Size: barrel (min, packages external) 1167.3 KB raw / 399.6 KB gz, +0.8% on 0.10.14 (the rig recipe and retarget's finger roles; the rig tool is a subpath, outside the barrel).
