/*#
# b3d-lamp

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
      scenePanel: () => [
        label3d({ text: 'Lamps' }),
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
      on: lamps.on, geometry: lamps.geometry, shadows: 'on', program: SOFT,
    }),

    // FLUORESCENT: strikes in stutters, hums, dies red and washed out.
    b3dPointLight({
      x: 0, y: 4.4, z: 0, diffuse: '#cfe8ff', range: 15, intensity: 2.1,
      on: lamps.on, geometry: lamps.geometry, shadows: 'on', program: FLUORESCENT,
    }),

    // GELLED SPOT over CLEAR floor, so the window pattern is legible.
    b3dSpotLight({
      x: 9, y: 8, z: -1, angle: 46, exponent: 6,
      diffuse: '#fff2dc', intensity: 620, range: 24,
      on: lamps.on, geometry: lamps.geometry, shadows: 'on', program: SOFT,
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
*/
/*{ "parent": "Environment", "order": 60 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, conventionName, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { SvgTexture } from './svg-texture'
import { canonicalize } from './model-transform'
import { resolveBudget } from './b3d-quality'
import {
  isAnimated,
  lightPhase,
  sampleLight,
  shiftHue,
  type LightProgram,
} from './light-modulation'

/**
 * Lowest the fixture's emissive goes, as a fraction of full.
 *
 * Not zero: an unlit black fixture disappears entirely, and being able to see
 * where a switched-off lamp is was the whole reason for making it unlit.
 */
const FIXTURE_FLOOR = 0.06

/** Warn once per message — a per-frame warning is a performance bug of its own. */
const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

/**
 * Shared behaviour for a placed light with a body.
 *
 * Subclasses build the light and (optionally) the default fixture; everything
 * else — position, modulation, the envelope clock, shadows, teardown — lives
 * here so a fix lands once rather than three times.
 */
export abstract class B3dLamp extends B3dChild {
  static initAttributes = {
    x: 0,
    y: 3,
    z: 0,
    intensity: 1,
    diffuse: '#ffffff',
    specular: '#ffffff',
    range: 10,
    /**
     * `'on'` / `'off'`, not a boolean.
     *
     * A boolean attribute cannot default true — an absent boolean reads false,
     * which is correct HTML and fatal here, since a lamp written
     * `<tosi-b3d-point-light>` would arrive switched off. tosijs now throws at
     * construction on a true-default boolean, so this is not a silent trap any
     * more, but it is still a trap.
     */
    on: 'on',
    geometry: 'on',
    geometryScale: 1,
    url: '',
    /*
    ⚠️ NOT FREE, and the cost is worst exactly where it is least visible.

    Every lamp with `shadows="on"` builds its own ShadowGenerator — a full
    extra render of the caster list, per lamp, per frame. Three lamps placed by
    hand is fine and you would notice if it were not. Forty pieces inserted
    from a library, each carrying a lit fixture, is forty extra passes and
    nobody is watching the total.

    RANGE makes it worse: a large-range lamp sweeps more of the world into its
    shadow map, so the two knobs multiply.

    So: prefer `shadows="off"` for anything DYNAMICALLY INSERTED, and reserve
    it for the few lights whose shadows a viewer would actually miss. A tool
    that inserts lit content should make this an explicit, resisted choice
    rather than a default — see TODO ("arbitration for inserted lights").
    */
    shadows: 'off',
    /*
    WHICH CLOCK the program runs on. `'real'` (default) or `'sim'`.

    `'real'` — actual elapsed seconds, immune to pause and to time scaling. A
    lamp is AMBIENCE, and freezing a flicker mid-flicker is what makes a paused
    game look broken rather than paused.

    `'sim'` — the WORLD's clock. It stops when the world stops and, once a
    scaled clock exists, compresses when the world is fast-forwarded. Tonio's
    case is the decisive one: _"consider if you wanted to show a time lapse, the
    way they do in some GTA IV and GTA V scenes... you don't want lights to
    slowly fade in while cars are appearing and disappearing."_ A lamp that is
    part of the SIMULATION rather than the ambience wants this — street lights
    coming on at dusk, a beacon whose period a player is timing.

    ⚠️ **Only pausing is implemented, not scaling**, because there is no
    scene-owned scaled clock yet (tosijs-3d#41). When one lands it must arrive
    through `sceneDelta` and NOT through a second channel: lamps then obey it
    with no change here, and there is still exactly one answer to "what time is
    it". A parallel key would be a second source of truth, which is the one
    thing this area cannot afford.

    Real time is measured from `performance.now()` rather than the engine
    delta, because `engine.getDeltaTime()` inside a scene observer is the WHOLE
    frame and runs once per active camera — the documented 2x/4x footgun that
    `sceneDelta` exists to fix.
    */
    timeSource: 'real',
    /** `0` = auto — resolved against the device tier, like every other budget. */
    shadowTextureSize: 0,
  }

