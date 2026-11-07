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

- **Tabbed settings panels with icons**: `panelSections: 'tabs'` with an `icon` on each collapsible `label3d`. The character builder and the rig tool use it.
- **`panelActions(el)`** on `<tosi-b3d>`: a page's own buttons on the settings panel's icon bar, at its right end. Icon bars take `{ spacer: true }` (an elastic gap); `tabs3d` takes `tools`, and in a tabbed panel `iconBar3d({ inTabs: true })` goes on the tab strip.
- **Undo and redo** in the character builder and the rig tool (⌘Z / ⇧⌘Z). `undoHistory` is the pure history behind them.
- **Panels rebuild once a resize settles.** The scene dispatches `resizeend`; `panelRoom(panelEl)` gives a system panel its room.
- **Pictures in materials**: a material picker's colour, opacity, glow and bumps (and a cloth's colour, roughness and normal) can take a picture, kept by `material-pictures` and saved in a character file (`pictures`). Cloth and PBR take `tile` (metres per repeat).
- **Photographed fabrics**: eleven of Poly Haven's CC0 fabric scans as cloth presets (`textiles`, `textiles-full`; `fabricTexturePresets`).
- **Material previews** are drawn on Tonio's material test ball, on grey (a cube until it loads).
- **Export a rigged body as a GLB** from the rig tool and the character builder (joint names, rest pose, height; the model's materials and springs).
- **Character builder**: Hold uses Tonio's textured weapons with a manipulator on the grip; clips come from a smaller builder pack (`UAL_builder.glb`); `playback3d` (play, scrub, speed) in Motion; all four AI characters open on hand-placed rigs.
- **Rig tool**: spread fingers, and hand modes (full, mitten, none); opened from the builder it shows the body it already wears.
- **Biped melee**: `holdingWeapon` stands on guard in Sword_Idle and the right trigger swings (Sword_Attack). The biped playground carries Tonio's weapons.
- **Material inputs that take a picture** are a heading and a row: choose a picture, clear it, a flat colour or grey instead (`colorPicker` icon), and a swatch of what it is now. `colorPicker3d` and `color3d` take `grey: true` (a black-to-white ramp and a ladder of greys).
- **`slider3d` `notches`**: a press beside the handle steps to the next notch that way; dragging stays continuous. A material's `tile` is now **scale textures**, 1/32 to 4 on a log scale, notched at 1/n and whole numbers (`textureScaleNotches`), where pictures repeat whole.
- **The tailor has undo and redo**, with cancel and done, on a bar pinned to the top of its panel (⌘Z / ⇧⌘Z in the builder while it is open).
- **Grips per class of item** (`hold-grip`: `holdGrip`, `holdClassOf`, `HOLD_CLASSES`): pistols, rifles, heavy weapons, one- and two-handed blades, bows, shields. The character builder keeps an adjusted grip per class (placing one sword places every one-handed blade; per-item grips saved before are read as their class's), and the biped playground holds by class.
- **The character builder's tailor is always on the bar** (scissors): pick a slot and a garment, and one you cut opens on its outline to edit, or start a new one; no done or cancel, it keeps the garment when you switch or close, and undo covers the edits. Export, import and forget moved into it; the Tailor tab is gone. `mountTailorTool` takes `panel`, `persistent` and `rows`; characters take `hideSlot` (one slot's garment off for a moment).
- **Character builder clothes**: each slot is one row, the garment and its material swatch beside it; the "edit" picker is gone. `materialPicker3d` takes `name` (a title with no caption).
- **Tailor drape**: edits no longer lock the page (debounced, sliced, interruptible: `drapeGarmentAsync`, `runSliced`, `drapeSteps`, `remeshSteps`); cloth goes over arms, shoulders and hips; anchored points are drawn in the new `--w3d-anchored` colour.

### Changed

- **Stroked-and-filled icons fill with `--w3d-icon-fill`** (a mid blue) instead of the button colour behind them. Pass `knockout` to `iconGlyph`, or set `--tosi-icon-knockout`, for the old look.
- The rig tool's hosted "start over" is an icon beside undo and redo.
- Material inputs are labelled **diffuse** (albedo), **normal map** (was bumps) and **colorize** (a cloth's recolour); the recipe keys are unchanged.
- A material's `tile` input's range is now 1/32 to 4 (was 0.02 to 4), so a smaller saved value is clamped.
- Cloth material previews show a colour the recipe names wholly (the preview has no texture for a recolour to keep).
- The tailor's "export glTF" button reads "export GLB".

### Fixed

- Arrow keys and Space no longer scroll the page while you play a demo.
- Tailor, cut from the skin: tidy, smoothed cut edges (no spikes or notches along a neckline).
- Drape: edges well clear of the body are no longer pinned to it (rigid hems).
- A held item's grip is measured on fresh world matrices (the pistol no longer circles the hand metres away); the launcher reads its `_grip` the same way.
- Auto-rig: glove bumps are not read as fingers, and a knotted thumb is placed by proportion.
- The rig tool casts shadows when hosted, and done on a body from a file no longer leaves it invisible.
- Undoing a placed grip in the character builder moves the held item back (the numbers were restored, the item was not).
- A stroked-and-filled icon's part drawn with `stroke:none` stays unstroked (tosijs-ui#251 worked round by `bin/icon-no-stroke.ts`).

## 0.12.3

The latest release. Characters out to other engines (a GLB read with no engine, any rigged body as a skinned GLB that plays UAL's clips by name, springs as `VRMC_springBone`), the rig tool's fixes for AI-made meshes, draped cloth, and scenes as agent tools and for a screen reader. See [0.12.3](/v0.12.3/).

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
