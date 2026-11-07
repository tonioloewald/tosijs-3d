## Provenance

`stroked/feather/{pause,play,pause-circle,play-circle}.svg` copied from
tosijs-ui's feather set (2026-08) for the scene panel's pause/resume toggle.
A missing name renders as a **plain box** with no error — the toggle shipped
looking like a solid white square, and the icon set was the last place anyone
thought to look, because the icon EXISTED upstream. `svg-icons.test.ts` now
asserts every name the app asks for is present.

`stroked/resize.svg` is copied verbatim from tosijs-ui's icon set (2026-08) so
`svgIcons.resize` exists here — if the original glyph changes upstream, re-copy
it. If copying recurs for more glyphs, consider a shared icon source instead.

`stroked/feather/{moon,thermometer}.svg` copied from tosijs-ui's feather set
(2026-09) for Land and Sky's section tabs. `stroked/tree.svg` is ours (Feather
has no tree): a trunk and a two-tier conifer, Feather's 2px stroke.

`stroked/feather/{book,book-open}.svg` copied from tosijs-ui's feather set
(2026-10) for the journal. `stroked/backpack.svg` (inventory) and
`stroked/loadout.svg` (a standing figure: what you are wearing and holding)
are ours, Feather's 24 grid and 2px stroke; Feather has neither (2026-10).

`stroked/lucide/person-standing.svg` is Lucide's (lucide-static 0.460.0,
ISC licence, Lucide Contributors; lucide.dev), copied verbatim less its
licence comment and class, for the inventory's system-bar button (2026-10).
`stroked/lucide/lucide-backpack.svg` is Lucide's `backpack` from the same
release, copied the same way, renamed so it sits beside our own `backpack`;
it marks the inventory's **unequip** target (2026-10, may be replaced).

`stroked/feather/clock.svg` is Feather's clock (MIT, 2026-10), for the watch's system-bar button. `stroked/feather/download.svg` is Feather's download (MIT, 2026-10), for the scene panel's screenshot tool.

`stroked/lucide/scissors.svg` is Lucide's `scissors` (lucide-static 0.460.0, ISC licence, Lucide Contributors; lucide.dev), copied the same way as `person-standing`, for the tailor tool's system-bar button (2026-10). `color/rig.svg` is Tonio's, the rig tool's button: a figure with its joint markers (2026-10).

`stroked/biped.svg` is Tonio's biped (2026-10), drawn on a 48 grid in Amadine and kept on it (its leg gap is narrower than a 2-unit stroke on a 24 grid), so its line is lighter than Feather's; its baked black is left out so it follows the theme.

`stroked/filled/biped-preview.svg` is Tonio's (2026-11), the character builder's preview: the walking biped inside a turning arc. In `stroked/filled` a path drawn with no fill is OPEN (the arc, the arrowheads); tosijs-ui's generator strips every fill there, so `bin/icon-open-paths.ts` (run by `bun run icons`) puts `fill="none"` back on those paths.

`stroked/filled/{ancestry,body,character,clothing,eyes,face,hair,motion,skin}.svg` and `stroked/spring.svg` are Tonio's (2026-11), the character builder's and the rig tool's section tabs.

In `stroked/filled` a path drawn with `stroke:none` is a fill with no outline (the skin icon's neck and shoulders). tosijs-ui's generator strips it (tosijs-ui#251), so `bin/icon-no-stroke.ts` (run by `bun run icons`) puts `stroke="none"` back. `stroked/filled/motion.svg` was drawn on a 48 grid and is rescaled to 24 (2026-11).

`stroked/feather/upload.svg` is Feather's upload (MIT, 2026-11), for a material input's "choose a picture". `color/color-picker.svg` and `color/cloth-texture.svg` are Tonio's (2026-11): a material input's flat colour, and a picture.
