# Lamps

**Lights you can see.** `b3dPointLight`, `b3dSpotLight` and `b3dAreaLight` are
placed lights that come with their own fixture geometry, cast shadows where
Babylon supports it, take a **gel** where Babylon supports it, and can be
animated over time by the curves in [[light-modulation]].

A bare `PointLight` is invisible — you get illumination with nothing emitting it,
so every scene grows a hand-rolled "glowing sphere next to the light" that then
has to be kept in sync with it. These carry the emitter with the light, and let
you turn it off or replace it when the scene has a real fixture to put there.

## Demo

A dark room with a **matte, patterned floor** — the two things a lighting demo
needs and the first version of this had neither. A glossy untextured plane
reflects the lamp back at you and shows nothing about falloff; a lit scene with
no shadow receivers lets every light shine straight through the objects.

Three zones so the lamps do not wash each other out: a warm lamp with hard
shadows, a fluorescent that strikes and dies, and a gelled spot throwing a
window pattern across a clear patch of floor. Switch them off to watch each
one's decay.

```js
import {
  b3d, b3dLight, b3dPointLight, b3dSpotLight,
  label3d, toggle3d, slider3d,
} from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { lamps } = tosi({ lamps: { on: true, geometry: true, ambient: 0.06 } })

// `on` and `geometry` are 'on'|'off' STRINGS, not booleans — an absent boolean
// attribute reads false, so a default-true boolean is not expressible in HTML.
// Binding a boolean leaf straight to them looks right and does nothing: tosijs
// silently discards a wrong-typed prop write (tosijs#24). So observe and map.
const applyToggles = () => {
  for (const el of document.querySelectorAll('tosi-b3d-point-light, tosi-b3d-spot-light')) {
    el.on = lamps.on.value ? 'on' : 'off'
    el.geometry = lamps.geometry.value ? 'on' : 'off'
  }
}
lamps.on.observe(applyToggles)
lamps.geometry.observe(applyToggles)

const FLUORESCENT = {
  brightness: [
    { x: 0, y: 0 }, { x: 0.06, y: 0.85 }, { x: 0.1, y: 0.05 },
    { x: 0.17, y: 1 }, { x: 0.23, y: 0.08 }, { x: 0.3, y: 0.95 },
    { x: 0.35, y: 1 }, { x: 0.45, y: 0.93 }, { x: 0.52, y: 1 },
    { x: 0.63, y: 0.9 }, { x: 0.75, y: 1 },
    // THE DECAY REGION. It drops fast to an EMBER and holds there before going
    // out, rather than fading straight to zero — otherwise the hue shift below
    // arrives at red exactly when there is no light left to be red, and the
    // whole effect is invisible. Tonio: "the light that looks red doesn't seem
    // to produce red light."
    { x: 0.8, y: 0.34 }, { x: 0.95, y: 0.26 }, { x: 1, y: 0 },
  ],
  // Reaches red EARLY in the decay, so the ember above is already red while it
  // still has something to light with.
  hue: [{ x: 0, y: 0.5 }, { x: 0.75, y: 0.5 }, { x: 0.85, y: 0.04 }, { x: 1, y: 0 }],
  // Saturation RISES into the decay, and needs a scale above 1 to do it: the
  // base #cfe8ff is only 0.19 saturated, so hue alone would give a pale orange.
  saturation: [{ x: 0, y: 0.2 }, { x: 0.75, y: 0.2 }, { x: 0.9, y: 1 }, { x: 1, y: 1 }],
  saturationScale: 5,
  hueShiftDeg: 190,
  attackEnd: 0.35, sustainEnd: 0.75,
  attack: 1.3, period: 3, decay: 3.2,
}

const SOFT = {
  brightness: [{ x: 0, y: 0 }, { x: 0.35, y: 1 }, { x: 0.7, y: 1 }, { x: 1, y: 0 }],
  attackEnd: 0.35, sustainEnd: 0.7,
  attack: 0.9, decay: 1.6,
}

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      panelTitle: 'Lamps',
      scenePanel: () => [
        toggle3d({ label: 'on — watch the attack / decay', value: lamps.on }),
        toggle3d({ label: 'show fixtures', value: lamps.geometry }),
        slider3d({ label: 'ambient', value: lamps.ambient, min: 0, max: 0.4, step: 0.01 }),
      ],
      sceneCreated(el, BABYLON) {
        const scene = el.scene
        // A DARK room, or nothing the lamps do is visible.
        scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.03, 1)

        // MATTE and PATTERNED. Specular black kills the mirror-highlight that
        // made the old floor reflect the lamps; the checker gives falloff and
        // shadow edges something to fall across.
        const checker = new BABYLON.DynamicTexture('checker', 512, scene, false)
        const ctx = checker.getContext()
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            ctx.fillStyle = (x + y) % 2 ? '#3a3f47' : '#2d323a'
            ctx.fillRect(x * 32, y * 32, 32, 32)
          }
        }
        checker.update()
        checker.uScale = checker.vScale = 3

        const floorMat = new BABYLON.StandardMaterial('floor', scene)
        floorMat.diffuseTexture = checker
        floorMat.specularColor = BABYLON.Color3.Black()
        const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 34, height: 20 }, scene)
        floor.material = floorMat

        // Blockers, so shadows have something to be cast BY.
        const props = []
        const prop = (x, z, w, h, d) => {
          const m = BABYLON.MeshBuilder.CreateBox('prop', { width: w, height: h, depth: d }, scene)
          m.position.set(x, h / 2, z)
          const mat = new BABYLON.StandardMaterial('prop', scene)
          mat.diffuseColor = new BABYLON.Color3(0.62, 0.6, 0.58)
          mat.specularColor = BABYLON.Color3.Black()
          m.material = mat
          props.push(m)
          return m
        }
        prop(-9, 0.6, 1.4, 2.2, 1.4)
        prop(-7.2, -1.6, 1, 1, 1)
        prop(0, 1.2, 1.2, 1.6, 1.2)
        prop(-1.6, -1.4, 0.9, 2.6, 0.9)
        const ball = BABYLON.MeshBuilder.CreateSphere('prop', { diameter: 1.6 }, scene)
        ball.position.set(9.5, 0.8, 1.5)
        ball.material = props[0].material
        props.push(ball)

        // Register so every lamp's shadow generator picks them up as casters
        // AND marks them as receivers.
        el.register({ meshes: [floor, ...props] })

        orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 3.1, radius: 24,
          target: [0, 1, 0], maxElevationDeg: 78,
        })
      },
    },
    b3dLight({ intensity: lamps.ambient }),

    // WARM LAMP, hard shadows. Its own corner, so the shadow reads.
    b3dPointLight({
      x: -8, y: 4.2, z: 0, diffuse: '#ffd9a0', range: 16, intensity: 1.8,
      shadows: 'on', program: SOFT,
    }),

    // FLUORESCENT: strikes in stutters, hums, dies red and washed out.
    b3dPointLight({
      x: 0, y: 4.4, z: 0, diffuse: '#cfe8ff', range: 15, intensity: 2.1,
      shadows: 'on', program: FLUORESCENT,
    }),

    // GELLED SPOT over CLEAR floor, so the window pattern is legible.
    b3dSpotLight({
      x: 9, y: 8, z: -1, angle: 46, exponent: 6,
      diffuse: '#fff2dc', intensity: 620, range: 24,
      shadows: 'on', program: SOFT,
      gelSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="black"/>
        <g fill="white">
          <rect x="7"  y="7"  width="22" height="22"/>
          <rect x="35" y="7"  width="22" height="22"/>
          <rect x="7"  y="35" width="22" height="22"/>
          <rect x="35" y="35" width="22" height="22"/>
        </g></svg>`,
    })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.preview { height: 100%; }
