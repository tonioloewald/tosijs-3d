/*#
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
is already degrees, and radians appear only where the maths needs them (see
CLAUDE.md → Angles). The pre-0.7.1 `alpha`/`beta` radian pair is still accepted
and converted, so old snippets keep working.

## Textures

Helpers take a `texture` URL rather than exporting asset paths. The paths that
used to be exported (`/tosi-test-pattern.svg`) resolve only on **this** site, so
publishing them would have been a broken promise in your project. Pass your own,
or omit it for a generated checker that needs no asset at all.
*/
/*{ "parent": "Utilities" }*/
import * as BABYLON from '@babylonjs/core';
import { b3dSun, b3dSkybox, b3dLight, b3dGround, b3dFog, b3dLibrary, b3dDeath, inputFocus, gameController, } from './index';
const DEG = Math.PI / 180;
/**
 * A sun that CASTS shadows — the "when in doubt, add a shadow light" default.
 *
 * `shadowTextureSize` defaults to the **auto sentinel `0`**, not a hard-wired
 * 2048. A fixed size overrode the device-tier budget for every demo including
 * on a headset, which is 4× the shadow VRAM on the tier least able to pay it.
 * Acne is handled by `shadowNormalBias` instead, which costs nothing.
 */
export function demoSun(opts = {}) {
    return b3dSun({ intensity: 0.9, shadowTextureSize: 0, ...opts });
}
/**
 * A ground that RECEIVES shadows. A test pattern reads the light far better
 * than a flat colour — a flat ground hides the lighting, the shadows and the UV
 * mapping at once, which is how a scene ends up looking broken when it is
 * merely bland.
 */
export function patternGround(opts = {}) {
    const { size = 40, tiles = 16, color = '#8a9b7e', texture } = opts;
    return b3dGround({
        width: size,
        height: size,
        texture: texture ?? 'checker',
        textureTiles: texture ? Math.max(1, Math.round(tiles / 4)) : tiles,
        color,
    });
}
/**
 * The whole "make it not look like a test harness" setup in one spread: a sun
 * that casts, a sky to light and reflect, and a ground that shows both.
 *
 * ```js
 * b3d({ ... }, ...demoStage({ texture: '/my-grid.png' }), myThing)
 * ```
 *
 * The fill light is not optional-by-taste: a directional sun alone leaves every
 * unlit face at ZERO, so objects read as black silhouettes rather than objects.
 * Real outdoor light has sky bounce; a hemispheric light is the cheap stand-in.
 */
export function demoStage(opts = {}) {
    const { timeOfDay = 11, sun = {}, fill = 0.35, ...ground } = opts;
    return [
        demoSun(sun),
        ...(fill > 0 ? [b3dLight({ y: 1, intensity: fill })] : []),
        b3dSkybox({ timeOfDay }),
        patternGround(ground),
    ];
}
/**
 * The standard `ArcRotateCamera` every demo sets up — one call instead of six
 * lines. Call it in `sceneCreated`.
 *
 * Clamps the tilt by DEFAULT so you cannot drag the view below the horizon and
 * see the world from underneath (an `ArcRotateCamera` happily orbits under the
 * floor otherwise — a long-standing demo papercut).
 *
 * **Degrees**, per the framework rule that a bare angle name is already
 * degrees. The old radian `alpha`/`beta` are still accepted and converted, so
 * existing snippets keep working; they are the one place in this module where
 * radians appear at all.
 */
export function orbitCam(el, opts = {}) {
    const { radius = 14, target = [0, 0.8, 0], minElevationDeg = 5, maxElevationDeg = 89, } = opts;
    const alpha = opts.alpha ?? (opts.alphaDeg ?? -90) * DEG;
    const beta = opts.beta ?? (opts.betaDeg ?? 60) * DEG;
    const cam = new BABYLON.ArcRotateCamera('demo-cam', alpha, beta, radius, new BABYLON.Vector3(target[0], target[1], target[2]), el.scene);
    cam.attachControl(el.querySelector('canvas'), true);
    // beta is measured from straight-up (0) to straight-down (π); π/2 is level.
    // Elevation ABOVE horizontal = π/2 − beta, so a MIN elevation is an UPPER
    // beta limit.
    if (minElevationDeg != null)
        cam.upperBetaLimit = Math.PI / 2 - minElevationDeg * DEG;
    if (maxElevationDeg != null)
        cam.lowerBetaLimit = Math.PI / 2 - maxElevationDeg * DEG;
    el.setActiveCamera(cam);
    return cam;
}
/**
 * A slowly-rotating box — the "non-static object so you can see the shadow
 * move" prop. Registers itself as a shadow caster so `demoSun`/`b3dSun` picks
 * it up. Call in `sceneCreated`.
 */
