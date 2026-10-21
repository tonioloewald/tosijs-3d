# 0.8.5

<!--{ "parent": "CHANGELOG", "order": 9991995 }-->

**Weather you can watch.** Storms that darken the day and strike: lightning
that lights the cloud from below, inside and above, lights the landscape and
throws shadows, with thunder at the speed of sound. Shafts of sun through a
broken sky, and the sky and sun seen through the water from below, with rays
fanning down from them. Rain and snow from the weather, the wind carrying
aircraft and buffeting them in a storm. And two long-hidden bugs: the cloud
deck's local weather was mirrored north-south, and on the doc site no shadow
map had rendered at all.

Size: barrel (min, packages external) 883.2 KB raw / 295.6 KB gz (+5.7% gz),
for lightning, light shafts, weather cells, trails and caustics.

## Fixed

- **Lightning lit the land through cloud-shaped shadows** (Tonio: "the
  directional light seems to be coming from above the cloud layer ... the
  shadows are mostly cloud"). The projected cloud shadow multiplied the
  whole lit colour, flash included; a flash starts BELOW the cloud, so the
  cloud shadow now fades while the deck is flashing (`strengthSource`, read
  at draw time).
- **Moonlight made shafts as bright as noon.** The shafts' colour was
  normalised and never scaled by the light's intensity; the skybox puts the
  moon in the same light at night. They now scale with it (moon shafts are
  real, and faint).
- **Shafts are SMALL where they leave the deck or the surface** (Tonio: the
  wider they are, the more obvious any mismatch with the gap): sky `width`
  200 -> 40 m (4 m near closed cover), underwater rays 0.2-0.8 m.

- **No shadow map rendered on the doc site, the sun's included.** Babylon's
  shadow generators lazy-load their shaders from code-split chunks, and each
  chunk loaded a second copy of the site bundle (tosijs-ui#191), which threw,
  so the shaders never loaded and every `isReady()` stayed false. The site
  entry now imports the shadow shaders statically and tells the generators
  they are loaded (site-only workaround; the library is unaffected).

- **Thunder kept playing after leaving the page** (Tonio). Thunder is
  scheduled ahead on the audio clock (a storm 2 km off rumbles 6 s after its
  flash, for 4 s), and disposing `<tosi-b3d-lightning>` neither stopped it
  nor closed the context. It now closes its AudioContext, silencing
  anything queued at once and no longer leaking a context per visit.

- **The cloud deck's local-weather texture was MIRRORED north-south.**
  Babylon's ground rows run from +Z to -Z; the texture's rows the other way.
  Everything reading the texture (local coverage, storm gloom, the cloud
  shadow) put storms and orographic cloud at the mirror image of where they
  were, invisible when a storm sat near the deck's centre. The lightning
  demo's storm, 1.3 km off-centre, was drawn 1.3 km the other way, so every
  strike lit empty sky. Pure `packWeatherTexture` flips the rows, tested.
- **A storm's sky only closed at its very core**, so from below you looked
  up through gaps at the inside of the tower, which read as the deck's
  BOTTOM bowing upward (Tonio). A storm now counts in full in the coverage
  (its share is taken out of the ramped field and added back whole): a cell
  of 1.8 closes the sky over the inner half of its radius, the base stays
  flat, and only the top skin rises into the tower. From above the ceiling
  bulges up; from below it is a flat, solid underside.
- **A strike lit the cloud one frame late** (the deck pushed its flash before
  lightning set it); the flash is now written at draw time. It also lights
  the TOP skin, so a tower seen from the side glows, and the ground light
  sits halfway between the cloud base and the terrain under the strike.

- **The launcher demo's left stick did nothing** (board #2434). Since the
  GTA-style remap the biped mapping sends A/D and left-stick X to `strafe`
  and only the right stick to `turn`; three doc demos (launcher, warhead,
  the controller's rover) still steered on `turn` alone, so the glass
  pad's stick and A/D were dead. They now steer on either.

- **Orographic cloud filled the whole sky over land** (Tonio: "orographic is
  the problem. It fills the transparent areas without changing apparent
  cloud coverage"). The lift was measured from ABSOLUTE height, so with Land
  and Sky's sea at 147 m every bit of land counted as mountain and added
  +0.5 to +0.75 coverage: a 0.3 sky rendered as a solid grey sheet. It is
  now measured from the SEA (the scene's water surface) and weighted to
  RIDGES (ground above its surroundings); a high flat plateau keeps 35% of
  it. Pure: `cloud-field`'s `orographicLift`, tested. `orographicPeak` is now
  the height above the sea.

## Added

- **Lightning casts shadows** (Tonio: "spin up a shadow map and retain it
  between strokes and just use it for the brightest strike"). ONE shadow map,
  kept; re-rendered once per new brightest ground strike, never per frame.
  The strike's light is a POINT light by default (`flashLight`), from the
  middle of the channel, so shadows radiate from the bolt (a cube map: six
  renders per strike); `'directional'` is the one-render option for low-end
  devices. Casters within `shadowRange` of you (and of the strike, for a
  point light); `shadows`, `shadowSize`. It replaces the old point light, so
  the scene stays within a material's 4-light budget. The lightning demo now
  has hills, trees and a hamlet under the storm.
- **A storm darkens the day around it** (Tonio: "cut ambient and even sun
  brightness somewhat when lightning is flashing ... by half"): new
  `darken` on `<tosi-b3d-lightning>` (0.5) takes the sun and the ambient
  fill down by half at full storm, easing with distance and strength,
  through the cloud deck's own light handling (`deck.stormDim`) so the two
  cannot compound. The deck's gloom no longer dims lightning's own lights
  (it was cutting the landscape flash by up to 90% under cover).
- **Land and Sky: a "lightning storm" toggle** beside the volcano: the storm
  gathers in front of you over 20 s, strikes, rains and throws strike
  shadows, then drifts away east.
- **Lightning is dramatic** (Tonio: "having the lightning be dramatically
  bright"): each strike lights the WHOLE landscape from above (falling off
  with the storm's distance), the tower from inside, harder, and the bolt
  carries an additive halo. New `brightness` (the drama) and `rate` (how
  often, a multiple of the natural rate; pure `strikesBetween` takes it,
  tested) on `<tosi-b3d-lightning>`; `groundLight` default 2.5 -> 6. Storm
  lightning also brightens the WHITEOUT when you are inside the cloud. The
  landscape flash is strong enough for a dark ground to read as lit (peak
  3.5, halving at 6 km; the ground light reaches 6 km). The
  demo has a scene panel: storm size,
  how often, cloud cover, brightness, time of day. A storm is no longer a
  TOWER by default (Tonio: "it basically looks terrible"): the deck's
  `stormRise` defaults to 0 (opt-in, domed when on), so a storm is more
  cover and lightning. From below the flash lights the underside and the
  ground, inside it the whiteout, above it the top.
- **Weather reaches the airframe** (board #1125). `<tosi-b3d-aircraft>` asks
  the scene for the weather where it is: the WIND carries it (it chases an
  air-relative velocity, so a crosswind crabs it downwind), and a STORM
  buffets it — seeded disturbance on pitch, roll and climb that the attitude
  controller fights back toward the stick. Strong wind alone adds a little.
  New attributes **`turbulence`** (`'on'`/`'off'`, default on) and
  **`turbulenceScale`** (default `1`), and a read-only **`turbulenceLevel`**
  (0–1) for a HUD or a debug readout. The disturbance is the pure, seeded
  **`turbulence(t, seed, level)`** in `fly-by-wire`. Nothing happens on the
  ground or in an owner without the weather service.
- **Light shafts** (WEATHER-DESIGN stage 4, board #1084), to Tonio's model
  (pure half: **`light-rays`**): **`<tosi-b3d-light-shafts>`** hangs shafts
  from the gaps in the cloud deck, BELOW it, running along the sun and
  widening slightly (`spread`), and as broad as the gaps: `width` at the
  0.5 threshold down to slits as the cover closes toward 1. An additive,
  flat fill of the sun's colour — `strength` 0.35 at the cloud, linear to 0 — most prominent looking toward
  the sun (a forward-scatter phase, per pixel), and only where the local
  cover is broken: 0.5 up to (not including) 1. Placement searches a fine
  grid near you as well as a coarse one far out, keeps one shaft per gap,
  and only refuses a shaft that would pass through you, so a deck just
  above your head (Land and Sky) gets shafts too. The same model runs UNDER
  THE WATER: shafts from the surface, bent by Snell's law, sunlight tinted
  by the water's fog, shimmering as cells come and go (`underwater`,
  `underwaterCount`). SURFACE TURBULENCE drives them (the wind over the
  water, its `waveHeight` and `bumpHeight`): calm water gives a few broad,
  slow rays, choppy water many narrow ones that flicker (`waterRoughness`,
  `waterRayShape`; `waterRoughness` on the element reads it back). The doc
  page has an underwater demo. Shafts are RECTANGULAR (`spread` 0), so
  perspective alone makes them radiate from the sun; sky placement is
  weighted hard toward the sun's position in view, and underwater rays are
  biased toward the viewer so the middle of the view is not empty. Rain adds
  to the strength.
- **The weather-cell demo has a frame of reference** (Tonio: "it has no
  frame of reference so it just looks like leaves blowing around"): a row of
  flagpoles you fly past, each flag showing the wind WHERE IT STANDS
  (streaming downwind, limp in the lee), and the lee's edge drawn as a ring
  on the water.
- **The sky through the water, from below** (`b3d-water` `undersideSky`,
  default 1; Tonio: "we want to see the sky and sun through and distorted by
  the water surface"). The window no longer shows a flat colour: a small
  reflection probe photographs the sky with its fog and veil OFF, and the
  underside refracts it through the water's own ripples, so the sky and the
  sun arrive bent and moving. Clearest in the shallows, fading with depth,
  giving way to the dark mirror at grazing angles. The probe is HALF-FLOAT
  and captures the sun as HDR (a new skybox uniform, `b3dSunHdr`, 0 in
  normal rendering), so the sun still punches through the partial
  transmission of the surface (Tonio: "our skybox isn't HDR so its glare
  doesn't punch through"). (It replaces a glare sprite that looked fake.) Underwater rays are fewer (`underwaterCount`
  12, lower presence).
- **Rain and snow from the weather** (WEATHER-DESIGN stage 5, board #1124).
  `b3d-ambient` gains `weather: 'rain' | 'snow'`: emission follows the
  PRECIPITATION where the viewer is, so a storm brings its own rain and it
  eases in and out as the storm passes; the local temperature splits rain
  from snow (sleet between). Rain now draws as STREAKS stretched along its
  velocity, so the wind visibly slants it. Land and Sky's storm rains.
- **Lightning and thunder** (WEATHER-DESIGN stage 3, board #1123):
  **`<tosi-b3d-lightning>`** strikes under every weather cell with
  `storminess`, seeded (same seed, same storm; frame rate cannot change it).
  Cloud-to-ground strikes draw a jagged, branching bolt that flickers through
  its re-strokes and light the ground; every strike lights the cloud deck from
  INSIDE around it (`deck.flash()`, a new hook: why storms want coverage past
  1); thunder is procedural and arrives at the speed of sound, so you can
  count the distance; and over strong storms, rarely, **sprites**: brief
  red-pink crowns with purple tendrils high above the tower. Each strike
  dispatches `strike` with `{ kind, x, z, t, distance }`. The pure model is
  `lightning.ts` (`strikesBetween`, `boltPath`, `flashAt`, `thunderDelay`).
  Land and Sky's storm now brings lightning.
- **Weather, stage 2: a storm you can see** (board #1122). A
  `<tosi-b3d-weather-cell>` with `coverage` joins the cloud deck's local
  weather field: denser cloud over it, a greyer, heavier underside (its own
  "gloom" channel, so orographic cloud still never repaints fair weather as
  foul), the storm's shadow on the ground beneath (the shadow reads the same
  field), and full strength even when the global dial says clear. A drifting
  cell re-bakes about once per 10 m of travel.
  Land and Sky has a **storm** toggle in its Weather group: a storm drifting
  with the wind (the scene's wind now matches the deck's) that passes over
  you and recedes into view.
  Cells gain **`grow`** (seconds to gather from nothing to full), so a storm
  builds rather than appearing; the deck re-bakes in 1% strength steps as it
  does. Across SPACE a cell was already gradual: a smoothstep over its whole
  radius, smoothed again by the deck.
  **Storm towers:** cell coverage now runs to 2, and past 1 is THICKNESS,
  as on the deck's own dial: the deck lifts its top skin there by up to
  `stormRise` (1,500 m), whatever the global dial says, so a storm is a dark
  heavy base from below and a bright tower from above, and the thing
  lightning will light from inside. The cell channels get one smoothing pass,
  not the orographic field's four (which flattened a storm's excess from 0.7
  to 0.18). Land and Sky's storm is coverage 1.7.
- **Weather, stage 1: the weather where you are** (WEATHER-DESIGN.md, board
  #255). `b3d.weatherAt(x, z)` (and `weatherHere()`) answers what every
  weather consumer asks: the scene's base wind plus every
  **`<tosi-b3d-weather-cell>`** that reaches the point, composed per quantity
  (wind and temperature sum, coverage sums clamped, precipitation and
  storminess take the max). Clouds, water and ambient now read the wind AT
  THE VIEWER rather than one scene-wide value, so a lee is calm and a squall
  is local. A cell with `drift="wind"` travels with the wind (a weather
  system), and `lifetime` grows, holds and ends it. The pure model is
  `weather.ts`. Measured on the new page: leaves' wind 12 → 0.96 m/s crossing
  a lee's centre.
- **Caustics** (board #198, tosijs-3d#16): light through the moving surface,
  dancing on whatever is beneath a `twoSided` `b3d-water` (`caustics`,
  `'auto'` = on whenever `twoSided`; `causticsStrength`, `causticsScale`).
  Projected by world position through a material plugin (the cloud-shadow
  technique), so terrain, hulls and the player all get it with no per-mesh
  setup; slants with the sun, shimmers (two moving layers, combined with
  `min`), fades with depth and fog, and goes with the sun. The pattern is a
  seeded, tiling cellular web (`causticPattern`), with no file to fetch.
- **One lattice per world, enforced where code can** (board #257,
  tosijs-3d#75): every `extractChunk` result carries its `lattice` identity
  (`latticeIdentity(cfg)`), and `assertLatticesWeld(chunks)` throws on a
  mismatch instead of leaving a crack. TUNNEL-DESIGN.md records the decision
  that carves are world-level objects provinces declare but don't own, so a
  tunnel between provinces is just a carve in the field.
- **Snell's window: the water's underside** (board #197, tosijs-3d#15). Looking
  up from under a `twoSided` `b3d-water` used to show flat dark blue. Now
  (`underside`, `'auto'` = on whenever `twoSided`) it is a bright window onto
  the sky overhead, darkening to a mirror of the depths toward grazing angles,
  rippling with the same normal map as the surface, and fading in with the
  underwater fog's own band weight. One plane, one draw call, only while
  submerged. `undersideColor` / `undersideDepthColor` tune the two ends. It
  stays OPAQUE and the sky stays fogged, unlike the prototype, so a level look
  under water still sees murk rather than sky.
- **`b3d.debugFogColor`** (`'#ff00ff'`) paints the composited fog a colour
  nothing else is, to tell fog from surface from sky; also a toggle on the
  Perf Stats panel's new Fog row (with density, end and veil), for a headset.
- **`<tosi-b3d-trail>`** — a ribbon behind anything that moves (contrails,
  missile smoke, a fast enemy's wake), lifted from manta-recon's engine
  contrails (tosijs-3d#4, board #186). Nest it in the mover, give it a local
  offset; it measures speed at its own emitter (so it works on anything),
  fades below `minSpeed`, takes `underwaterColor` below a `<tosi-b3d-water>`,
  re-attaches when the host's mesh is replaced (respawn, async load), and
  resets on a floating-origin shift. **`attachTrail(node, scene, options)`**
  is the same for a node you hold, such as a spawned missile.
  Missiles get it for free: `<tosi-b3d-launcher missile-trail="on">`, or
  `trail` on `spawnProjectile`/`spawnMissile` for your own rounds.
- **Frame panels are usable as menus** (board #768, tosijs-3d#92, from
  manta-recon moving its outer game to viewer-relative panels):
  - **They route pointers.** A `panel3d` on a frame panel now takes presses,
    drags and hover from mouse, touch and XR rays (the same routing
    `b3d-svg-plane` has), and repaints immediately on press and release rather
    than on the texture's 400 ms timer. Before, the buttons drew and ignored
    every click, with no error.
  - `attachFramePanel` returns its **`mesh`**.
  - **`resolution`** on `FramePanelSpec` (and `<tosi-b3d-panel resolution>`):
    384 suits a reticle, not a menu of text.
  - **`flatFrame` applies to any panel**, not only hand panels, so
    `flatFrame: 'face'` measures a flat panel's elevation from the VIEW rather
    than the off-screen horizon of a pitched camera.
- **Flying under water feels like water** (board #185, manta's #3). A
  `submersible` aircraft now meets a thicker MEDIUM below the surface:
  `waterDrag` (×10 by default, the 2010 Manta's air:water ratio) multiplies
  drag, blended over `waterTransition` metres. The controls are unchanged; full
  throttle settles at ~32% of `maxSpeed`. **`surface-crossed`** fires on each
  crossing with `{ entering, point, speed, aircraft }` for splash, wake and
  audio cues, and **`submerged`** (0–1) is readable. In the pure model:
  `FlyByWireConfig.mediumDrag`, and drag now clamps at rest instead of
  overshooting into reverse on a long frame.

## Fixed

- **Replacing the player left input focus on the removed one** (board #2421,
  from manta-recon's respawn): the new craft got no input and its crash was
  ignored by `b3d-death`. A controllable now releases focus when it is
  disposed, and `adoptIfVacant` treats a disconnected focused entity as a
  vacant seat. No more `releaseFocus()` before the swap.
- **Ambient wind accumulated every frame and flung particles away**: the
  preset's direction vectors were assigned by reference, and the per-frame
  `direction.set(preset + wind)` wrote into the preset, so the wind grew frame
  on frame (drops at kilometres a second, never seen). Cloned now, and the
  particles take the INHERITED wind (scene and weather cells), not only the
  element's own `windX`/`windZ`.
- **Flat eye-anchored panels trailed a moving camera by one frame** (board
  #767, found by manta-recon at 2.15 m per frame behind b3d-aircraft's follow
  camera). The flat frames are now posed on `onBeforeCameraRenderObservable`,
  after anything that moves the camera during the render. Measured: 0.000 m
  gap over 64 frames of a camera moving 2 m per frame.
- **Every scene with a glass gamepad logged a type warning** (`gamepad is
  declared boolean … but was written string`). `gamepad` is genuinely
  `boolean | string` (`true` = the default layout, a string = a layout), so
  it is now a plain property read once at setup rather than a typed attribute.
  Markup (`gamepad`, `gamepad="…"`) and `b3d({ gamepad })` are unchanged.
- **`b3d-terrain.recenter()` threw away an authored `worldU`/`worldV`** (board
  #458), resetting them to the defaults. It now clears the travel (the
  floating-origin offset) and leaves the placement alone.
