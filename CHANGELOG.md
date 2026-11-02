# Changelog

<!--{ "parent": "upgrading", "order": 20 }-->

All notable changes to **tosijs-3d**, one page per version: each lives in
`changelog/v<version>.md` (on the site at `/v<version>/`), and this page is the
index: the latest release below, then every version, newest first (that list is
generated from each page's `parent`). This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes. Each is called out in a
**⚠️ Breaking** block on its version's page, with what a consumer must do.
Upgrading across a minor? Start with [Migration](/Migration/).

## Unreleased

- **The character core is engine-free, and promised.** Twenty modules that make a character with no Babylon and no DOM (human-pack, human-morph, human-rig, rigged-body, rig-fit, bone-heat, rig-recipe, retarget, spatial-transform, proxy-fit, proxy-rigid, hair-fit, garment-cut, garment-file, uv-unwrap, skin-tone, character-file, and the new character-settings, proxy-cover and asset-url) are subpaths (`tosijs-3d/human-morph`, …) a three.js app or a server can import; a test fails if any of them reaches Babylon, types included, and the packed tarball imports each under plain Node. `RiggedBody.surfaces[].material` is typed `SurfaceMaterial` (a name) instead of Babylon's `Material`: cast it back on the Babylon side. New: `character-settings` holds `DEFAULT_CHARACTER`, `CHARACTER_SLOTS`, `HAIR_COLOURS` and `hm08PackUrl()` (with `HM08_PACK_PATH`, `HM08_PACK_VERSION`); `proxy-cover` is the engine-free half of `coverBody` (`coverSkin`, `BODY_WRAPPING_SLOTS`). The barrel exports everything it did. See the `character-core` page.

- **Vehicles you can drive.** `ground-vehicle` is a pure model of wheeled and tracked vehicles (springs, tyre grip that slides past its limit, Ackermann steering, skid steer), no physics engine. `<tosi-b3d-car>` is rebuilt on it: give it a model whose wheels have `wheel` in their names (Tonio Loewald's cars on the CDN, `tonio/vehicles/cars.glb`, work at `scale: 2`; so does Kenney's Car Kit at `1.7`), and it measures them. ⚠️ `b3d-car`'s `turnRate` and `friction` are gone: use `steerDeg`, `grip`, `mass` and `drive`; `acceleration` and `braking` are now m/s². `<tosi-b3d-tank>` is new: tracks, a pivot turn, and a plain tank when given no model. The car mapping is GTA V's: right trigger accelerates, left trigger brakes and reverses, the left stick only steers, the right stick looks around, A is the handbrake, and one step from GTA, the right bumper also brakes and reverses so the right thumb has both pedals on the on-screen pad (W/S still drive on a keyboard, through the new `keyboard` hook on an `InputMapping`). Vehicles bring their own chase camera, high and aimed ahead of the car (`chaseRigFor`, `chasePose`). Off the throttle a car coasts down (`coast`, m/s²); steering at speed is held to what the tyres grip, so turns keep their speed. A tank keeps turning at top speed and goes where it points. The tank's right stick (arrow keys) aims its turret: traverse and gun elevation, held in the world while the hull turns, and the camera looks where it aims; a model's `turret` and `gun`/`barrel`/`cannon` nodes are found by name. A tank climbs a step about as high as its tracks (a `TrackSpec` may carry `climb` points, which carry nothing on the flat). Vehicles stop at walls with rays from their own body instead of a swept ellipsoid, which stepped over anything under half its height.

- **A city's plan**: `cityLayout({ width, depth, seed })` lays out roads, blocks and lots on a grid of cells (every road connected, every lot on a street), with each road cell's piece and rotation; it knows no kit or metres, so any kit on any grid can dress it.

- **The scene waits until it is built.** `el.holdLoading(label)` keeps a `<tosi-b3d>` behind its spinner until the returned release is called (at most 20 s); the first showing also waits for a streaming terrain. `<tosi-b3d-city>` and `<tosi-b3d-library>` hold it, so a city is never shown without its buildings.

- **Light pollution.** A lit town washes the faint stars out of its own sky and lays a warm glow along the horizon; out in the country they come back. Anything that lights the night registers a source (`lightPollutionSource(scene, { centre, radius, strength })`, `<tosi-b3d-city>` does, following its street lights), and `<tosi-b3d-skybox>` reads them at the camera every frame; its `lightPollution` attribute is the base for the whole sky (0, a dark sky).

- **A city to drive in**: `<tosi-b3d-city>` builds roads, buildings, street lights and parked cars from a seed with Kenney's city kits (any kit, through its `kit` manifest), drawn as thin instances at 12 m a cell (9.6 m kerb to kerb: a lane each way and a parked car; the kit's `roadway` says how wide its road is), each building on as many cells as its model covers; `cityStart(options)` is a clear spot in the middle to start a car. Street lights are spots pointing down from their poles (`lampAngle`, reaching twice their height), and some flicker (`flicker`, `lampFlicker`). **Traffic** (`traffic`, default 24): cars drive round on their own in the right-hand lane, turn at junctions, keep their distance and stop for your car. Each is a body on the same model as your car (`TRAFFIC_CAR`), steering after a plan that drives the lane: cars that touch push and spin each other, and ramming one knocks both cars about (momentum is exchanged; your car is no longer stopped dead), kerbs keep them out of buildings, and two cars jammed into each other sort it out by one backing away. The count is a GTA-style budget (`recycleTraffic`): cars far away or out of view go and come back out of view, driving toward you. Head, tail and brake lamps, and a headlight beam at night. The model is pure (`createTraffic`, `stepTraffic`). **Lit windows** (`windowLights`, `roomLit`): a material plugin lights rooms' windows at night (warm lamps, the odd blue screen). Every room has a habit it keeps (always dark, night owl, early riser, evening, bathroom), each with its own hours: most lit around ten, rare after midnight, more from five. **Lamps** (`lightPool`): street lights and headlights are virtual lights, and the few that matter most to the view get real lights (`lampLights`, a new device budget; ranked by `poolScore`, lamps ahead first), falling off linearly to their range on PBR materials too. Where the device supports clustered lighting, every lamp is a real light (a `ClusteredLightContainer`): a city's hundred street lights and the traffic's headlights all light the street. A `VirtualLight` may carry a ranking `weight`. The sky reports `daylight`, so street lights come on at dusk and a driven vehicle's `headlights` at night.

