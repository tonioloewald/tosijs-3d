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

- `heldParts(joints, held, bases)` (`tosijs-3d/rigged-body-glb`): a held item for any skeleton at rest, as `riggedBodyGlb` writes one: the socket joint under the hand (local transform and inverse bind), and the item's mesh skinned to it with its materials and pictures. For a GLB writer whose skeleton `riggedBodyGlb` did not make; `riggedBodyGlb` now uses the same code.
- `loftGarment` (`body-sweep`): a garment lofted along a chain of bones, as rings round the hull of the body's slice plus thickness and an `ease` curve, with mitred or rounded (`steps`) bends and open, sealed or capped ends. It returns a `GarmentCut` binding, so it fits and bends like a tailor's cut. The first piece of the sweep core; no tool uses it yet.

### Changed

- `loadCharacterAssets` no longer fetches Quaternius' hair library (13.9 MB) at start: a character fetches it the first time it wears one of its pieces, and offers the pieces by name before then (`QUATERNIUS_HAIR`). `CharacterAssets.hair` is null until then; `assets.loadHair()` loads it, and `loadCharacterAssets(scene, { hair: 'now' })` keeps the old behaviour.
- Character builder: the panel runs from the most basic, least changeable choices to the most: tabs Body, Skin, Eyes, Face, Hair, Clothes, Hold, Motion, Export; in the Body tab, shape (gender, age, height) then ancestry then figure (weight, muscle and the rest); in Hair, brows and the style before beard, moustache and stubble. Control paths that moved: `Body/figure/weight`, `Body/figure/muscle`.

### Fixed

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
