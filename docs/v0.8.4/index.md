# 0.8.4

<!--{ "parent": "CHANGELOG", "order": 9991996 }-->

**A sky you can actually see the stars in, and a world with things growing on
it.** The encoded sky is decoded exactly (sharp points, not smeared blobs),
twinkles, and is rebaked from the new voxel galaxy — one galaxy implementation
now, with stable star addresses and a biased "interesting stars" population.
Worlds get their own air and dust (a black noon on the Moon, a butterscotch
Mars), cosmetic extra moons whose phase follows the sun, and render resolution
follows the display by device tier. `<tosi-b3d-decorator>` scatters rocks and
trees by budget and biome, with near-only shadows and colliders. Plus a
batch of adopter fixes (ensemble's #76–#91, touch-orbit #52) and review
follow-ups, and the first release through the OIDC + staged publish flow.

Size: barrel 837.8 KB min (+5.6%) · **279.6 KB gz (+6.3%)**; dist total 1.30 MB gz (+4.3%).

> **Visible, not breaking:** every `PRNG`-seeded output re-rolls (xoshiro128\*\*
> replaces the Mersenne Twister), so a given seed produces a different galaxy,
> star system, cloud field, crowd and spawn sequence from 0.8.3 — "same seed,
> same battles" holds within 0.8.4, not across the upgrade. The shipped sky is
> rebaked (and now served from a versioned URL). Deprecated names still work
> and warn once: `generateGalaxy` (use `voxelGalaxy`), `onEnter`/`onExit` on
> the trigger, `handleChange`/`handleCommit` on the manipulator
> (`whenChange`/`whenCommit`). `registerIcons` now refuses markup that can run.

## Fixed

- **Dropdowns in a panel with a pinned header opened over their own
  control** — body popups were anchored as if there were no header, too high
  by its height. The in-VR scene panel has one (the transport bar), so this was
  every select in the headset. Header widgets also get a host now, so a
  `select3d` pinned in a header can open at all.
- **`FrameInfo` keeps wall-clock time while paused**, as documented:
  `realDt`, `realElapsed` and `frame` advance on a paused (still rendering)
  frame; `dt` and `elapsed` stay stopped. They used to freeze too, which broke
  the one case they exist for — a spinner on the pause panel.
- **Floating origin reaches the placeables.** `b3d-prop`, a standalone
  `b3d-beacon` and a place-anchored `b3d-spawner` drifted on a terrain rebase;
  they now shift with it. The shared piece is `AbstractMesh.followOrigin()`,
  which `b3d-destroyable` now uses too.
- **`b3d-trigger` no longer calls BOTH `whenEnter` and `onEnter`** — the new
  name wins and the old one warns once, like every other deprecated callback.
  `themeEditor` reads `handleChange`/`onChange` the same way (it never warned).
- **A table's row-button menu opened low** by the COLUMN gap; it is now
  anchored at the row.
- **A log slider with `zeroStop` ignored `step`**; it quantises in decades
  like one without.
- **`registerIcons` refuses markup that can run** (`<script>`, `on*=`
  handlers, `<foreignObject>`, `javascript:` URLs) with a warning; the trust
  boundary is now documented.
- Clouds, ambient and water share one wind-inheritance rule
  (`inheritedWind`); `vector3d`/`footprint3d`/`curve3d` import `handlerOf`
  from its own module rather than dragging in `widgets3d`.
- **Stars were smeared into soft plus-shaped blobs.** The sky's star decoder
  placed each star relative to whichever tap fetched its texel, so it moved
  as the fragment moved and was drawn across the whole texel (sometimes twice,
  when two rotated taps hit one texel). It now walks the 3×3 neighbourhood in
  texel space and rebuilds every star from its own texel and sub-texel offset,
  through an exact GLSL mirror of the codec's cube convention. Also, **the
  data cube had mipmaps**, despite a comment saying otherwise: a mip of packed
  fields is data nobody encoded. They are off now.
- **Airless sun and moon vanished** (the moon kept only its glow). The sky
  model draws both through scattering, so without air there was nothing left.
  Real half-degree discs now fade in as the air goes, and the glow fades with
  it: a hard white sun and moon on a black sky. The airless moon is as bright
  as the moon seen through air.
- **The voxel galaxy's disc was built of slabs** (seen by Tonio as
  "ellipsoid columns" at 1M stars). Voxel layers (0.03 at `nz` 20) were as
  thick as the disc, so stars sat in flat slabs with hard edges. `nz` now
  defaults to 60. Every voxel address changes (0.8.4 already rerolls the
  galaxy), and the shipped sky is rebaked with a slightly crisper band.
