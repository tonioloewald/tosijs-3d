# 0.12.5

<!--{ "parent": "CHANGELOG", "order": 9987995 }-->

For Dramatis and the character builder: an exported body now carries clips, garments and what the hand holds, the cast's rigs are engine-free data, and the Babylon peers are optional, so a three.js app can take the character core without installing Babylon. The builder gets a Character menu on the system bar, a manipulator for placing hair, and sub-sections in its panels.

Size: barrel (min, packages external) 1655.1 KB raw / 573.5 KB gz, up 11.3 KB / 4.5 KB gz (+0.7%) on 0.12.4.

> **⚠️ Breaking (install only):** `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders` and `@babylonjs/materials` are now *optional* peers, so npm no longer installs them for you. A Babylon app that was relying on that installs them itself: `npm i @babylonjs/core @babylonjs/gui @babylonjs/loaders @babylonjs/materials`. The version ranges are unchanged.

### Added

- **`lockMove`** on `<tosi-b3d-manipulator>` (`'x'`, `'xz'`…): the object's axes a move may not go along. The widget shows only what is left (an arrow per free axis, a pad where both its axes are free) and a drag never moves along a locked axis. The character builder's hair handle locks x: up and forward, one pad.
- **Menus of actions on the system bar**: `barMenu` options can be actions (`handleSelect`, `checked`), submenus (`items`), rules (`separator`) and `disabled`, `options` may be a function read on each opening, and `layout: 'list'` shows each option's icon beside its caption. `viewMenu` is a list now (each view named).
- **`panelIcon`** on `<tosi-b3d>`: the settings button's icon in place of the owl, named by `panelTitle`, for a page whose panel is its main tool.
- **Character builder**: the character (select, delete, save, save as, rename, export and load JSON, go to the playground) is a **Character** menu on the system bar instead of a tab; the panel's button is the body. A library hairstyle is placed with a move-only manipulator on the head (up and forward) and a **scale** slider, in place of the up, forward and size sliders (the settings are unchanged, so saved characters keep their hair). The Body tab carries the mesh icon, and a mesh body's surfaces are a sub-section under its source. `makeCharacter(...).hairAnchor()` is the Head node and the skull's middle the adjustment is measured from.
- **Sub-sections**: `label3d({ collapsible: true, level: 2 })` folds inside the section or tab it is in (one open at a time, except with `panelSections: 'folds'`), drawn indented, and is a level under its section in the control tree (`Body/shape/gender`). The character builder's Body tab folds into shape, figure and ancestry.
- **`tailorPanel(el, options)`**: the character builder's always-on tailor as a piece any page with a character mounts (slot and garment pickers, keep on switch or close, forget, export, import), with the host's draft, slots and garment store passed in; `garmentStore()` is the browser's IndexedDB store the builder uses. The builder now runs on it.
- **Clips in an exported body**: `tosijs-3d/glb-clips` (engine-free) reads any skinned GLB's animations and the skeleton they were made on (`readGlbClips`) and bakes one onto another skeleton through the retargeter (`bakeClip`); `riggedBodyGlb(body, { clips: [{ from, clip, extras }] })` writes them as glTF animations, each with its licence in its `extras`. `writeSkinnedGlb` takes `animations`.
- **Garments in an exported body**: `riggedBodyGlb(body, { garments })` writes garments bound to that body (`garmentProxy`: the tailor's cuts and draped cloth on a file body, or Blender's) as meshes skinned on the same skeleton with weights from the body's own, their materials as glTF, and tucks the skin they cover (`cover: false` leaves it). A character's `wornGarments()` hands over what it wears; the character builder's export GLB includes them.
- **`tosijs-3d/garment-proxy`** (engine-free): `garmentProxy(content, body)` binds a garment file to the body it was made on as a `HumanProxy`, its material as data (pictures as bytes, `twoSided`, the saved `look`, and `gltf`, that look as glTF factors where it has a plain reading), so an exporter writes own garments through the same path as MakeHuman's clothes; `garmentMadeOn`, `garmentLook`, `lookGltf`. The character wears own garments through it. `clothRecipe` moved to `material-recipe` (still exported from `cloth-shading`).
- **Held items in an exported body**: `riggedBodyGlb(body, { held: { grip, item, gripPoint, extras } })` writes a `weapon_r` joint (or `weapon_l`, or `held.name`) under the hand where the character builder holds the grip, and with `item` (a mesh read by `glbRigTriangles(bytes, { pick })`) the item itself, skinned to that joint with its materials and its licence in the mesh's `extras`. `glbNodePosition` reads an item's `_grip` node with no engine. The socket arithmetic is the engine-free `tosijs-3d/hand-socket`, which the launcher's `handSocket` now runs too. `writeSkinnedGlb` meshes take `extras`. The character builder's export GLB carries what the right hand holds (`BodyExportTarget.held`).
- **`tosijs-3d/character-sources`** (engine-free): `CHARACTER_SOURCES` and `AI_CHARACTER_SOURCES` with Tonio's hand-placed rigs for the AI cast, and `rigFromMarkers`, so an exporter rigs the cast as the builder does (`glbRigTriangles`, `bodyFromMarkers` with the source's `recipe.binding`, `riggedBodyGlb`). Still exported from `character` and the barrel. `riggedBodyGlb`'s `recipe` may be partial.

### Changed

- **The `@babylonjs/*` peers are optional**, so a consumer of the engine-free subpaths (a three.js app taking the character core) installs no Babylon. A Babylon app that relied on npm installing the peers for it installs them itself: `npm i @babylonjs/core @babylonjs/gui @babylonjs/loaders @babylonjs/materials`.

### Fixed

- **Manipulator plane pads** can be grabbed again: the hairline arrow shafts, drawn in front of them from most angles, took the press first.
- Character builder: loading a saved character (or the autosaved one on opening the page) stopped before restoring its name and its tailor outline (a call left behind when the clothes "edit" picker went, in 0.12.4).
- A system panel with no title bar (a bar menu) keeps its size in step with its content when the content is swapped (a submenu was drawn at the full menu's height).
- A select's list is one at a time: tapping the select again closes it, and a panel rebuilt while the list was open (an in-place refresh) closes it with the old content. Before, the list stayed in the scene at its old offset (off screen once the panel's height changed) and the next tap opened a second.
- The character builder keeps a held item's grip point on the grip when the grip's scale is not 1 (the item slid off it).
