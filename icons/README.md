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
