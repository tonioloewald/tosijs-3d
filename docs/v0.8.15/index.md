# 0.8.15

<!--{ "parent": "CHANGELOG", "order": 9991985 }-->

**Rocks and trees that belong to the land.** Procedural rocks, Quaternius
trees gathered into copses, and a biome shader that colours vegetation by the
ground under it and by the season: autumn colour, bare winter branches, snow.

Size: barrel (min, packages external) 932.0 KB raw / 313.0 KB gz, +1.85% on
0.8.14.

## Added

- **Procedural rocks.** `rockGeometry({ seed })` makes a rock from a seed
  (a sphere cut by random planes, roughened, squashed, sunk into the ground):
  pure, deterministic, no model file. The decorator's default boulders and
  stones are now these instead of Kenney's, and it shades them with the
  terrain's own biome colours, so their tops take whatever grows there and
  they change colour with the planet. A scatter rule asks for one by name:
  `rock:boulder:3` (`rockNames('boulder', 6)` lists six). See
  [procedural-rock](/procedural-rock/).

- **The scatter gathers into clumps.** Every rule now clusters by default
  (copses, thickets, rock fields, with thin outliers between) instead of
  spreading evenly. Per rule: `clump` (0 = the old even spread, default
  0.85), `clumpScale` (this rule's clump size relative to the scatter's) and
  `clumpGroup` (rules in one group gather in the same places; the default
  stones gather around the boulders). The scatter and `<tosi-b3d-decorator>`
  take `clump` (one strength for every rule) and `clumpSize` (metres; 0 =
  auto, about two and a half times the average spacing, so pulling `radius`
  in keeps the clumps).
- **The scatter's budget is a ceiling.** It no longer fills the gaps between
  clumps, or packs thin habitat as full as lush, to reach the number: a small
  radius or a map that is mostly sea gets fewer and keeps its shape. It also
  lays down at least `oversample` × budget candidates (it could lay down
  half that), so a high budget no longer stalls below itself.
- `ScatterRule.sink`: how much of a model is buried. The default rocks bury a
  quarter or more; they used to rest on their lowest point and looked set
  down on the ground, or floating over it. Same seed gives a DIFFERENT layout
  than before; set `clump: 0` on a rule to get the old one back.

- **Seasons in the biome shader.** `<tosi-b3d-terrain biomeSeason
  biomeSeasonality>` (params `season`, `seasonality`): the year swings the
  chart's temperature axis, so winter cools the whole ground (snow lines drop)
  with no second palette. `seasonality` defaults to 0, so nothing changes
  until you ask. `seasonOf(season, seasonality)` is the pure rule.
- **Winter snow.** Where the season takes a moist place below freezing
  (temperature about 0.3), snow lies on level ground and the tops of rocks,
  and evergreen foliage goes white. It is a layer of its own, applied only
  while the season is pulling cold, so a world without seasons is unchanged.
- **Deciduous trees drop their leaves.** After the autumn turn (season 0.55
  to 0.7) `leaf`-role canopies thin in soft patches and are gone through
  winter, leaving trunk and branches, then return across the spring equinox.
  Evergreens, and anything in warm country, keep theirs. A bare tree still
  casts its full summer shadow and still counts in ambient occlusion.
