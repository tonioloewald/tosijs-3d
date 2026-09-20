/*#
# b3d-skybox

Procedural sky with sun/moon cycle driven by time of day. Automatically controls
a `b3dSun` sibling's direction, intensity, and color.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 17 } })

const scene = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Sky' }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0, latitude: 40 }),
  // A checkered ground (receives shadows) + a few casters — scrub the time of
  // day and watch the shadows swing long at dawn/dusk and short at noon.
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
  b3dBox({ meshName: 'pillar', size: 1.5, x: -3, y: 0.75, z: 1, color: '#c85a3a' }),
  b3dBox({ meshName: 'crate', size: 1, x: 2, y: 0.5, z: 3, color: '#5aa0c8' }),
  b3dSphere({ meshName: 'ball', diameter: 2, x: 3, y: 1, z: -2, color: '#c8a83a' }),
)
preview.append(scene)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `timeOfDay` | `6.5` | 0-24 hours |
| `realtimeScale` | `10` | Realtime speed multiplier |
| `latitude` | `40` | Geographic latitude in DEGREES (affects the sun's arc) |
| `azimuth` | `0` | Sun's compass bearing as Babylon's **0–1 fraction of a full turn**, not degrees — it goes straight to `SkyMaterial.azimuth`. The one angle here that isn't degrees, because it isn't ours |
| `luminance` | `1` | Sky brightness |
| `turbidity` | `10` | Atmospheric haze |
| `rayleigh` | `2` | Rayleigh scattering |
| `spaceStart` | `0` | Altitude (m) where the fade to space BEGINS |
| `spaceFull` | `0` | Altitude (m) of full vacuum. Feature is off unless this exceeds `spaceStart` |
| `starfieldCube` | `''` | Root path of a baked cube (`<root>_px.png` …). Replaces `starfield` |
| `starfieldTilt` | `'0,0,0'` | Degrees `rx,ry,rz` on the baked cube — where a galactic tilt belongs |
| `starfield` | `0` | How many background stars to build. `0` = none |
| `nebulae` | `0` | Soft emission clouds behind the stars. `0` = none |
| `nebulaBrightness` | `0.55` | Nebula brightness 0…1 |
| `nebulaSize` | `0.16` | Nebula size as a fraction of the sky radius |
| `nebulaTexture` | `''` | Black-backed image stamped per nebula; empty = a plain procedural falloff |
| `spaceColor` | `'#05070f'` | What is behind the stars in vacuum. Just north of black, so a black hole still has somewhere darker to go |
| `starfieldSeed` | `12345` | Seed for the starfield — same seed, same constellations |
| `starDistance` | `0` | Park a `<tosi-b3d-star>` child this far along the sun vector. `0` = leave it alone |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `applyFog` | `false` | Whether scene fog affects the skybox |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { PRNG } from './mersenne-twister.js'
import { SkyMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils.js'
import { band } from './atmosphere.js'
import type { B3d } from './tosi-b3d.js'
import type { B3dSun } from './b3d-shadows.js'

const DEG_TO_RAD = Math.PI / 180

function hexToColor3(hex: string): BABYLON.Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new BABYLON.Color3(r, g, b)
}

// Shared constants so updateSky (which runs per frame while the sky animates) can
// stay allocation-free — see the reused scratch on the component.
/**
 * The fallback when no `nebulaTexture` is given — a plain radial falloff.
 *
 * Deliberately modest: it is a DISC, symmetric and smooth, and it reads as a
 * lens flare rather than as gas. It exists so the attribute is optional, not
 * because it is any good. Point `nebulaTexture` at a real painted one.
 */
function proceduralNebula(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const tex = new BABYLON.DynamicTexture(
    'nebula-falloff',
    { width: 128, height: 128 },
    scene,
    false
  )
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  tex.update()
  return tex
}

const SKY_AXIS_X = new BABYLON.Vector3(1, 0, 0)
const SKY_AXIS_Z = new BABYLON.Vector3(0, 0, 1)
const SKY_BLUE = new BABYLON.Color3(0.55, 0.7, 0.9)
const HORIZON_WHITE = new BABYLON.Color3(0.95, 0.95, 0.97)
const NIGHT_HORIZON = new BABYLON.Color3(0.08, 0.1, 0.18)

