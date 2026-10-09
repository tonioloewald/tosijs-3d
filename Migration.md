# Migration

<!--{ "order": 2 }-->

What to change when upgrading. Only breaking changes are listed — everything
else is additive. The full detail for each is in [CHANGELOG.md](./CHANGELOG.md).

This file ships **inside the package**, because a migration table you can only
read on GitHub does not exist for someone who has already installed the thing
and is staring at an error.

## 0.9.0 → 0.10.0

### 1. The deprecated callback names are gone: `onX` → `handleX`

**What changed.** The `onX` callback options were deprecated in 0.8.0 and kept
working, with a warning, through 0.9.x. They are removed. An `onX` option is
no longer called.

**Who is affected.** Anyone who saw the console warning
"`onChange` is deprecated — use `handleChange`" and has not renamed yet.

**How you will notice.** TypeScript reports the old name as an unknown
property. At runtime the callback does not fire, and the console says so once
per name: "`onChange` was removed in 0.10 and is IGNORED — use `handleChange`".
Demo code in doc comments and plain JavaScript is not type-checked, so search
for the names rather than relying on the compiler.

**What to do.** Rename. Every pair:

| where | removed | use |
| --- | --- | --- |
| `toggle3d` `slider3d` `select3d` `color3d` `vector3d` `euler3d` `angle3d` `arc3d` `picker3d` `curve3d` `footprint3d` `themeEditor` `terrainEditor3d` | `onChange` | `handleChange` |
| `button3d`, menu actions, `addDebugSource` actions | `onClick` | `handleClick` |
| `list3d`, `surface` `MenuItem`, `table` | `onSelect` | `handleSelect` |
| `table`, `box` `button` / `BoxChild` | `onActivate` | `handleActivate` |
| `showPopup` / `openPopup` / `openMenu3d` | `onClose` | `handleClose` |
| `inputField` | `onChange` / `onEnter` / `onFocus` | `handleChange` / `handleEnter` / `handleFocus` |
| `keyboard` | `onKey` / `onAction` / `onCaretMove` | `handleKey` / `handleAction` / `handleCaretMove` |
| `curve3d` / `footprint3d` result (`field.onChange = …`) | `onChange` | `handleChange` |

Components take `when*`:

| component | removed | use |
| --- | --- | --- |
| `<tosi-b3d-trigger>` | `onEnter` / `onExit` properties | `whenEnter` / `whenExit` |
| `<tosi-b3d-manipulator>` | `handleChange` / `handleCommit` | `whenChange` / `whenCommit` |

`b3dTrigger({ onEnter })` through the element creator is unchanged: it was
never the property, it is a listener for the `'enter'` event and receives an
`Event`.

`handlerOf(config, 'handleX', 'onX')` keeps its signature. It now returns only
`handleX`, and warns once if it finds a function under the old name.

### 2. `generateGalaxy` and `galaxy.getStarSPS()` are removed

`generateGalaxy(seed, count, options)` was an adapter over the voxel galaxy.
Call that directly:

```javascript
// before
const galaxy = generateGalaxy(1234, 10000, options)
// after
const galaxy = voxelGalaxy({
  seed: 1234,
  brightBudget: 10000,
  dimBudget: 0,
  galaxyOptions: options,
}).view({ generatePlanets: options.generatePlanets === true })
```

The result is identical. `getStarSPS()` on `<tosi-b3d-galaxy>` returned `null`
since the stars moved to a vertex shader; use `galaxy.pickStar(x, y)`.

## 0.8.15 → 0.9.0

### 1. `biomeTemperature` is in degrees now: 0 is 0 °C, 1 is 50 °C

**What changed.** `<tosi-b3d-terrain biomeTemperature>` used to be the biome
chart's own axis: `0…1`, cold to warm, with `-1` meaning "use the default".
It is now a temperature: `0` is 0 °C and each unit is 50 °C, so `-1` is
-50 °C, and the value is not limited to any range. The default is `0.45`
(22.5 °C), which is the same climate as before.

**Who is affected.** Anyone who sets `biomeTemperature`. An old value is read
on the new scale and comes out much warmer: `0.3` used to be about -4 °C and
is now 15 °C. `-1` used to mean the default and is now -50 °C.

