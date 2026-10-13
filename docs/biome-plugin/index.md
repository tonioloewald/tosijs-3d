# biome-plugin

The Babylon half of the procedural terrain shader (TERRAIN-SHADER-DESIGN.md):
a `MaterialPluginBase` that replaces the diffuse of the terrain material with
**world-space biome classification** — the GLSL mirror of [[biome-chart]]'s
pure, unit-tested model (one function per shader expression, same names).

This is build-order **step 1 + 3**: flat-colour biome cells (validate the
chart mapping before any texture), fBm axis noise + `edgeDither`, the slope
cliff override, and the photic cutoff sharing b3d-water's fog curve. The
array-atlas sampling (step 2) replaces `cellColour` with `TEXTURE_2D_ARRAY`
fetches later — the classification above it doesn't change.

Attach via [[b3d-terrain]]'s `biome="on"` attribute, or `attachBiomePlugin`
on any material for authored tiles. Being a plugin (not a ShaderMaterial),
scene lighting, shadows, and fog keep composing — the same reason
[[cloud-shadows]] is a plugin.

## Roles: one climate, several kinds of material

The same plugin shades the ground, the rocks on it and the trees, so that all
of them follow the planet. What differs is the plugin's `role`, which is a
property of the MATERIAL and is set on the plugin, never in `params` (a
decorator shares one `params` object between the terrain and everything it
places):

| `role` | What it does |
| --- | --- |
| `'ground'` (default) | Classified by slope and climate, like terrain. Rocks use this |
| `'leaf'` | Keeps its own colour, pulled toward the ground's by `leafBlend`; turns in autumn and is bare in winter |
| `'evergreen'` | A leaf that does not turn or drop (needles, palms, cacti); whitens under snow |
| `'bark'` | Keeps its own colour, lightly tinted by the ground |

```javascript
const plugin = attachBiomePlugin(leafMaterial)
plugin.params = terrainPlugin.params // the SAME object: one climate
plugin.role = 'leaf'
```

[[b3d-decorator]] does this for you, by material name (`roles`).

## Seasons

`params.season` is where in the year it is (`0` spring equinox, `0.25`
midsummer, `0.5` autumn, `0.75` midwinter) and `params.seasonality` is how far
the year swings the temperature (`0`, the default, is no seasons; `0.2` is
temperate). Winter cools the whole chart: where that takes a moist place below
freezing, snow lies on level ground and on evergreens, and the sea can freeze
([[water-shore]]). `seasonOf(season, seasonality)` is the pure rule. On a
terrain these are `biomeSeason` and `biomeSeasonality`.

Both are in CHART units (see [[biome-chart]], "Two temperature scales"), not
the degrees an author sets with `biomeTemperature`.
