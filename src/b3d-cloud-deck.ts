/*#
# b3d-cloud-deck

**A cloud LAYER, as a layer.** One lit surface overhead with dark undersides and
bright fringes, driven by a field you can dial from clear to overcast and slide
up and down without rebuilding anything.

This is a second primitive, not a replacement for [b3d-clouds](?b3d-clouds.ts).
Discrete blobs are right for cloud you fly BETWEEN — a canyon of thunderheads,
`insideCloud` as a tactic. They are wrong for a DECK, which is what you see from
below on an ordinary day and from above on an ordinary flight. Tonio, on seeing
one from both sides in a rocket: *"What we have is not worthy of everything else
we've got. It looks like a child's cartoon next to everything else."*

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dCloudDeck, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { sky } = tosi({
  sky: { coverage: 0.5, cirrus: 0, transmission: 0.5, altitude: 140, timeOfDay: 10 },
})

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      sceneCreated(el, BABYLON) {
        // OUR OWN CAMERA, because `sceneCreated` runs BEFORE the default one is
        // built -- that is what the hook is for. The default frames the origin
        // at radius 8, and for a 4 km deck at 140 m you would never see it at
        // all, let alone from below. This sits the eye at about 60 m: under the
        // deck, above the ground, looking up at the undersides.
        const cam = new BABYLON.ArcRotateCamera(
          'deck-camera',
          -1.0,
          1.66,
          900,
          new BABYLON.Vector3(0, 140, 0),
          el.scene
        )
        cam.maxZ = 12000
        cam.lowerBetaLimit = 0.05
        cam.upperBetaLimit = 1.9
        cam.lowerRadiusLimit = 80
        cam.upperRadiusLimit = 6000
        cam.wheelPrecision = 0.2
        cam.attachControl(el.parts.canvas, true)
        el.scene.activeCamera = cam
      },
      scenePanel: () => [
        label3d({ text: 'Weather' }),
        slider3d({ label: 'coverage', value: sky.coverage, min: 0, max: 1, step: 0.02 }),
        slider3d({ label: 'cirrus', value: sky.cirrus, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'transmission', value: sky.transmission, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'altitude', value: sky.altitude, min: 20, max: 600, step: 10 }),
        slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
      ],
    },
    b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0 }),
    b3dSun({ x: -0.4, y: -1, z: -0.3 }),
    b3dGround({ size: 3000, color: '#3f4a3c' }),
    b3dCloudDeck({
      coverage: sky.coverage,
      cirrus: sky.cirrus,
      transmission: sky.transmission,
      altitude: sky.altitude,
    })
  )
)
```
```css
.preview { height: 100%; }
```

> Drag `coverage` from 0 to 1 — clear to overcast is one dial on a threshold,
> not a count of spawned objects, so it has no pool to exhaust at the top.
> `cirrus` takes the same sky from heaped cumulus to long wispy streaks, and
> `transmission` decides how much daylight comes through from above: at 0 the
> underside is storm-dark, at 1 it glows.
>
> **Drag `altitude` down past 60.** The deck sweeps through the camera and you
> get the whiteout — the same fog layer a plane flying through it would see,
> and the reason a pass-through needs no special case.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `altitude` | `140` | Height of the deck. Moving it is ONE number |
| `size` | `4000` | World extent of the deck |
| `subdivisions` | `48` | Grid resolution — see "A grid, not a quad" |
| `coverage` | `0.5` | Clear `0` → overcast `1`. LIVE, and shared with the shadow |
| `cirrus` | `0` | Rounded heaps `0` → long wispy streaks `1`. Rebakes the field |
| `cirrusHeadingDeg` | `0` | Which way the streaks run |
| `transmission` | `-1` | How much light comes THROUGH: `0` storm-dark underside, `1` glowing. `-1` = auto from `coverage` |
| `thickness` | `320` | Vertical extent of the whiteout. Deep on purpose — see "You must never see it edge-on" |
| `haze` | `0.9` | How much the air under the deck takes the cloud's colour. Hides the rim |
| `seed` | `1337` | Same seed, same weather |
| `frequency` | `3` | Field repeats across its own width. Higher = smaller puffs |
| `octaves` | `6` | Detail octaves. Billow needs more than fBm — folding eats fine structure |
| `fieldSize` | `512` | Texels per edge of the baked density field. More texels = finer cloud, 1 byte each |
| `tiles` | `6` | How many times the field repeats across `size` |
| `color` | `'#ffffff'` | Lit top colour |
| `underColor` | `'#3a4350'` | Shadowed underside |
| `fringe` | `0.9` | Brightness of the lit edges seen from below. ADDED to `underColor`, so it can exceed 1 |
| `bump` | `34` | Faux-bump strength. Higher = more pronounced relief |
| `shade` | `0.22` | How much of the top's brightness the lighting may take. Small on purpose — cloud is near-white, and a wide swing reads as water |

## A grid, not a quad

The obvious build is one huge quad, and it is the wrong one. Tonio: *"If we use
a bunch of quads we can use the vertex channels to drive localized weather
effects later."*

That is the argument. A subdivided grid costs nothing at these resolutions and
buys a **per-vertex channel** — somewhere to say *it is raining HERE, this part
is a thunderhead, there is a hole over the airfield* — which a single quad has
nowhere to put. The vertex colours are written white and unused today, and that
is deliberate: the channel exists so localized weather is a later edit to a
shader rather than a change of primitive.

And the case that makes it more than a convenience — Tonio: *"Or have clouds
that cluster near mountains say."* That is orographic cloud, it is real, and it
is the thing a noise field fundamentally cannot produce: noise knows nothing
about the ground under it. But the deck is a grid whose vertices have world
positions, so each one can ASK the terrain how high it is there and write the
answer into its own channel. Cloud then gathers over ridges and thins over
valleys because of the landscape rather than because someone painted it — the
same "systemic, not textural" move the rest of this project keeps making.

It generalises past mountains, too: anything samplable at a vertex can drive it.
Cloud that builds over warm ground and breaks over cold water is the same edit
with a different sampler.

It also means the deck can eventually SAG and billow by displacement, which a
quad cannot do at all.

## ⚠️ First pass — the structure is right, the LOOK is not tuned

Honest state, so nobody mistakes "it renders" for "it is finished". Three things
are visibly off and all three are art direction rather than architecture:

1. **The repeat is visible.** `tiles: 6` across `size: 4000` puts a 667 m period
   in plain sight. Fewer, larger tiles, or a second field at another scale to
   break the rhythm.
2. **`coverage` still wants its own curve.** Percentile normalisation fixed the
   worst of it — the threshold now sits at the same place in the distribution
   whatever kind of cloud this is, so the dial behaves the same for cumulus and
   cirrus and across seeds. What is left is taste: the *feel* of the travel from
   clear to overcast, which is a curve on the dial, not a rebuild.
3. **No REFRACTION, and that is deliberate** — Tonio flagged it and the material
   already satisfies it: this is plain alpha blending with no refraction
   texture, no screen-space sampling and no index-of-refraction term. Cloud
   scatters, it does not bend what is behind it, and anything that distorts the
   sky through a thin edge would read as glass.

None of these need a different primitive, which is the part worth knowing: the
deck, the two faces, the live dials and the vertex channel are all doing their
jobs.

## One field, three readers

The density comes from [cloud-field](?cloud-field.ts) — baked once, tileable,
sampled by world XZ. The deck reads it, the whiteout reads it, and the ground
shadow is meant to, so all three agree by construction rather than by being kept
in step. `coverage` stays a live uniform for the same reason: weather is one
dial and nothing regenerates when it moves.

**Two of the three are wired.** The deck samples the field on the GPU and the
whiteout samples the same array on the CPU — deliberately the same array, not
a read-back and not a re-implementation, because a GPU read-back per frame would
cost real time to learn something we baked ourselves, and a second copy of the
noise is where "why is the shadow off the cloud" lives.

The shadow is the one still missing. `fieldTexture` is exposed for it:
[cloud-shadows](?cloud-shadows.ts) already has the receiver half — a material
plugin sampling a world-XZ texture, conforming to terrain — and today it is fed
by `b3d-clouds` painting blob positions into a moving window. Pointing it at
this field instead, with the same live `coverage` uniform, is what makes the
shade underfoot belong to the cloud overhead rather than merely resemble it.
*/
/*{ "parent": "environment", "order": 930 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import { cloudField, cloudOpacity } from './cloud-field.js'

const DECK_VERT = `
precision highp float;
attribute vec3 position;
attribute vec4 color;
uniform mat4 worldViewProjection;
uniform mat4 world;
varying vec3 vWorld;
varying vec4 vChannel;
void main(void) {
  vec4 wp = world * vec4(position, 1.0);
  vWorld = wp.xyz;
  // RESERVED: per-vertex weather. Unused today, carried so localized effects
  // are a shader edit rather than a different primitive.
  vChannel = color;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`

const DECK_FRAG = `
precision highp float;
varying vec3 vWorld;
varying vec4 vChannel;
uniform sampler2D cloudField;
uniform float coverage;
uniform float invTile;
uniform vec2 windAxis;
uniform vec3 topColor;
uniform vec3 underColor;
uniform vec3 sunDir;
uniform float fringe;
uniform float bump;
uniform float shade;
uniform float transmission;
uniform vec3 fogColorU;
// (mode, start, end, density) — Babylon's own vFogInfos, read from the scene.
uniform vec4 fogInfos;
uniform vec3 camPos;

/*
WIND HEADING IS A UV ROTATION, not something baked into the field.

Rotating inside the bake does not tile (the torus angle advances by 2*PI*cos
across the field, which only closes at right angles). Rotating the SAMPLE does:
the texture wraps, so a rotated read has no seam — the repeat lattice simply
sits at an angle to the world. Turning the wind therefore costs nothing and
rebakes nothing.
*/
float density(vec2 p) {
  vec2 q = vec2(p.x * windAxis.x - p.y * windAxis.y, p.x * windAxis.y + p.y * windAxis.x);
  return texture2D(cloudField, q * invTile).r;
}