  declare x: number
  declare y: number
  declare z: number
  declare intensity: number
  declare diffuse: string
  declare specular: string
  declare range: number
  declare on: string
  declare geometry: string
  declare geometryScale: number
  declare url: string
  declare shadows: string
  declare timeSource: string
  declare shadowTextureSize: number

  owner: B3d | null = null
  light?: BABYLON.Light
  /** Parent for the fixture. Parent your own geometry here. */
  node?: BABYLON.TransformNode
  shadowGenerator?: BABYLON.ShadowGenerator
  /** Undo for the current shadow setup — see `syncShadows`. */
  private _shadowOff: (() => void) | null = null
  /** Fixture materials, repainted each frame to track the light. */
  private _fixtureMats: BABYLON.StandardMaterial[] = []

  /**
   * The lamp's whole behaviour as one curve per channel — attack, sustain and
   * decay are regions of it, split by `attackEnd` / `sustainEnd`.
   */
  program: LightProgram | null = null

  protected baseIntensity = 1
  protected baseRange = 10
  protected baseColor = new BABYLON.Color3(1, 1, 1)

  /*
  ONE accumulator, and a timestamp for the last switch.

  `sinceChange` is derived (`_elapsed - _switchAt`) rather than accumulated in
  its own right: a second accumulator would drift against the first, and the
  whole point of reading position from a clock is that it cannot.
  */
  private _elapsed = 0
  /** Last real-time reading, for the `'real'` clock. */
  private _lastRealMs = 0
  private _switchAt = 0
  private _wasOn = true
  private _tick?: BABYLON.Observer<BABYLON.Scene>
  private _disposables: Array<{ dispose: () => void }> = []

  /** Build the Babylon light. */
  protected abstract createLight(scene: BABYLON.Scene): BABYLON.Light
  /** Build the default fixture, parented to `node`. */
  protected abstract createGeometry(scene: BABYLON.Scene): BABYLON.Mesh | null

  protected get isOn(): boolean {
    return !isOff(this.on)
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    this.owner = owner
    this.node = new BABYLON.TransformNode('lamp', scene)
    this.node.position.set(this.x, this.y, this.z)

    this.light = this.createLight(scene)
    this.baseIntensity = this.intensity
    this.baseRange = this.range
    this.baseColor = BABYLON.Color3.FromHexString(this.diffuse)
    this._wasOn = this.isOn
    // A lamp that starts OFF must not play its decay on the first frame — it
    // was never on. Backdate the switch past the window so it resolves to `off`.
    this._switchAt = this._wasOn ? 0 : -((this.program?.decay ?? 0) + 1)

    this.buildFixture(scene)
    this.syncShadows()
    owner.register({ lights: [this.light] })

    this._tick = scene.onBeforeRenderObservable.add(() => this.update(scene))
  }

  private buildFixture(scene: BABYLON.Scene): void {
    if (this.url) {
      // A GLB fixture goes through the same canonicalization as any model, so
      // a lamp asset behaves like the rest of the content pipeline.
      BABYLON.LoadAssetContainerAsync(this.url, scene)
        .then((container) => {
          if (this.node == null) {
            container.dispose()
            return
          }
          container.addAllToScene()
          const node = this.node
          for (const root of container.rootNodes) {
            if (root instanceof BABYLON.TransformNode) {
              canonicalize(root, scene, 'lamp-fixture').parent = node
            }
          }
          this._disposables.push({ dispose: () => container.dispose() })
          this.owner?.register({ meshes: container.meshes })
        })
        .catch((err) =>
          console.warn(`b3d-lamp: could not load ${this.url}`, err)
        )
      return
    }
    if (isOff(this.geometry)) return
    const mesh = this.createGeometry(scene)
    if (mesh != null) {
      mesh.parent = this.node ?? null
      this._disposables.push(mesh)
    }
  }