export function spinner(el, opts = {}) {
    const { size = 2, x = 0, y = 1.2, z = 0, spin = 0.12, texture } = opts;
    const box = BABYLON.MeshBuilder.CreateBox('spinner', { size }, el.scene);
    box.position.set(x, y, z);
    const mat = new BABYLON.StandardMaterial('spinner-mat', el.scene);
    if (texture)
        mat.diffuseTexture = new BABYLON.Texture(texture, el.scene);
    box.material = mat;
    el.register?.({ meshes: [box] });
    el.scene.onBeforeRenderObservable.add(() => {
        box.rotation.y += spin * 0.016 * Math.PI * 2;
    });
    return box;
}
/**
 * A setting an aircraft can actually operate in — the flight equivalent of
 * {@link demoStage}, and the fix for three demos that each forgot a different
 * piece of it.
 *
 * What it includes, and why each is here rather than left to the caller:
 *
 * - **A `b3dDeath` with a working respawn.** Without one, `crash()` releases
 *   input focus and leaves you holding nothing — no wreck to fly, no panel, no
 *   way back. That reads as the demo seizing up rather than as dying, and it is
 *   why `plane` is a factory.
 * - **A sun configured for the ground it lights.** A 4000-unit ground with the
 *   default single shadow map puts the aircraft's shadow in a coarse far
 *   cascade where it is invisible, and `shadowMaxZ` at its default of 100 drops
 *   shadows entirely once you climb.
 * - **Ground, sky and fog at flight scale**, which every flight demo otherwise
 *   retypes slightly differently.
 *
 * Returns an object rather than an array (unlike `demoStage`) because the stage
 * owns an IDENTITY: the current aircraft changes on respawn, so a readout that
 * captured the first one would go stale.
 *
 * ```js
 * const stage = flightStage({
 *   plane: () => b3dAircraft({ library: 'vehicles', meshName: 'scout', player: true, y: 40 }),
 *   library: '/test-3.glb',
 * })
 * const scene = b3d({ gamepad: true }, ...stage.elements)
 * // stage.aircraft is always the one you are flying NOW
 * ```
 */
export function flightStage(opts) {
    const { plane, size = 4000, timeOfDay = 10, library, libraryType = 'vehicles', fog = true, groundColor = '#6b7f5e', title = 'DOWN', } = opts;
    let current = plane();
    const focus = inputFocus(gameController(), current);
    const elements = [
        b3dLight({ y: 1, intensity: 0.6 }),
        // Cascaded, with a shadowMaxZ that still reaches the ground from cruising
        // altitude. `shadowTextureSize` stays on the auto sentinel so the device
        // tier decides — a hard-wired size is 4x the VRAM on the tier least able to
        // pay for it.
        b3dSun({ intensity: 0.9, shadowCascading: true, shadowMaxZ: 600 }),
        b3dSkybox({ timeOfDay }),
        ...(fog
            ? [b3dFog({ start: size / 10, end: size * 0.75, color: '#bfd9f2' })]
            : []),
        b3dGround({
            meshName: 'ground_nocast',
            width: size,
            height: size,
            color: groundColor,
        }),
        ...(library ? [b3dLibrary({ url: library, type: libraryType })] : []),
        b3dDeath({
            title,
            respawn() {
                current = plane();
                focus.appendChild(current);
            },
        }),
        focus,
    ];
    return {
        elements,
        /** The aircraft you are flying NOW — changes on respawn. */
        get aircraft() {
            return current;
        },
    };
}
//# sourceMappingURL=demo-utils.js.map