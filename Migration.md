# Migration

<!--{ "order": 2 }-->

What to change when upgrading. Only breaking changes are listed — everything
else is additive. The full detail for each is in [CHANGELOG.md](./CHANGELOG.md).

This file ships **inside the package**, because a migration table you can only
read on GitHub does not exist for someone who has already installed the thing
and is staring at an error.

## 0.6.2 → 0.7.0

> # ⚠️ READ THIS FIRST: library rotation
>
> **If you place library models with `rx`/`ry`/`rz`, your scenes will MOVE.**
>
> Everything else in this release either errors or looks obviously wrong. This
> one changes a scene that previously looked **correct**, which is why it is at
> the top instead of in the table.
>
> Two things happened to the same option at once:
>
> 1. It **never worked** on the default path. `instantiate()` wrote
>    `result.rotation`, but Babylon's glTF loader always assigns a
>    `rotationQuaternion`, and a `TransformNode` ignores `.rotation` while one is
>    present. Measured on a real model: `ry: 0`, `ry: 140` and `ry: -90` all
>    produced **bit-identical** orientations — you got the GLB's own baked
>    rotation whatever you asked for. Position worked, which is exactly what made
>    it look wired up.
> 2. It is now **degrees**, not radians.
>
> So a value that did nothing now does something, in a unit that also changed.
>
> **What to do:**
>
> - **If you passed rotation and it appeared to work** — it was not your value
>   doing it. Something else was: baked rotation in the model, a parent
>   transform, or a compensating tweak downstream. That compensation is now
>   **doubled up**. Look at every placement before assuming a regression.
> - **If you passed rotation and gave up because it did nothing** — it works now.
>   Your values are in radians; multiply by `180 / Math.PI`.
> - **If you never passed rotation** — nothing changes. `canonical: true` was
>   unaffected throughout.
>
> Quickest way to tell: search for `instantiate(` and `make.` with an `r[xyz]`
> key. If there are none, skip this entirely.

> ## ⚠️ AND THIS: models placed away from the origin in their file
>
> **If a `.glb` has its object sitting somewhere other than (0,0,0) in the source
> scene, `canonicalize` now discards that placement** — as its contract always
> claimed it did. It previously zeroed only the glTF loader's `__root__`
> wrapper, leaving the authored object's scene transform intact.
>
> **The tell is a vehicle that pivots or collides oddly**, because the control
> node used to sit a fixed distance from the model it steers (1.7 m for our own
> scout). A `_centerOfGravity` marker measured against that node folded the
> offset into the pivot, so a marker authored **correctly on the centreline**
> produced a pivot 1.75 m out, while a hand-tuned offset came out right. Ours
> was re-exported to the documented convention and immediately began crashing on
> every bank.
>
> **What to do:** author in the model's LOCAL frame and delete compensating
> offsets. Before treating a changed vehicle as a regression, check whether a
> marker or placement was tuned against the old behaviour. **Models authored at
> the origin — the common case — are unaffected.**

| What                                            | Before                                               | After                                                                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landform.gulley` / `landform.cover` `heading`  | radians                                              | **degrees** — `heading * 180 / Math.PI`                                                                                                                   |
| `library.instantiate()` / `lib.make.*` rotation | radians **and silently ignored** — see the box above | **degrees, and actually applied**                                                                                                                         |
| `b3d-aircraft` chase HUD                        | `hudChase: true` / `hudChase: false`                 | delete it (now default) / `hudChaseOff: true`                                                                                                             |
| Right stick                                     | aux roll                                             | **camera**. `strafe` still sums into roll, so a custom mapping can restore a roll axis                                                                    |
| Glass gamepad                                   | always visible                                       | **auto-hides** once a keyboard or hardware gamepad is used. `fade="off"` pins it                                                                          |
| `carve` exports                                 | 13 bare names (`sphere`, `tube`, …)                  | the **`carve.*` namespace** (`carve.sphere`, `carve.tube`)                                                                                                |
| `b3dPatch` / `B3dPatch`                         | experimental element                                 | **removed** — the pure modules it used (`carve.*`, `sdf-lattice`, `patch-field`) are kept                                                                 |
| `library.getNames()`                            | raw node names                                       | **public names** — `.model`, behaviour suffixes and the glTF loader's `_primitiveN` removed, so `building_collideCylinder_primitive0` lists as `building` |
| Model scene transform                           | kept on the content node under `__root__`            | **dropped** — see the box above; affects models not authored at the origin                                                                                |
| `spawnProjectile` / `spawnMissile` impact       | `onImpact(point)`                                    | `whenImpact({ point, normal, mesh })`. The old name still fires, with a one-shot warning                                                                  |

### The two that fail SILENTLY

Most of the above errors, or is obvious the first time you look. These two do
not, so check them by hand:

- **Angles.** A bare number is valid in either unit, so a value meant as radians
  now produces a different orientation rather than an error.
- **`hudChase`.** tosijs props end in an index signature, so a stale `hudChase`
  **compiles and is silently ignored**. Nothing will tell you.

### A note on library rotation

See the box at the top of this section. It is the one change here that can move a
scene which previously looked correct, so it is not buried down here.

### Prerelease users

If you pinned `0.7.0-rc.1` or any `0.7.0-beta.*`, move to `0.7.0`. The
prerelease channel was inverted — `rc.1` was published before `beta.1…6`, and
semver sorts beta below rc, so `@next` resolved _backwards_ to the older build.
`0.7.0` sorts above all of them.