  /**
   * An UNLIT emissive material for the fixture.
   *
   * `disableLighting` matters more than it looks: a fixture shaded by the scene
   * is a grey lump precisely when its own light is off, which is when you most
   * need to see where the lamp is.
   */
  protected fixtureMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    const mat = new BABYLON.StandardMaterial('lamp-fixture', scene)
    mat.emissiveColor = BABYLON.Color3.FromHexString(this.diffuse)
    mat.diffuseColor = BABYLON.Color3.Black()
    mat.specularColor = BABYLON.Color3.Black()
    mat.disableLighting = true
    this._disposables.push(mat)
    // Tracked, so the emitter follows what the light is actually doing.
    this._fixtureMats.push(mat)
    return mat
  }

  /**
   * Paint the fixture to match the light — colour AND brightness.
   *
   * A flickering lamp with a steadily-glowing bulb is wrong in the way that is
   * hardest to unsee: the thing emitting the light is the one part of the
   * scene not participating in it. Tonio: _"the built-in geometry should mirror
   * the light's brightness etc."_
   *
   * The FLOOR is why this is not simply `colour × brightness`. At zero the
   * fixture is pure black and, being unlit, vanishes completely — and the
   * reason it is unlit in the first place was so you could still see where a
   * switched-off lamp IS. A few percent keeps it locatable in a dark room
   * while reading as off, and is physically defensible anyway: a real bulb
   * still catches the light around it.
   */
  protected paintFixture(color: BABYLON.Color3, brightness: number): void {
    const b = Math.max(FIXTURE_FLOOR, brightness)
    for (const mat of this._fixtureMats) {
      mat.emissiveColor.set(color.r * b, color.g * b, color.b * b)
    }
  }

  /**
   * Build or tear down the shadow generator to match `shadows`.
   *
   * Called from `render()` as well as at setup, because it was setup-only and
   * that made `shadows` an attribute you could write, that kept your value, and
   * that did nothing — the exact failure #43 describes for the aircraft's chase
   * fields. Toggling it in an editor did nothing at all.
   */
  private syncShadows(): void {
    const want = !isOff(this.shadows)
    if (want === (this._shadowOff != null)) return
    if (!want) {
      this._shadowOff?.()
      this._shadowOff = null
      this.shadowGenerator = undefined
      return
    }
    this.setupShadows()
  }

  private setupShadows(): void {
    if (isOff(this.shadows)) return
    const light = this.light
    if (!(light instanceof BABYLON.ShadowLight)) {
      warnOnce(
        `b3d-lamp: ${this.tagName.toLowerCase()} cannot cast shadows — Babylon's RectAreaLight is not a ShadowLight. Ignoring shadows="on".`
      )
      return
    }
    const size = resolveBudget(this.shadowTextureSize, 'shadowTextureSize', {
      xr: false,
    })
    const gen = new BABYLON.ShadowGenerator(size, light)
    gen.usePercentageCloserFiltering = true
    this.shadowGenerator = gen
    /*
    Casters arrive over time (loaders, spawners), so subscribe rather than
    snapshotting the scene once — the same contract b3d-shadows uses.

    AND MARK RECEIVERS. Adding casters alone renders a shadow map that nothing
    reads: the lamp pays for a whole extra render pass and shows nothing. That
    is how this first shipped, and it does not present as "a flag is missing" —
    it presents as lights shining straight through solid objects, which is what
    Tonio saw in the demo.

    Same conventions as B3dSun: `_nocast` opts out of casting, `_noshadow` out
    of receiving, and an InstancedMesh is skipped because it INHERITS the flag
    from its source — writing it there is a no-op Babylon warns about once per
    instance, which drowned a console in ~10,000 messages (#53).
    */
    const add = (additions: { meshes?: BABYLON.AbstractMesh[] }) => {
      for (const mesh of additions.meshes ?? []) {
        if (mesh.getTotalVertices() === 0) continue
        const name = conventionName(mesh.name)
        if (!name.includes('_nocast') && !name.includes('-nocast')) {
          gen.addShadowCaster(mesh as BABYLON.Mesh)
        }
        if (mesh instanceof BABYLON.InstancedMesh) continue
        if (!name.includes('_noshadow') && !name.includes('-noshadow')) {
          mesh.receiveShadows = true
        }
      }
    }
    this.owner?.addSceneListener(add)
    /*
    ONE releaser for the whole shadow setup, so turning it off undoes exactly
    what turning it on did. Held separately from `_disposables` because that is
    torn down once at dispose, and this can happen many times.
    */
    this._shadowOff = () => {
      this.owner?.removeSceneListener(add)
      gen.dispose()
    }
  }

  /** Per-frame: advance the clock and apply the sampled program. */
  private update(scene: BABYLON.Scene): void {
    const light = this.light
    if (light == null) return
    this._elapsed += this.tickSeconds(scene)

    const on = this.isOn
    if (on !== this._wasOn) {
      this._wasOn = on
      this._switchAt = this._elapsed
    }
    const sinceChange = this._elapsed - this._switchAt

    // No program: `render()` owns the light entirely, and a lamp that is simply
    // switched off is simply disabled.
    if (!isAnimated(this.program)) {
      light.setEnabled(on)
      this.paintFixture(this.baseColor, on ? 1 : 0)
      return
    }
    if (lightPhase(this.program, on, sinceChange) === 'off') {
      light.setEnabled(false)
      this.paintFixture(this.baseColor, 0)
      return
    }
    light.setEnabled(true)

    const s = sampleLight(this.program, on, sinceChange)
    light.intensity = this.baseIntensity * s.brightness
    if (s.hueShiftDeg !== 0 || s.saturation !== 1) {
      const c = shiftHue(this.baseColor, s.hueShiftDeg, s.saturation)
      light.diffuse.set(c.r, c.g, c.b)
    } else {
      light.diffuse.copyFrom(this.baseColor)
    }
    this.paintFixture(light.diffuse, s.brightness)
    const ranged = light as unknown as { range?: number }
    if (typeof ranged.range === 'number') {
      ranged.range = this.baseRange * s.range
    }
  }

  render(): void {
    super.render()
    if (this.light == null || this.node == null) return
    this.node.position.set(this.x, this.y, this.z)
    this.baseIntensity = this.intensity
    this.baseRange = this.range
    this.baseColor = BABYLON.Color3.FromHexString(this.diffuse)
    this.light.specular = BABYLON.Color3.FromHexString(this.specular)
    this.syncShadows()
    if (!isAnimated(this.program)) {
      this.paintFixture(this.baseColor, this.isOn ? 1 : 0)
    }
    // Only write through when nothing is animating; otherwise `update` owns
    // these and a render mid-flicker would fight it for a frame.
    if (!isAnimated(this.program)) {
      this.light.intensity = this.intensity
      this.light.diffuse = this.baseColor.clone()
      const ranged = this.light as unknown as { range?: number }
      if (typeof ranged.range === 'number') ranged.range = this.range
    }
    this.positionLight()
  }

  /** Keep the Babylon light on the node. Overridden where direction matters. */
  protected positionLight(): void {
    const l = this.light as unknown as { position?: BABYLON.Vector3 }
    if (l?.position != null) l.position.set(this.x, this.y, this.z)
  }

  sceneDispose(): void {
    if (this._tick != null) {
      this._tick.remove()
      this._tick = undefined
    }
    for (const d of this._disposables.splice(0)) {
      try {
        d.dispose()
      } catch {
        /* a half-built fixture can throw on the way down */
      }
    }
    // The shadow setup has its own releaser now — `_disposables` no longer
    // holds it, since it can be built and torn down many times over a lamp's
    // life whereas that list is drained exactly once.
    this._shadowOff?.()
    this._shadowOff = null
    this.shadowGenerator = undefined
    this.light?.dispose()
    this.light = undefined
    this.node?.dispose()
    this.node = undefined
    this.owner = null
  }

  /**
   * Seconds to advance the program by, on whichever clock this lamp uses.
   *
   * Clamped like every other delta here: a tab that was backgrounded for a
   * minute would otherwise hand the program a 60-second step and fast-forward
   * the whole thing on the frame you came back.
   */
  private tickSeconds(scene: BABYLON.Scene): number {
    /*
    `sceneDelta` and nothing else — deliberately no private channel for a
    scaled clock. Reading some other key would give the scene two answers to
    "what time is it", and lamps are not the right place to decide which wins.
    When tosijs-3d#41 lands, the scale arrives through this one delta and lamps
    obey it with no change here.
    */
    if (this.timeSource === 'sim') return sceneDeltaSeconds(scene)
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (this._lastRealMs === 0) {
      this._lastRealMs = now
      return 0
    }
    const dt = (now - this._lastRealMs) / 1000
    this._lastRealMs = now
    return Math.min(0.1, Math.max(0, dt))
  }
}

