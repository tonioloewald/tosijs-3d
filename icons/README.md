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

`stroked/feather/clock.svg` is Feather's clock (MIT, 2026-10), for the watch's system-bar button.
