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

### Added

- Rig tool: drag a marker forward or back in a side view to set its joint's depth (the fit puts each at the middle of the body's thickness, and the mannequin's pelvis is well behind it). Kept in the rig recipe as `binding.depths`, an offset per marker from the fit's depth; `fitSkeleton`'s `depths`, `bodyFromMarkers`'s `depths` and `rigFromMarkers`'s sixth argument take it too.
- Rig tool: a **floor** slider (Motion) moves the body up or down from where its soles stand, for one that floats or sinks; kept in the rig recipe as `floor` (metres), and the character builder stands the body the same way. At rest the soles, not the mesh's lowest point, are put on the floor.
- Character builder: exporting MakeHuman's body writes the clothes it wears (MakeHuman's own and garments of your own made on it), fitted as drawn, with their pictures and looks. `character.exportGarments()` gives them for `riggedBodyGlb`'s `garments` on either kind of body; `onSkin` (`garment-proxy`) binds a piece made for MakeHuman's pack to the skin a body draws, and `packGarmentMaterial` gives a pack piece's material as data.
- The export of MakeHuman's body carries its eyelashes, drawn and faded as in the builder, following the head. The fade is a small ramp picture, so it needs no vertex alpha (`shortenLashes`, `lashAlpha`, `lashUvs`, `lashPicture` in `eye-art`).
- The export of MakeHuman's body carries its hair, beard, moustache and brows: Quaternius' pieces placed as the builder places them (scalp hair following the head, tucked under a hat), MakeHuman's own hair and brows bound like clothes, each picture coloured as the builder colours hair (`recolourHair`, `cloth-bake`). A garment may `follow` one joint wholly; `riggedBodyGlb` tucks the skin under clothes only. `readHairLibrary` now gives each part's uvs and material, and `readHairMaterials` the library's pictures.
- The export of MakeHuman's body carries its skin (its tone as the material, lips and stubble as vertex colours: `skinSurface`, `skin-paint`) and its eyes with Tonio's eye art in its iris colour (`riggedBodyGlb`'s `eyeTexture`, laid on by `gltfEyeUvs`). `character.exportCharacter()` gives the body, garments and eye picture together.
- Export (rig tool, character builder): **animation** puts the clip playing in the GLB, retargeted onto the skeleton as written, whether it is UAL's, a GLB of your own or a BVH capture. A host passes it as `clip` on the export target (`ExportClip`: the file and the clip's name); `exportClip` reads one into `riggedBodyGlb`'s `clips`.
- A character file carries the clip it plays when that is one of your own (`clips`: the BVH or GLB file, by name), so it plays on a page that has never seen the file; the builder reads and keeps it on load. `characterStore` keeps the bytes once, as it does garments.
- A garment's look goes out in its picture: `riggedBodyGlb` writes a recoloured cloth's texture recoloured, so any engine shows what the builder does (`bake: false` keeps the pictures as they came). `bakeClothLook(picture, look)` (`cloth-bake`) is the step on its own.
- `jpegDecode` and `decodeImage` (`tosijs-3d/jpeg`): JPEGs read with no engine or canvas (baseline and progressive, grey or colour, any chroma subsampling), as `pngDecode`'s `RgbaImage`; `decodeImage` reads either. `pngDecode` now reads grey PNGs too.
- Character builder: **clips from a file…** takes BVH motion captures as well as GLBs, and keeps them in this browser (`clipStore`, IndexedDB `tosijs-clips`), so they come back next visit; **forget** drops one. `retargetSourceClip` plays a clip held as data (a BVH, or a GLB read with `readGlbClips`) on a loaded skeleton, as `retargetClip` does a loaded one.
- `readBvh` and `writeBvh` (`tosijs-3d/bvh`): BVH motion capture files read as clips (any skeleton, any Euler order, units guessed or given) that `bakeClip` and `retargetClip` play on any body, and any clip written out as BVH.
- A tailor's garment fits any body (`tailor-recipe`): a cut records the joints of the body it was drawn on (`TailorCut.on`), and `recutGarment(body, cut)` makes it on another rigged body, its outlines carried by the joints so a hem drawn at the knee stays at the knee. In the tailor, outlines now follow the body when it is reshaped. `fitCut`, `warpOutline`, `outlineLandmarks` and `tailorBody` are the parts.
- `heldParts(joints, held, bases)` (`tosijs-3d/rigged-body-glb`): a held item for any skeleton at rest, as `riggedBodyGlb` writes one: the socket joint under the hand (local transform and inverse bind), and the item's mesh skinned to it with its materials and pictures. For a GLB writer whose skeleton `riggedBodyGlb` did not make; `riggedBodyGlb` now uses the same code.
- `loftGarment` (`body-sweep`): a garment lofted along a chain of bones, as rings round the hull of the body's slice plus thickness and an `ease` curve, with mitred or rounded (`steps`) bends and open, sealed or capped ends. It returns a `GarmentCut` binding, so it fits and bends like a tailor's cut. The first piece of the sweep core; no tool uses it yet.