/**
 * Seconds since the last render, honouring a paused scene.
 *
 * Uses `sceneDelta`'s published value — `engine.getDeltaTime()` inside a scene
 * observer is the WHOLE frame and runs at 2x or 4x with several cameras, which
 * would make every lamp in a multi-camera scene flicker at the wrong rate.
 */
function sceneDeltaSeconds(scene: BABYLON.Scene): number {
  const published = (scene.metadata as any)?.b3dFrameDelta
  if (typeof published === 'number' && published >= 0) return published
  return Math.min(0.1, (scene.getEngine().getDeltaTime() || 16) / 1000)
}

// --- Point -----------------------------------------------------------------

export class B3dPointLight extends B3dLamp {
  static preferredTagName = 'tosi-b3d-point-light'

  protected createLight(scene: BABYLON.Scene): BABYLON.Light {
    const light = new BABYLON.PointLight(
      'point-light',
      new BABYLON.Vector3(this.x, this.y, this.z),
      scene
    )
    light.intensity = this.intensity
    light.range = this.range
    light.diffuse = BABYLON.Color3.FromHexString(this.diffuse)
    return light
  }

  protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh {
    const bulb = BABYLON.MeshBuilder.CreateSphere(
      'lamp-bulb',
      { diameter: 0.25 * this.geometryScale, segments: 12 },
      scene
    )
    bulb.material = this.fixtureMaterial(scene)
    // A bulb must not shadow its own light, or the lamp puts a black ball
    // exactly where the illumination comes from.
    bulb.receiveShadows = false
    return bulb
  }
}

