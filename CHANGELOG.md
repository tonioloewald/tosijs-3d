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

- **Added:** the rig tool binds a model with no skeleton itself (`load model file…` takes a GLB or OBJ): eight markers on its outline, guessed and then dragged onto the joints, place a skeleton, and bone heat binds the mesh to it. `bind from markers` does the same for a model that has a skeleton, ignoring it. The markers are saved in the recipe as `binding` (`RigBinding`).
- **Fixed:** auto-rig: fingers a mesh does not show lie on the nearest one it does, so a mitten hand is aimed along the mitten (omnidude's hands curled into hooks).
- **Fixed:** `<tosi-b3d-light>` applies its attributes when its light is made. Before, a light whose element rendered before the scene was ready kept Babylon's defaults (intensity 1, a black ground colour) whatever it was given, so a page that hit it (the character builder did) now gets the fill it asked for. The demos that set a very dim fill (colour picker, beacon, solar system, planet) render exactly as before: they were not hit.
- **Fixed:** hair is matched to the head it was modelled on by how closely it hugs that head (the crown rule put Balding on the wrong one), and every vertex keeps its height above the skin (`skinGaps`, `keepHeight`), so beards are as thick on the chin as on their own head; a face is fitted with one scale (`fitToScalp`'s `scaling: 'uniform'`), since a stylised face's flatter depth squashed beards back.
- **Added:** `skinShading` (`skin-shading`), a PBR material plugin for skin: a reddened, softened terminator (scatter), a grazing rim, and back-light through thin parts (ears, nose, fingers) from `skinThinness`, a per-vertex thinness carried in the vertex colour's alpha (`lipTint` takes it). `skinMaterial` turns it on (`shading: false` for plain PBR) and is a little glossier (roughness 0.42).
- **Added:** hair shading (a highlight band along the strands from PBR anisotropy, a sheen rim) and dye: `hairDye(natural, hue, saturation)` and `HairMaterial.setHair(light, red, { hue, saturation })` turn the natural colour toward a hue at the hair's own lightness (blue over dark hair is blue-black, pink over bleached hair pastel). The builder has dye hue and strength sliders.
- **Added:** CLOTHING. `proxy-fit` is MakeHuman's `.mhclo` binding (three base vertices, weights and an axis-scaled offset per vertex), so a garment follows every body shape with no per-body fitting: `fitProxy`, `drawnPositions`, `proxyWeights` (skin weights from the vertices it is bound to), `nearestWeights` (for the helper vertices clothes bind to), `coveredTriangles`. `human-proxy` puts one on a built body, skinned to its skeleton: `humanProxy`, `proxyMaterial`, `coverBody` (hides covered skin). The human pack (`?v=5`) carries MakeHuman's CC0 system assets as proxies: 20 suits and shoes, a fedora, 10 hairstyles and 12 brows (`pack.proxy(name)`). The builder has outfit, shoes and hat menus, MakeHuman's hair and brows beside Quaternius', and beard nudges.
- **Added:** `underCover(hat, hair, triangles)` hides the hair a hat covers (above its brim, within its reach, followed around a tilted brim), so hair no longer pokes through hats; MakeHuman's CC0 beards and moustaches (Bodyparts 05) in the pack (`?v=6`), bound to the body like clothes, so they sit on any face. The builder's sun takes `shadowNormalBias: 0.008`: the default thinned a body's shadow.
- **Added:** `hairShading` (`hair-shading`): hair coloured by a BASE and a HIGHLIGHT colour, the way a colourist describes it: a material plugin tints the texture with the base and leans its brighter strands to the highlight (and the strand sheen takes it), with `desaturate` for libraries whose hair textures are already coloured (MakeHuman's), so one pair of colours works on every library. `HAIR_COLOURS` are paired presets, natural and dyed. The builder's hair colour is a preset menu and two colour pickers, replacing the light, red and dye sliders.
- **Fixed:** every orbit camera given to `setActiveCamera` gets `touchOrbit`'s view controls, so shift-drag (and a trackpad's two-finger drag) pans in demos that build their own camera (the character builder, auto-rig, spring bones and others could not pan on a laptop); `touchOrbit` is once per camera.
- **Fixed:** an orbit camera's zoom stops short of its target (`touchOrbit` sets `lowerRadiusLimit` to twice the near plane when a page has not set one): a two-finger scroll could zoom through zero and flip the view.
- The character builder's hair colours are two `colorPicker3d` rows (a swatch that opens a picker with named presets); a base preset brings its usual highlight.
- **Added:** clothing materials. `clothShading` (`cloth-shading`) puts a fabric on a garment (`FABRICS`: cotton, denim, wool, linen, velvet, silk, satin, synthetic, leather, rubber, as roughness and PBR sheen) and a recolour over its texture (read as grey, tinted, blended by `amount`; 0 keeps the texture's colours). `proxyMaterial(scene, proxy, look)` draws one of a garment's alternate textures; the pack (`?v=7`) carries MakeHuman's CC0 colourways for the elegant and casual suits. The builder has look, fabric, colour and recolour per outfit, shoes and hat.
- **Added:** separate garments and accessories in the human pack (`?v=8`), each with a `slot` (outfit, top, bottom, shoes, hat, glasses, gloves; one of each worn at a time): MakeHuman's CC0 shirts, pants, skirts, suits, shoes, hats, glasses and gloves. The builder wears one per slot (an outfit replaces a top and bottom) and edits whichever is chosen. `inflate` pushes a proxy out from a point: the builder's hats sit 12 mm out from the skull, over the hair, and `underCover` drops only hair wholly under a hat (dropping any triangle across the brim left bare scalp below it).
- **Fixed:** the human pack publishes its textures (they 404'd on the CDN, and clothes drew Babylon's missing-texture checkerboard).
- **Fixed:** a character builder body stands on its soles: `humanRig(…, { triangles })` puts the floor at the skin's lowest point (the foot's joint cubes are inside the foot, and the body sank by an ankle's height), and worn shoes lift it by their sole.
- **Added:** `studioEnvironment(scene)`, a procedural studio (sky, horizon, floor) as the scene's environment, so gloss and metal have something to reflect; metal and gloss finishes in `FABRICS` (vinyl, foil, chrome, brushed steel, gold, copper, silver lamé; `metallic`, and a `tint` for finishes that are a colour); a `mask` slot and MakeHuman's CC0 sci-fi suits, helmets and masks in the pack (`?v=9`).
- **Fixed:** the face moves with the head (`stiffenHead`: skin above the head joint weighted wholly to it, blended over 4 cm), so the eyelids no longer slide over the eyeballs when a clip moves the neck; a moustache's lower edge sits 4 mm above the lip.
- The character builder: beards and moustaches are separate choices and MakeHuman's (Quaternius' facial hair, drawn for its own stylised mouth, drooped and tilted on ours); MakeHuman's hair and brows are the defaults and listed first; hair, brows and beards keep their texture's alpha (pack `?v=10`).
- **Fixed:** faces no longer shear when a clip turns the neck: `stiffenHead` now makes the whole face rigid with the head (the jaw, chin and mouth, in front of the head joint, which sits at about nose height on hm08), not only the skin above the joint. Idle's look-around showed it most.
- **Changed:** clothes TUCK the skin they cover rather than cutting it: `coverBody` drops only triangles wholly under a garment and draws the covered skin 6 mm in (`tuck`), so a neckline no longer shows holes where a garment's edge and its listed vertices disagree (`coveredTriangles` takes `mode: 'all'`). `underCover` likewise tucks hair in under a hat (`tuck`).
- **Changed:** hair colour is normalised by each texture's own measured brightness (`HairShadingPlugin.mean`), so a preset is the same colour on every library's hair; MakeHuman's hair is rougher and reflects its surroundings less (it shone like wet plastic); highlights are subtler. Skin reflects the environment faintly (`environmentIntensity` 0.3, roughness 0.5): very dark skin looked polished.
- **Added:** FACES THAT MOVE (`human-expression`). MakeHuman's 59 CC0 face pose units (lids, jaw, lips, mouth corners, brows, cheeks, tongue) are baked into the human pack (`?v=12`) as shape targets (`expression/<Unit>`): its face rig posed per unit and the base skinned with its own weights, offline. At runtime they are morph targets on the body, the eyelashes, the teeth and tongue and whatever is bound to the face (a beard follows the jaw): `faceDeltas`, `humanExpressions` (weights in named LAYERS, summed per unit), `blinker` (a person's rhythm, sometimes twice), `lidsFollow` (upper lids follow the eyes up and down), `lipSync` (any Web Audio source: loudness opens the jaw, bright sound widens, dark rounds), `babble` (talking with no audio), `VISEMES`. `proxyDelta` moves a bound proxy with the face. The pack also carries MakeHuman's teeth and tongue, and the builder wears them. The builder has a Face section: blink, talk, mic (lip sync from your microphone), smile, brows, frown.
- **Fixed:** skin no longer shows through trousers and skirts at the knees and thighs: `coverBody({ drawn })` finds skin a garment covers by geometry (`coveredBy`: garment surface just outside it along its normal), not only its listed vertices, and tucks lower garments' skin deeper. Hair colours tint only hair, brows and beards (the teeth came out brown).
- **Fixed:** closing a popup no longer sometimes closes the panel behind it: a press on a popup's close is claimed, so the parent never sees it (only the close: claiming a drag's press broke dragging and dismissed everything). A `select3d`'s menu is as wide as its longest option (at least 220, at most 420), and a long value is ellipsized instead of running into the row's caption.
- **Fixed:** the lower chest no longer narrows when a clip lowers the arms: `armsOffTorso` moves arm and collarbone weight off the ribcage below the armpit to the spine (bone heat let the arms claim the ribcage's sides, since MakeHuman's rest pose holds them close; Idle lost 5 to 6 cm of width there). The builder's clothes editor shows `look` only for items that have colourways.
- **Fixed:** tucking under clothes is gentler: only body garments tuck skin they cover by geometry (not glasses, hats or masks, which pulled the eyelids in), at most 10 mm, faded in over 3 cm from the covered skin's edge (`coverBody`'s `fade`), so a cuff no longer pinches the wrist. Glasses' lenses are blended glass (pack `?v=13`). Eyes look together or not at all (past the limit, both look ahead) and follow the active camera, so in a headset they find you. The palest skin tone is paler. `EyeTexture.setIrisColour`; the builder's eye colour is a colour picker with presets.
- **Added:** `select3d({ stayOpen: true })` keeps its list open after a pick, until it is closed or something behind it is pressed, for trying options one after another; the character builder's style, clothes and clip menus use it.
- **Changed:** clothes are categorised by where they sit on the body, not by the pack they came in (pack `?v=14`): hoods are hats, the viking boots, pants and tunic are separate, shorts and miniskirts are bottoms. Two new slots: `bodysuit` (a base layer) and `armour` (an overlay, worn over anything; `humanProxy`'s `lift` sets it 5 mm out along its surface so it does not fight what is beneath).
- **Fixed:** `<tosi-b3d-manipulator>`'s handles follow a move drag instead of staying where the drag began until release; they still ignore a target's parent animation while you drag.
- **Fixed:** in flat view, a popup opened partly off the screen is moved back on (its corners projected, the overshoot turned into a move at its depth), or centred when it is too big to fit; a headset is left alone.
- **Fixed:** a panel's popups on a page (its DOM layer) are mounted in the document body, not beside the panel, so a clipping container (a doc page's demo frame, a scrolling sidebar) no longer cuts them off; they still scroll with the page and close when their panel leaves it. `useDomLayer(container)` still mounts in the container given.
- **Fixed:** retargeting drives the middle of a three-bone spine (new role `midSpine`; UAL's `spine_02`). Without it a clip's mid-back bend was dropped and the bones either side bent harder, creasing the lower back in a crouch.
- **Added:** stubble. `stubbleTint(colours, mask, amount, skinRgb, hairRgb)` darkens the skin toward the hair colour where a mask says the beard grows; the character builder makes the mask from MakeHuman's full beard fitted to the body (below the cheekbones, faded) and has a stubble slider.
- **Changed:** no wall clock in game code. The system clock is read only in `clock` (`realNow`, `wallMs`, `wallDate`), and a test fails on a read anywhere else. The exploder's debris, the biome shader's drift and the stars' twinkle now run on the scene's clock (`sceneSeconds`), so they stop in a pause and follow `timeScale`.
- **Changed:** physics is repeatable. `JoltPlugin` steps Jolt by a fixed step (1/60 s, `setTimeStep`) as many times as WORLD time covers (`sceneDelta`: zero while paused, scaled by `timeScale`), carrying the remainder; it used to step by however much real time had passed, so no run repeated and physics carried on through a pause. Kinematic bodies are given their target before each step. The sky's day cycle (`realtimeScale`) runs on world time too: it stops in a pause and follows `timeScale`.
- **Added:** chest and bust controls in `MacroBody` (all optional, 0.5 neutral): `chestDepth`, `pecs`, and `bustSize` / `bustFirmness`, which blend MakeHuman's breast targets across gender, age, muscle and weight like the macros and apply in proportion to how female the body is. The human pack (`?v=15`) carries the targets; the character builder has the four sliders.
- **Changed:** controllables (bipeds, vehicles, aircraft) step by world time (`sceneDelta`), so slow motion slows them too; input stays real-time. While the world is not running, a controllable still reads its input and discards it, so nothing accumulated during a pause (a wheel's scroll) arrives on resume.
- The character builder has a gridded floor that takes the sun's shadow, and an eye colour slider under its own heading.

- **Changed:** hair is carried from the head it was modelled on, skin to skin (`headScalp` now warps the library's own heads, carried in the hairstyles library as of `?v=2`; `shellWarp`, `applyWarp`, `headRegion`), instead of fitting a buzz cut to the scalp, which sank every style by its own thickness. Women's styles use Quaternius' female head, brows are placed from the eyes, moustaches above the lip, and `nudge` adjusts a style by hand. `headScalp`'s arguments and `HeadScalp` changed; `humanHair` and `placeHair` take the piece's `head` (`library.headFor(name)`).

## 0.11.4

The latest release. A character creator on MakeHuman's CC0 body: shape a
person with sliders, give them skin, eyes and hair, and watch them walk with
UAL's clips. [Read 0.11.4](/v0.11.4/).

## Every version

<!-- toc -->
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
