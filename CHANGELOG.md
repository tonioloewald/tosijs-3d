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

- **Character builder:** `save…` asks for the name in a popup (filled in with the current one), refuses a blank name or the working figure's with a reason, and asks before replacing another saved character; `rename…` renames the picked one. They work in a headset too. `nameCharacter` (character-store) is the rule.
- **`button3d({ popup })`**: a button that opens a small form (controls, flat and in a headset) in a popup anchored to it; the controls get a handle to close it or show the next step.
- **`tosijs-3d/fit-extremes`** and **`bun run extremes`**: every MakeHuman garment and Quaternius hairstyle on 133 bodies at the sliders' corners, measured for penetration (raw, and visible past the skin's tuck) and bone sanity, with a markdown/JSON report and a headless contact sheet of the worst cases. Engine-free. Moved here from Dramatis.
- **`tosijs-3d/hair-place`**: hair placed on a body's head with no engine (`headScalp`, `placeHair`, and the hair library read from its GLB with `readHairLibrary`). `human-hair` now uses it and re-exports what it exported before.
- **`tosijs-3d/mesh-sdf`**: signed distance to a triangle mesh.
- **`coverDepths`** (proxy-cover): how deep each skin vertex goes under what is worn, the rule `coverSkin` applies before its fade.
- **Eyes from a picture**: `eyeTexture({ style: 'basic' | 'anime' })` paints Tonio's CC0 eye art with its iris recoloured, and a character's new `eyeStyle` setting picks it (`basic` by default; `drawn` keeps the eye drawn in code, which also shows while the art loads). `tosijs-3d/eye-art` is the engine-free half: the art's URLs, `recolourEyePng`, and `gltfEyeUvs` for an export. `pngDecode` joins `pngEncode`. Both are in the engine-free character core.

## 0.12.1

The latest release. A rigged, morphing body written out as a GLB with no engine (`tosijs-3d/skinned-glb`, with `tosijs-3d/glb-chunks`), moved here from Dramatis. See [0.12.1](/v0.12.1/).

## Every version

<!-- toc -->
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
