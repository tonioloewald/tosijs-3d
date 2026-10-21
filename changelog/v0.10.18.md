# 0.10.18

<!--{ "parent": "CHANGELOG", "order": 9989982 }-->

## Added

- **`landformSchemas`**: the options of `volcano`, `impactCrater`, `pad`, `gulley` and `cover` as JSON Schema (asked for by ensemble, tosijs-3d#119, for landform pieces linked to a terrain). `x` and `z` carry `x-position`, so a host can take them from the piece's position. A default worked out from another option (a volcano's `craterRadius` is `radius × 0.22`) is marked `x-derived: { from, scale }` and has no frozen `default`, so it keeps following its source; `landformDerived()` works one out. A volcano's `activity` names its stops (extinct, dormant, semi-active, erupting). The schemas are typed against the options interfaces, and a test checks that spelling out every default draws the same ground as leaving it out.
- **`slider3d({ stops })`**: named values on a slider's track (tosijs-3d#121): a tick at each, a detent that catches the handle within a few pixels, and the name beside the number while the value is on it. The landing spot for a schema's `x-stops`.

## Changed

- **`effectRecipeSchema()` says which strings are fetched** (tosijs-3d#120): a sound layer's `url` is `format: 'uri-reference'`, and a particle layer's `texture` is `anyOf` a URI (not starting with `<`) or inline SVG markup (`contentMediaType: 'image/svg+xml'`, `x-inline: 'svg'`), told apart by the leading `<` exactly as the player does. Markup is drawn as an image, so nothing it links to is loaded.

Size: barrel (min, packages external) 1211.0 KB raw / 414.4 KB gz, +0.4% on 0.10.17 (landform schemas, slider stops).