export const b3dPointLight = B3dPointLight.elementCreator()

// --- Spot ------------------------------------------------------------------

export class B3dSpotLight extends B3dLamp {
  static preferredTagName = 'tosi-b3d-spot-light'

  static initAttributes = {
    ...B3dLamp.initAttributes,
    /** Cone angle in DEGREES — the authoring unit (see CLAUDE.md's Deg rule). */
    angle: 60,
    exponent: 2,
    /**
     * Inner cone angle in DEGREES — where the edge starts to fade.
     *
     * `0` (default) leaves the cone on Babylon's standard falloff, shaped by
     * `exponent`. Anything above `0` gives a true PENUMBRA: full brightness
     * inside `innerAngle`, fading to nothing at `angle`. Bring them together
     * for a hard-edged theatre spot; spread them for a soft pool.
     *
     * Setting it switches the light to the glTF falloff model, because that is
     * the only one Babylon reads `innerAngle` in — exposing the number without
     * the switch would be an attribute that accepts a write and does nothing,
     * which this component has already shipped once (see `shadows`).
     */
    innerAngle: 0,
    /**
     * Cone cross-section: `'circle'` (default), `'square'`, or `'none'`.
     *
     * Babylon's spot is ALWAYS a circular cone — there is no square spot — so
     * a shape is projected as a gel. `'none'` leaves the cone bare.
     *
     * ⚠️ It therefore uses the same slot as `gel`/`gelSvg`. An explicit gel
     * wins and the shape is ignored, because a gel is a picture the author
     * chose and a shape is a default we generated.
     */
    shape: 'circle',
    /**
     * Width / height of the shape. `1` is round or square; `2` is twice as
     * wide as it is tall, which is how you get an ellipse or a letterbox.
     */
    shapeAspect: 1,
    /**
     * How soft the shape's edge is, `0..1` as a fraction of its radius.
     *
     * A generated shape needs its own softness because it is a stencil: a hard
     * white square on black gives a hard edge no matter what `exponent` or
     * `innerAngle` say, so the cone's falloff and the gel's would disagree.
     */
    shapeSoftness: 0.25,
    /** Direction the cone points. Default is straight down. */
    dirX: 0,
    dirY: -1,
    dirZ: 0,
    /** Gel (projection texture) URL — bitmap or SVG file. */
    gel: '',
    /** Gel as inline SVG source. Also accepts an `SVGElement` set as a property. */
    gelSvg: '',
  }

