# 0.10.17

<!--{ "parent": "CHANGELOG", "order": 9989983 }-->

## Added

- **`sceneSchemas.effect` (`effectSchema()`)**: `<tosi-b3d-effect>`'s attributes as JSON Schema, like the other scene primitives (asked for by ensemble, tosijs-3d#118): `preset` (an enum of the presets), `activity` (-1 for the recipe's own, else 0 to 1, with `x-stops` naming a volcano's dormant, semi-active and erupting values), `autoplay`, `scale`, `ground` and the transform. `recipe`, a property rather than an attribute, is marked `x-property` and refers to `effectRecipeSchema()` in `$defs`. The drift test holds it to the component's `initAttributes`.

Size: barrel (min, packages external) 1206.3 KB raw / 412.6 KB gz, +0.05% on 0.10.16 (the effect schema).