- **City Drive** (Demos): a 48 × 48 city on ground flattened for it, in green hills by the sea under the full sky (day and night, cloud deck, stars), with woods round it; drive out of town and keep going. `cityGround({ width, depth, level, x, z })` gives a terrain `landform` (a pad flat under the grid) and a decorator `clear`; `<tosi-b3d-decorator>` takes `clear`, ground kept clear of trees and rocks.

- **Sound in the city** (positional, synthesised): the nearest traffic's engines (the note rises with speed, opens on the throttle), a horn from a driver you block (and, after a long wait, from one stuck behind a stuck car; `car.honk` in the pure model), the hum of the nearest street lights and a sputtering buzz from the failing ones. Your own vehicle's engine plays while you drive it (`sound="off"` to silence; a tank's is lower). New effect voices: `engine`, `hum`, `horn`. `<tosi-b3d-city sound="off">` for silence.

- **Faster on a headset**: a vehicle's physics takes at most 0.1 s a frame, so a stall cannot pile up steps; the vehicle model steps at 1/60 s (was 1/120), and a vehicle casts each wheel's ground ray once a frame, its later steps meeting the plane that ray found; `pickWorld(scene, ray, predicate)` and `rayProxies(scene)` let something that knows its own shape answer rays (a `RayProxy`), and `<tosi-b3d-city>` does (flat ground, a box per building, parked car and pole, filed by cell), so a vehicle's ray in the city costs a quarter of what it did. City models are one mesh each, and only buildings and moving traffic cast shadows. Fixed: cars with their wheels as instances (half Kenney's) were drawn without wheels; your own headlights flickered as you looked round (the lamp pool gave their light away; the one you drive now keeps it, and a lamp holding a light keeps it unless another is clearly better). Effect audio that cannot start (an iPhone's audio device) no longer retries every frame or throws an unhandled rejection; it tries once a second. In a headset the lamp pool uses its ranked lights, not clustered lighting: Babylon's container bins lamps for one camera a frame, so the second eye flickered and lost the street lights.

- **Chase camera and Cross Country.** A vehicle's chase camera pivots round a point above it: the right stick orbits (springing back on release) and up/down moves it along an arc from close behind to nearly overhead, where it stays (`CHASE_BOOM`; `chasePose` takes the boom and a lift). It climbs over walls, traffic and hillsides before it pulls in, and keeps clear of the ground. In a headset it orbits too and looks down from the top. A tank's view follows its turret. `ControlInput.lookMode` is the right-stick click (R3; **V** on a keyboard, `right_stick_click` on the glass gamepad): on a tank it swaps the stick's up/down between the gun and the camera, with a buzz in a headset (`b3d.haptic()`). The track links of a model that animates them (Tonio's tank) run at ground speed. **Cross Country** (Demos): that tank in open country.

- Fixed: a car's headlight beam trailed the car by a frame or two (visible from above at speed). The lamp pool now places its lights after everything else has moved that frame, and a vehicle aims its beam from where it is now.

