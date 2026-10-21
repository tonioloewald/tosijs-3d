# 0.10.10

<!--{ "parent": "CHANGELOG", "order": 9989990 }-->

## Fixed

- **`panel3d`'s return type says what it carries** (#104): the exported `Panel3d` type lists `handlePointer`, `scrollBy`, `scrollable`, `gripHeight`, `gripHit`, `measure`, `addLayerHost`, `useDomLayer` and `dispose`. The declaration was a bare `SVGSVGElement`, so calling `dispose()` (new in 0.10.8) did not typecheck. Existing casts to a subset of those methods still compile.
- **A per-axis scale set on a library destroyable's node survives moves and turns** (#105): the uniform `scale` attribute was rewritten onto the node on every render, so a consumer's `[2, 1, 3]` stretch was lost at the next unrelated attribute write. It is now written only when `scale` (or the node) changes, and the attribute still wins whenever it is set.
- **Projected AO darkens library pieces** (#107, from ensemble): it hooked only the materials in `scene.materials` and those created after it started, but a library's instances share its container's materials, which are in neither. So pieces placed from a `<tosi-b3d-library>` were left out of the depth picture and never occluded, while the plugin count said AO was running. It now also finds materials through the scene's meshes, at start and as meshes are added. On twelve pirate-kit pieces, the pixels it changes went from 0% to 5.8% at strength 1, and from 0.1% to 16.5% at strength 3 (screen AO: 13%).
- **A key is delivered once even when a handler re-renders its field group mid-keystroke** (#94, from ensemble): a `handleChange` that rebuilt its panel inside the keydown detached the focused field's group, so the window listener, deciding afterwards, typed the key a second time (`flagXXship`). Every route now marks the event it consumed and skips one already marked.
- **The Moon with NASA's maps is a globe again**: its height map was exaggerated 12×, which put its relief at 14% of the radius ("ridiculous"). It is 3× now, about 3.5%: basins still show at the limb.
- **A planet's golden hour peaks with the sun at the horizon, not well above it.** The gold at the limb was strongest with the sun about 50° from behind the planet and still bright at 70°: daylight over most of the limb. It now needs the sun close behind (full within about 15°, gone by about 50°) and keeps its breadth. A first attempt that narrowed the band itself was rejected ("a very thin effect which isn't what I wanted"); Tonio, on this one: "pretty perfect".
- **A star system's rocky worlds have continents, not one blob.** A planet reads its noise at `grossScale × radius`, and its presets' relief is tuned for radius 50, both in drawn units. A system draws a world a few units across, so the synthetic Earth read a fiftieth of one noise wave and came out as a single smooth landmass ("very Fisher Price Pangaea"). Its noise is now set per world (about 1.6 waves across it for continents, 6 for coastlines), and the preset's relief is scaled by drawn radius over 50, for planets and moons alike. A look that sets its own scales or relief still wins.

## Added

- **Retargeting: one humanoid's animation on another's body.** The Universal Animation Library's clips now play on characters that weren't built for them. The demo (`/retarget/`) shows one clip on four bodies: UAL's mannequin, a Quaternius superhero, omnidude (Mixamo's bones) and a Kenney chibi (seven bones).
  - **Roles:** `humanoidRoles` says which bone is which across UE, Mixamo, Kenney and Blender names.
  - **Rotations:** `retargeter(source, target)` transfers each bone's world-space rotation since rest, so a clip made on an A-pose rig plays as shown on a T-pose one.
    - The hips move in proportion to hip height.
    - A target bone that stands for several source bones (a chibi's whole leg) aims along the source's chain.
  - **The Babylon side:** `readSkeleton` reads a loaded character; `retargetClip`/`retargetClips` turn a clip into an AnimationGroup for it. All pure except the Babylon side, and tested on the real UAL, Mixamo and Kenney skeletons.
- **Auto-rig: a mesh with no skeleton, walking** (#3349). Eight markers on a front view, as on Mixamo's auto-rigger, are enough to rig a mesh for UAL's clips. The auto-rig page (`/rig-build/`) rigs Tonio's omnidude, two weasels and a space marine in the browser (CC BY 4.0, on the CDN under `tonio/rigging/`) and plays clips on them side by side.
  - **Fitting:** `fitSkeleton(markers, meshQuery(positions, indices))` places UAL's 65 joints, each at the middle of the mesh's thickness. An optional tail tip grows a tail chain.
  - **Binding:** `boneHeat` binds the mesh by bone heat (Baran & Popović), in about 0.1–0.3 s.
  - **Building:** `buildRig` makes a Babylon skeleton of the result the way the glTF loader would, so `readSkeleton` and `retargetClip` work on it.
  - **Reading files:** `objTriangles` reads an OBJ.
- **Spring bones: secondary motion for hair, tails and capes.**
  - **Model:** `spring-chain` is the pure model: Verlet at a fixed 120 Hz step, stiffness toward the rest shape, damping, sphere colliders, and a correction that keeps the tip from whipping.
  - **Babylon side:** `springBones` hangs a simulated chain from any node, after the animation has posed the body, and `skinTube` skins a tube to it. `springNodes` runs an existing chain, which is how the weasels' tails swing.
  - **Demo:** a mannequin running in circles with a ponytail.

- **The auto-rig's marker step** (#3349). `markerField3d` shows a mesh's front silhouette with Mixamo's eight markers on it, to be dragged onto the joints, plus a side view for a tail tip. It is an ordinary panel control, so it works on a page, in the scene and in a headset. Symmetry is on by default, hovering names a marker, `handleChange` fires as a marker moves and `handleCommit` when it is let go. The pure half is in `rig-fit`:
  - `rigSilhouette(positions, indices, view)` is a mesh's front or side view as runs on a grid (a few ms).
  - `guessMarkers(silhouette)` gives a first placement read off the outline: the crotch, the arms' row, the neck and the legs. On Tonio's three OBJ meshes it lands within 10% of body height of the hand-placed markers, mostly within 3%.
  - The auto-rig page (`/rig-build/`) now rigs a character from the panel: pick one, drag its markers, and on release it is fitted, bound and walking again (about 0.15 s). **guess** re-places the markers from the silhouette alone.
- **Arm space for retargeting** (Mixamo's "Character Arm-Space"): `retargeter(source, target, { armSpaceDeg })` and `retargetClip(..., { armSpaceDeg })` turn the upper arms out from the body after retargeting, and the forearm and hand follow. A Kenney chibi's arms are long for its height, so hanging where UAL's hang put its hands half a metre through the floor, and in the retarget demo it looked as if it were kneeling. At 55° it walks like Kenney's own walk for that character, compared side by side: the arms are held out at about 45° and the lowest point is −0.13 m against Kenney's −0.15 m. The retarget page's panel no longer opens over the characters.
- **System panels for an app's main chrome** (#106, from ensemble). Three new `<tosi-b3d-panel>` controls for a panel with an `icon`:
  - **`exclusive="off"`** lets it stay open beside other system panels. Opening it closes nothing, and the settings panel or an exclusive panel (an inventory) opens and closes over it without closing it. The default is unchanged: one at a time.
  - **`open`** opens it when the scene starts.
  - **Its `screenAnchor` is where it first opens**, so a right-hand column can be declared. A drag still moves it and it reopens there; holding its button still puts it back.
  - **In a headset** the non-exclusive panels that were open follow you in and back out. A left-pinned panel sits left of centre and a right-pinned one right, lower for a lower pixel `top`.
  - A focused `inputField` in one takes typing as it does anywhere: keys come from a window listener, not the DOM (checked).
- **Screenshot from the scene panel.** A download icon on every scene's standard panel opens a popup with two buttons: **With panels** and **Scene only**. Each saves the canvas as a PNG. Scene only hides the `ui` and `modal` layers and world-layer panels (the system bar included) for the frame and puts them back. The popup closes itself first, so it is never in the picture. It is `b3d.saveScreenshot({ ui, name })` in code, and returns the Blob. `setPanelsHidden(scene)` (frame-panel) is the hide, and returns its undo. Feather's `download` icon is added.
- **Axial tilt.** Planets lean, with the axis fixed in space as they orbit, so seasons and a ring's shadow on its planet come and go with the year.
  - **Moons orbit their own plane:** `inclination` on a moon (degrees from the ecliptic), by default its planet's equator, as regular moons do. Our Moon takes 5.1°; with the tilt on its holder it had dropped 23° below the ecliptic.
  - **`SOL` carries the real tilts** (Earth 23.4°, Saturn 26.7°, Uranus 82.2°, Venus 2.6°; a negative `day` already makes Venus and Uranus turn backwards). A star system tilts each planet (and its rings).
  - **`tilt` on `<tosi-b3d-planet>`** does the same for a standalone planet; the spin runs about the tilted axis.
  - **What it fixes:** Saturn's rings shadowed nothing in the Solar System demo, because they lay in the plane of the orbit, edge-on to the Sun, and their shadow was a hairline on the equator. The sun's elevation above the rings now runs from −26.7° to +26.7° round Saturn's year: two equinoxes (the demo's clock starts at one) and two solstices.

Size: barrel (min, packages external) 1152.8 KB raw / 394.5 KB gz, +3.46% on 0.10.9 (retargeting, the auto-rig and spring bones).
