# 0.10.14

<!--{ "parent": "CHANGELOG", "order": 9989986 }-->

## Fixed

- **A press during a system panel's content swap is no longer lost** (#111 follow-up, ensemble). Setting `el.svg = next` on an open panel closed and reopened it, which left a moment with no plane: a click landing then went nowhere (ensemble's host-actions test failed one run in four after a store refresh swapped every panel's content), and `contentToClient` returned null. A framed panel (the default title bar) now swaps the content under the same frame, so the plane, texture, spot and focus stay. `panelopen` still goes to the old content (close) and the new (open). A press already down in the old content ends there rather than releasing onto the new. `chrome="none"` panels still close and reopen.
- **The docs a consumer reads describe what the code does** (#116, ensemble). `select3d`'s JSDoc called it "a compact cycler, no dropdown" five releases after it became a select that opens a list (it steps only with no host). A sweep of every behaviour change in this CHANGELOG against the shipped docs found 33 more, fixed against the code:
  - The settings panel is the owl's in-scene panel, not a gear and an HTML overlay (about 20 pages, and the `scenePanel` property).
  - `gameController`'s key map: the wheel zooms (the d-pad axis), the arrows look, the mouse buttons are listed, `mouseLook` defaults to `'off'`.
  - `b3dBiped`: the camera defaults in its table, `invertLookY` is off by default, `jumpSpeed` has no wind-up, `wadeDepth`'s swim thresholds (in at 1.3 ×, out at 1 ×).
  - SSAO runs in a headset with `on` and the default `projected` method (three type docs and a console warning said never).
  - `slider3d`'s peek readout sits beside the label; `panel3d`'s gap is 4.
  - Frame-panel presets are angular, and frame panels can show flat; `b3d-moon` lights the night; planets have no separate sea sphere; the loadout is on the system bar; `lookX`/`lookY` persist on foot; `gamepadFade` ignores the pointer; the aircraft's `maxSpeed` is full lever; `GulleyOptions.heading` is degrees; `iconGlyph` takes composed and mirrored names; `biomeLapseRate`'s auto value is a fixed 0.004.
  - Two doc comments had come loose from their declarations (`iconGlyph`'s sat on a private constant, `wadeDepth`'s on the wrong attribute), so the `.d.ts` documented the wrong thing.

## Added

- **`titled3d(…).setContent(next)`**: other content under the same title bar, in place (the old content goes back where it came from).

Size: barrel (min, packages external) 1158.6 KB raw / 396.5 KB gz, +0.05% on 0.10.13.