- **Vegetation roles: trees take their colour from the land.**
  `BiomePlugin.role` is `'ground'` (as before), `'leaf'`, `'evergreen'` or
  `'bark'`. A leaf is its own green pulled toward the colour of the ground
  under it (`leafBlend`), and turns in autumn in temperate country; an
  evergreen does not turn. The decorator assigns roles by material name
  (`roles`, default `NATURE_ROLES`, with `Model*/Material` keys for one
  model's use of a shared material).

- An **Occlusion on/off button in Perf Stats**, so its cost can be read in any
  demo on any device; Land and Sky has its own control too.

## Changed

- **⚠️ The decorator's defaults changed: models, rocks and layout.** See
  [Migration](/Migration/) for the exact steps. In short:
  - With no `url` it now loads `quaternius/libraries/nature.glb` (a curated
    64-model library: common, pine, birch, willow and palm trees, dead trees,
    bushes, cacti, undergrowth) with the new `NATURE_RULES`. Custom rules that
    use Kenney's model names and set no `url` now find none of their models:
    the decorator warns and places nothing for them. Set `url` to
    `assetUrl('kenney/libraries/nature-kit.glb')`.
  - Naming a `url` still gets `NATURE_KIT_RULES` and Kenney's trees, but NOT
    the old result: its rocks are now the procedural ones, everything clumps,
    and the same seed gives a different layout. `clump: 0` on a rule (or
    `clump="0"` on the element) restores the even spread.
  - Rocks are no longer placed on a volcanic province. They cannot read the
    province, so they came out the colour of the country around it.
  - The new trees are heavier (about 1,000 vertices each against Kenney's
    100): Land and Sky's 2,000 placements went from about 205k to 365k
    vertices.

- **A volcano's flank is bare basalt, and seams start only near the top.**
  Walking in from the edge of `volcano()`'s province you now cross the biome,
  then plain basalt, then faint seams from about 55% of the way to the crater
  rim; stronger veins and open lava are inside the crater only. The rim's
  province value is 0.25 (it was 0.5). In the biome shader, a local province
  draws no seams below 0.14 and all of them by 0.4; the global `volcanism`
  dial is unchanged. Land and Sky's volcano keeps its size with a smaller
  crater (radius 55, it was 90).

- **A standalone headset sizes build-once budgets for stereo from the start.**
  Terrain detail and tile pool, shadow map and cascade count, cloud shadows and
  reflection probes are sized when the scene is built, which is before any
  session, so a Quest got the flat (`medium`) numbers and kept them in VR. They
  now resolve at the XR tier (`low`) on a standalone headset, flat included:
  terrain 12 subdivisions and 56 tiles instead of 16 and 80, shadows 2 cascades
  instead of 4. A PC driving a headset is unaffected. `headsetDevice()` is
  exported for your own build-once budgets.

- **Water's reflection and refraction follow the device tier.** Each is the
  whole scene drawn again, and both were 1024 and redrawn every frame on every
  device. `textureSize` now defaults to auto (1024 / 512 / 256) and a new
  `reflectionRefresh` redraws them every Nth frame (1 / 2 / 3) on a flat
  screen; inside a headset session they are redrawn every frame, because
  skipping one eye breaks stereo. Top-tier devices are unchanged. To keep the old behaviour everywhere, set
  `textureSize="1024" reflectionRefresh="1"`.
- Land and Sky's lightning storm toggle moved to the Weather tab.

## Fixed

- **A small, distant sun is visible in an airless sky.** Its disc is drawn at
  true size, which from Jupiter is under a pixel, so Io had no sun. A tight
  glare now takes over as the disc shrinks.

- **A world with no moisture grows nothing.** The cactus rule accepted a
  moisture of zero, so Mars grew cacti (and a few dead trees).

- **Switching decorator shadows on made whole models vanish**, and every
  rebuild flashed the full scatter before dropping most of it. Each part's
  shadow-only twin shared its geometry, and with it the thin-instance buffer,
  so the visible mesh drew its full count from the twin's short list and
  WebGL rejected the draw. The twin now has its own geometry.

- A menu hung off a narrow button (`button3d({ menu })`, `openMenu3d`) is now as wide as its longest label. It used to take a 160 floor, so longer labels ran out of the box (Land and Sky's preset menu).
- **A `select3d` inside a `row3d` stepped to its next option instead of opening
  its list.** A row did not pass the panel's host to its children, and a select
  with no host falls back to stepping. Land and Sky's world picker jumped from
  Earth to Mars on a tap. (Seen in a headset, reproduced flat.)
