# 0.12.2

<!--{ "parent": "CHANGELOG", "order": 9987998 }-->

More of the character, engine-free: eyes from Tonio's art, hair placed with no engine, lips and stubble as vertex colours, cloth recoloured into its texture, and the extremes sweep, all moved here from Dramatis. The character builder's save and rename ask in a popup.

Size: barrel (min, packages external) 1516.6 KB raw / 526.0 KB gz, up 6.2 KB / 2.3 KB gz (+0.4%): the eye art painter, `pngDecode` and the save popup are in the barrel; the rest are subpaths.

## Added

- **Eyes from a picture**: `eyeTexture({ style: 'basic' | 'anime' })` paints Tonio's CC0 eye art with its iris recoloured, and a character's new `eyeStyle` setting picks it (`basic` by default; `drawn` keeps the eye drawn in code, which also shows while the art loads). `tosijs-3d/eye-art` is the engine-free half: the art's URLs, `recolourEyePng`, and `gltfEyeUvs` for an export. `pngDecode` joins `pngEncode`.
- **`tosijs-3d/hair-place`**: hair placed on a body's head with no engine (`headScalp`, `placeHair`, and the hair library read from its GLB with `readHairLibrary`). `human-hair` uses it and re-exports what it exported before.
- **Baked materials**: `tosijs-3d/skin-paint` (`lipTint`, `stubbleTint`, `stubbleMask`) gives the lips and stubble as per-vertex colours over the skin's albedo, and `writeSkinnedGlb` writes them as `COLOR_0` (a primitive's new `colors`), which glTF multiplies into the base colour, so no texture is needed. `tosijs-3d/cloth-bake` (`recolourCloth`, `textureMean`, `clothSheenColour`) bakes a garment's recolour into its texture as cloth-shading draws it. `lipTint` and `stubbleTint` moved from character-builder and are still exported from the barrel.
- **`tosijs-3d/fit-extremes`** and **`bun run extremes`**: every MakeHuman garment and Quaternius hairstyle on 133 bodies at the sliders' corners, measured for penetration (raw, and visible past the skin's tuck) and bone sanity, with a markdown/JSON report and a headless contact sheet of the worst cases.
- **`tosijs-3d/mesh-sdf`**: signed distance to a triangle mesh.
- **`coverDepths`** (proxy-cover): how deep each skin vertex goes under what is worn, the rule `coverSkin` applies before its fade.
- **`button3d({ popup })`**: a button that opens a small form (controls, flat and in a headset) in a popup anchored to it; the controls get a handle to close it or show the next step.
- All the new modules are in the engine-free [character core](/character-core/).

## Changed

- **Character builder**: `save…` asks for the name in a popup (filled in with the current one), refuses a blank name or the working figure's with a reason, and asks before replacing another saved character; `rename…` renames the picked one. Both work in a headset. `nameCharacter` (character-store) is the rule.

## Fixed

- Stubble no longer darkens the lower lip.
