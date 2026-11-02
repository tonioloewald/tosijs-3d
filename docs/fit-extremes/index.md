# fit extremes

**Every garment and hairstyle, on the bodies at the sliders' corners.** A
character is judged on its worst screenshot, and the worst ones are at the
extremes: the heaviest, most muscular, tallest, oldest bodies, the ancestry
corners, the local shapes pushed all the way. This sweep morphs each of those
bodies, fits everything that can be worn as the character builder fits it,
and measures:

- **penetration**: garment and hair vertices inside the body, raw (inside
  the bare skin) and VISIBLE (deeper than the builder tucks the skin there,
  so skin would show through the cloth);
- **bone sanity**: the skeleton `humanRig` fits each body, against the
  default body's (scale after height, left against right, chain order,
  joints inside the skin);
- and draws a **contact sheet** of the worst cases, headless (a software
  rasteriser into a PNG).

It runs with no engine and no DOM:

```sh
bun run extremes                 # the full sweep: 133 bodies, about half an hour
bun run extremes --quick         # the default body and 32 macro corners
bun run extremes --only casual   # only the garments whose names match
bun run extremes --sheet         # also draw the contact sheet
```

It reads MakeHuman's pack and Quaternius' hair library from `../static-assets`
when that is checked out (else from the CDN), and writes
`reviews/extremes/extremes.md` (each item's verdict: holds, fails at the
extremes, or broken at the default), `extremes.json` and the sheet.

The same parts are a library (`tosijs-3d/fit-extremes`): `sweepCorners`
lists the bodies, `runSweep({ pack, corners, proxies, hair })` measures
them, `summarise` and `renderMarkdown` report, `contactSheet` draws.
`penetration` and `checkBones` work on any body, with
[mesh-sdf](/mesh-sdf/) as the inside test.

**The bodies** (`sweepCorners`, 133): the default; every corner of the six
macros that blend as corners (gender, age from 25 to 90, muscle, weight,
height, proportions: 64), because they interact and only the full product
finds the bad combinations; each pure ancestry on eight gender, weight and
muscle corners (24); and each local shape (bust size and firmness, waist,
chest depth, pecs) at each end on four bases, plus the four with all of them
out at once (44). Children are not swept.
