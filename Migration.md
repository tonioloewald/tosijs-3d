# Migration

<!--{ "order": 2 }-->

What to change when upgrading. Only breaking changes are listed — everything
else is additive. The full detail for each is in [CHANGELOG.md](./CHANGELOG.md).

This file ships **inside the package**, because a migration table you can only
read on GitHub does not exist for someone who has already installed the thing
and is staring at an error.

## 0.8.0 → 0.8.1

**Nothing breaks at compile time, and one behaviour changes.** The
`activationVeto` signature grew a second parameter and it is OPTIONAL — a
required one would have been a hard TypeScript break for every caller, and the
default is chosen so that a veto reading it gets a conservative answer rather
than a permissive one.

### 1. Aircraft guns are direct-hit, not area-effect

**What changed.** `<tosi-b3d-aircraft>`'s cannon damages the thing its shell
passes through. It used to detonate a small AOE warhead at the impact point.

**Why.** Blast damage resolves by distance to a destroyable's registered point —
one point, at the model's origin. Scale a fighter up and its wing sits outside
the blast, so point-blank fire does nothing, silently. Direct-hit damage has no
length scale in it, so it cannot break that way. Reported by an adopter who hit
it by making their world four times larger (#23).

**If you relied on the old behaviour**, say so explicitly:

```html
<tosi-b3d-aircraft gun-mode="blast" gun-blast-radius="1.5" gun-full-radius="0.5">
```

Both radii are attributes now; they used to be hardcoded. Missiles and bombs are
unchanged — AOE is right for those.

### 2. `activationVeto`'s second parameter (optional)

`blocks(info)` now receives a description of the activation — who, how, how far.
A veto that ignores its argument is unaffected, which is every veto written
before this existed:

```javascript
use.vetoes.push({ name: 'locked', blocks: () => !hasKey })   // unchanged
```

Calling `activationVeto(vetoes)` directly still compiles. When you omit the
info, vetoes are told `distance: Infinity` — "we do not know that you are near"
— so a **reach veto refuses** rather than waving the activation through. If you
call it yourself and want a reach veto to pass, supply the distance:

```javascript
activationVeto(vetoes, { source: 'near', distance: 0.4 })
```

### 3. `select3d` no longer draws ‹ › stepper arrows

Tapping the control opens a popup list, which it already did — the arrows were
a second way to do the same thing and made the popup undiscoverable. Nothing to
change; the control is the same size and the same tap.

## 0.7.8 → 0.8.0

**Nothing breaks at runtime.** Both items below keep working in 0.8.x; one is an
install-time floor, the other is a deprecation with a removal date.

### 1. Peer floor: `tosijs` `^1.7.8` → `^1.9.2`

Upgrade `tosijs` alongside this. npm will refuse to install otherwise
(`ERESOLVE`); bun and pnpm warn and proceed, which is the case worth reading on.

One behaviour changed with it, and it is silent. A wrong-typed write to an
`initAttributes` prop used to be **discarded**; since tosijs 1.9 it **warns and
applies the value as given**. So on an `'on' | 'off'` attribute, `foo: false`
used to mean `'on'` and now genuinely sets `false` — anything comparing against
the string breaks instead of quietly defaulting.

Use **`isOff()`** from `tosijs-3d`, which accepts `'off'`, `false` and
`'false'`, rather than comparing to a string yourself.

### 2. Callback options: `onX` → `handleX`

Every callback option in the library now takes `handleX`. The old `onX` spelling
still works, warns **once per name**, and is **removed in 0.9**.

| widget                                   | old                                  | new                                              |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| `inputField`                             | `onChange` / `onEnter` / `onFocus`   | `handleChange` / `handleEnter` / `handleFocus`   |
| `keyboard`                               | `onKey` / `onAction` / `onCaretMove` | `handleKey` / `handleAction` / `handleCaretMove` |
| `table`                                  | `onSelect` / `onActivate`            | `handleSelect` / `handleActivate`                |
| `box` `button` / `BoxChild`              | `onActivate`                         | `handleActivate`                                 |
| `surface` `MenuItem`                     | `onSelect`                           | `handleSelect`                                   |
| `showPopup` / `openPopup` / `openMenu3d` | `onClose`                            | `handleClose`                                    |
| `addDebugSource` actions                 | `onClick`                            | `handleClick`                                    |
| `themeEditor`                            | `onChange`                           | `handleChange`                                   |

**Why, in one sentence:** these are plain factories today, but the moment one
becomes a tosijs component the element creator binds an `on*` prop as a DOM
event **listener**, so the callback is never called and nothing errors — which
is not hypothetical, it shipped three times in this codebase.

**Components use `when*`, not `handleX`** — `b3d-trigger` gains
`whenEnter`/`whenExit` (`onEnter`/`onExit` still work). Passing `onEnter` to the
element creator never set the field at all; it added a listener for the `'enter'`
CustomEvent, so your callback received an `Event` instead of the trigger.

If you write your own widgets, `handlerOf(config, 'handleX', 'onX')` is exported
so you can follow the same rule.

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
