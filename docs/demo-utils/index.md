# demo-utils

**Scene-setup helpers for examples and prototypes** — the "when in doubt" defaults
that make a scene look like a scene instead of a test harness. Every live example
on this site uses them, which is why they are published: the code you copy off a
doc page should run in your project unchanged.

> ## ⚠️ These are DEV HELPERS. Do not build on them.
>
> They exist so examples run, and they are **not** covered by the care the main
> API gets:
>
> - **They can change or disappear in a patch release.** No deprecation period,
>   no migration note.
> - **They are tuned for looking good in a doc page**, not for your game — the
>   numbers are chosen to flatter a cube on a grey ground.
> - **They are not a design system.** `demoStage` is three components in a
>   trench coat; when you outgrow it, inline what it does and delete the import.
>
> Production code should compose `b3dSun`/`b3dSkybox`/`b3dGround` directly. If
> you find yourself wanting a helper to be *stable*, that is the signal it
> belongs in the main API — open an issue rather than pinning a version.

```js
import { b3d, b3dBox } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'

const scene = b3d(
  { sceneCreated: (el) => orbitCam(el, { radius: 8 }) },
  ...demoStage({ texture: '/tosi-warhol-testgrid.svg' }),
  b3dBox({ y: 1 }),
)
preview.append(scene)
```

## What's here

| Helper | What it does |
| --- | --- |
| `demoStage(opts)` | Sun + fill + sky + ground, spread into a `b3d(...)` |
| `demoSun(opts)` | A sun that casts shadows, at the device's shadow budget |
| `patternGround(opts)` | A ground that RECEIVES shadows and shows the light |
| `orbitCam(el, opts)` | The standard orbit camera, tilt-clamped, in `sceneCreated` |
| `spinner(el, opts)` | A slowly-rotating textured box, so you can see shadows move |
| `flightStage(opts)` | A setting an **aircraft** can operate in — stage, library, and a death panel that respawns you |

## Angles are DEGREES

`orbitCam` takes `alphaDeg`/`betaDeg`, per the framework rule: a bare angle name
is already degrees, and radians appear only where the maths needs them. The
radian `alpha`/`beta` pair is deprecated; it is still accepted and converted.

## Textures

Helpers take a `texture` URL rather than exporting asset paths: a path like
`/tosi-warhol-testgrid.svg` resolves only on **this** site, not in your project.
Pass your own, or omit it for a generated checker that needs no asset at all.
