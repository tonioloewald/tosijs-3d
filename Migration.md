# Migration

What to change when upgrading. Only breaking changes are listed — everything
else is additive. The full detail for each is in [CHANGELOG.md](./CHANGELOG.md).

This file ships **inside the package**, because a migration table you can only
read on GitHub does not exist for someone who has already installed the thing
and is staring at an error.

## 0.6.2 → 0.7.0

| What                                            | Before                               | After                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landform.gulley` / `landform.cover` `heading`  | radians                              | **degrees** — `heading * 180 / Math.PI`                                                                                                                   |
| `library.instantiate()` / `lib.make.*` rotation | radians (and see the note below)     | **degrees**                                                                                                                                               |
| `b3d-aircraft` chase HUD                        | `hudChase: true` / `hudChase: false` | delete it (now default) / `hudChaseOff: true`                                                                                                             |
| Right stick                                     | aux roll                             | **camera**. `strafe` still sums into roll, so a custom mapping can restore a roll axis                                                                    |
| Glass gamepad                                   | always visible                       | **auto-hides** once a keyboard or hardware gamepad is used. `fade="off"` pins it                                                                          |
| `carve` exports                                 | 13 bare names (`sphere`, `tube`, …)  | the **`carve.*` namespace** (`carve.sphere`, `carve.tube`)                                                                                                |
| `b3dPatch` / `B3dPatch`                         | experimental element                 | **removed** — the pure modules it used (`carve.*`, `sdf-lattice`, `patch-field`) are kept                                                                 |
| `library.getNames()`                            | raw node names                       | **public names** — `.model`, behaviour suffixes and the glTF loader's `_primitiveN` removed, so `building_collideCylinder_primitive0` lists as `building` |
| `spawnProjectile` / `spawnMissile` impact       | `onImpact(point)`                    | `whenImpact({ point, normal, mesh })`. The old name still fires, with a one-shot warning                                                                  |

### The two that fail SILENTLY

Most of the above errors, or is obvious the first time you look. These two do
not, so check them by hand:

- **Angles.** A bare number is valid in either unit, so a value meant as radians
  now produces a different orientation rather than an error.
- **`hudChase`.** tosijs props end in an index signature, so a stale `hudChase`
  **compiles and is silently ignored**. Nothing will tell you.

### A note on library rotation

`instantiate()`'s `rx`/`ry`/`rz` were not merely in the wrong unit — on the
default (non-canonical) path they were **discarded entirely**. Babylon's glTF
loader always assigns a `rotationQuaternion`, and a `TransformNode` ignores
`.rotation` while one is present, so every value produced the GLB's own baked
rotation. Fixed in 0.7.0 (the option now writes a quaternion). If you had
compensated for that by baking rotation into your models or working around it
downstream, **that workaround is now doubled up** — this is the one entry where
upgrading can change a scene that previously looked correct.

### Prerelease users

If you pinned `0.7.0-rc.1` or any `0.7.0-beta.*`, move to `0.7.0`. The
prerelease channel was inverted — `rc.1` was published before `beta.1…6`, and
semver sorts beta below rc, so `@next` resolved _backwards_ to the older build.
`0.7.0` sorts above all of them.
