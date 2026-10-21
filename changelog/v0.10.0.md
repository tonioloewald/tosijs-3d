# 0.10.0

<!--{ "parent": "CHANGELOG", "order": 9990000 }-->

**A quality release: the deprecated names are gone, and a long list of bugs
with them.** No new elements; what was added is tooling for measuring and
debugging on a device, and some defaults changed (listed under **Changed
defaults** below). Most of what breaks was announced in 0.8 and
0.9; three things were not, and are listed below with the rest:
`new MersenneTwister()` without a seed, `WorldStore` queries returning copies,
and `surface.openPanel`'s `onClose`. [Migration.md](https://3d.tosijs.net/Migration/) has every
pair and what to do.

Size: barrel (min, packages external) 970.3 KB raw / 327.2 KB gz, +2.30% on
0.9.0.

## ⚠️ Breaking

- **`onX` callback options are removed.** `onChange`, `onClick`, `onSelect`,
  `onActivate`, `onClose`, `onKey`, `onAction`, `onCaretMove`, `onEnter` and
  `onFocus` are no longer called; use `handleX`. An old name is not dropped
  silently: `handlerOf` warns once per name that it is ignored and names the
  replacement.
- **`<tosi-b3d-trigger>`'s `onEnter` / `onExit` properties** are removed; use
  `whenEnter` / `whenExit`. **`<tosi-b3d-manipulator>`'s `handleChange` /
  `handleCommit`** are removed; use `whenChange` / `whenCommit`.
- **`generateGalaxy`** is removed; use `voxelGalaxy({ seed, brightBudget }).view()`.
  **`galaxy.getStarSPS()`** is removed; use `pickStar`.
- **`new MersenneTwister()` needs a seed.** It used to seed from the clock
  when the argument was left out, which silently broke "same seed, same
  result". It now throws; pass `Date.now()` if that is what you want.
- **`WorldStore.getState()`, `getEntity()` and `query()` return copies.** A
  driver could change the simulation by writing to what a query returned.
  Code that relied on that (deliberately or not) must call a command instead.
  The engine's own systems read `store.liveState`.
  A copy is made on every call, so read once per frame, not once per entity.
- **A store passed to the conformance kit must implement
  `chooseOption(choiceId, optionId)`.** The kit now covers the choice
  primitive and calls it.
- **`surface.openPanel({ onClose })` is `handleClose`.** This one was never
  announced: it was the last `onX` option in the library and follows the same
  rule now (ignored, with a warning).


## Changed defaults

Nothing here removes an API, but a scene can look or behave differently
without a line of yours changing. Each has the setting that puts it back.

- **Opaque meshes are drawn nearest first, the sky last** (was material
  order). The picture is the same for ordinary opaque meshes; one with depth
  write off can differ. `scene.setRenderingOrder(0)` restores Babylon's order,
  and a camera-pinned sky of your own must set `infiniteDistance`.
- **A headset session renders at a reduced scale with foveation** on the low
  tier (`xrRenderScale`, `xrFoveation`; `1` and `0` for full).
- **The decorator places a tier share of its budget** (0.6 on the low tier)
  and plant rules thin with moisture (`thirst`), so the same seed gives a
  different layout from 0.9. `budgetScale: 1` places the whole budget.
- **Scatter rules gather more** (`clump` 0.95, was 0.85).
- **Water receives sun and cloud shadows.**
- **The low tier uses the lighter ground shader** (`groundDetail`).
- **`PerlinNoise(0)` is a seed**, not "no seed".

## Docs

- **The doc site is reorganised.** Sections now list the elements you put in a
  scene, with the pure models and helpers each is built from tucked beneath
  it (the flight model under the aircraft, the biome chart under the
  terrain). UI was one list of 39 pages and Environment one of 37; no section
  now has more than 12 direct children. Environment is split into Sky and
  light, Weather and clouds, Terrain and Water; Migration and the Changelog
  moved from second and third to a Reference section at the end. Page URLs
  are unchanged, except the section landing pages.