- **Fixed: models were drawn mirrored.** Everything loaded through `canonicalize` or a `<tosi-b3d-library>` (vehicles, aircraft, lamp fixtures, the city's kits, any library instance) was its own mirror image: text backwards, left and right swapped. Babylon's glTF loader converts handedness with one mirror on `__root__`, which both paths dropped. `unmirrorGltf` / `unmirrorContainer` now move that mirror into the content node by node (transforms, vertices with their winding, animation keys), so every frame stays proper and the model looks as authored. ⚠️ An asymmetric model now appears the other way round from 0.11, and anything measured off the mirrored picture needs checking: `KENNEY_CITY`'s bend is now `turns: 0` and its end `turns: 3`. Skinned models are left as they were.

- Fixed: building a scene after the page's only one was removed (a route change) lost skin, hair and cloth shading, caustics, the biome ground, cloud shadows and projected occlusion; skin shading threw 'plugin not registered'. Babylon clears material plugins when its last engine goes; ours now register again (`registerMaterialPlugin`).

- iPhone: the page no longer zooms from inside a scene (`<tosi-b3d>` is `touch-action: none` and cancels Safari's pinch), and a zoomed page is reset when the scene goes full screen, where nothing was left to pinch out on.

- `b3dLight` takes `nightIntensity`: under a day/night `b3dSkybox` the ambient fill eases to it as the daylight goes (the sun is already the moon), so night no longer looks like an overcast noon.

## 0.11.6

The latest release. The character leaves the builder: any body (MakeHuman's, Blender's, Quaternius' or your own mesh) rigged, dressed and tailored the same way; a character file that carries its body; `makeCharacter`, and `<tosi-b3d-biped character>` to walk it in a game; a material picker. [Read 0.11.6](/v0.11.6/).

## Every version

<!-- toc -->
- [0.11.6](/v0.11.6/)
- [0.11.5](/v0.11.5/)
- [0.11.4](/v0.11.4/)
- [0.11.3](/v0.11.3/)
- [0.11.2](/v0.11.2/)
- [0.11.1](/v0.11.1/)
- [0.11.0](/v0.11.0/)
- [0.10.20](/v0.10.20/)
- [0.10.19](/v0.10.19/)
- [0.10.18](/v0.10.18/)
- [0.10.17](/v0.10.17/)
- [0.10.16](/v0.10.16/)
- [0.10.15](/v0.10.15/)
- [0.10.14](/v0.10.14/)
- [0.10.13](/v0.10.13/)
- [0.10.12](/v0.10.12/)
- [0.10.11](/v0.10.11/)
- [0.10.10](/v0.10.10/)
- [0.10.9](/v0.10.9/)
- [0.10.8](/v0.10.8/)
- [0.10.7](/v0.10.7/)
- [0.10.6](/v0.10.6/)
- [0.10.5](/v0.10.5/)
- [0.10.4](/v0.10.4/)
- [0.10.3](/v0.10.3/)
- [0.10.2](/v0.10.2/)
- [0.10.1](/v0.10.1/)
- [0.10.0](/v0.10.0/)
- [0.9.0](/v0.9.0/)
- [0.8.15](/v0.8.15/)
- [0.8.14](/v0.8.14/)
- [0.8.13](/v0.8.13/)
- [0.8.12](/v0.8.12/)
- [0.8.11](/v0.8.11/)
- [0.8.10](/v0.8.10/)
- [0.8.9](/v0.8.9/)
- [0.8.8](/v0.8.8/)
- [0.8.7](/v0.8.7/)
- [0.8.6](/v0.8.6/)
- [0.8.5](/v0.8.5/)
- [0.8.4](/v0.8.4/)
- [0.8.3](/v0.8.3/)
- [0.8.2](/v0.8.2/)
- [0.8.1](/v0.8.1/)
- [0.8.0](/v0.8.0/)
- [0.7.8](/v0.7.8/)
- [0.7.7](/v0.7.7/)
- [0.7.6](/v0.7.6/)
- [0.7.5](/v0.7.5/)
- [0.7.4](/v0.7.4/)
- [0.7.3](/v0.7.3/)
- [0.7.2](/v0.7.2/)
- [0.7.1](/v0.7.1/)
- [0.7.0](/v0.7.0/)
- [0.7.0-rc.1](/v0.7.0-rc.1/)
- [0.6.2](/v0.6.2/)
- [0.6.1](/v0.6.1/)
- [0.6.0](/v0.6.0/)
- [0.5.2](/v0.5.2/)
- [0.5.1](/v0.5.1/)
- [0.5.0](/v0.5.0/)
<!-- /toc -->
