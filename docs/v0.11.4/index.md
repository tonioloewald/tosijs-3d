# 0.11.4

<!--{ "parent": "CHANGELOG", "order": 9988996 }-->

## Added

- **A character creator, on MakeHuman's CC0 body** (CHARACTER-DESIGN.md). Try it on the [character builder](/character-builder/) page: a person walking while you reshape them. The data is a **human pack** on the CDN (`makehuman/hm08/`), loaded with `loadHumanPack`.
  - **Body**: `macroWeights` / `morphHuman` turn gender, age, muscle, weight, height, proportions and an ancestry mix into a body, in about a millisecond.
  - **Skeleton**: `humanRig` places UAL's 65 joints from the body's own joint cubes, and bone heat binds the skin once per base, so UAL's clips play on any body shape (`buildRig`, `retargetClip`). `humanBody` draws a body unrigged.
  - **Skin**: one dial from very fair to very dark through the Monk Skin Tone Scale, plus redness (`skinMaterial`, `skinAlbedo`); lips tinted from it over the pack's `lips` region, no UVs needed (`lipTint`, `lipAlbedo`).
  - **Eyes**: `humanFace` adds eyes and eyelashes that fit every body (they are the base mesh's own helper vertices); the iris is drawn in code with a colour dial (`eyeTexture`, `irisColor`); `eyeGaze` aims the eyes at a world point with small saccades.
  - **Hair**: Quaternius' CC0 hairstyles, beards and eyebrows, modelled for another head, fitted to any body (`loadHairLibrary`, `headScalp`, `humanHair`); tinted by `hairColor` (black to platinum, plus red). The pure fit is `fitToScalp` / `conformOutside`.

## Fixed

- **Retargeting no longer lines a character's collarbones up with the clip's.** A collarbone's rest direction is the body's shape, like the spine's; where two rigs differed (UAL's runs back to the shoulder, MakeHuman's lies flat), every clip shrugged the shoulders.
