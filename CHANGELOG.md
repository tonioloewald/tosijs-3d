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

## 0.12.4

The latest release. Tabbed settings panels and undo across the character builder, rig tool and tailor; pictures in materials (Poly Haven's fabric scans as cloth presets, a picture or a flat colour or grey for any input); the tailor always on the bar; grips per class of held item; Tonio's textured weapons and melee in the biped. See [0.12.4](/v0.12.4/).

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
