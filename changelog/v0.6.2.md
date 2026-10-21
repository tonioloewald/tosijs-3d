# 0.6.2

<!--{ "parent": "CHANGELOG", "order": 9993998 }-->

Terrain gets **volcanism** and **authored landforms**, clouds get real shapes, and a
systemic timing bug that made half the engine run in slow motion is fixed. Additive
only — no API removals, no peer-dependency changes. (The full terrain-system upgrade
lands as 0.7.0 once its remaining pieces are in.)

## Added

- **Volcanism intensity ladder** ([biome-plugin](https://3d.tosijs.net/biome-plugin/)) —
  the `volcanism` dial now climbs stages rather than scaling one look: near-black basalt
  with dark-brown voronoi seams → dark-brown rock with glowing seams → patchy open lava.
  Verticals lag one stage behind horizontals (lava pools flat; cliff faces drain and
  crust over), veins widen as the ladder climbs so pools form by veins merging, and the
  glow is subtly animated (spatially-phased pulse + drifting 3D-noise churn — never a
  global blink). Water pushes the ladder down half a stage and mutes the glow with depth
  instead of cancelling it: smouldering veins under shallow water.
- **`volcanicPalette`** + `LAVA_PALETTE` / `CRYOVOLCANIC_PALETTE` — the seven ladder
  colours are data, so a frozen world venting molten _water_ (pale ice rock, teal veins,
  glowing blue-white melt) is a palette swap, not a new shader.
- **Local volcanic provinces** — `b3dTerrain.provinceField = (x, z) => 0..1` marks
  _this_ island volcanic independently of the global dial. Sampled per tile vertex in
  origin-stable coordinates and carried to the shader in the colour buffer's (visually
  inert) alpha channel.
- **[landform](https://3d.tosijs.net/landform/)** — authored landforms FORCED through
  the terrain noise via the new `b3dTerrain.landform` hook, where
  [slope-profile](https://3d.tosijs.net/slope-profile/)s only _remap_ it. `volcano()`
  and `impactCrater()` each return a matched pair — the height shape **and** the
  volcanism province that makes it glow — so a volcano goes anywhere and an explosion
  leaves a glowing crater. `pad()` claims flat ground for cities and bases;
  `composeLandforms` / `mergeProvinces` chain them. Pure, deterministic, unit-tested.
- **`_centerOfGravity` model convention** — a child node with that suffix declares where
  a vehicle pivots in flight, while the root origin stays its on-ground stance point, so
  one model conveys both how it flies and how it plants.
  `findCenterOfGravity`/`applyCenterOfGravity` are exported; `b3d-aircraft` applies it
  on both load paths.
- **`b3dClouds({ model })`** — an authored GLB mesh becomes the cloud lobe (normalized
  on load, bottom-aligned), and clouds are now built as **clusters** of 2–4 overlapping
  lobes laid out by size rank (biggest low, smallest on top straddling the pair) with
  aligned bases, since cumulus condense at a level.
- **`B3d.frameDelta`** + **`sceneDelta(scene)`** — the authoritative inter-render delta
  (see Fixed).

## Fixed

- **Everything ticking in a scene observer ran in slow motion.** Babylon's
  `getDeltaTime()` measures the engine's rAF tick, but scene observers only fire when
  `scene.render()` runs — and `<tosi-b3d>` throttles rendering to `frameRate`. At
  `frameRate: 60` on a 120Hz display that's **half speed**; at the default 30, a
  **quarter**. Measured live: a dropped bomb inherited exactly 50% of the aircraft's
  velocity. B3d now publishes the real delta and 14 call sites use it — projectiles,
  missiles, turret, radar, warhead FX, spawner, clouds, ambient, death orbit, exploder,
  star / star-system / planet / black-hole.
- **`canonicalize` applied a spurious 180° yaw**, flying correctly-authored (Blender
  −Y-forward) models backwards. Babylon reads node-local data raw — the handedness flip
  lives only on the discarded `__root__` — so the collapse now applies **no rotation**,
  it only cleans. Pinned against real content in `model-frame.test.ts`.
- **Weapons inherited a phantom velocity.** `this.velocity` is only the aircraft's
  hover/ground integrator and reads zero in wing-borne flight; weapons now inherit the
  true world velocity, so bombs fall with you and cannon rounds lead correctly.
- **Weapon muzzles are computed through the world matrix**, so shots leave the visible
  airframe under any attitude or centre-of-gravity pivot.
- **Flying into a cliff face passed through it** — the ground check was a single
  downward ray, which reports the valley floor while a wall fills the windscreen.
  Airborne frames now also sweep along the velocity; steep contacts crash.
- **Death could strand you in the wreck.** Charring the wreck cloned a material carrying
  an unregistered plugin, Babylon threw, and the sequence aborted _after_ the explosion
  but _before_ releasing input focus — no spectate camera, no respawn panel. Material
  plugins are now registered for cloning, and death's exit is shielded so cosmetics can
  never block it again.
- Volcano calderas are flat-floored basins with the melt confined to the floor and a
  crusted rim (a smoothed shading normal can't make the rim read as open lava).
- Library instances carry their animations, retargeted onto the instance.