- **Big objects in the star sky were clipped square**, and **packed stars sat
  on a lattice.** Objects wider than the decoder's 3×3 reach (distant galaxies
  run to 3.5 texels) were cut at texel edges. Everything now tapers to nothing
  within a texel. Packed stars in the dense core, known only to a quarter
  texel, were drawn at their cells' centres, which formed a lattice the cube
  projection bends into curves. They now get a deterministic jitter within the
  cell (error diffusion for position).
- **`atmosphere` just below 1 made the clouds vanish.** 5% vacuum pushed a
  1–4 km fog out past 50 km, and the haze that hides the cloud deck's rim went
  with it. The world's air is now steep, nearly binary (vacuum is
  `(1 − atmosphere)⁴`): 0.95 is Earth, and only the last stretch thins the sky.
- **Touch on the orbit camera: two fingers pan, a pinch zooms** (tosijs-3d#52).
  Babylon's default does both on every two-finger move, with zoom from the
  change in SQUARED spacing, so a drag read as "a weird zoom"; its alternative
  mode turns a slow pinch into a pan for good. New **`touchOrbit(camera)`**
  (wired into `<tosi-b3d>`'s default camera and `orbitCam`) decides once per
  gesture from NET spread vs NET centroid travel, then locks. Pan follows the
  fingers (pixels → world units at the target's depth), and zoom is natural.
  Pure decision model in **`touch-gesture`**, unit-tested; measured in
  headless Chrome with emulated touch: a 150 px two-finger drag now moves the
  target 2.35 m with the radius unchanged, where before it moved 0.76 m and
  zoomed 8 → 8.68.
- **Vacuum hid the stars it was supposed to reveal.** The space band's fog
  layer defaulted its sky veil to its weight, so leaving the atmosphere
  painted the sky black OVER the starfield. Vacuum is the absence of a
  medium; it now thins the haze without veiling the sky. Found building
  `atmosphere: 0`, and it applies to the rocket climb too.
- **A field outside an attached `fieldGroup` swallowed keystrokes silently**
  (tosijs-3d#82). Attaching any group stood the global key listener down for
  EVERY field, so a tapped field outside it showed a caret while its keys went
  to the group's active field or nowhere. Now the listener stands down only
  for fields an attached group owns, and a field outside every group that
  takes focus makes those groups let go. `fieldGroup` gains **`add(field)`**,
  so a field created after the group can join it rather than depending on
  construction order.
- **A page that mounted and removed scenes hit Chrome's WebGL context cap**
  (tosijs-3d#79). Babylon's `engine.dispose()` keeps the context alive unless
  `loseContextOnDispose` is set, so every removed scene held one until GC, and
  Chrome force-loses the OLDEST live context past its cap — the scene you are
  looking at goes black. Teardown now releases the context, and an element
  re-added after a removal gets a fresh canvas (a lost context is permanent
  for its canvas). A genuine re-add no longer warns "an engine already
  exists". `bun bin/context-cap.ts` checks it in headless Chrome: 50 trips
  with the removed elements retained; the live scene rendered nothing before
  the fix and renders now.
- **Starfield attributes were construction-time only** (tosijs-3d#88). Setting
  `starfieldData`, `starfieldCube`, `starfieldTilt`, `nebulae`, … on an
  existing sky did nothing — no request, no stars, no error. They rebuild the
  starfield now; the dome is untouched. A dispose also releases the cube
  textures (a moved sky used to leave them behind).
- **A sky given `starfieldData` alone drew no stars.** The build returned
  early unless `starfield` or `starfieldCube` was set, although the data cube
  stands on its own.
- **`slider3d`, `toggle3d` and `select3d` rejected the reactive boxes they
  are designed to bind** (tosijs-3d#76) — 24 false type errors in one
  consumer panel. `value` is `Bindable<T>` now (exported): a `T` or anything
  with `.value` and `.observe`.
- **`spaceStart`, `spaceFull` and `starDistance` said `unit` where every other
  schema field says `x-unit`** (tosijs-3d#85). A test now rejects a bare `unit`.
- **`azimuth` is out of `skyboxSchema()`** (tosijs-3d#86). It has been a no-op
  since the sky material fork (the sun is placed by `latitude` and
  `timeOfDay`), and the schema offered it as a 0–360° slider while the docs
  called it a 0–1 fraction. Still accepted in markup; documented as ignored.
- **A cloud deck forgot its local weather on a re-parent.** Its bake memo
  survived `sceneDispose`, so the fresh mesh stayed unbaked — orographic cloud
  gone — until some input moved. A deck moved into another `<tosi-b3d>` also
  kept sampling the OLD scene's terrain (a narrow regression from 0.8.3's
  cached lookup). Both reset on dispose now.
- **The deck did per-frame work it did not need.** With no field in force
  (orographic 0, no `weather`) it re-baked zeros on every grid snap and every
  terrain rebuild; and the fly-into-cloud whiteout rebuilt the whole weather
  field — a fresh terrain height sampler — every frame to sample one point.
  The first bakes once; the second samples the field the bake already built.

## Added

- **Undo for the two page-global mutations.** `themeEditor()`'s element has
  `restore()` — the palette as it was when the editor was built, then
  `handleChange` so you rebuild. `registerIcons()` now RETURNS an undo that
  removes the names it added and brings back any icon it replaced.
- **`<tosi-b3d-moon>`** — cosmetic extra moons (tosijs-3d#89). Put up to
  four inside a `<tosi-b3d-skybox>`: `azimuth`/`elevation` on the star
  sphere (they ride with the stars), `size` (angular diameter, degrees),
  `color`, `brightness`. The PHASE is automatic: each disc is shaded as a
  sphere lit by the real sun, so a moon near the sun is a crescent and one
  opposite it is full. A moon hides the stars behind it; it casts no light.
- **`voxel-galaxy`** (`tosijs-3d/voxel-galaxy`) — the first step of
  `GALAXY-DESIGN.md`: a galaxy as voxels, each with a derived bright and dim
  seed. `brightStars()` is the global pass; `dimStarsNear(point, radius)` is
  the local one the skybox baker will use. Density is sampled from
  `generateGalaxy` and propagated so no voxel is empty; stars are addressed
  `population:voxel:n` (no shared-seed clones). `galaxy-data` exports `starDetailFor`, `SPECTRAL_CLASSES`
  and `SPECTRAL_WEIGHTS`, split out so both generators share one definition.
- **The baker reads the voxel galaxy** (`GALAXY-DESIGN.md` step 2):
  `starsFromVoxelGalaxy(galaxy, shell, eye, { dimReach, floor })` gives every
  bright star (today's rule — intrinsic brightness), the dim stars near the
  eye falling off with distance (the gather radius computed from the floor,
  not guessed), and the distant shell. `bakeSkyPair` takes precomputed
  `objects`; `bin/bake-stars.ts` rebakes `static/sky/stars_*` without a
  browser in ~1 s for the tuning loop; `SHIPPED_SKY.voxel` holds the dials.

## Changed

- **`b3d-manipulator` callbacks are `whenChange` / `whenCommit`** — the
  component convention. `handleChange`/`handleCommit` still work, warn once,
  and are removed in 0.9.
- `AbstractMesh.applyUniformScale()` replaces the identical private copies in
  `b3d-prop` and `b3d-destroyable`.
- **ONE galaxy implementation** (GALAXY-DESIGN.md → "Reconciliation").
  The voxel galaxy is the galaxy now. `b3d-galaxy`, `b3d-star-system`, the
  skybox baker and `bin/bake-stars` all read it. Its nebulae and distant shell
  have their own derived seeds, so they no longer depend on the star count.
  - **Visible:** a given seed now produces a **different galaxy** from 0.8.3
    (same shape and distributions, different stars), and `starCount` is the
    galaxy's **bright budget** (±noise), not an exact count.
  - **`generateGalaxy` is deprecated** (removed in 0.9). It is now an adapter
    returning `voxelGalaxy({ seed, brightBudget }).view()`. The spiral model it
    was built on survives as **`sampleSpiral`**, which the density is sampled
    from.
  - **Stars have an address:** `id` is `seed:population:voxel:n`, with a
    sequence number rather than the derived seed. `galaxy.star(id)`,
    `b3d-galaxy.getStar(id)` and `b3d-star-system`'s new `star` attribute
    resolve it. Star _n_ never depends on the budget, so an address resolves
    even in a galaxy computed with a smaller one.
  - **New:** `voxelGalaxy().view()`, `.star(id)`, `.nebulae()`, `.shell()`;
    `b3d-galaxy`'s `dimBudget`; `starAddress` / `parseStarAddress`,
    `starNameFor`, `sampleSpiral` and `starsFromVoxelGalaxy` in the barrel.
  - **Interesting stars.** The dim population splits in two. **Interesting**
    stars have a planet with HI ≤ 2 (breathable or filterable air, under 2 g,
    not extreme); they are generated globally, so the galaxy demo's HI filter
    sees every habitable system with its HI already known. **Boring** stars
    are generated only locally, as sky texture. Both are exact: candidates are
    drawn from a spectral mix biased by measured pass rates, then verified with
    the real HI rules. The rates come from a harness, **`bin/tune-populations.ts`**,
    which writes `population-table.ts`. A fingerprint test fails when HI
    changes, and the fix is to rerun it. HI 3 is deliberately not
    "interesting": it has no air requirement, so the Moon and Mars are HI 3.
    `generateGalaxy` (deprecated) keeps meaning bright stars only.
  - **`PRNG` runs on xoshiro128\*\*** (new **`Xoshiro128`**, exported). MT
    carried 624 words of state and regenerated them before its first draw,
    so just constructing one cost ~13 µs, and a star system builds one per
    planet. xoshiro has 4 words: 30–75× faster to construct and draw, and it
    passes BigCrush and PractRand, which MT fails. A star system now costs
    6.5 µs, down from 70. It is checked against an independent BigInt
    transcription of the reference C. **Every `PRNG`-seeded output
    re-rolls:** planets, the spiral samples, nebulae, the shell and the
    skybox's point starfield. That is folded into this release, which already
    changes every galaxy. `b3d-clouds`, `b3d-crowd` and `b3d-spawner` moved
    too, so their seeded layouts (cloud blobs, crowd placement, spawn rings)
    reroll once as well. `MersenneTwister` stays exported.
  - **The shipped sky's nebula half is rebaked** with the new nebulae.
    **`bin/bake-nebula.ts`** bakes it in headless Chrome and checks that the
    point half on disk came from the same galaxy.
- **Noted late, from 0.8.3: `slider3d`'s `peek` readout appears BESIDE the
  caption rather than replacing it** (tosijs-3d#84). Deliberate — a label that
  vanishes the moment you touch the control loses the name of what you are
  adjusting — but it went unannounced, and a consumer test pinned the old
  behaviour. Press and drag over the caption also work (the stacked layout made
  the whole width the track); now pinned by a test.
- **The shipped sky's stars are rebaked from the voxel galaxy** — 100k bright
  stars plus the dim stars around the bake point (~119k objects, against 100k
  before). Far more stars at night, and a dense local sprinkle across the
  whole sky rather than only along the band. The band itself is a little
  broader. `bun bin/bake-stars.ts` with no flags reproduces it byte-for-byte;
  the smooth `nebula_*` half is unchanged.
- **The shipped sky has pinned, versioned URLs** (tosijs-3d#90):
  `/sky/0.8.3/…` (the previous sky) and `/sky/0.8.4/…` (this one), each with a
  `manifest.json` holding the decode parameters and the recipe.
  `/sky/stars` stays "latest" for the demos; a document should pin a version.
  `shipped-sky.test.ts` fails if latest drifts from the newest version.
- **A world's own air, and its sky colour** (tosijs-3d#89). `b3d-skybox`
  gains **`atmosphere`** (1 Earth … 0 the Moon: black noon, stars out, no
  haze, a hard sun), which multiplies with the space band, and
  **`zenithTint` / `horizonTint` / `tintStrength`**, which colourize the
  scattered light only, keeping its brightness (a butterscotch Mars, a green
  alien sky). Stars and moon are behind the air and stay untinted. Land and
  Sky gains an **Atmosphere** group: a world preset (Earth / Mars / Alien /
  Airless) plus live air, tint, turbidity, rayleigh, mie and luminance.
- **Viewer-relative panels in the flat view** (tosijs-3d#81).
  `<tosi-b3d-panel presence="both">` appears on a monitor as well as in a
  headset, placed with the same frame vocabulary (eye / body / neck / face,
  azimuth-elevation-distance, presets, gaze reveal). **`XrFrames.flat(scene,
camera)`** derives the frames from any flat camera's world pose (the eye
  frame takes the view's yaw, not its pitch). Hands have no flat analogue, so
  a hand panel declares **`flatFrame`**; without one it stays VR-only and
  warns once. `presence` defaults to `'xr'`, so existing panels are unchanged.
- **`<tosi-b3d-decorator>` — rocks and trees on the terrain, by budget and
  by climate.** The pure **`scatterPlacements`** model places a fixed NUMBER of things.
  Its rules use the biome shader's own axes (temperature, moisture, altitude
  above sea, slope), so pines grow in the cold, palms on warm shores, cacti in
  hot dry country, and boulders on the steep. Candidates are world-anchored
  and deterministic, and an acceptance threshold is solved to hit the budget.
  Provinces suppress by kind (no plants on a lava field; rocks still). Models
  come from Kenney's Nature Kit, drawn as thin instances: one draw call per
  model part, whatever the budget. A small collider pool follows the camera:
  trunks as posts, boulders as boxes. `measureCost()` steps through budgets
  and reports frame time, GPU time (where exposed), draw calls and indices.
  Land and Sky has a Vegetation group (budget 0–20k, reach).
- **Render resolution follows the display, by device tier.** Scenes rendered
  at CSS resolution, so a 1.25× or 2× display upscaled everything (soft edges,
  soft stars). The render now uses the display's pixel ratio capped by tier:
  high up to 2×, medium up to 1.5×, low at CSS resolution. The new
  `PerfBudgets.pixelRatioCap` sets the cap, and **`<tosi-b3d pixel-ratio>`**
  overrides it with an explicit value (`1` = CSS resolution, `2` = full
  Retina, `0.75` = below CSS for speed). It follows a window moved to another
  monitor, and XR is unaffected. The rule is `renderScalingLevel` in
  `b3d-quality`, tested.
- **Twinkle** (`starfieldTwinkle`, default 0.35): scintillation, which is
  the air, so it scales with the gas (none on an airless world), is strongest
  at the horizon, and each star flickers on its own pattern. Land and Sky has
  a twinkle slider.
- **`dust` on `b3d-skybox`** separates dust from gas. Gas (`atmosphere`)
  scatters blue; dust scatters a bright grey haze that the tint colours. So
  Mars is almost no air, lots of dust and a butterscotch sky (Land and Sky's
  preset: air 0.03, dust 0.85), and the Moon is neither. The previous Mars
  needed full air to be bright at all.
- **Star look dials on `b3d-skybox`:** **`starfieldGain`** (brightness) and
  **`starfieldFloor`** (the faint mass) join `starfieldSharpness` (size) and
  `starfieldSizeScale`. All four are live uniforms, so a slider does not reload
  the cube. With exact points the defaults moved to gain 0.9 and floor 0.4.
  Land and Sky has a Stars group (size, brightness, faint stars).
- **`slider3d({ useful: [lo, hi] })`** (tosijs-3d#83) — a soft band on the
  track where the values anybody wants live; the handle still reaches `min`
  and `max`. It is where a schema's `x-useful` lands.
- **`cloudDeckSchema()`** in `sceneSchemas` (tosijs-3d#87) — the deck was the
  one scene primitive a schema-driven consumer had to describe by hand.
- **Fetched strings are marked in the scene schemas** (tosijs-3d#91):
  `format: 'uri-reference'` on `starfieldData`, `starfieldCube`,
  `nebulaTexture`, `water.normalMap`, `clouds.model` and `ground.texture`
  (which also lists its keywords in `x-keywords`). A test fails on any new
  plain string that is not a colour, enum, URL or deliberately listed.
- **`bun run sizes`** — the barrel as a consumer bundles it, and the shipped
  `dist/*.js`, against a committed `dist-sizes.json` (0.8.3: 263.1 KB gz).