### Changed

- Rigs bound from markers put the pelvis behind the thigh joints by 0.028 of the body's height and below them by 0.008, as UAL's mannequins have it, not above them at the middle of the hips' thickness (a seat, a belly or armour moved it). Every marker rig changes, saved ones too: look at yours in a crouch. `fitSkeleton`'s `pelvis: 'middle'` gives the old placement.
- Rigs bound from markers put the neck joint at the top of the shoulders, an eighth of the way down from the head joint to the pelvis as on UAL's mannequins; on a body with its arms down it sat in the upper chest (5 to 9 cm low on the AI cast), so the head turned from there.
- Tailor: a new garment, or one with nothing drawn yet, is cut from the body's own triangles (**cloth mesh: as the body**), not draped: the cheapest and surest way. Saved garments keep how they were made.
- `loadCharacterAssets` no longer fetches Quaternius' hair library (13.9 MB) at start: a character fetches it the first time it wears one of its pieces, and offers the pieces by name before then (`QUATERNIUS_HAIR`). `CharacterAssets.hair` is null until then; `assets.loadHair()` loads it, and `loadCharacterAssets(scene, { hair: 'now' })` keeps the old behaviour.
- Character builder: the panel runs from the most basic, least changeable choices to the most: tabs Body, Skin, Eyes, Face, Hair, Clothes, Hold, Motion, Export; in the Body tab, shape (gender, age, height) then ancestry then figure (weight, muscle and the rest); in Hair, brows and the style before beard, moustache and stubble. Control paths that moved: `Body/figure/weight`, `Body/figure/muscle`.

### Fixed

- Retargeted clips keep the feet on the ground on bodies whose thigh and shin are proportioned differently from the clip's (the rig tool's AI characters crouched with one foot in the air): a foot near the ground goes where the source's went and the leg bends to reach it; a foot in the air keeps the copied angles. On by default in `retargeter`, `retargetClip` and `bakeClip`; `footIk: false` turns it off.
- Rig tool: a recipe handed over through `api.recipe` with new markers now binds the mesh again (it kept the old binding).
- The African American female's and Eurasian male's knee joints sit higher (2.5 and 4.4 cm), at the hollow behind the knee rather than below it.
- Tailor: switching to a slot that wears something the body shown cannot (MakeHuman's shoes while another body is on show) opened as "(new garment)" but said there was no outline; it now starts a new garment.
- Tailor: undo and redo work while an outline is being clicked out, a point at a time (they did nothing until it was closed). `outlineField3d` gains `undoPoint`/`redoPoint`. A panel's tooltips stay inside its padding, so the undo button's is no longer cut off at the edge.
- `riggedBodyGlb` wrote a garment's uvs upside down (ours run up the image, glTF's down), so a textured garment's picture landed flipped on it in other engines.
- The tailor could not cut a large garment ("Maximum call stack size exceeded"): a big cut's triangle list was spread into a call. The same pattern is gone from `remesh` and `loadRigTriangles`.
- A body opened from the builder's own export GLB (`riggedBodyGlb`) is its skin and eyes only: `glbRigTriangles`, `loadRigTriangles` and `loadSkinnedBody` leave out the garments and the held item it also carries, which were merged into the body.
- A menu opened from a scene panel (a select's list) closes on a press anywhere else: outside it, or on its panel anywhere but the control that opened it, which still toggles it. `showLayer` takes `dismissOutside`, and `showPopup` (every menu) asks for it.
- A popup dropped with its title band off screen comes back on release until the band is reachable (its top on screen, 48 px of it across), as a frame panel's screen drag already does. It may still be slid partly off to see past it.

## 0.12.5

The latest release. Exported bodies carry clips, garments and held items; the cast's rigs are engine-free; the Babylon peers are optional (install them yourself); the character builder gets a Character menu, a hair manipulator and sub-sections. See [0.12.5](/v0.12.5/).

## Every version

<!-- toc -->
- [0.12.2](/v0.12.2/)
- [0.12.1](/v0.12.1/)
- [0.12.0](/v0.12.0/)
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
