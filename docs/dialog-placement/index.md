# dialog-placement

**Where a modal dialog goes, when it should follow you, and which way a panel
faces** — the pure half of world-placed dialogs, plus the one function every
panel in the library aims itself with (`faceViewer`). Babylon-free (plain `{x, y, z}`), deterministic, and unit
tested, so the rules can be argued about without a headset.

## Why dialogs are world-placed at all

A camera-parented panel is the obvious implementation and the wrong one. In 2D a
DOM element is clipped to its window, and `z-index` is a *local* claim that
cannot lift you out of an `overflow: hidden` ancestor. **Depth and collision are
XR's window frame**: you do not get to composite over them. A respawn panel set
to draw on top painted in front of the terrain and became untouchable, because
picking is geometric and does not care what you drew last.

So a dialog is a thing at a place. It occludes and is occluded like anything
else, it stacks with other UI by ordinary depth, and it does not jitter with
your head.

## Why it still follows you

The one honest argument for head-locking is "what if I cannot find it". Answer:
if the dialog has been outside a generous cone for a couple of seconds, it
re-picks a spot in front of you and eases over. You get findability without the
panel chasing your eyes — the thing that made a face-pinned pause dialog
unpleasant.

**Eased, never snapped.** A dialog that teleports reads as a glitch; one that
moves reads as deliberate.
