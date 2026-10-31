# 0.11.6

<!--{ "parent": "CHANGELOG", "order": 9988994 }-->

The character leaves the builder. Any body (MakeHuman's, Blender's, Quaternius', or a mesh of your own) is rigged, dressed and tailored the same way; a character is a file that carries its body, `makeCharacter` builds it anywhere, and `<tosi-b3d-biped character>` walks it in a game. The biped playground plays as a character you saved. Materials get a picker of their own.

Size: barrel (min, packages external) 1430.1 KB raw / 493.3 KB gz, +5.74% on 0.11.5 (rigged bodies, characters, the tailor and rig tools as tools, the material picker).

## Added

- **`RiggedBody`** (rigged-body): one shape for a character's body whoever made it: the rest mesh, UAL's joints, skin weights, regions, and how it was made. Three producers: `bodyFromMarkers` (any mesh plus eight markers, guessed if absent), `humanBodyMaker(pack)` (MakeHuman's sliders) and `loadSkinnedBody` (a file already skinned to UAL's skeleton, as Quaternius' characters are, taken with its own joints and weights). `buildBody` makes a Babylon skeleton from any of them; `autoRig` and `loadRigTriangles` (rig-build) are the whole path in two calls. A body from a file carries its `uvs`, `colors` and `surfaces` (its materials), and its eyeballs (`body.eyes`, objects named as eyes), which take the iris dial and the gaze.
- **`lidBlink(positions, eye)`**: a blink made from a body's shape, for bodies with eyeballs and no blink targets (Blender's Human Base Meshes). Bodies rigged from markers blink with it.
- **`makeCharacter(scene, assets, { settings, garments, gaze })`** (character): the character builder's character from its settings, outside the builder. `set(changes)` applies only what changed; `skeleton`, `recipe` and `groundFor(clip)` are what playing clips on it needs. `loadCharacterAssets` loads MakeHuman's pack and the hair once per scene.
- **Character files** (character-file): a character as one versioned JSON document: every setting, each slot's look and material, the tailor's outlines, its own garments and its body (`bodies`: a URL, or the file itself) embedded, so a file is whole on another machine. `readCharacter` reads it against the page's defaults (unknown settings listed in `warnings`, missing ones defaulted, older versions migrated, newer refused).
- **`<tosi-b3d-biped character="…json">`** (or `characterDoc`): a biped made from a character file, with the clips its states name retargeted onto it (UAL1 by default), so `ualAnimationStates()` drives it. MakeHuman is imported only when a biped has a character.
- **`characterStore()`** (character-store): the characters this browser keeps (IndexedDB), shared by the builder and any page. A mesh or garment shared by several saves is stored once. The biped playground's settings panel has a **character** menu: the mannequin or any saved character, swapped in where the hero stands.
- **`mountTailorTool(b3d, { body, built, handleDone })`** (tailor-tool): the tailor as a tool, cutting a garment from any `RiggedBody`. Garments cut or imported on a mesh's body are bound to that body. `mountRigTool` takes `handleDone` / `handleCancel` and a host `panel`, and hands back `{ recipe, body }`.
- **The rig tool's markers are on the body**, dragged onto the joints they place; every joint can be moved by hand (kept in the recipe as `binding.joints`), and a tail has markers at its base and tip.
- **`materialPicker3d`** (material-picker): a material as one row, edited in a popup with rendered previews. `material-recipe` is the data (`{ type, inputs }`, schema, validator, collections such as the fabrics), `applyMaterial` puts it on a Babylon material. The character builder's garments use it.
- `barMenu` options take an `icon`; when every option has one the menu is a row of icon buttons. A new icon kind, `stroked filled`. Icons: `svgIcons.biped`, the rig and the tailor's scissors.
- `chooseFile(accept)`: the file picker as a promise, which keeps its input in the page until it answers.
- An [Acknowledgements](/acknowledgements/) page: every source used, with its licence.

## Changed

- The character builder has a body **source**: MakeHuman's, Blender's realistic Human Base Meshes, Quaternius' superheroes, or a GLB/glTF you open. A body from a file wears its own materials (each "as made" or "skin"), gets clothes and the Tailor, and its rig recipe is saved with the character. Characters save and restore (autosaved as you work, named saves beside it, JSON export and import).
- Feet and toes take the clip's turn by heading only, so feet stand flat on bodies whose ankle sits higher or lower than UAL's.
- The rig tool grounds a clip on the body's soles, so a body whose legs differ from the mannequin's no longer floats or sinks.

## Fixed

- Every file picker (the builder, the rig tool, the effect tool) delivers the file picked; a detached input could lose it, silently on Safari.
- The builder's Blender and Quaternius bodies load on a page that sets the asset base after import.
- Auto-rig on A-posed bodies: shoulders, elbows, wrists, hands and feet are found on the body.
- Turning a tail on brings its spring; its tip starts at the end of the mesh.
- Cloth eased onto a coarse body stays on its skin.
- A `b3d-launcher` moved to another holder shows its model, not the placeholder box.
