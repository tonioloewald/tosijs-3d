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

const { sky } = tosi({ sky: { coverage: 0.5, altitude: 140, timeOfDay: 10 } })

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      scenePanel: () => [
        label3d({ text: 'Weather' }),
        slider3d({ label: 'coverage', value: sky.coverage, min: 0, max: 1, step: 0.02 }),
        slider3d({ label: 'altitude', value: sky.altitude, min: 20, max: 600, step: 10 }),
        slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
      ],
    },
    b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0 }),
    b3dSun({ x: -0.4, y: -1, z: -0.3 }),
    b3dGround({ size: 3000, color: '#3f4a3c' }),
    b3dCloudDeck({ coverage: sky.coverage, altitude: sky.altitude })
  )
)
```
```css
.preview { height: 100%; }
```

> Drag `coverage` from 0 to 1 — clear to overcast is one dial on a threshold,
> not a count of spawned objects, so it has no pool to exhaust at the top. Move
> `altitude` and the whole deck slides; orbit under it to see the dark
> undersides and lit fringes that a billboard cannot do.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `altitude` | `140` | Height of the deck. Moving it is ONE number |
| `size` | `4000` | World extent of the deck |
| `subdivisions` | `48` | Grid resolution — see "A grid, not a quad" |
| `coverage` | `0.5` | Clear `0` → overcast `1`. LIVE, and shared with the shadow |
| `seed` | `1337` | Same seed, same weather |
| `frequency` | `3` | Field repeats across its own width. Higher = smaller puffs |
| `fieldSize` | `256` | Texels per edge of the baked density field |
| `tiles` | `6` | How many times the field repeats across `size` |
| `color` | `'#ffffff'` | Lit top colour |
| `underColor` | `'#3a4350'` | Shadowed underside |
| `fringe` | `1.2` | Brightness of the lit edges seen from below |

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

1. **Too continuous at mid coverage.** At `coverage` 0.5 it should be broken
   sky with real gaps; it reads closer to overcast. The threshold curve in
   `cloudOpacity` is probably crossing too much of the field — the fix is the
   curve, not the noise.
2. **It reads like WATER.** The faux bump produces smooth rolling relief rather
   than puffy cauliflower, because a single fBm gradient is exactly what an
   ocean shader uses. Cloud wants sharper, more clustered highs — a ridged or
   billow noise, or the gradient pushed through a harder curve.
3. **The repeat is visible.** `tiles: 6` across `size: 4000` puts a 667 m period
   in plain sight. Fewer, larger tiles or a second field at another scale to
   break the rhythm.

None of these need a different primitive, which is the part worth knowing: the
deck, the two faces, the live dials and the vertex channel are all doing their
jobs.

## One field, three readers

The density comes from [cloud-field](?cloud-field.ts) — baked once, tileable,
sampled by world XZ. The deck reads it, the ground shadow reads it, and the
whiteout reads it, so all three agree by construction rather than by being kept
in step. `coverage` stays a live uniform for the same reason: weather is one
dial and nothing regenerates when it moves.
*/
/*{ "parent": "environment", "order": 930 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import { cloudField } from './cloud-field.js'

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
uniform vec3 topColor;
uniform vec3 underColor;
uniform vec3 sunDir;
uniform float fringe;

float density(vec2 p) { return texture2D(cloudField, p * invTile).r; }

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
  float e = 6.0;
  float dx = density(p + vec2(e, 0.0)) - density(p - vec2(e, 0.0));
  float dz = density(p + vec2(0.0, e)) - density(p - vec2(0.0, e));
  vec3 n = normalize(vec3(-dx * 12.0, 1.0, -dz * 12.0));

  if (gl_FrontFacing) {
    // TOP: sunlit, with the bump doing the shaping.
    float lam = clamp(dot(n, normalize(-sunDir)), 0.0, 1.0);
    vec3 col = topColor * (0.55 + 0.45 * lam);
    gl_FragColor = vec4(col, a);
  } else {
    /*
    UNDERSIDE: dark, with BRIGHT FRINGES.

    The two faces being genuinely different is most of why a deck reads as
    weather and a billboard does not — a billboard has one appearance. Thin
    cloud at the edges transmits, so the fringe rides the part of the ramp
    where opacity is still climbing, and the thick middle stays shadowed.
    */
    float thin = 1.0 - smoothstep(0.25, 0.9, a);
    vec3 col = mix(underColor, topColor * fringe, thin * thin);
    gl_FragColor = vec4(col, a);
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
    fieldSize: 256,
    tiles: 6,
    color: '#ffffff',
    underColor: '#3a4350',
    fringe: 1.2,
  }

  declare altitude: number
  declare size: number
  declare subdivisions: number
  declare coverage: number
  declare seed: number
  declare frequency: number
  declare fieldSize: number
  declare tiles: number
  declare color: string
  declare underColor: string
  declare fringe: number

  mesh?: BABYLON.Mesh
  /** The baked density field — the thing a shadow decal should also sample. */
  fieldTexture?: BABYLON.RawTexture
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any

    const size = Math.max(8, Math.floor(attrs.fieldSize))
    const field = cloudField({
      size,
      seed: attrs.seed,
      frequency: attrs.frequency,
    })
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
    this.fieldTexture = tex

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
          'topColor',
          'underColor',
          'sunDir',
          'fringe',
        ],
        samplers: ['cloudField'],
        needAlphaBlending: true,
      }
    )
    // Seen from both sides — that is the entire point of a deck.
    mat.backFaceCulling = false
    mat.setTexture('cloudField', tex)
    mesh.material = mat
    this.mesh = mesh

    this._obs = scene.onBeforeRenderObservable.add(() => this._sync())
    this._sync()
    owner.register({ meshes: [mesh] })
  }

  /** Push the live dials at the shader. Cheap enough to do every frame. */
  private _sync(): void {
    const attrs = this as any
    const mat = this.mesh?.material as BABYLON.ShaderMaterial | undefined
    if (mat == null || this.mesh == null) return
    this.mesh.position.y = attrs.altitude
    mat.setFloat('coverage', attrs.coverage)
    // World XZ → field UV. `tiles` repeats of the field across the deck.
    mat.setFloat('invTile', (attrs.tiles || 1) / (attrs.size || 1))
    mat.setColor3('topColor', BABYLON.Color3.FromHexString(attrs.color))
    mat.setColor3('underColor', BABYLON.Color3.FromHexString(attrs.underColor))
    mat.setFloat('fringe', attrs.fringe)
    const sun = this.owner?.scene?.lights?.find(
      (l) => (l as BABYLON.DirectionalLight).direction != null
    ) as BABYLON.DirectionalLight | undefined
    mat.setVector3(
      'sunDir',
      sun?.direction ?? new BABYLON.Vector3(-0.4, -1, -0.3)
    )
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null && this._obs != null) {
      scene.onBeforeRenderObservable.remove(this._obs)
    }
    this._obs = null
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