**What to do.** Convert each value: `new = (old - 0.36) / 0.8`. Replace `-1`
with `0.45`, or delete the attribute.

| Old | New | Climate |
|-----|-----|---------|
| `-1` (auto) | `0.45` | 22.5 °C |
| `1` | `0.8` | 40 °C |
| `0.72` | `0.45` | 22.5 °C |
| `0.36` | `0` | 0 °C |
| `0` | `-0.45` | -22.5 °C |

`chartTemperature` and `planetTemperature` (from `biome-chart`) do the
conversion in code. Only this attribute moved. `BiomePlugin.params`, the
province climate curves and the decorator's rule bands are still in chart
units.

### 2. Nothing else is removed, including what was promised

The deprecated `onX` callback names (and the other names announced as
"removed in 0.9") still work in 0.9.x and warn once. They are removed in
0.10. Rename when convenient.

## 0.8.14 → 0.8.15

**Nothing breaks at compile time. Three defaults change what you see.**

### 1. The decorator's default library is Quaternius', not Kenney's

**What changed.** `<tosi-b3d-decorator>` with no `url` loads
`quaternius/libraries/nature.glb` and uses `NATURE_RULES`. It used to load
Kenney's Nature Kit and use `NATURE_KIT_RULES`.

**Who is affected.**
- You set no `url` and no `rules`: you get the new trees. Nothing to do unless
  you want the old ones.
- You set custom `rules` that use Kenney's model names (`tree_oak`,
  `rock_largeA`) and no `url`: none of those names exist in the new library.
  The decorator now warns in the console and places nothing for them.
- You self-host only the Kenney kit: the default URL is a file you do not have.

**What to do.** To stay on Kenney's kit, name it:

```javascript
b3dDecorator({ url: assetUrl('kenney/libraries/nature-kit.glb') })
```

With a `url` set and no `rules`, the decorator uses `NATURE_KIT_RULES`.

### 2. Layouts are different, and things clump

**What changed.** Every scatter rule now gathers into clumps by default, the
candidate grid changed, and the budget became a ceiling (a small radius or a
mostly-sea map places fewer than the budget). The same seed gives a different
layout than 0.8.14 did. `NATURE_KIT_RULES`' rocks are now procedural
(`rock:boulder:1` …) at a different scale, and no rocks are placed on a
volcanic province.

**Who is affected.** Anyone who stored placements, compared them in a test, or
tuned a scene around where things stood.

**What to do.** There is no switch that restores 0.8.14's exact layout. For an
even spread again, set `clump="0"` on the element (or `clump: 0` on a rule).

### 3. Water reflections follow the device tier

**What changed.** `<tosi-b3d-water>`'s `textureSize` defaults to auto (1024,
512 or 256 by device tier; it was 1024 everywhere) and a new
`reflectionRefresh` redraws the reflection every frame, every second or every
third by tier on a flat screen.

**What to do.** Top-tier devices see no change. To keep the old behaviour on
every device:

```javascript
b3dWater({ textureSize: 1024, reflectionRefresh: 1 })
```

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

<!--
`xml`, NOT `html` — the doc system RUNS a ```html fence as a live example, and
this one is illustrative markup in a reference document with no scene to mount
into. `xml` highlights the same and stays inert. See `doc-examples.test.ts`,
which now fails on any live-language fence in a published markdown file.
-->

```xml
<tosi-b3d-aircraft
  gun-mode="blast"
  gun-blast-radius="1.5"
  gun-full-radius="0.5"
></tosi-b3d-aircraft>
```

Both radii are attributes now; they used to be hardcoded. Missiles and bombs are
unchanged — AOE is right for those.

### 2. `activationVeto`'s second parameter (optional)

`blocks(info)` now receives a description of the activation — who, how, how far.
A veto that ignores its argument is unaffected, which is every veto written
before this existed:

```javascript
use.vetoes.push({ name: 'locked', blocks: () => !hasKey }) // unchanged
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
kept working through 0.9.x, warning **once per name**, and was **removed in
0.10** (see the top of this file).

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