```

## What each type can actually do

Decided by Babylon, not by us, and worth knowing before you pick:

| | shadows | gel (`projectionTexture`) | geometry |
| --- | --- | --- | --- |
| `b3dPointLight` | ✅ cube shadow map | ❌ not supported — model the blocker instead (below) | glowing sphere |
| `b3dSpotLight` | ✅ | ✅ **native** — bitmap, SVG, or a generated `shape` | cone housing |
| `b3dAreaLight` | ❌ `RectAreaLight` is not a `ShadowLight` | ❌ | emissive panel |

### A lantern behind a grill — model it, do not gel it

Tonio: _"can we do gels on point lights (I would assume provide a cylindrical
gel) e.g. if I wanted to make a lamp shaped like it's behind a grill like an old
lantern)?"_ Babylon has no projection texture on a point light, and the honest
answer is that you do not want one: **give the lamp a `url` fixture with the
grill modelled, and turn `shadows` on.**

The cube shadow map then projects the grill in every direction, for real. That
beats a gel outright — the pattern is correct from any viewpoint, it falls
across uneven ground properly, and it moves when the lantern swings. A
cylindrical gel would be a flat approximation that breaks the moment you look
at it from above.

It already works, because a `url` fixture is registered with the scene and every
lamp's shadow generator picks up registered meshes as casters. Mark the glass
and the flame `_nocast` in the model so only the metal casts — otherwise the
bulb shadows its own light, which is the one thing the built-in primitives
avoid by not being casters at all.

The cost is a cube shadow map (six faces), so this is a per-lantern decision
rather than something to switch on across a street. See the ⚠️ on `shadows`.

Rather than fake the two ❌ cases, they warn once and carry on lit. A gel faked
on a point light would be a shadow-map hack with different behaviour, different
cost and different bugs from the real thing — a worse outcome than the honest
absence, and one you would discover late.

## Geometry: on, off, or yours

`geometry="on"` (the default) builds a primitive sized to the light. `"off"`
gives you the light alone. To supply your own, either point `url` at a GLB — it
is canonicalized and parented like any model — or parent anything you like to
the lamp's `node`:

```javascript
const lamp = b3dSpotLight({ intensity: 40, geometry: 'off' })
myChandelier.parent = lamp.node
```

The default geometry is deliberately plain and **unlit** (`emissiveColor`,
`disableLighting`), because a fixture that is itself shaded by the scene reads as
a grey lump exactly when its light is off — which is when you most need to see
where it is.

**It TRACKS the light.** The emitter's colour and brightness follow whatever the
program is doing, so a fluorescent's bulb stutters as it strikes and dims to a
red ember as it dies. A flickering lamp with a steadily-glowing bulb is wrong in
the way that is hardest to unsee: the one part of the scene not participating in
the light is the part emitting it. There is a small emissive floor so a
switched-off fixture stays locatable rather than vanishing outright — which is
the same concern that made it unlit to begin with.

## One curve is the whole lamp

Everything time-varying comes from [[light-modulation]]: **one curve per channel**
(`brightness`, `hue`, `saturation`, `range`) spanning the lamp's entire
behaviour, split into three regions by two markers.

```
   0 ─────────── attackEnd ──────────── sustainEnd ─────────── 1
   |   ATTACK        |       SUSTAIN         |      DECAY      |
   | once, on        | loops while on,       | once, on        |
   | switch-on       | one pass per `period` | switch-off      |