export class B3dSkybox extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-skybox'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    turbidity: 10,
    /*
    LEAVING THE ATMOSPHERE — the altitudes over which the sky fades to space.
    Metres, and OFF unless `spaceFull > spaceStart`, so no existing scene wakes
    up with a black sky.

    There is no realistic default to pick, and pretending otherwise would be
    worse than declining: the Kármán line is 100 km, which no demo ever climbs,
    so a "correct" default would simply mean the feature never fires. The right
    numbers are dramatic ones chosen per scene — a rocket demo that tops out at
    3 km wants the whole fade inside 3 km.

    The pair mirrors `band(value, startAt, full)` in atmosphere.ts on purpose:
    these ARE its two arguments, so there is nothing to translate.
    */
    spaceStart: 0,
    spaceFull: 0,
    /*
    A STARFIELD BEHIND THE DOME — a count, 0 = none.

    Not the real galaxy: this is the "we just want a nice night sky" case, which
    is most of them. Seeded, so it is the same sky every load, and built ONCE —
    stars do not move relative to each other, and the dome is already pinned to
    the camera, so there is nothing to update per frame.
    */
    /**
     * A BAKED cube map behind the sky — the root path of six files named
     * `<root>_px.png` … `<root>_nz.png` (see [skybox-baker](?skybox-baker.ts)).
     *
     * When set it replaces the procedural `starfield` entirely, because it is
     * the same job done properly: real star positions photographed from a real
     * system, with structure no scattering of points will reproduce.
     */
    starfieldCube: '',
    /**
     * Roll/pitch/yaw applied to `starfieldCube`, in DEGREES, as `'rx,ry,rz'`.
     *
     * This is where a galactic tilt belongs. Rotating the GALAXY to get one
     * moves it out from under the bake camera; rotating the cube costs nothing,
     * is changeable after the fact, and can differ per system from one baked
     * texture.
     */
    starfieldTilt: '0,0,0',
    starfield: 0,
    /**
     * Soft emission clouds behind the stars — a count, `0` = none. They are
     * what stops a starfield reading as pepper on black.
     */
    nebulae: 0,
    /** Nebula brightness 0…1. */
    nebulaBrightness: 1,
    /*
    SMALL, AND THEREFORE MANY.

    Tonio: "The nebulae will only look good if there's a LOT of them and they're
    individually quite small." Proven in the galaxy, which has always been built
    that way — 750 stamps at a few percent of its radius — and reads as gas,
    where fourteen stamps at 16% of the sky radius read as what they are: huge
    discs with a visible straight quad edge.

    The reason is that ONE stamp is never a nebula. Structure comes from many
    dim overlapping ones ACCUMULATING under additive blending, so each has to be
    small enough to be a brushstroke rather than the whole painting.
    */
    nebulaSize: 0.045,
    /**
     * Image stamped for each nebula — black-backed, since it is composited
     * ADDITIVELY and the black is what makes the silhouette. Empty falls back
     * to a procedural falloff, which is a poor substitute: this repo ships
     * `/nebula.png`, and a consumer should point this at their own.
     */
    nebulaTexture: '',
    /*
    THE BACK OF THE SKY — what is behind the stars when the air is gone.

    Tonio's own statement of the architecture: "In the back is black (or
    interstellar background radiation), stars are additive dots. The atmosphere
    is additive light scattering." So the backdrop needs an owner, and it is
    this element rather than whatever `clearColor` a scene happened to set: the
    sky fading out was revealing the default grey and reading as the sky getting
    LIGHTER in space, which is precisely backwards.

    Default is JUST north of black on purpose — "allow us to make a black hole
    actual black in the middle". Something truly black in frame has nothing left
    to be darker than, so the sky keeps a floor and the void keeps somewhere to
    go.
    */
    spaceColor: '#05070f',
    /** Seed for `starfield`. Same seed, same constellations. */
    starfieldSeed: 12345,
    /**
     * Where a `<tosi-b3d-star>` child gets parked along the sun vector. `0`
     * leaves it wherever the author put it. Apparent size is `radius /
     * starDistance`, and that is deliberately the author's arithmetic rather
     * than ours — see the note in updateSky.
     */
    starDistance: 0,
    luminance: 1,
    // ⚠️ Babylon's SkyMaterial azimuth is a 0–1 FRACTION of a turn, not an
    // angle. Passed through unchanged rather than converted, because a
    // half-translated third-party unit is worse than an honest foreign one —
    // but it is called out in the attribute table so nobody types 90 here.
    azimuth: 0,
    latitude: 40,
    realtimeScale: 10,
    updateFrequencyMs: 100,
    sunColor: '#eeeeff',
    duskColor: '#ffaa22',
    moonColor: '#6688cc',
    moonIntensity: 0.15,
    timeOfDay: 6.5,
    rayleigh: 2,
    mieDirectionalG: 0.8,
    mieCoefficient: 0.005,
    skyboxSize: 1000,
    applyFog: false,
  }

  private interval = 0
  private _sizeToCamera: (() => void) | null = null
  // Last timeOfDay the sky material was rendered for. The per-frame observer
  // re-runs updateSky when this drifts — see the note on _sizeToCamera.
  private _lastSkyTime = NaN
  /*
  DID THE SUN BRANCH ACTUALLY RUN?

  `updateSky` writes `sunPosition`, `rayleigh` and `turbidity` only when a sun
  element's LIGHT exists, and the sun is a separate element that appears on its
  own schedule. A first pass landing before it leaves the SkyMaterial at its
  defaults — a dark sky that reads as night.

  `realtimeScale: 10` hides this, because the clock drifts every tick and the
  time gate reopens until some pass catches the sun. Set `realtimeScale: 0` for
  a reproducible scene — which an authored file wants, since it should render
  the light it declares — and roughly four loads in five come up dark
  (tosijs-3d-ensemble, #55).

  So the retry is gated on the OUTCOME rather than on the clock. `render()`
  already re-runs `updateSky` when this element's own attributes change, so
  a later sun is the only input it could not see.
  */
  private _sunApplied = false
  /*
  Bounded, because a skybox with no sun at all is a legitimate scene and must
  not re-run this every frame forever. ~5s at 60fps is far longer than any
  element takes to connect, and costs nothing once satisfied.
  */
  private _sunWaitFrames = 0
  private sunEl: B3dSun | null = null
  private _horizonColor = new BABYLON.Color3(0.75, 0.85, 0.95)
  // Reused scratch + a parsed-color cache so updateSky allocates nothing per frame.
  private _sunVec = new BABYLON.Vector3()
  private _dir = new BABYLON.Vector3()
  private _qLat = new BABYLON.Quaternion()
  private _qTime = new BABYLON.Quaternion()
  private _qTotal = new BABYLON.Quaternion()
  private _horizonScratch = new BABYLON.Color3()
  private _colorCache = new Map<string, BABYLON.Color3>()

  /** Approximate horizon color based on current time of day / atmosphere. */
  get horizonColor(): BABYLON.Color3 {
    return this._horizonColor
  }

  // Parse a hex color once and cache it (source strings are stable attributes), so
  // updateSky doesn't reparse/allocate a Color3 per frame. Returned colors are
  // treated as read-only (used as Lerp sources / copied from).
  private hex(hex: string): BABYLON.Color3 {
    let c = this._colorCache.get(hex)
    if (c == null) {
      c = hexToColor3(hex)
      this._colorCache.set(hex, c)
    }
    return c
  }

  /** 0 in the troposphere, 1 in vacuum. See `spaceStart`/`spaceFull`. */
  private _vacuum = 0
  private _glowExcluded = false

  /*
  KEEP THE STARFIELD OUT OF THE GLOW LAYER.

  The stars are emissive, which is what makes them stars — and an emissive mesh
  is exactly what a `GlowLayer` is looking for. Two and a half thousand of them
  bloom into each other and the whole frame goes WHITE: not a dim wash, a total
  blowout that reads as a broken sky rather than as bloom. It cost a real
  diagnosis on the ascent demo, where the sky and the fog both measured
  correctly (a pixel probe read 10,12,8 — nearly black) while the screenshot was
  pure white, because the blowout happens in a post-process after everything the
  scene can tell you about.

  `glowLayerIntensity` is a documented `<tosi-b3d>` attribute, so any adopter who
  turns it on would meet this. Bloom belongs to bright things IN the world — a
  muzzle flash, a corona, a lamp — never to the backdrop, which is by definition
  the dimmest thing on screen.

  Deferred because ordering is not guaranteed: B3d may build its glow layer
  before or after this element's `sceneReady`, so this retries until it finds
  one rather than assuming it is already there.
  */
  /**
   * NEBULAE — off by default, and honestly a dead end in this form.
   *
   * ⚠️ A STAMPED SPRITE CANNOT BE A NEBULA. The texture is a round blob, so
   * every stamp is a circle; squashing and rolling it varies the outline but
   * not the fact of it. Tonio, after several passes of tuning: "This isn't from
   * overlaps. Each nebular is a single squashed circle and looks wrong."
   *
   * And the two requirements fight. Structure only reads when a stamp is LARGE,
   * while a field only reads when the stamps are small and many — at which
   * point each one is a few pixels across, mips average the turbulence flat,
   * and you are back to a smooth disc. There is no count/size that satisfies
   * both, which is why tuning kept producing a different wrong answer.
   *
   * `b3d-galaxy` does not have this problem because its nebulae are not
   * sprites: the fragment shader runs fbm per particle with a per-particle seed
   * and distorts the falloff with it, so no two are the same shape. That is the
   * approach to port if this is ever worth doing here — or, better, skip it
   * entirely and BAKE THE GALAXY, which is the agreed direction and gets real
   * structure plus real stars in one step.
   *
   * Kept, off, and cheap: a no-dependency fallback for a scene with no galaxy.
   */
  /**
   * (Implementation note) What stops a starfield reading as pepper on black.
   *
   * Quads, not points, because a nebula is an EXTENT. They need no billboarding
   * despite always facing you: the camera sits at the centre of this sphere and
   * only ever rotates, so a quad built facing the centre faces the viewer
   * forever. Per-frame billboarding would buy precisely nothing — the same
   * reason the stars are points and the same reason none of this backdrop is
   * rebuilt after the first frame.
   *
   * Additive and soft-edged, like everything else in the sky: emission cannot
   * darken what is behind it, and two overlapping nebulae should pool rather
   * than occlude.
   */
  private _buildNebulae(scene: BABYLON.Scene, prng: PRNG, radius: number): void {
    const attrs = this as any
    const count = Math.floor(attrs.nebulae) || 0
    if (count <= 0 || this._starfieldMesh == null) return

    /*
    A PAINTED NEBULA BEATS A GRADIENT, and it is not close.

    The procedural version was a radial falloff, which is a DISC — smooth,
    symmetric, and reading as a lens flare rather than as gas. Real structure
    (turbulent, uneven, dark lanes cutting through bright knots) is not
    something a two-stop gradient can fake, and this repo ships a 1024² one.

    It needs NO opacity map, which is the neat part: the image is black-backed,
    and under additive blending black adds exactly nothing. The silhouette comes
    free from the pixels rather than from a second sampler.
    */
    const src = (attrs.nebulaTexture as string) || ''
    const tex: BABYLON.BaseTexture = src
      ? new BABYLON.Texture(src, scene)
      : proceduralNebula(scene)

    const size = radius * 2 * (attrs.nebulaSize as number)
    for (let i = 0; i < count; i++) {
      const z = prng.realRange(-1, 1)
      const t = prng.realRange(0, Math.PI * 2)
      const r = Math.sqrt(Math.max(0, 1 - z * z))
      const quad = BABYLON.MeshBuilder.CreatePlane(
        `skybox-nebula-${i}_nocast`,
        { size: size * prng.realRange(0.6, 1.6) },
        scene
      )
      quad.position.set(
        radius * r * Math.cos(t),
        radius * z,
        radius * r * Math.sin(t)
      )
      /*
      FACE THE VIEWER WITH THE VISIBLE SIDE, so ONE face draws.

      `lookAt(Zero())` aims local +Z at the centre — and a Babylon plane's
      visible face is local −Z (the same fact that mirrored the death dialog;
      see dialog-placement), so this was showing the quad's BACK to the camera
      and only rendered at all because culling was off. Aim +Z outward instead
      and the front face is the one you see.
      */
      quad.lookAt(quad.position.scale(2))
      quad.rotate(
        BABYLON.Axis.Z,
        prng.realRange(0, Math.PI * 2),
        BABYLON.Space.LOCAL
      )
      /*
      SQUASHED, NOT SCALED. One image stamped fourteen times is obvious the
      moment two of them are the same shape, so each gets its own roll AND its
      own non-proportional stretch — the same pixels read as a different cloud.
      */
      quad.scaling.set(prng.realRange(0.6, 1.5), prng.realRange(0.6, 1.5), 1)
      const mat = new BABYLON.StandardMaterial(`skybox-nebula-${i}`, scene)
      mat.disableLighting = true
      /*
      BLACK DIFFUSE, OR THE NEBULA IS WHITE WHATEVER COLOUR YOU GIVE IT.

      `disableLighting` does not mean "emissive only" — it makes StandardMaterial
      use `diffuseColor` DIRECTLY as an unlit base, and that defaults to white.
      So every nebula rendered as a white cloud with a faint tint on top, no
      matter what `emissiveColor` said. Tonio: "How are the nebulae coming out
      white?"

      The stars dodge it by accident: they carry vertex colours, which multiply
      that white base and end up the colour of the star. The nebulae have no
      vertex colours, so the base came through untouched.
      */
      mat.diffuseColor = new BABYLON.Color3(0, 0, 0)
      mat.specularColor = new BABYLON.Color3(0, 0, 0)
      mat.emissiveTexture = tex as BABYLON.Texture
      mat.alphaMode = BABYLON.Constants.ALPHA_ADD
      mat.disableDepthWrite = true
      /*
      ⚠️ CULL THE BACK FACE — ADDITIVE BLENDING DOUBLES WHATEVER DRAWS TWICE.

      This was `false`, which is harmless for an opaque mesh and is NOT harmless
      here: with no culling and no depth write, both faces of every quad render,
      and each one ADDS. So the framebuffer got `colour + colour + background`
      where the model says `textureValue · colour + background` — a 2× overdose
      that saturated the middle of every stamp to white and left only the thin
      edges under 1.0, keeping their hue. Tonio, who spotted the arithmetic from
      the look alone: "it seems more like nebula color + color + background".

      Worth stating as the general rule, because it is invisible on anything
      opaque: under additive blending, DOUBLE-SIDED MEANS DOUBLE-BRIGHT.

      ⚠️ STILL UNEXPLAINED, and left here for whoever picks this up: Tonio's
      last reading was that the output is the nebula's COLOUR rather than the
      texture's VALUE times that colour — "There should be no white unless a
      green nebular overlaps an orange one". Babylon's StandardMaterial does
      document `emissiveColor *= emissiveTexture`, which is value × colour, so
      either something upstream is not setting the EMISSIVE define or the
      observation has another cause. I could not account for it, and three of my
      explanations in this area were already wrong, so it is recorded as open
      rather than resolved. If this is ever revived, put the image in the
      DIFFUSE slot with `disableLighting` — `diffuseColor × texture` has no
      ambiguity to argue about.
      */
      mat.backFaceCulling = true
      /*
      DIM AND SATURATED, which is the note the galaxy's own nebulae get right
      and this first pass got exactly backwards: these were near-white, and a
      desaturated nebula is just fog. Hydrogen reds through reflection blues,
      with one channel pushed and the others held down so the hue survives being
      added onto black.
      */
      /*
      DARK COLOURS, BECAUSE THE TEXTURE IS THE BRIGHT PART.

      The emissive here is a TINT that the image's own value multiplies, not a
      brightness — and the previous values (up to 0.94 in a channel) meant the
      texture's bright core came out well past 1.0 and clipped to white, while
      its faint outer field still read strongly enough to show the quad's edge.
      Tonio: "colored squares with blown out blurry white circles in the middle.
      You should multiply the value by the nebular color and it should be a
      darkish color (value 40 say)."

      So the peak channel is ~0.16 — value 40 of 255. The image's dark lanes
      then land near zero and genuinely vanish, and its bright knots land at a
      colour rather than at white.
      */
      /*
      MANY STAMPS MEANS EACH ONE HAS TO BE FAINTER THAN YOU THINK.

      The tint is what the image's VALUE multiplies, so it sets the peak of a
      stamp rather than its brightness curve. 0.12 with one draw per quad lands
      where 0.16 was aiming before back-face culling was fixed — the old value
      was arriving twice.
      */
      const warm = prng.value()
      const V = 0.12
      mat.emissiveColor = new BABYLON.Color3(
        V * (0.35 + 0.65 * warm),
        V * (0.2 + 0.3 * (1 - Math.abs(warm - 0.5) * 2)),
        V * (0.4 + 0.6 * (1 - warm))
      )
      this._nebulaBase.push(mat.emissiveColor.clone())
      quad.material = mat
      quad.isPickable = false
      quad.applyFog = false
      quad.parent = this._starfieldMesh
      this._nebulaMeshes.push(quad)
      this._nebulaMats.push(mat)
    }
  }

  private _excludeFromGlow(scene: BABYLON.Scene): void {
    const mesh = this._starfieldMesh
    if (mesh == null || this._glowExcluded) return
    for (const layer of scene.effectLayers ?? []) {
      const add = (layer as any).addExcludedMesh
      if (typeof add === 'function') {
        add.call(layer, mesh)
        this._glowExcluded = true
      }
    }
  }
  private _starfieldMesh: BABYLON.Mesh | null = null
  private _clearBase: BABYLON.Color4 | null = null
  private _nebulaMeshes: BABYLON.Mesh[] = []
  private _nebulaMats: BABYLON.StandardMaterial[] = []
  private _nebulaBase: BABYLON.Color3[] = []
  private starEl: AbstractMesh | null = null

  /**
   * The background starfield — built ONCE, then never touched.
   *
   * Points, not billboards: a star is a point source and there is nothing to
   * face. `b3d-galaxy` re-billboards its whole particle system every frame,
   * which is right for a galaxy you orbit and would be pure waste for a sky
   * that cannot change. Parented to the dome so it inherits the per-frame
   * camera pinning and rescaling for free.
   *
   * Colour follows the spectral sequence (cool red → hot blue) with most stars
   * dim, because a sky of uniformly bright white dots reads as static. The
   * brightness curve is `u^3`, which is not physics but does put a handful of
   * bright stars among many faint ones, which is what the eye is looking for.
   */
  private _buildStarfield(scene: BABYLON.Scene): void {
    const attrs = this as any
    const count = Math.floor(attrs.starfield) || 0
    this._starfieldMesh?.dispose()
    this._starfieldMesh = null
    if (this.mesh == null) return
    if (count <= 0 && !((this as any).starfieldCube as string)) return

    /*
    A BAKED CUBE WINS, and it is one mesh instead of thousands of points.

    Same treatment as the point starfield: pinned to the camera, depth-written
    like ordinary far geometry, and faded by the same EXPOSURE term so it
    vanishes into a daylit sky. The difference is only where the pixels come
    from.
    */
    /*
    A SEPARATE BOX, and the single-material version is recorded here as TRIED
    AND FAILED rather than quietly dropped.

    Compositing the starfield into the sky's own shader is the right
    architecture and Tonio asked for it twice. `SkyMaterial` even looked
    willing: its fragment source has `varying vec3 vPositionW`, a
    `cameraPosition` uniform and the standard CUSTOM_FRAGMENT hooks. A
    `MaterialPluginBase` attaches cleanly and reports itself attached —
    `pluginManager` lists it alongside CloudShadow and Biome.

    It still renders nothing, and the reason is not SkyMaterial-specific: the
    plugin manager installs `material._callbackPluginEventGeneric` and it is
    then THE MATERIAL'S JOB to invoke it. Only standardMaterial, pbrBaseMaterial,
    openpbrMaterial and gaussianSplattingMaterial do. NOT ONE material in the
    `@babylonjs/materials` pack does — sky, water, terrain, grid, all of them
    accept a plugin and ignore it. So the define never reaches the effect,
    `#ifdef B3D_STARFIELD` compiles out, and the sampler is never read.

    Attaching succeeds silently and every diagnostic agrees it worked — plugin
    listed in `pluginManager`, texture ready, level 0.8 — which is why this took
    two rounds of "still black" to locate. Filed in UPSTREAM.md.

    So the cube gets its own mesh again. It is scaled slightly OUTSIDE the dome
    rather than onto it, which is what fixes the original complaint: two shells
    on the same shell had no honest depth relationship and their order changed
    as the dome faded.
    */
    const cubeRoot = (attrs.starfieldCube as string) || ''
    if (cubeRoot) {
      const box = BABYLON.MeshBuilder.CreateBox(
        'skybox-starfield_nocast',
        { size: 1000, sideOrientation: BABYLON.Mesh.BACKSIDE },
        scene
      )
      const cm = new BABYLON.StandardMaterial('starfield-cube', scene)
      cm.backFaceCulling = false
      cm.disableLighting = true
      // Black diffuse and specular: the REFLECTION sample is the colour, and
      // emissive would only add white on top of it.
      cm.diffuseColor = new BABYLON.Color3(0, 0, 0)
      cm.specularColor = new BABYLON.Color3(0, 0, 0)
      cm.emissiveColor = new BABYLON.Color3(0, 0, 0)
      // Extensions spelled out — CubeTexture defaults to .jpg, silently.
      cm.reflectionTexture = new BABYLON.CubeTexture(cubeRoot, scene, [
        '_px.png',
        '_py.png',
        '_pz.png',
        '_nx.png',
        '_ny.png',
        '_nz.png',
      ])
      cm.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
      box.material = cm
      box.isPickable = false
      box.applyFog = false
      box.infiniteDistance = true
      const tilt = String(attrs.starfieldTilt ?? '0,0,0')
        .split(',')
        .map((n) => (parseFloat(n) || 0) * DEG_TO_RAD)
      box.rotation.set(tilt[0] ?? 0, tilt[1] ?? 0, tilt[2] ?? 0)
      this._starfieldMesh = box
      this._excludeFromGlow(scene)
      return
    }

    const prng = new PRNG(attrs.starfieldSeed || 1)
    const positions: number[] = []
    const colors: number[] = []
    /*
    IN THE DOME'S OWN UNITS, which are NOT unit-box units.

    `CreateBox({size: skyboxSize})` spans ±skyboxSize/2 in local space, so a
    radius of 0.45 put the whole sky 4.5 m from the camera — stars in front of
    the scenery, scattered over the ground and the props. It looked like a depth
    bug and was a units bug, which is the expensive kind: the first fix attempted
    was depth-write, and depth was never involved.

    0.45 of the box's SIZE puts them just inside its half-extent (0.5), so they
    ride the same per-frame rescale and stay behind everything the camera can
    see.
    */
    const R = ((attrs.skyboxSize as number) || 1000) * 0.45
    for (let i = 0; i < count; i++) {
      // Uniform on the sphere: z uniform, NOT latitude uniform — the naive
      // version bunches stars at the poles, and a sky with two bald patches is
      // the one starfield bug everyone ships once.
      const z = prng.realRange(-1, 1)
      const t = prng.realRange(0, Math.PI * 2)
      const r = Math.sqrt(Math.max(0, 1 - z * z))
      positions.push(R * r * Math.cos(t), R * z, R * r * Math.sin(t))
      /*
      MAGNITUDES ARE LOGARITHMIC. THE FIRST VERSION WAS NOT.

      Brightness was `u³` on a uniform draw, which is a skew but a LINEAR one —
      and its top end sits at 1.0, so the brightest stars were pure white
      maximum-value dots added onto near-black. Tonio: "what look like insanely
      bright stars… we might need to log-scale them." (Not the glow layer, as it
      turned out: `glowLayerIntensity` defaults to 0 and this demo sets none.
      They were simply that bright.)

      Real star brightness runs on magnitudes, where each step of 1 is a factor
      of ~2.512 in flux, so a naked-eye sky spans roughly 100:1 between its
      brightest and faintest — mostly faint, with a handful that carry the
      constellations. `flux = 10^(-0.4·m)` is that relation exactly, and drawing
      `m` with a skew toward the faint end gives the count distribution too:
      many dim stars, few bright ones, none of them blinding.

      Capped below 1 as well, because a star at full channel value is not a
      bright star, it is a clipped one — and with nothing brighter left on the
      scale, everything above the cap reads as the same white dot.
      */
      const m = Math.pow(prng.value(), 0.55) * 5
      const flux = Math.pow(10, -0.4 * m) * 0.85
      // Warm dim dwarfs through to rare hot blue-white giants.
      const warm = prng.value()
      const rr = 0.55 + 0.45 * warm
      const gg = 0.6 + 0.4 * (1 - Math.abs(warm - 0.5) * 2)
      const bb = 0.6 + 0.4 * (1 - warm)
      colors.push(rr * flux, gg * flux, bb * flux, 1)
    }
    const mesh = new BABYLON.Mesh('skybox-starfield_nocast', scene)
    const vd = new BABYLON.VertexData()
    vd.positions = positions
    vd.colors = colors
    vd.applyToMesh(mesh)
    const mat = new BABYLON.StandardMaterial('starfield', scene)
    mat.disableLighting = true
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1)
    mat.pointsCloud = true
    mat.pointSize = 2
    /*
    STARS ADD. THEY DO NOT PAINT.

    This is the whole fix, and the bug it replaces is worth keeping because it
    looked like three other things first. Opaque points meant a DIM star drew a
    near-black dot — so the night sky was speckled with dark specks and the blue
    day sky was speckled with them too. Tonio, who spotted it: "The blue of the
    sky should wash out dark stars. Right now the dim stars show as dark dots."

    I read those dots as stars punching through the foreground and went hunting
    for a depth-order bug — tried depth-write, the double `infiniteDistance`
    pin, a glow layer, and background/foreground rendering groups. None of them
    were it, because none of it was about depth. A star is a LIGHT SOURCE: it
    adds to whatever is behind it and can never darken it. Additive blending
    says exactly that, and then everything else falls out for free — a dim star
    adds almost nothing, so a bright sky washes it out and a black one does not,
    with no day/night branch anywhere.

    Depth is still TESTED, just not written, so the ground in front still
    occludes them. Background-ness is a consequence of being at the dome's
    radius, not something that needs its own rendering group.
    */
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true
    mat.needAlphaBlending = () => true
    mesh.material = mat
    mesh.isPickable = false
    mesh.applyFog = false
    mesh.infiniteDistance = true
    /*
    A SIBLING OF THE DOME, NOT ITS CHILD.

    Parenting was tidier — the starfield inherited the camera pin and the
    per-frame rescale for nothing. It also made the stars hostage to the dome:
    `setEnabled(false)` on a parent disables its children, so the dome could
    never be switched off without taking the sky with it.

    And it has to be switchable, because `SkyMaterial` does not reach black.
    Even with rayleigh, turbidity and luminance at zero it keeps a floor colour,
    so at full vacuum the sky stayed faintly lit — Tonio: "the sky never
    completely fades away." Scattering going to zero is the right model and the
    shader simply does not honour the limit, so at the limit the dome stops
    drawing instead.
    */
    mesh.scaling.setAll(1)
    this._starfieldMesh = mesh
    this._buildNebulae(scene, prng, R)
    this._excludeFromGlow(scene)

    /*
    THE DOME IS LEFT ALONE, deliberately.

    The first attempt moved it onto the transparent path so it could composite
    over the stars, which is the right picture — scattering adds over whatever
    comes from beyond the air — but it is the wrong PLACE to implement it. Make
    the stars additive instead and the same result arrives with the core element
    untouched: the dome paints the sky, the stars add to it, and a dim one
    vanishes into a bright sky on its own.

    Which also means the vacuum fade needs no special case. `_vacuum` already
    drives rayleigh/turbidity/luminance to zero, so at altitude the dome paints
    black and the stars are simply all that is left — day, night and space out
    of one term, with nothing switched.
    */
  }
  private _removeFogLayer: (() => void) | null = null

  /**
   * How far out of the atmosphere the VIEWER is — the camera, not the skybox,
   * which is pinned to the camera anyway. Read live rather than cached because
   * the thing that moves is someone else's mesh.
   */
  private _vacuumNow(): number {
    const attrs = this as any
    const full = attrs.spaceFull as number
    const start = attrs.spaceStart as number
    if (!(full > start)) return 0
    const cam = this.owner?.scene?.activeCamera
    if (cam == null) return 0
    return band(cam.globalPosition.y, start, full)
  }

  private updateSky() {
    if (this.mesh?.material == null) return
    const attrs = this as any
    const material = this.mesh.material as SkyMaterial
    const latitude = attrs.latitude * DEG_TO_RAD
    const sunVector = this._sunVec.set(0, 100, 0)
    // Time rotation: noon=0, wraps through day
    const t = (((attrs.timeOfDay + 30) % 12) / 12) * 1.04 - 0.52
    const timeAngle = t * Math.PI
    // Latitude tilts the sun's arc away from vertical; time rotates it east-west.
    BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_X, latitude, this._qLat)
    BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_Z, timeAngle, this._qTime)
    this._qLat.multiplyToRef(this._qTime, this._qTotal)
    const isDay = attrs.timeOfDay > 6 && attrs.timeOfDay < 18
    // The day curve, hoisted: it used to be computed only inside the sun
    // branch, but the backdrop's exposure needs it whether or not a
    // <tosi-b3d-sun> happens to be in the scene.
    const dayBrightness = isDay
      ? Math.min(Math.abs((t + 0.52) * 10), Math.abs((t - 0.52) * 10), 1)
      : 0
    sunVector.rotateByQuaternionToRef(this._qTotal, sunVector)

    /*
    VACUUM IS NOT A SKY COLOUR — IT IS THE ABSENCE OF SCATTERING.

    The sky is blue because air scatters; take the air away and it goes black
    on its own, with the sun still a hard bright disc because the mie term is
    forward-scattering off the sun itself. So the fade to space drives the three
    uniforms that MEAN atmosphere — `rayleigh`, `turbidity`, `luminance` —
    toward zero, and `SkyMaterial` renders the result. No second sky, no shader,
    nothing to cross-fade: the same material does daylight and vacuum because
    they are the same equation with different air.

    `_air` is 1 in the troposphere and 0 in vacuum, so every scattering term
    below is simply multiplied by it.
    */
    const air = 1 - this._vacuum
    /*
    FADE THE DOME OUT. DO NOT DIM ITS LUMINANCE.

    `luminance` is not a brightness scale in `SkyMaterial` — it sits in the
    Preetham tonemap as a divisor, so driving it toward zero does not darken the
    sky, it BLOWS IT OUT. Tonio: "The sky suddenly goes WHITE in space." Suddenly
    is the tell: it was a threshold, and just below it luminance was small enough
    to saturate every channel.

    So luminance is left exactly where the author put it. `rayleigh` and
    `turbidity` still scale with the remaining air — those genuinely mean
    scattering, and the night path has always used them that way — and the dome
    itself fades on ALPHA.

    Which is the architecture arrived at several passes ago rather than a patch:
    the dome is an OVERLAY on the starfield, so "no atmosphere" is the overlay
    at zero opacity, revealing what was always behind it. It is also smooth,
    where the threshold it replaces could only ever pop.
    */
    this.mesh.setEnabled(air > 0.004)
    material.alpha = air

    /*
    AND THE SKY OWNS WHAT IS BEHIND IT.

    Fading the dome revealed the scene's clear colour, which is a mid grey by
    default — so climbing out of the atmosphere made the sky get BRIGHTER, which
    is the exact opposite of the thing being modelled. The backdrop is part of
    the sky, so the sky sets it: the scene's own colour at sea level, lerped to
    `spaceColor` as the air goes.

    The base is captured ONCE rather than read each frame, because this writes
    the value it would otherwise be reading — and `b3d-clouds` borrows the same
    property during a whiteout, so a re-read would eventually latch white.
    */
    const sceneNow = this.owner?.scene
    if (sceneNow == null) return
    if (this._clearBase == null) {
      this._clearBase = sceneNow.clearColor.clone()
    }
    const sc = this.hex(attrs.spaceColor)
    const v = this._vacuum
    sceneNow.clearColor.set(
      this._clearBase.r + (sc.r - this._clearBase.r) * v,
      this._clearBase.g + (sc.g - this._clearBase.g) * v,
      this._clearBase.b + (sc.b - this._clearBase.b) * v,
      1
    )
    material.needAlphaBlending = () => air < 0.999
    material.luminance = attrs.luminance

    /*
    EXPOSURE FADES THE BACKDROP. SCATTER IS NOT THE MECHANISM.

    The first version of this dimmed the stars with the scattering term, on the
    theory that daylight ADDS enough to swamp them. Tonio: "Really the big thing
    is that exposure adjusts at daytime and the entire backdrop is basically
    being faded out. The scatter is actually not the issue." That is the better
    model and it is the true one — you cannot see stars at noon because your
    pupil has stopped down, not because the sky has been added to them. The
    whole backdrop goes, together, and it goes because of EXPOSURE.

    Which matters here because we are quietly simulating a dynamic range far
    wider than the framebuffer holds. Tonio again: "The moon is the color of
    coal." It is — an albedo around 0.12 — and it reads as brilliant white at
    night purely because the eye is wide open. Nothing in an 8-bit buffer
    behaves that way on its own, so the exposure has to be applied by hand.

    `dayBrightness` is the element's OWN day curve, the same number that drives
    the sun's intensity, so the sky and its exposure cannot drift apart. `air`
    is in there because vacuum has no bright sky to stop down FOR:

      night, sea level  → 0            → backdrop full
      noon,  sea level  → 1 · 1        → faded out
      noon,  in VACUUM  → 1 · 0        → stars AND the sun, together

    The last row is the one that says this is a model rather than a tuning: it
    is what an astronaut sees, and nothing special-cased it.
    */
    if (this._starfieldMesh != null) {
      if (!this._glowExcluded && this.owner?.scene != null) {
        this._excludeFromGlow(this.owner.scene)
      }
      const exposed = 1 - dayBrightness * air
      const m = this._starfieldMesh.material as BABYLON.StandardMaterial
      /*
      TWO KINDS OF BACKDROP, TWO DIFFERENT KNOBS, ONE exposure.

      A point cloud is emissive, so its brightness IS `emissiveColor`. A baked
      cube gets its colour from a reflection sample, which emissive can only add
      to — so its knob is the texture's `level`. Driving the wrong one paints
      the sky white rather than dimming it.
      */
      /*
      TWO KINDS OF BACKDROP, TWO KNOBS. A point cloud is emissive, so its
      brightness IS `emissiveColor`. A baked cube gets its colour from a
      reflection sample, which emissive can only ADD to — driving the wrong one
      paints the sky white rather than dimming it.
      */
      if (m.reflectionTexture != null) {
        m.reflectionTexture.level = exposed
      } else {
        m.emissiveColor.set(exposed, exposed, exposed)
      }
      this._starfieldMesh.setEnabled(exposed > 0.01)
      // Nebulae are backdrop too, so the same exposure governs them — they must
      // not survive a daylight sky the stars have already vanished from.
      /*
      EXPOSURE DRIVES THE EMISSIVE, NOT THE ALPHA.

      `alpha` does not gate an ADDITIVE emissive material — the emission is
      added regardless — so setting it left fourteen enormous nebulae glowing at
      full strength in broad daylight. Tonio: "something is rendering as ultra
      big and glowy." Scaling the colour is what actually dims an emitter, which
      is the same thing the stars already do a few lines up.
      */
      const nb = (attrs.nebulaBrightness as number) * exposed
      for (let i = 0; i < this._nebulaMats.length; i++) {
        const base = this._nebulaBase[i]
        this._nebulaMats[i].emissiveColor.set(
          base.r * nb,
          base.g * nb,
          base.b * nb
        )
      }
    }
    material.azimuth = attrs.azimuth
    material.mieDirectionalG = attrs.mieDirectionalG
    material.mieCoefficient = attrs.mieCoefficient

    /*
    PARK A `<tosi-b3d-star>` CHILD ON THE SUN VECTOR.

    The skybox already owns this relationship for light — `b3d-sun`'s own docs
    say its direction is "overridden by skybox when present" — so the visible
    body rides the same channel rather than inventing a second one. Tonio:
    "Don't we have a star object already?" We do, with a corona; nothing placed
    it.

    Apparent size stays the AUTHOR's arithmetic (`radius / starDistance`)
    rather than being derived from an angular diameter here. Deriving it would
    be friendlier for one case — a sun-like 0.53° disc — and would quietly make
    `radius` a lie for every other, which is the worse trade for a star you can
    also fly to.
    */
    if (this.owner != null && attrs.starDistance > 0) {
      if (this.starEl == null) {
        this.starEl = this.owner.querySelector(
          'tosi-b3d-star'
        ) as unknown as AbstractMesh | null
      }
      const star = this.starEl
      const cam = this.owner.scene?.activeCamera
      if (star != null && cam != null) {
        const d = attrs.starDistance / Math.max(1e-6, sunVector.length())
        // The star sits along the sun vector FROM THE CAMERA, so like the dome
        // it never recedes — it is a body at effective infinity, not scenery
        // you can outrun.
        star.x = cam.globalPosition.x + sunVector.x * d
        star.y = cam.globalPosition.y + sunVector.y * d
        star.z = cam.globalPosition.z + sunVector.z * d
      }
    }

    if (this.owner != null) {
      if (this.sunEl == null) {
        this.sunEl = this.owner.querySelector(
          'tosi-b3d-sun'
        ) as unknown as B3dSun | null
      }
      const sunEl = this.sunEl
      // Record whether the sun-dependent writes below actually happen — the
      // frame gate retries on this, not on the clock. See `_sunApplied`.
      this._sunApplied = sunEl?.light != null
      if (sunEl?.light != null) {
        const { light } = sunEl
        // The skybox owns the day/night intensity cycle; tell the sun to stop
        // writing light.intensity itself (it would stomp this on its slower 1s
        // tick and cause a periodic flicker). We multiply by the sun's
        // underwater dimFactor so the two stay in agreement.
        sunEl.externallyLit = true
        const dim = sunEl.dimFactor ?? 1
        material.sunPosition = sunVector
        sunVector.normalizeToRef(this._dir)
        light.direction.x = -this._dir.x
        light.direction.y = -this._dir.y
        light.direction.z = -this._dir.z
        const intensity = dayBrightness
        if (isDay) {
          // Blend dusk→sun straight into light.diffuse (cached parsed sources).
          BABYLON.Color3.LerpToRef(
            this.hex(attrs.duskColor),
            this.hex(attrs.sunColor),
            intensity,
            light.diffuse
          )
          light.intensity = intensity * dim
          material.rayleigh = attrs.rayleigh * air
          material.turbidity = attrs.turbidity * air

          // Horizon: blend light color with sky blue, then brighten toward white
          // at high sun — written in place into _horizonColor via a scratch.
          BABYLON.Color3.LerpToRef(
            light.diffuse,
            SKY_BLUE,
            0.6,
            this._horizonScratch
          )
          BABYLON.Color3.LerpToRef(
            this._horizonScratch,
            HORIZON_WHITE,
            intensity * 0.4,
            this._horizonColor
          )
        } else {
          light.diffuse.copyFrom(this.hex(attrs.moonColor))
          light.intensity = attrs.moonIntensity * dim
          material.rayleigh = attrs.rayleigh * 0.05 * air
          material.turbidity = attrs.turbidity * 0.05 * air

          // Night horizon: dark desaturated blue
          this._horizonColor.copyFrom(NIGHT_HORIZON)
        }
      }
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    /*
    ADVANCE BY MEASURED TIME, not by the interval we asked for.

    This added `realtimeScale * updateFrequencyMs` per tick — i.e. it assumed
    every tick arrived exactly `updateFrequencyMs` apart. Browsers throttle
    timers in a BACKGROUNDED tab to a second or more, so the tick still added its
    100 ms of sky while ~1000 ms of real time passed: the sky quietly ran an
    order of magnitude slow, and only looked wrong when you came back to the tab
    and compared it with what the scene was doing.

    Silent, and it never self-corrects — nothing anywhere measures the drift, so
    it accumulates for as long as the tab is hidden.

    The elapsed time is CLAMPED because the alternative is a teleporting sun: a
    tab hidden for an hour would otherwise apply an hour of sky in a single
    frame. Clamping means a long absence resumes smoothly rather than jumping,
    at the cost of the clock lagging real time — which is the right trade for a
    day/night cycle that is scenery, not a simulation.
    */
    const MAX_STEP_MS = 250
    let lastTick = Date.now()
    this.interval = window.setInterval(() => {
      const now = Date.now()
      const elapsed = Math.min(MAX_STEP_MS, Math.max(0, now - lastTick))
      lastTick = now
      attrs.timeOfDay =
        (((attrs.timeOfDay + attrs.realtimeScale * elapsed * 1e-6) / 24) % 1) *
        24
    }, attrs.updateFrequencyMs)

    const material = new SkyMaterial('skybox', scene)
    material.backFaceCulling = false
    material.useSunPosition = true

    this.mesh = BABYLON.MeshBuilder.CreateBox(
      'skybox_nocast',
      {
        size: attrs.skyboxSize,
        sideOrientation: BABYLON.Mesh.BACKSIDE,
      },
      scene
    )
    this.mesh.material = material
    this.mesh.applyFog = (this as any).applyFog
    // infiniteDistance pins the dome to the camera (translation ignored), so you
    // can fly forever without leaving it. Then scale it each frame to just inside
    // the active camera's far plane, so ALL in-view geometry (streamed terrain,
    // etc.) sits inside the dome and it renders behind everything by normal depth
    // — no fixed size to outgrow. Base box is `skyboxSize` across (half that).
    this.mesh.infiniteDistance = true
    const baseHalf = ((this as any).skyboxSize || 1000) * 0.5
    this._sizeToCamera = () => {
      const cam = scene.activeCamera
      if (cam == null || this.mesh == null) return
      // Keep even the box CORNERS (at half·√3) well inside the far plane, or they
      // clip and punch holes in the sky. 0.5·maxZ → corner ≈ 0.87·maxZ, safe.
      const targetHalf = cam.maxZ * 0.5
      this.mesh.scaling.setAll(targetHalf / baseHalf)
      // Refresh the sky material HERE (a scene onBeforeRender observer, which fires
      // in flat AND XR) rather than only from tosijs's rAF-batched render(). In an
      // immersive session window.rAF is suspended, and this component's continuous
      // realtimeScale setInterval keeps re-queuing render() so its per-element flag
      // stays stranded — freezing the sky (the "time-of-day slider does nothing in
      // XR until you exit" bug). Driving updateSky off the frame loop, gated on a
      // timeOfDay change, keeps it live everywhere.
      /*
      ALTITUDE IS THE SECOND CLOCK. The gate below used to watch `timeOfDay`
      alone, which is right for a sky that only changes with the hour — but a
      rocket climbing at a fixed hour would have held a blue sky all the way to
      orbit, the update never firing because nothing it watched had moved.
      */
      if (this._starfieldMesh != null) {
        /*
        INSIDE THE DOME — and putting it OUTSIDE was the bug, not the fix.

        Both boxes are `infiniteDistance`, pinned to the camera and sitting at
        the far plane, where depth precision is at its worst. Pushing the
        backdrop 6% FURTHER out did not separate them: at that range the two
        depths are indistinguishable, so the tie was decided per-pixel and the
        frame split along a hard diagonal, blue sky one side and stars the other.
        Tonio: "It's z-chasing at the corners… the skybox with two cubes NEVER
        worked."

        Nesting it inside gives the depth buffer a real difference to work with.
        It also matches what the two things ARE: the sky is drawn in front of the
        stars and hides them by day, which is the whole model — so the starfield
        being the nearer mesh is only a rendering detail, while being the
        further one was a claim depth could not honour.

        Rotation stays the cube's own — see `starfieldTilt`.
        */
        this._starfieldMesh.scaling.copyFrom(this.mesh.scaling).scaleInPlace(0.9)
        this._starfieldMesh.position.copyFrom(this.mesh.position)
      }
      const vac = this._vacuumNow()
      // Quantised, not compared raw: a float that drifts by 1e-7 every frame
      // would refresh the sky every frame and the gate would be decorative.
      const moved = Math.abs(vac - this._vacuum) > 0.002
      if (moved) this._vacuum = vac
      const waiting = !this._sunApplied && this._sunWaitFrames < 300
      if (waiting) this._sunWaitFrames++
      if (attrs.timeOfDay !== this._lastSkyTime || moved || waiting) {
        this._lastSkyTime = attrs.timeOfDay
        this.updateSky()
      }
    }
    scene.registerBeforeRender(this._sizeToCamera)
    /*
    THE HAZE HAS TO GO TOO, or the sky turns black behind air you can still see
    through — vacuum with weather in it. This is the `space` layer atmosphere.ts
    has specified from the start ("altitude leaving the atmosphere: density → 0,
    colour → black") and that nothing has ever registered: water and clouds both
    contribute bands, the third was documented and unwired. So the compositor
    already knew how to do this; it was only ever missing a caller.

    Density and end are pulled toward "nothing between you and infinity"; the
    colour goes black so that whatever haze remains mid-fade darkens rather than
    staying blue.
    */
    this._removeFogLayer = owner.addFogLayer(() => {
      const w = this._vacuum
      return w <= 0
        ? null
        : {
            weight: w,
            color: { r: 0, g: 0, b: 0 },
            density: 0,
            start: 1e6,
            end: 1e7,
          }
    })
    this._buildStarfield(scene)
    this._glowExcluded = false
    this.updateSky()
    owner.register({ meshes: [this.mesh] })
  }

  sceneDispose() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
    if (this._sizeToCamera && this.owner) {
      this.owner.scene.unregisterBeforeRender(this._sizeToCamera)
      this._sizeToCamera = null
    }
    for (const q of this._nebulaMeshes) q.dispose()
    this._nebulaMeshes = []
    for (const nm of this._nebulaMats) nm.dispose()
    this._nebulaMats = []
    this._nebulaBase = []
    this._starfieldMesh?.dispose()
    this._starfieldMesh = null
    this._glowExcluded = false
    this._clearBase = null
    this.starEl = null
    this._removeFogLayer?.()
    this._removeFogLayer = null
    this._vacuum = 0
    // Hand intensity ownership back to the sun before we let go of it.
    if (this.sunEl != null) this.sunEl.externallyLit = false
    this.sunEl = null
    super.sceneDispose()
  }

  render() {
    super.render()
    this.updateSky()
  }
}

export const b3dSkybox = B3dSkybox.elementCreator()