- **Getting started**: the install line with its peer dependencies, a first
  scene that needs no model file, and where to go next. The README has the
  same.
- **Ten modules that other pages linked to had no page**: the flight model,
  ballistics, guidance, warhead, destroyable, resource, Perlin noise, gradient
  filter, terrain grid and the primitives (box, sphere, ground). 17 links were
  dead. A test now fails on a link to a page that does not exist.
- Every section landing page says which page you want, where most were a bare
  list of links.

## Fixed

- **A headset is drawn at the device tier's resolution.** It never was: the
  tier lowered the engine's hardware scaling for a session, and that does not
  reach the XR layer, so every tier drew both eyes at full size. The viewport
  is now scaled per frame (`xrRenderScale`, auto: 0.67 on the low tier, 0.83
  on medium) and fixed foveation is set (`xrFoveation`, auto: 1 on low, 0.5 on
  medium). Measured on a Quest in Land and Sky at 90 ms a frame: half the
  pixels saved 19 ms and full foveation 12 ms. Both are attributes of
  `<tosi-b3d>`; set `xrRenderScale="1" xrFoveation="0"` for the old picture.
- **Opaque meshes are drawn nearest first, and the sky last.** Babylon draws
  them in creation order, so a sky made first was shaded across the whole view
  and then painted over by the land. The picture is the same; a covered pixel
  is now rejected before its shader runs. `nearFirst(scene)` is exported for a
  render target of your own (the water's two have it).
- **A cheaper ground shader for a weak GPU** (`<tosi-b3d groundDetail>`:
  `auto`, `full`, `lite`). The biome shader took eight noise samples a pixel;
  `lite` takes three and looks nearly the same from a distance. `auto` picks
  it on the low tier, and in a headset on the medium tier. Measured on a Quest
  in Land and Sky, the terrain was 40 ms of a 90 ms frame. The cost sweep
  measures the other form on your device.
- **The ground shader reads its fine noise from a texture.** It computed 3D
  noise four times a pixel, eight hashed corners each; it now reads a shared
  64-texel tiling block (`noiseVolume`, exported) once per sample. Mip-mapped,
  so the detail fades in the distance where the computed noise shimmered. On
  every tier with WebGL 2; `setBiomeComputedNoise(scene, true)` is the way
  back, and the cost sweep measures it. The climate noise is still computed.
- **The water's reflection and refraction are drawn once for both eyes, and
  every Nth frame in a headset too.** Each is the scene drawn again, and a
  headset drew both for each eye on every frame: four extra scene passes.
  Each is now looked up through the view it was drawn from, so one drawing is
  in the right place from either eye and on later frames (`reflectionRefresh`,
  from the device tier: every 3rd frame on the low tier). This also fixes the
  refraction sliding against the seabed between redraws on a flat screen.
- **Perf Stats reports what SVG texture repaints cost** (the HUD, panels):
  repaints a second and main-thread milliseconds a second (`svgTextureCost`).
  It also shows the JS heap against its first reading and the total redraw
  count, so a leak is visible from inside a headset.
- **Debug sink** (`debugSink.url`, `sendDebug`): a page can post its readings
  to an endpoint, for a headset that has no console. With a URL set,
  `<tosi-b3d>` sends each cost sweep step, the Perf Stats lines while that
  popup is open in a session, and every `logDebug` event. Off by default.
- **`bun run xr … --counters [--again n]`**: documents, DOM nodes, listeners
  and JS heap before and after a script, after a collection.
- **Cost sweep** (`b3d.costSweep()`, and a button in Perf Stats): where a
  frame goes, measured on the device, by switching one thing off at a time.
  Runs are numbered and the last four are kept, each saying whether it
  finished or where it stopped, so a run that hangs does not replace the one
  before. **Shader sweep** is a separate button: it measures the ground
  shader's other forms, which recompiles shaders.
- **A popup's move and close icons keep their size on a tall popup in a
  headset.** The title bar was a fifth of the popup's height, so Perf Stats
  with a long list got icons several times too large, over its first rows.
- **A popup is capped in height and scrolls past the cap** (480 units, or the
  caller's `maxHeight`). Perf Stats with a sweep listed was taller than the
  screen flat and enormous in a headset, with no way to its lower rows.
- **The decorator places a share of its budget set by the device tier**
  (`budgetScale`, `0` = auto: 1, and 0.6 on the low tier, which is a Quest in
  a session). Measured on a Quest: decorations were 16 ms of a 42 ms frame.
  Set `budgetScale: 1` to place the whole budget everywhere.
- **A thinned scatter loses clumps, not density** (`ScatterOptions.share`,
  `clumpCentreFor`): the weaker clumps go and the middle of the rest stays as
  full, in the same places as the whole scatter. The decorator's share and the
  moisture thinning both work this way. Rules also gather more by default
  (`clump` 0.95, was 0.85), so fewer things stand alone.
- **The cost sweep's two headset rows measure what the resolution levers are
  saving** (`+ full resolution`, `+ no foveation`). The old rows set the
  values the tier already uses, so they measured nothing.
- **Wetter country grows more.** A scatter rule's moisture band only said
  where a kind may grow, and every plant's band reached the top, so anything
  damp enough for a tree grew the same forest as the wettest setting. Plant
  rules now have a `thirst`: the drier it is, the more of their places are
  left empty (`moistureCover`). In Land and Sky, trees go from about 120 at
  moisture 0.5 to about 240 at 1; rocks are unchanged.
- **A headset session no longer freezes the second time your hands are
  tracked.** Babylon's hand tracking (9.16) takes the topmost ancestor of its
  shared hand mesh as a root and parents it to the camera's parent every
  frame. The second time hands appear (a controller put down twice), that root
  is the camera's parent itself, which became its own parent; the next enable
  or dispose then recursed until the stack ran out and the picture stopped.
  Found on a Quest with Perf Stats open (#3135). The rig now refuses such a
  parent (`refuseOwnAncestor`, exported for anyone parenting an XR camera to
  their own node).
- **Underwater light rays go away when you leave the water.** They were still
  fading on the frame you surfaced, the update read the water that was no
  longer above you and threw, and it threw again every frame after, so the
  rays stayed for good.
- **A popup moved in a headset stays with its panel.** Dragging an owned popup
  used to tear it off, so moving the panel afterwards left it behind. It now
  moves relative to its opener and stays owned; `tearOff()` is still how a
  caller lets one go.
- **No second, dead copy of a popup after a panel rebuild in a headset.** The
  rebuild dropped its popups' handles and relied on each dying with the panel
  plane. One that was torn off, or not yet mounted, stayed in the scene: a
  Perf Stats that never updated and could not be closed. They are now closed
  before the plane goes, and a popup whose opener has been disposed closes
  itself.
- **Perf Stats refreshes every two seconds in a headset** (was 0.4 s). A
  Quest hung within minutes with it open and ran on with it closed; the cause
  is not known, this redraws its texture less often.
- **Water, and the ice on it, receives shadows.** The surface never did: it
  was not marked as a shadow receiver, so nothing cast a shadow on the sea,
  which on a white ice sheet is obvious. `<tosi-b3d-water receiveShadows="off">`
  restores the old behaviour and saves a shadow lookup per water pixel (the
  cost on a headset has not been measured).
- **Cloud shadows fall on water and ice.** They never did, on any device:
  cloud shadows are a material plugin, and Babylon's water material runs no
  plugins. The lookup is now in the water's own shader, fed from the scene's
  cloud shadow map (`cloudShadowMapOf(scene)`, new). `receiveShadows="off"`
  turns it off with the sun's shadows. Every water now uses the patched
  shader, not only `shore="on"`.
- `PerlinNoise(0)` uses seed 0. It was treated as "no seed" and gave a
  different field every time.
- `world-store.ts` compiles under `noUncheckedIndexedAccess` (the steer loop
  read `r.portals[0]` unguarded), so a project that vendors it with strict
  settings no longer has to pin an old copy.
- The world contract now says what it meant: a driver must supply `spec.id` to
  `spawn` (the return value cannot cross a worker boundary), and `setIntent`
  is legacy (`steer` is what the sim honours).
- The conformance kit covers the choice primitive: a pick emits exactly one
  `choiceMade`, an option that is not on the menu emits nothing, a choice is
  reported once, and the sim resolves nothing.
- **A bomb that goes off on terrain now hurts what is above it.** The blast's
  line of sight started on (or just under) the surface it hit, so the terrain
  was cover for everything and a ground burst damaged nothing. A burst near a
  surface now looks from a metre above it; a hill or wall in between is still
  cover. (Only a mesh named `ground` was exempt before.)
- **Decorator: naming the default library explicitly no longer empties the
  scatter.** Default rules were chosen by whether `url` was set, so
  `url="…/quaternius/libraries/nature.glb"` got the other library's rules,
  which matched no model. The choice is now made from the library in use.
- **Decorator: `NATURE_ROLES` applies only to the default library.** Its keys
  are generic material names (`White`, `Wood`), so a third-party model with a
  material of the same name had it replaced by flat biome shading. Set `roles`
  to opt a custom library in.
- The Perf Stats "Occlusion" button says whether occlusion is running, not
  what was asked for (`on, not running here` when the method cannot run in
  the current mode). Land and Sky's own occlusion select, which drifted out of
  step with it, is gone.
- **Lightning bolts are solid, not see-through.** The channel was faded by
  transparency between re-strokes, so up close it was a pale translucent
  tube. It is opaque while the stroke is live, far brighter than white (so it
  blooms), and the glow around it fades to nothing at its edge. The flicker is
  carried by the glow, the cloud and the ground.
- **Thunder stops when its storm does.** Thunder is queued as far ahead as
  sound takes to arrive, so changing world left the old storm's thunder
  playing over the new one.
- **In VR, the pointer no longer lands on the vehicle you are sitting in.**
  In the aircraft's cockpit the controller ray hit the canopy first, and on a
  Quest the panel behind it could be hovered but not pressed or dragged, so
  there was no way out of the session from inside. Anything beneath the node
  the XR rig rides on is no longer a pointer target; your own panels are.
  (Reproduced and checked with the emulated headset; not yet on a device.)
- **Sea ice: the plate pattern no longer depends on the GPU's `sin`.** The
  plates were laid out with the classic `fract(sin(x) * 43758.5)` hash, which
  mobile GPUs evaluate differently from desktop ones; in a headset the ice
  showed severe mismatches that a Mac never did. The hash is arithmetic only
  now. Plate edges are also a little softer. (The layout of plates for a given
  place changes. Not yet confirmed on a headset.)
- **No holes in solid sea ice near its edge.** The invisible mesh a car or a
  shell lands on kept a triangle only if all three corners were solid, so a
  band one cell wide (16 m and more far from the viewer) was drawn solid and
  had nothing to stand on. A triangle is kept when it is solid on average,
  which is where the drawn ice crosses the same line.
- **The HUD page no longer throws 30 times a second.** Its demo still called
  `setTraces(traces, viewer, options)`, a signature that went away when the
  HUD started projecting through the camera. The demo passes the camera, and
  `setTraces` warns once (and draws nothing) if it is handed anything else.
- Three demo controls were dead because they still used an old name the
  compiler cannot see in a doc comment: the aircraft page's "chase pitch
  follow" and "follow lag" sliders, and the particles page's Burst button.
  (They worked, with a warning, until the fallback was removed here.)