```

The seams cannot jump, because there is only one curve — the attack arrives at
`attackEnd` and the sustain starts there. It follows that **the curve's value at
`attackEnd` IS the sustain level**: there is nothing else to declare and nothing
to keep in sync.

```javascript
b3dSpotLight({
  y: 4, intensity: 60, diffuse: '#ffd9a0',
  // A fluorescent: strikes in stutters, hums steadily, fades out and reddens.
  program: {
    brightness: [
      { x: 0, y: 0 }, { x: 0.08, y: 0.9 }, { x: 0.12, y: 0.05 },
      { x: 0.2, y: 1 }, { x: 0.26, y: 0.1 }, { x: 0.35, y: 0.95 },
      { x: 0.75, y: 1 }, { x: 0.9, y: 0.3 }, { x: 1, y: 0 },
    ],
    hue: [{ x: 0, y: 0.5 }, { x: 0.75, y: 0.5 }, { x: 1, y: 0 }],
    hueShiftDeg: 190,
    attackEnd: 0.35, sustainEnd: 0.75,
    attack: 1.2, period: 2, decay: 1.5,
  },
})
```

Those are the same `[0,1] → [0,1]` curves the province editor edits, so
[[curve-field|curve3d]] is already the editor for a lamp — the two markers are
the only thing it does not draw yet.

**Flicker does not compose across regions**, deliberately: if you want a lamp
flickering as it dies, draw that into the decay region. See
[[light-modulation]] for why that trade was taken and the two discontinuities
it leaves.

`on` is what runs the program: setting it false plays the DECAY region rather
than killing the light. A lamp that has finished decaying stops doing per-frame
work altogether.

## Attributes

Shared by all three unless noted.

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` / `y` / `z` | `0`/`3`/`0` | Position |
| `intensity` | `1` | Brightness. With `modulation`, this is the MAXIMUM |
| `diffuse` | `'#ffffff'` | Colour |
| `specular` | `'#ffffff'` | Specular colour |
| `range` | `10` | Falloff distance (point / spot) |
| `on` | `true` | `false` plays the DECAY region; it does not kill the light |
| `geometry` | `'on'` | `'off'` for no fixture |
| `geometryScale` | `1` | Size multiplier for the default fixture |
| `url` | — | GLB fixture, in place of the primitive |
| `shadows` | `'off'` | `'on'` for a shadow generator (point / spot only) |
| `shadowTextureSize` | `0` (auto) | Resolves against the device budget |
| `angle` | `60` | **spot** — cone angle in degrees |
| `exponent` | `2` | **spot** — falloff sharpness (standard falloff) |
| `innerAngle` | `0` | **spot** — inner cone in degrees; above `0` gives a true penumbra and switches to glTF falloff |
| `shape` | `'circle'` | **spot** — cone cross-section: `circle` / `square` / `none`. Projected as a gel, so an explicit `gel` wins |
| `shapeAspect` | `1` | **spot** — width/height; `2` is an ellipse or letterbox |
| `shapeSoftness` | `0.25` | **spot** — edge feather, as a fraction of the radius |
| `gel` | — | **spot** — projection texture URL (bitmap or SVG file) |
| `gelSvg` | — | **spot** — inline SVG source or an `SVGElement` |
| `width` / `height` | `2`/`1` | **area** — panel size |

**Properties** (JS only — objects, not attributes): `program`
([[light-modulation|LightProgram]]) and `node` (the fixture's `TransformNode`,
for parenting your own geometry).