  declare angle: number
  declare exponent: number
  declare innerAngle: number
  declare shape: string
  declare shapeAspect: number
  declare shapeSoftness: number
  declare dirX: number
  declare dirY: number
  declare dirZ: number
  declare gel: string
  declare gelSvg: string | SVGSVGElement

  private _gelTexture?: BABYLON.BaseTexture
  /** Source signature of the current gel — see `syncGel`. */
  private _gelKey = ''

  protected createLight(scene: BABYLON.Scene): BABYLON.Light {
    const light = new BABYLON.SpotLight(
      'spot-light',
      new BABYLON.Vector3(this.x, this.y, this.z),
      new BABYLON.Vector3(this.dirX, this.dirY, this.dirZ),
      (this.angle * Math.PI) / 180,
      this.exponent,
      scene
    )
    light.intensity = this.intensity
    light.range = this.range
    light.diffuse = BABYLON.Color3.FromHexString(this.diffuse)
    this._gelKey = this.gelKey()
    this.applyGel(light, scene)
    return light
  }

  /**
   * The gel — Babylon's `projectionTexture`, which only a SpotLight has.
   *
   * An SVG gel goes through `SvgTexture`, so the same vector source that draws a
   * panel can be a window, a leaf canopy or a venetian blind. Rasterized once
   * (`updateInterval: 0`) because a gel is a stencil, not a live surface.
   */
  /**
   * An SVG stencil for the cone's cross-section.
   *
   * White is lit, black is not — a projection texture multiplies the light, so
   * the shape is literally a mask. The soft edge is a Gaussian blur rather than
   * a gradient so the SAME code feathers a square and a circle; a gradient
   * would need a different construction per shape and they would not match.
   *
   * Drawn oversized and blurred INWARD from a margin, because a blur at the
   * viewBox edge clips and leaves a hard line exactly where the softness was
   * supposed to be.
   */
  private shapeGelSvg(): string | null {
    const kind = this.shape
    if (kind !== 'circle' && kind !== 'square') return null
    const S = 128
    const margin = 12
    const soft = Math.max(0, Math.min(1, this.shapeSoftness))
    const blur = (soft * (S / 2 - margin)) / 2
    const aspect = Math.max(0.05, this.shapeAspect || 1)
    // Fit the shape inside the margin, squashed by the aspect on whichever
    // axis needs it, so a wide ellipse never leaves the box.
    const rx = (S / 2 - margin) * Math.min(1, aspect)
    const ry = (S / 2 - margin) / Math.max(1, aspect)
    const body =
      kind === 'circle'
        ? `<ellipse cx="${S / 2}" cy="${
            S / 2
          }" rx="${rx}" ry="${ry}" fill="white"/>`
        : `<rect x="${S / 2 - rx}" y="${S / 2 - ry}" width="${
            rx * 2
          }" height="${ry * 2}" fill="white"/>`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs><filter id="s" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="${blur.toFixed(2)}"/>
      </filter></defs>
      <rect width="${S}" height="${S}" fill="black"/>
      <g filter="url(#s)">${body}</g>
    </svg>`
  }

  /**
   * Rebuild the gel only when its SOURCE changed.
   *
   * Called every render, because `shape` / `shapeAspect` / `gel` / `gelSvg` all
   * look like editable attributes and would otherwise be set-once — the exact
   * "accepts a write, keeps the value, does nothing" failure this component
   * already shipped with `shadows`. Keyed on the source string, so a repaint
   * costs a string comparison rather than a texture.
   */
  private syncGel(scene: BABYLON.Scene): void {
    const light = this.light as BABYLON.SpotLight | undefined
    if (light == null) return
    const key = this.gelKey()
    if (key === this._gelKey) return
    this._gelKey = key
    this._gelTexture?.dispose()
    this._gelTexture = undefined
    light.projectionTexture = null
    this.applyGel(light, scene)
  }

  private gelKey(): string {
    return [
      this.gelSvg || '',
      this.gel,
      this.shape,
      this.shapeAspect,
      this.shapeSoftness,
    ].join('|')
  }

  private applyGel(light: BABYLON.SpotLight, scene: BABYLON.Scene): void {
    // An explicit gel WINS: it is a picture the author chose, where a shape is
    // a default we generated.
    const svg = this.gelSvg || (this.gel ? '' : this.shapeGelSvg() ?? '')
    if (svg) {
      const element = (typeof svg === 'string'
        ? new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
        : svg) as unknown as SVGSVGElement
      const tex = new SvgTexture({ scene, element, updateInterval: 0 })
      this._gelTexture = tex.texture
      light.projectionTexture = tex.texture
      return
    }
    if (this.gel) {
      const tex = new BABYLON.Texture(this.gel, scene)
      this._gelTexture = tex
      light.projectionTexture = tex
    }
  }

  protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh {
    const s = this.geometryScale
    const housing = BABYLON.MeshBuilder.CreateCylinder(
      'lamp-housing',
      {
        diameterTop: 0.34 * s,
        diameterBottom: 0.16 * s,
        height: 0.3 * s,
        tessellation: 16,
      },
      scene
    )
    housing.material = this.fixtureMaterial(scene)
    housing.receiveShadows = false
    // The cylinder's axis is +Y; aim it along the cone so the housing points
    // where the light goes rather than always hanging straight down.
    const dir = new BABYLON.Vector3(this.dirX, this.dirY, this.dirZ)
    if (dir.lengthSquared() > 0) {
      dir.normalize()
      const axis = BABYLON.Vector3.Cross(BABYLON.Axis.Y, dir)
      const angle = Math.acos(
        Math.min(1, Math.max(-1, BABYLON.Vector3.Dot(BABYLON.Axis.Y, dir)))
      )
      housing.rotationQuaternion =
        axis.lengthSquared() < 1e-8
          ? BABYLON.Quaternion.FromEulerAngles(dir.y < 0 ? Math.PI : 0, 0, 0)
          : BABYLON.Quaternion.RotationAxis(axis.normalize(), angle)
    }
    return housing
  }

  protected positionLight(): void {
    const light = this.light as BABYLON.SpotLight | undefined
    if (light == null) return
    light.position.set(this.x, this.y, this.z)
    light.direction.set(this.dirX, this.dirY, this.dirZ)
    if (this.owner?.scene != null) this.syncGel(this.owner.scene)
    light.angle = (this.angle * Math.PI) / 180
    light.exponent = this.exponent
    /*
    `innerAngle` is only read in the glTF falloff model, so setting it without
    switching would be a number that does nothing. Switching only when it is
    used keeps the default cone on Babylon's standard falloff, which is what
    every existing lamp was tuned against.
    */
    if (this.innerAngle > 0) {
      light.falloffType = BABYLON.Light.FALLOFF_GLTF
      // Clamped below the outer angle: equal or greater is a division by zero
      // in the penumbra term and the cone renders black.
      light.innerAngle = Math.min(
        (this.innerAngle * Math.PI) / 180,
        light.angle * 0.999
      )
    } else if (light.falloffType === BABYLON.Light.FALLOFF_GLTF) {
      light.falloffType = BABYLON.Light.FALLOFF_DEFAULT
    }
  }

  sceneDispose(): void {
    this._gelTexture?.dispose()
    this._gelTexture = undefined
    super.sceneDispose()
  }
}

export const b3dSpotLight = B3dSpotLight.elementCreator()

// --- Area ------------------------------------------------------------------

export class B3dAreaLight extends B3dLamp {
  static preferredTagName = 'tosi-b3d-area-light'

  static initAttributes = {
    ...B3dLamp.initAttributes,
    width: 2,
    height: 1,
  }

  declare width: number
  declare height: number

  protected createLight(scene: BABYLON.Scene): BABYLON.Light {
    const light = new BABYLON.RectAreaLight(
      'area-light',
      new BABYLON.Vector3(this.x, this.y, this.z),
      this.width,
      this.height,
      scene
    )
    light.intensity = this.intensity
    light.diffuse = BABYLON.Color3.FromHexString(this.diffuse)
    return light
  }

  protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh {
    // The emitter IS the shape here, so the fixture is the light's own
    // rectangle rather than a stand-in for it.
    const panel = BABYLON.MeshBuilder.CreatePlane(
      'lamp-panel',
      {
        width: this.width,
        height: this.height,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      scene
    )
    panel.material = this.fixtureMaterial(scene)
    panel.receiveShadows = false
    return panel
  }
}

export const b3dAreaLight = B3dAreaLight.elementCreator()