/*
THE SHARED THRESHOLD — must mirror \`cloudOpacity\` in cloud-field.ts.

Only the CURVE lives in two places; the field itself is one texture, so the
worst a drift here can do is soften an edge differently. That is the whole
reason the density is baked rather than re-implemented: a noise function in two
languages is where "why is the shadow off the cloud" bugs live.
*/
float opacityAt(float d) {
  if (coverage <= 0.0) return 0.0;
  if (coverage >= 1.0) return 1.0;
  float threshold = 1.0 - coverage;
  float softness = 0.18 * (1.0 - coverage) + 0.02;
  float t = clamp((d - threshold + softness) / (softness * 2.0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/*
OUR OWN FOG, because this is our own shader.

The deck cannot use mesh.applyFog (no backticks in here -- this is inside a
template literal, and one would end the shader mid-sentence): a ShaderMaterial
does not get Babylon's
fog plumbing at all. And skipping it is not cosmetic. An unfogged sheet inside a
whiteout is a DARKER BAND across a white screen: the one object in the frame
that did not receive the memo, and precisely the edge-on view the band exists to
hide. Fogging it costs four uniforms and makes the sheet dissolve into the same
white as everything else.

It pays a second time at distance: a deck fading into haze has no visible rim,
which is the other half of why a real overcast has no edge.
*/
float fogAmount(vec3 world) {
  float mode = fogInfos.x;
  if (mode < 0.5) return 1.0;
  float d = length(camPos - world);
  if (mode > 2.5) return clamp((fogInfos.z - d) / (fogInfos.z - fogInfos.y), 0.0, 1.0);
  float f = d * fogInfos.w;
  if (mode > 1.5) f = f * f;
  return clamp(exp(-f), 0.0, 1.0);
}

void main(void) {
  vec2 p = vWorld.xz;
  float d = density(p);
  float a = opacityAt(d) * vChannel.a;
  if (a <= 0.004) discard;

  /*
  A FAUX BUMP from the field's own gradient. The deck is flat geometry, so the
  relief has to come from the only thing that varies across it — and finite
  differences on the density give a normal for free, which is what makes a lit
  top read as billowing rather than as painted.
  */
  float e = 2.5;
  float dx = density(p + vec2(e, 0.0)) - density(p - vec2(e, 0.0));
  float dz = density(p + vec2(0.0, e)) - density(p - vec2(0.0, e));
  vec3 n = normalize(vec3(-dx * bump, 1.0, -dz * bump));

  if (gl_FrontFacing) {
    /*
    TOP: MOSTLY WHITE, bump-mapped. Not a lit surface with a wide tonal range.

    The first version swung 0.55→1.0 with the lambert term, which is what an
    OCEAN shader does — broad light and dark bands rolling across a smooth
    gradient — and it read as exactly that. Tonio: "The material should look
    mostly white but bump mapped from above… So it shouldn't look at all like
    water."

    Cloud is near-white almost everywhere; what tells you its shape is a narrow
    band of shading on top of that whiteness, not a swing between bright and
    dark. So the lambert term is a small perturbation of the colour rather than
    a multiplier of it — and topColor stays essentially what you SEE, which is
    also what makes it usable as a dial: set it sulfurous and you get a
    sulfurous sky, not a grey one with a yellow tint.

    (No backticks in here: this is inside a template literal, and one would end
    the shader mid-sentence.)
    */
    float lam = clamp(dot(n, normalize(-sunDir)), 0.0, 1.0);
    vec3 col = topColor * (1.0 - shade + shade * lam);
    gl_FragColor = vec4(mix(fogColorU, col, fogAmount(vWorld)), a);
  } else {
    /*
    UNDERSIDE: dark, with BRIGHT FRINGES.

    The two faces being genuinely different is most of why a deck reads as
    weather and a billboard does not — a billboard has one appearance. Thin
    cloud at the edges transmits, so the fringe rides the part of the ramp
    where opacity is still climbing, and the thick middle stays shadowed.
    */
    float thin = 1.0 - smoothstep(0.2, 0.75, a);
    /*
    TRANSMISSION is how much of the daylight on the far side gets through, and
    it moves the WHOLE underside, not just its edges. A thin fair-weather deck
    is bright grey underneath with luminous edges; a storm deck is nearly black
    with a rim. Both are this shader at two settings.

    It does two things because a single one is never enough: it lifts the base
    out of the dark (so the middle of a thin cloud is not a silhouette), and it
    scales the emissive fringe (so a dark deck keeps its rim but loses the
    glow). Tonio: "makes the layer less dark and more emissive from below."

    The lift is a mix toward topColor rather than a brightening, which is what
    keeps an alien sky alien — a sulfurous deck transmits sulfurous light.
    */
    vec3 base = mix(underColor, topColor, transmission * 0.6);
    // EMISSIVE edges, so they read as lit-from-behind rather than as pale
    // paint: the fringe is ADDED to the base, which is what lets it go brighter
    // than the material's own colour where the cloud is thinnest.
    float glow = fringe * (0.25 + 0.75 * transmission);
    vec3 col = base + topColor * glow * (thin * thin + 0.12 * transmission);
    gl_FragColor = vec4(mix(fogColorU, col, fogAmount(vWorld)), a);
  }
}
`

export class B3dCloudDeck extends B3dChild {
  static initAttributes = {
    altitude: 140,
    size: 4000,
    subdivisions: 48,
    coverage: 0.5,
    seed: 1337,
    frequency: 3,
    /** Rounded heaps `0` → long wispy streaks `1`. Rebakes the field. */
    cirrus: 0,
    /** Which way the cirrus streaks run. */
    cirrusHeadingDeg: 0,
    /**
     * How much daylight comes THROUGH from above: `0` storm-dark underside,
     * `1` glowing. `-1` derives it from `coverage`, which is the honest default
     * — a thin sky transmits and an overcast one does not.
     */
    transmission: -1,
    /**
     * Vertical extent of the whiteout. The geometry stays a surface; this is
     * how far either side of it counts as being inside the cloud.
     *
     * BIG on purpose — see "You must never see it edge-on".
     */
    thickness: 320,
    /**
     * Haze under the deck, `0…1`: how much the air below an overcast is the
     * cloud's own colour. What it buys is the deck's RIM — a 4 km plane has an
     * edge, and fog is what a real sky uses to hide it.
     */
    haze: 0.9,
    /** Octaves of detail in the baked field. Billow needs more than fBm. */
    octaves: 6,
    fieldSize: 512,
    tiles: 6,
    color: '#ffffff',
    underColor: '#3a4350',
    /** Brightness of the lit edges seen from below — ADDED, so it can exceed 1. */
    fringe: 0.9,
    /** Strength of the faux bump normal. Higher = more pronounced relief. */
    bump: 34,
    /** How much of the top's brightness the lighting may take. SMALL on purpose. */
    shade: 0.22,
  }

  declare altitude: number
  declare size: number
  declare subdivisions: number
  declare coverage: number
  declare seed: number
  declare frequency: number
  declare cirrus: number
  declare cirrusHeadingDeg: number
  declare transmission: number
  declare thickness: number
  declare haze: number
  declare octaves: number
  declare fieldSize: number
  declare tiles: number
  declare color: string
  declare underColor: string
  declare fringe: number
  declare bump: number
  declare shade: number

  mesh?: BABYLON.Mesh
  /** The baked density field — the thing a shadow decal should also sample. */
  fieldTexture?: BABYLON.RawTexture
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  /*
  THE SAME ARRAY THE SHADER READS, kept on the CPU so the whiteout asks the
  field whether there is cloud where the camera actually is. Sampling the
  texture back would cost a GPU readback per frame to learn something we baked
  ourselves — and, worse, the two could disagree.
  */
  private _field: Float32Array | null = null
  private _fieldSize = 0
  private _bakeKey = ''
  private _immersion = 0
  private _removeFogLayer: (() => void) | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any

    this._bakeField(scene)

    const mesh = BABYLON.MeshBuilder.CreateGround(
      'cloud-deck_nocast',
      {
        width: attrs.size,
        height: attrs.size,
        subdivisions: Math.max(1, Math.floor(attrs.subdivisions)),
      },
      scene
    )
    mesh.position.y = attrs.altitude
    mesh.isPickable = false
    mesh.applyFog = false
    /*
    THE PER-VERTEX WEATHER CHANNEL, initialised to "ordinary cloud everywhere".
    Nothing reads it beyond the alpha yet — it is here so that localized rain,
    a thunderhead, or a hole over the airfield is a shader edit later rather
    than a different primitive.
    */
    const count = mesh.getTotalVertices()
    const colors = new Float32Array(count * 4)
    colors.fill(1)
    mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true)

    const mat = new BABYLON.ShaderMaterial(
      'cloud-deck',
      scene,
      { vertexSource: DECK_VERT, fragmentSource: DECK_FRAG },
      {
        attributes: ['position', 'color'],
        uniforms: [
          'world',
          'worldViewProjection',
          'coverage',
          'invTile',
          'windAxis',
          'topColor',
          'underColor',
          'sunDir',
          'fringe',
          'bump',
          'shade',
          'transmission',
          'fogColorU',
          'fogInfos',
          'camPos',
        ],
        samplers: ['cloudField'],
        needAlphaBlending: true,
      }
    )
    // Seen from both sides — that is the entire point of a deck.
    mat.backFaceCulling = false
    mesh.material = mat
    this.mesh = mesh

    /*
    THE WHITEOUT IS A FOG LAYER, exactly as it is for b3d-clouds — the scene
    composites and smooths every layer together (see atmosphere.ts), so passing
    through a deck cannot fight the sea, the base fog or space, and nothing ever
    switches fogMode. That is also why a zero-thickness surface can be flown
    THROUGH at all: the pass-through is optical, not geometric.
    */
    this._removeFogLayer = owner.addFogLayer(() => {
      const st = this._fogAt(scene.activeCamera?.globalPosition)
      return st.weight <= 0 ? null : st
    })

    this._obs = scene.onBeforeRenderObservable.add(() => this._sync())
    this._sync()
    owner.register({ meshes: [mesh] })
  }

  /** Push the live dials at the shader. Cheap enough to do every frame. */
  private _sync(): void {
    const attrs = this as any
    const mat = this.mesh?.material as BABYLON.ShaderMaterial | undefined
    if (mat == null || this.mesh == null) return
    // Cheap enough to compare every frame; the bake only runs when it differs.
    if (this._currentBakeKey() !== this._bakeKey && this.owner?.scene != null) {
      this._bakeField(this.owner.scene)
    }
    this.mesh.position.y = attrs.altitude
    mat.setFloat('coverage', attrs.coverage)
    // World XZ → field UV. `tiles` repeats of the field across the deck.
    mat.setFloat('invTile', (attrs.tiles || 1) / (attrs.size || 1))
    const h = (attrs.cirrusHeadingDeg * Math.PI) / 180
    mat.setVector2('windAxis', new BABYLON.Vector2(Math.cos(h), Math.sin(h)))
    mat.setColor3('topColor', BABYLON.Color3.FromHexString(attrs.color))
    mat.setColor3('underColor', BABYLON.Color3.FromHexString(attrs.underColor))
    mat.setFloat('fringe', attrs.fringe)
    mat.setFloat('bump', attrs.bump)
    mat.setFloat('shade', attrs.shade)
    mat.setFloat('transmission', this.resolvedTransmission)
    const scene = this.owner?.scene
    if (scene != null) {
      mat.setColor3('fogColorU', scene.fogColor)
      mat.setVector4(
        'fogInfos',
        new BABYLON.Vector4(
          scene.fogMode,
          scene.fogStart,
          scene.fogEnd,
          scene.fogDensity
        )
      )
      const cam = scene.activeCamera
      if (cam != null) mat.setVector3('camPos', cam.globalPosition)
    }
    this._immersion = this._immersionAt(
      this.owner?.scene?.activeCamera?.globalPosition
    )
    const sun = this.owner?.scene?.lights?.find(
      (l) => (l as BABYLON.DirectionalLight).direction != null
    ) as BABYLON.DirectionalLight | undefined
    mat.setVector3(
      'sunDir',
      sun?.direction ?? new BABYLON.Vector3(-0.4, -1, -0.3)
    )
  }

  /**
   * Bake (or re-bake) the density field.
   *
   * SEPARATE FROM SETUP, because the bake inputs are attributes and an
   * attribute that silently does nothing is worse than one that does not exist.
   * `cirrus` is the case that made this obvious: the slider moved, the element
   * accepted the value, and the sky did not change — because the field had been
   * baked once in `sceneReady` and nothing ever asked for another.
   *
   * Only the BAKE inputs live here. `coverage` and the colours are uniforms and
   * must stay that way: weather is a live dial, and nothing should regenerate
   * when it moves.
   */
  private _bakeField(scene: BABYLON.Scene): void {
    const attrs = this as any
    const size = Math.max(8, Math.floor(attrs.fieldSize))
    const field = cloudField({
      size,
      seed: attrs.seed,
      frequency: attrs.frequency,
      octaves: attrs.octaves,
      cirrus: attrs.cirrus,
    })
    this._field = field
    this._fieldSize = size
    this._bakeKey = this._currentBakeKey()
    /*
    ONE CHANNEL, eight bits. The field is a smooth mask and the threshold that
    reads it ramps over a band far wider than a quantisation step, so floating
    point here would cost four times the memory to move nothing on screen.
    */
    const bytes = new Uint8Array(field.length)
    for (let i = 0; i < field.length; i++) bytes[i] = Math.round(field[i] * 255)
    const tex = new BABYLON.RawTexture(
      bytes,
      size,
      size,
      BABYLON.Constants.TEXTUREFORMAT_R,
      scene,
      false,
      false,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE
    )
    // It tiles by construction — say so, or the edges clamp into streaks.
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
    this.fieldTexture?.dispose()
    this.fieldTexture = tex
    const mat = this.mesh?.material as BABYLON.ShaderMaterial | undefined
    mat?.setTexture('cloudField', tex)
  }

  /** The bake inputs, as one comparable value. */
  private _currentBakeKey(): string {
    const a = this as any
    return [a.fieldSize, a.seed, a.frequency, a.octaves, a.cirrus].join('|')
  }

  /**
   * `transmission`, with `-1` resolved against `coverage`.
   *
   * Tonio asked for it "loosely tied to coverage" — loosely being the whole
   * point. A thin sky genuinely does transmit and an overcast one genuinely
   * does not, so the default should not have to be set to be right; but the
   * tie is a default rather than a law, because a bright thin overcast and a
   * black scattered squall are both real skies and neither is derivable from
   * how MUCH cloud there is.
   */
  get resolvedTransmission(): number {
    const t = this.transmission
    if (t >= 0) return Math.min(1, t)
    const cov = Math.min(1, Math.max(0, this.coverage))
    /*
    CIRRUS LIFTS IT, because wispy cloud is THIN cloud. You can see the sun
    through cirrus and you cannot see it through a cumulus deck, so a sky dialled
    toward wisps that stayed storm-dark underneath would be contradicting its own
    shape. One dial moving two things that always move together.
    */
    const wisp = Math.min(1, Math.max(0, this.cirrus)) * 0.35
    return Math.min(1, 0.15 + 0.75 * (1 - cov) + wisp)
  }

  /** Density at a world XZ, sampled from the same array the shader reads. */
  private _densityAt(x: number, z: number): number {
    const f = this._field
    const n = this._fieldSize
    if (f == null || n === 0) return 0
    const invTile = (this.tiles || 1) / (this.size || 1)
    const wrap = (v: number) => {
      const m = v % n
      return m < 0 ? m + n : m
    }
    // Nearest texel is enough: this feeds a smoothed fog weight, not a pixel.
    const ix = Math.floor(wrap(x * invTile * n))
    const iz = Math.floor(wrap(z * invTile * n))
    return f[iz * n + ix]
  }

  /**
   * How far inside the cloud a point is, `0…1`.
   *
   * TWO tests, and the second is the one that makes it weather rather than a
   * ceiling: being at the right ALTITUDE is not being in cloud — there has to
   * be cloud overhead at that XZ. Scattered cumulus is mostly gaps, so flying
   * along the deck should flicker between white and clear, which is exactly
   * what an aircraft in broken cloud does.
   *
   * ## You must never see it edge-on
   *
   * The deck is one flat surface, and a flat surface viewed along its own plane
   * is a LINE — the one angle at which the whole illusion is visibly a sheet.
   * Tonio: "we should give the cloud layer enough depth you never get close to
   * seeing it edge-on."
   *
   * The fix is not geometry, it is the BAND. The whiteout saturates well before
   * the plane (inside `CORE` of the half-thickness) and stays saturated well
   * past it, so by the time your eye is level with the sheet there has been
   * nothing but white for a long while. You enter cloud, you are in cloud, you
   * leave cloud — and the moment that would have given the trick away happens
   * where you cannot see anything at all.
   *
   * That is why `thickness` defaults big. It costs nothing: no geometry has
   * depth here, only the ramp does.
   */
  private _immersionAt(p?: BABYLON.Vector3 | null): number {
    if (p == null || this._field == null) return 0
    const half = Math.max(1, this.thickness * 0.5)
    const d = Math.abs(p.y - this.altitude) / half
    // Saturate inside the core, ramp to nothing at the band edge.
    const CORE = 0.45
    const t = Math.min(1, Math.max(0, (1 - d) / (1 - CORE)))
    if (t <= 0) return 0
    const opacity = cloudOpacity(this._densityAt(p.x, p.z), this.coverage)
    // Smoothstep so entry has no crease; opacity already ramps smoothly.
    return t * t * (3 - 2 * t) * opacity
  }

  /**
   * The deck's whole contribution to the air, at a point.
   *
   * ONE LAYER DOES BOTH JOBS, because they are the same weather seen from two
   * distances. Tonio: *"it should probably set the fog to at minimum hide the
   * end of the cloud layer and at maximum white out the screen."*
   *
   * - **Minimum** — you are under an overcast. The air is the cloud's colour
   *   and `end` comes in to about half the deck, which is what hides the fact
   *   that a 4 km plane has a rim. Real skies do this; it is why you cannot see
   *   the edge of an overcast.
   * - **Maximum** — you are inside it. `end` is arm's length and the screen is
   *   white.
   *
   * `weight` and `veil` diverge here and that is the point: haze owns the air
   * completely while hiding none of the sky (you can still see straight up),
   * and only real immersion stands in front of the sky. One number could not
   * say both.
   */
  private _fogAt(p?: BABYLON.Vector3 | null): {
    weight: number
    veil: number
    color: { r: number; g: number; b: number }
    density: number
    start: number
    end: number
  } {
    const immersion = this._immersionAt(p)
    this._immersion = immersion

    const half = Math.max(1, this.thickness * 0.5)
    const dy = p == null ? 0 : p.y - this.altitude
    /*
    HAZE ONLY BELOW, and only while the deck is overhead rather than a distant
    ceiling. Above it the air is clear — that is the whole reward for climbing
    out — so this is deliberately one-sided.
    */
    const below = Math.max(0, -dy - half)
    const reach = Math.max(1, this.size * 0.3)
    const near = 1 - Math.min(1, below / reach)
    /*
    SQUARED in coverage, because haze is not proportional to how much sky is
    covered — it is what happens when the sky is SHUT. Scattered fair-weather
    cloud puts almost nothing in the air below it and a linear term greys the
    whole world at half coverage, which is the look of a bad overcast preset
    rather than of an ordinary afternoon.
    */
    const cov = Math.min(1, Math.max(0, this.coverage))
    const haze = Math.min(1, Math.max(0, this.haze)) * near * cov * cov
    const weight = Math.max(haze, immersion)

    /*
    THE COLOUR RUNS THE HEIGHT OF THE BAND — darkest underside at the bottom,
    brightest top at the top. Tonio: "the fog color should be set to the darkest
    value of the cloud underside at or below the white-out threshold and
    transition to the brightest value of the top of the layer at the top."

    So the two ends are the two things the shader actually paints: the underside
    base (no fringe — the fringe is an edge effect and there are no edges when
    you are inside) and the lit top. Climbing through therefore brightens
    continuously, which is what flying out of the top of a cloud looks like, and
    it costs no extra dial because both ends are already the material's.
    */
    const top = BABYLON.Color3.FromHexString(this.color)
    const under = BABYLON.Color3.FromHexString(this.underColor)
    const darkest = BABYLON.Color3.Lerp(
      under,
      top,
      Math.min(1, this.resolvedTransmission * 0.6)
    )
    const bandPos = Math.min(1, Math.max(0, (dy + half) / (half * 2)))
    const c = BABYLON.Color3.Lerp(darkest, top, bandPos)

    return {
      weight,
      // Only IMMERSION hides the sky. Haze under a deck leaves it plainly
      // visible straight up, which is exactly what an overcast looks like.
      veil: immersion,
      color: { r: c.r, g: c.g, b: c.b },
      density: 1.0,
      start: 0,
      /*
      The scene's fog is usually LINEAR, where `end` decides opacity and
      `density` is ignored. At minimum this reaches about half the deck, which
      is what puts its rim out of sight; at maximum it is arm's length, because
      a distant `end` is never opaque close up and that was the old "the
      whiteout never reaches full white" bug.
      */
      end: 12 + (1 - immersion) * this.size * 0.45,
    }
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null && this._obs != null) {
      scene.onBeforeRenderObservable.remove(this._obs)
    }
    this._obs = null
    this._removeFogLayer?.()
    this._removeFogLayer = null
    this._field = null
    this.fieldTexture?.dispose()
    this.fieldTexture = undefined
    this.mesh?.dispose()
    this.mesh = undefined
    super.sceneDispose()
  }
}

export const b3dCloudDeck = B3dCloudDeck.elementCreator({
  tag: 'tosi-b3d-cloud-deck',
})
