# Getting started

<!--{"order": 1}-->

**From nothing to a lit scene you can walk around, then where to go next.**

## Install

```bash
npm install tosijs-3d tosijs @babylonjs/core @babylonjs/gui @babylonjs/loaders @babylonjs/materials
```

Babylon (`^9`) and `tosijs` (`^1.9.2`) are peer dependencies: you install them,
so your app has exactly one copy of the engine. `jolt-physics` is an optional
peer, needed only for [b3d-physics](/b3d-physics/).

## A first scene

No model file needed:

```javascript
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere } from 'tosijs-3d'

document.body.append(
  b3d(
    b3dSun({ shadowCascading: true }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ size: 24, texture: 'checker' }),
    b3dBox({ x: -1.5, y: 0.5, color: '#c8553d' }),
    b3dSphere({ x: 1.5, y: 1, diameter: 2, color: '#ffd166' })
  )
)
```

Give the element a size in your CSS (`tosi-b3d { width: 100vw; height: 100vh; }`).

That is the whole app. `b3d(...)` creates a `<tosi-b3d>` element, which owns the
engine and the scene; everything nested inside it adds itself when the scene is
ready and removes itself when it leaves the page. You get an orbit camera,
shadows, and (on a device that supports it) an Enter VR button, without asking.
The [Primitives](/b3d-primitives/) page is this scene, running.

The functions are element creators, so the same scene is also plain markup:
`<tosi-b3d><tosi-b3d-sun shadow-cascading></tosi-b3d-sun>...</tosi-b3d>`.

## Then what

| You want | Start at |
| --- | --- |
| Your own model | [b3d-loader](/b3d-loader/) loads a GLB. Mesh name suffixes (`_collide`, `_mirror`, `_nocast`) set behaviour: [Material Conventions](/b3d-utils/) |
| Something to drive | [b3d-biped](/b3d-biped/), [b3d-car](/b3d-car/) or [b3d-aircraft](/b3d-aircraft/), inside a [b3d-input-focus](/b3d-input-focus/) so keyboard, gamepad, touch and VR controllers all work |
| A world | [b3d-terrain](/b3d-terrain/), [b3d-water](/b3d-water/), [b3d-skybox](/b3d-skybox/). [Land and Sky](/land-and-sky/) is all of it at once |
| Controls that work in a headset | The `scenePanel` hook on [b3d](/tosi-b3d/), built from [widgets3d](/widgets3d/) |
| Things that blow up | [Combat](/combat/) |
| A world something else drives | [World Sim](/world-sim/) |

## Finding a capability

Search the [attribute index](https://3d.tosijs.net/attributes.txt) before
deciding something is not there: one line per attribute of every element,
generated from source. It also ships in the package, at
`node_modules/tosijs-3d/static/attributes.txt`.

## How the pages are organised

Each section lists the **elements** you put in a scene. Tucked under an element
are the pure models and helpers it is built from (the flight model under the
aircraft, the biome chart under the terrain). You can use those directly, and
they are where the tests are, but you do not need them to get started.

<!-- toc -->
<!-- /toc -->
