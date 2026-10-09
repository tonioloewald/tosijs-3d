/*#
# b3d-water

Water plane with reflections, waves, and underwater fog effect.

## Demo

**A lake with a few crates on the shore.** The sun rakes across the surface; the water reflects the
sky and the crates. Drag to orbit — dip the camera below the surface and the world tints and dims.

```js
import { b3d, b3dSkybox, b3dWater, b3dReflections, b3dGround, sceneDelta } from 'tosijs-3d'
import { demoSun, orbitCam, spinner } from 'tosijs-3d/demo-utils'

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 24, beta: Math.PI / 2.8, target: [0, 0.4, 0] })
      // crates floating ON the surface (bottom at the water line), bobbing on the swell
      const a = spinner(el, { x: -5, y: 1.0, z: -3, size: 2, spin: 0.12 })
      const b = spinner(el, { x: 4.5, y: 0.7, z: 4, size: 1.4, spin: -0.18 })
      let t = 0
      el.scene.registerBeforeRender(() => {
        t += sceneDelta(el.scene)
        a.position.y = 1.0 + Math.sin(t * 1.1) * 0.14
        b.position.y = 0.7 + Math.sin(t * 1.5 + 1) * 0.14
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 9 }),
  // a textured seafloor, visible through the translucent water — gives the surface real depth
  b3dGround({ y: -1.2, width: 60, height: 60, texture: 'checker', textureTiles: 20, color: '#3a5f6b' }),
  b3dWater({ waterSize: 60, waveHeight: 0.4, windForce: -4, twoSided: true }),
  b3dReflections(),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `textureSize` | `0` (auto) | Size of the reflection and refraction textures. Each is the whole scene drawn again. `0` follows the device tier: 1024 / 512 / 256 |
| `reflectionRefresh` | `0` (auto) | Redraw those textures every Nth frame. `0` follows the device tier: 1 / 2 / 3. `1` is every frame. Flat only: inside a headset session it is always every frame, because skipping one eye's reflection breaks stereo |
| `waterSize` | `128` | Size of the water plane |
| `subdivisions` | `32` | Mesh subdivisions |
| `twoSided` | `false` | Render both sides |
| `underside` | `'auto'` | Snell's window from below: straight up, a bright window onto the sky; toward grazing angles, a mirror of the depths. `'auto'` = on whenever `twoSided`; `'on'`/`'off'` force it. Fades in with the underwater fog |
| `fogColor` | `'#00264d'` | The colour of the water you are IN (the underwater fog). Sea blue by default; a methane sea (Titan) is dark amber |
| `undersideColor` | `'#9fdcf0'` | The window: the sky's light, looking up |
| `undersideDepthColor` | `'#06283a'` | The mirror: the dark water, at grazing angles |
| `undersideSky` | `1` | From below, the window REFRACTS THE REAL SKY (the sun included), distorted by the ripples — clearest in the shallows, fading with depth, giving way to the dark mirror toward grazing angles. `0` = the flat `undersideColor` only |
| `caustics` | `'auto'` | Light through the moving surface, dancing on everything beneath it (terrain, hulls, the player). `'auto'` = on whenever `twoSided`. Fades with depth and fog; follows the sun |
| `causticsStrength` | `0.6` | How bright the web gets |
| `causticsScale` | `6` | Metres per caustic cell: bigger is coarser and calmer |
| `shore` | `'off'` | `'on'` gives the surface the depth of the water under it, from the scene's terrain, and draws a shoreline from it: surf running in, pale shallows, and ice that spreads out from the land when the climate at sea level is below freezing. See [water-shore](/water-shore/). Not for `spherical` water. Set at build time |
| `shoreFine` | `false` | With `shore="on"`: a water vertex every 2 m near the viewer where there is otherwise one every 4 m (about 16,600 vertices, up from 9,400). The surf follows a winding shore more closely; each refresh of the shore data (when the water re-centres, every 32 m travelled) costs about two thirds more. Set at build time |
| `receiveShadows` | `'on'` | The surface (and the ice on it) takes shadows from the sun and from clouds. `'off'` skips both lookups per water pixel |
| `follow` | `false` | Ride the camera in x/z (endless sea): the plane snaps to a coarse grid under you, ripples stay anchored in world space |
| `windForce` | `-5` | Wind strength |
| `waveHeight` | `0` | Wave amplitude |
| `bumpHeight` | `0.1` | Normal map bump intensity |
| `waterColor` | `'#0066cc'` | Water tint color |
| `colorBlendFactor` | `0.1` | How much color tints the water |
| `spherical` | `false` | Use a sphere instead of a plane |

## Underwater Effect

When the camera goes below the water surface, a blue fog is automatically applied.
The sun (if present via `b3dSun`) is also dimmed based on depth.

```javascript
import { b3d, b3dWater, b3dSun, b3dSkybox } from 'tosijs-3d'

document.body.append(
  b3d({},
    b3dSun({}),
    b3dSkybox({ timeOfDay: 12 }),
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024 })
  )
)
```
*/
/*{ "parent": "water", "order": 10 }*/

import { plane as mediumPlane, type PlaneMedium } from './medium.js'
import * as BABYLON from '@babylonjs/core'
import { headsetDevice, resolveBudget } from './b3d-quality.js'
import { waterNormalTexture } from './water-normal.js'
import { WaterMaterial } from '@babylonjs/materials'
import {
  AbstractMesh,
  fetchedUrl,
  markCollisionGroup,
  sceneDelta,
  isOff,
} from './b3d-utils.js'
import { inheritedWind, waterWind } from './wind.js'
import { band } from './atmosphere.js'
import { CausticsMap } from './caustics.js'
import {
  shoreGrid,
  shoreData,
  iceBears,
  bearingTriangles,
  type ShoreGrid,
} from './water-shore.js'
import {
  registerShoreWater,
  IceUndersidePlugin,
  CLOUD_UNIFORMS,
  CLOUD_SAMPLER,
} from './water-shore-shader.js'
import { cloudShadowMapOf } from './cloud-shadows.js'
import { seasonOf } from './biome-plugin.js'
import { planetTemperature } from './biome-chart.js'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d.js'

export class B3dWater extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-water'

  static initAttributes = {
    // Underwater fog: how thick, and how sharply it takes over as you cross the surface.
    // The transition is deliberately TIGHT (see the fog layer below): killing the "thunk"
    // meant killing the discontinuity, not the contrast.
    underwaterFog: 0.12, // density the moment you're under
    /** The colour of the water you are IN: sea blue by default; a methane sea
     * (Titan) is dark amber. The fog, the medium's optics and the light
     * shafts all read it. */
    fogColor: '#00264d',
    underwaterMurk: 0.08, // extra density at 30m down (the sea thickens with depth)
    fogTransition: 0.2, // metres below the surface to reach FULL underwater fog
    /*
    THE UNDERSIDE — what the surface looks like from BELOW (board #197,
    tosijs-3d#15). 'auto' = on whenever `twoSided` (the only time you can see
    the underside at all). Snell's window: straight up, the surface is a
    bright window onto the sky (`undersideColor`); toward grazing angles it
    becomes a mirror of the dark water (`undersideDepthColor`).
    */
    underside: 'auto' as 'auto' | 'on' | 'off',
    undersideColor: '#9fdcf0',
    undersideDepthColor: '#06283a',
    /*
    THE WINDOW SHOWS THE REAL SKY: from below, looking up, the surface
    refracts the actual sky (sun included), rippled by the waves; clearest
    in the shallows. 0 = the flat window colour only.
    */
    undersideSky: 1,
    /*
    CAUSTICS — light through the moving surface, dancing on whatever is
    beneath (board #198, tosijs-3d#16). 'auto' = on whenever `twoSided` (a
    sea you go under). Projected by world position, so terrain, hulls and the
    player all get it with no per-mesh setup; see `caustics`.
    */
    caustics: 'auto' as 'auto' | 'on' | 'off',
    causticsStrength: 0.6,
    /** Metres per caustic cell: bigger = a coarser, calmer web. */
    causticsScale: 6,
    ...AbstractMesh.initAttributes,
    spherical: false,
    waterSize: 128,
    subdivisions: 32,
    // 0 = auto: from the device tier (1024 / 512 / 256). Each of the two
    // textures is the whole scene drawn again.
    textureSize: 0,
    // 0 = auto: redraw the reflection and refraction every Nth frame, from the
    // device tier (1 / 2 / 3). 1 = every frame.
    reflectionRefresh: 0,
    twoSided: false,
    // Follow the camera in x/z so a finite plane reads as an ENDLESS sea. The mesh rides with
    // you but the ripple pattern is offset back into WORLD space (so the surface looks fixed, not
    // dragged along), and how often the reflection is redrawn is `reflectionRefresh`
    // (a moving sea doesn't need a perfect mirror). Off by default (a small pond doesn't need it).
    follow: false,
    /*
    THE SHORE: give the surface the depth of the water under each vertex (from
    the scene's terrain), and draw from it: foam and pale shallows at the
    waterline, and ice that spreads out from the land as the climate at sea
    level drops below freezing (sheet, then broken plates, then open water).
    See water-shore. Off by default: it needs a terrain and replaces the mesh
    with a finer one.
    */
    shore: 'off' as 'on' | 'off',
    // Twice the vertices near the viewer, for a shoreline you stand at.
    shoreFine: false,
    /*
    THE SURFACE TAKES SHADOWS. It never did: the water does not register with
    the scene the way a loaded mesh does, so the sun never marked it as a
    receiver, and a cliff, a hull or a tree threw no shadow on the sea. On
    open water that is easy to miss. On ICE it is not: a white sheet with
    nothing on it casting a shadow reads as a flat cut-out (Tonio: "ice on
    water surface doesn't receive shadows"). `'off'` restores the old look
    and saves the shadow lookup per water pixel.
    */
    receiveShadows: 'on' as 'on' | 'off',
    /*
    EMPTY MEANS PROCEDURAL, and that is the default on purpose.

    It used to default to `/waterbump.png` — root-absolute so it resolved the
    same from every `/{slug}/` doc page, which was correct reasoning about the
    wrong problem: **the file ships in this repo's `static/`, not in the
    package**. So every consumer taking the documented default pointed at a file
    they had never been told to serve.

    And the failure is silent in the worst way. Babylon's `Texture` falls back
    when a fetch does not decode, so the sea renders as a CHECKERBOARD — which
    reads as a deliberate style rather than a missing asset. ensemble's owner
    asked whether it was intentional and said it looked awesome (tosijs-3d#46).

    A 59 KB PNG could have been shipped, but a path that must resolve at a
    fixed URL is the footgun itself, not the file. `waterNormalTexture` builds
    one from the Perlin noise this library already has: no file, no network, no
    path to get wrong, and it works offline and inside a headset. Set
    `normalMap` to override with something prettier.
    */
    normalMap: '',
    windForce: -5,
    waveHeight: 0,
    bumpHeight: 0.1,
    waveLength: 0.1,
    waterColor: '#0066cc',
    colorBlendFactor: 0.1,
    windDirectionX: 0.6,
    windDirectionY: 0.8,
    /*
    Take the SCENE's wind, or this element's own. See [[wind]] and the same
    note on `b3d-clouds`: a mode rather than "absence means inherit", because
    `windForce` defaults to -5 and there is no value meaning "unset".

    Additive: a scene with no `windSpeed` has no wind to offer, so the three
    `wind*` attributes below still apply exactly as they did.
    */
    wind: 'scene' as 'scene' | 'own',
  }

  waterMaterial?: WaterMaterial
  private _callback?: SceneAdditionHandler
  private _underwaterUpdate?: () => void
  private _removeFogLayer?: () => void
  private _removeMedium?: () => void
  private _medium: PlaneMedium | null = null
  /** Is the sky currently fogged for us? Latched so we only touch it on a crossing. */
  private _skyFogged = false
  /** What each sky mesh's `applyFog` was before we took it — restored on exit. */
  private _skyWasFogged = new WeakMap<BABYLON.AbstractMesh, boolean>()
  private _followTick?: () => void
  private _ceilingTick?: () => void
  private _caustics: CausticsMap | null = null
  private _ceiling: BABYLON.Mesh | null = null
  private _ceilingBump: BABYLON.Texture | null = null
  /** The fog layer's crossing weight (0 in air, 1 fully under) — ONE value,
   * so the underside fades in exactly as the fog does. */
  private _underW = 0
  private _shimmer = 0
  /** Milliseconds of scene time, for the water shader. See `_windTick`. */
  private _clock = 0
  private _ceilingKey = ''
  private _windTick?: () => void
  private _wasUnderwater = false

  private waterCallback(additions: SceneAdditions) {
    const { meshes } = additions
    if (meshes == null) return
    for (const mesh of meshes) {
      if (!mesh.name.includes('water')) {
        this.waterMaterial!.addToRenderList(mesh)
        // Caustics on everything that could be under the surface; the shader
        // itself does nothing above it, so there is no need to be choosy.
        if (
          this._caustics != null &&
          mesh.material != null &&
          !/sky/i.test(mesh.name)
        )
          this._caustics.attachTo(mesh.material)
      }
    }
  }

  private _causticsOn(): boolean {
    const c = (this as any).caustics
    if (c === 'off') return false
    if (c === 'on') return true
    return (this as any).twoSided === true
  }

  private _updateCaustics(scene: BABYLON.Scene): void {
    const map = this._caustics
    if (map == null || this.mesh == null) return
    try {
      map.waterY = this.mesh.absolutePosition.y
      map.time += sceneDelta(scene)
      map.strength = Math.max(0, (this as any).causticsStrength ?? 0.6)
      map.cellSize = Math.max(0.5, (this as any).causticsScale ?? 6)
      // The sun: the first directional light, which is what b3d-sun makes.
      const sun = scene.lights.find(
        (l) => l instanceof BABYLON.DirectionalLight
      ) as BABYLON.DirectionalLight | undefined
      if (sun != null) {
        const d = sun.direction
        const len = Math.hypot(d.x, d.y, d.z) || 1
        map.sunX = d.x / len
        map.sunY = d.y / len
        map.sunZ = d.z / len
        // No sun, no caustics: they are the sun's light, focused.
        map.strength *= Math.min(1, Math.max(0, sun.intensity))
      }
    } catch {
      /* never throw in the render loop */
    }
  }

  /**
   * Wave wind: the scene's, or this element's own.
   *
   * `WaterMaterial` wants a force alongside a roughly UNIT direction, so the
   * speed cannot be folded into the vector — `waterWind` does that split.
   */
  private _wind(): {
    windForce: number
    windDirectionX: number
    windDirectionY: number
  } {
    const attrs = this as any
    const scene = inheritedWind(attrs.wind, this.owner?.weatherHere?.().wind)
    if (scene != null) return waterWind(scene)
    return {
      windForce: attrs.windForce,
      windDirectionX: attrs.windDirectionX,
      windDirectionY: attrs.windDirectionY,
    }
  }

  private updateWater() {
    if (this.waterMaterial == null || this.owner == null) return
    const attrs = this as any
    this.waterMaterial.backFaceCulling = !attrs.twoSided
    const wind = this._wind()
    this.waterMaterial.windForce = wind.windForce
    this.waterMaterial.windDirection = new BABYLON.Vector2(
      wind.windDirectionX,
      wind.windDirectionY
    )
    this.waterMaterial.waveHeight = attrs.waveHeight
    this.waterMaterial.waveLength = attrs.waveLength
    this.waterMaterial.bumpHeight = attrs.bumpHeight
    if (attrs.colorBlendFactor > 0) {
      const hex = attrs.waterColor as string
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      this.waterMaterial.waterColor = new BABYLON.Color3(r, g, b)
    }
    this.waterMaterial.colorBlendFactor = attrs.colorBlendFactor
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any

    // `shore` asked for and not given must say so: the water is otherwise
    // simply plain, with no surf, no ice and nothing to explain it.
    // Patched for every water, not only a shore: the patch is also where the
    // surface takes cloud shadows.
    const patched = registerShoreWater()
    const shoreReady = attrs.shore === 'on' && patched
    if (attrs.shore === 'on' && attrs.spherical) {
      console.warn(
        'tosi-b3d-water: shore="on" does nothing on spherical water.'
      )
    } else if (attrs.shore === 'on' && !shoreReady) {
      console.warn(
        `tosi-b3d-water: shore="on" could not patch the water shader of this Babylon (${BABYLON.Engine.Version}), so there is no shoreline or ice. Please report it.`
      )
    } else if (attrs.shoreFine && attrs.shore !== 'on') {
      console.warn('tosi-b3d-water: shoreFine does nothing without shore="on".')
    }

    if (attrs.spherical) {
      this.mesh = BABYLON.MeshBuilder.CreateSphere(
        'water_nocast',
        { segments: attrs.subdivisions, diameter: attrs.waterSize },
        scene
      )
    } else if (shoreReady) {
      // A grid that is fine around the viewer, with a vertex colour holding
      // [depth, ice] that the patched shader draws the shoreline from.
      // A vertex every 4 m out to 64 m from the centre, then spreading;
      // `shoreFine` makes that every 2 m.
      const size = Math.max(1, attrs.waterSize)
      const grid = attrs.shoreFine
        ? shoreGrid(size, 64, 2, 32)
        : shoreGrid(size)
      const mesh = new BABYLON.Mesh('water_nocast', scene)
      const data = new BABYLON.VertexData()
      data.positions = grid.positions
      data.normals = grid.normals
      data.uvs = grid.uvs
      data.indices = grid.indices
      data.applyToMesh(mesh)
      const shore = new Float32Array(grid.count * grid.count * 4)
      // Until the terrain answers: deep, open water everywhere.
      for (let i = 0; i < shore.length; i += 4) {
        shore[i] = 60
        shore[i + 3] = 40 // far from any shore
      }
      mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, shore, true, 4)
      this.mesh = mesh
      this._shore = { grid, data: shore, key: '' }
      /*
      SOLID ICE IS A MESH, so it is solid for everyone.

      The same vertices as the water, with only the triangles whose ice bears
      weight (`_updateIceMesh` refills the index list whenever the shore data
      changes). It collides and picks like any ground, so a car, a shell and a
      ground probe all meet it without knowing what ice is. Never drawn
      (`visibility` 0, which leaves it pickable). In the `ice` collision group
      for anything that wants to tell it from land.
      */
      const ice = new BABYLON.Mesh('water-ice_nocast', scene)
      const iceData = new BABYLON.VertexData()
      iceData.positions = grid.positions
      iceData.normals = grid.normals
      iceData.indices = grid.indices
      iceData.applyToMesh(ice, true)
      ice.visibility = 0
      ice.checkCollisions = true
      ice.setEnabled(false)
      markCollisionGroup(ice, 'ice')
      this._ice = ice
    } else {
      this.mesh = BABYLON.MeshBuilder.CreateGround(
        'water_nocast',
        {
          width: attrs.waterSize,
          height: attrs.waterSize,
          subdivisions: attrs.subdivisions,
        },
        scene
      )
    }
    this.mesh.checkCollisions = false
    this.mesh.receiveShadows = !isOff(attrs.receiveShadows)
    /*
    MARK IT AS WATER.

    A ground probe raycasts for "what is under me", and Babylon meshes are
    pickable by default — so an aircraft's floor sensor hit the water SURFACE
    and called it ground. That is right for a plane ditching in the sea and
    wrong for anything meant to go under: the b3d-ambient dive demo set
    `groundY: -40` to reach the seabed and still stopped dead at the waterline
    ("you can't fly down to the sea because you crash into the water").

    A flag rather than `isPickable = false`, because the surface still needs to
    be pickable — querying water height at a point is a feature we want, not one
    to design out. Consumers decide what water means to them; this only lets
    them tell it apart.
    */
    this.mesh.metadata = { ...(this.mesh.metadata ?? {}), b3dWater: true }
    /*
    Also a collision GROUP, which is the general form of the same idea.

    `b3dWater` answers "is this water" and `b3dAircraft.submersible` consults
    it — but that pairing is aircraft-specific and hardcodes the one substance.
    A group lets any mover say what it treats as solid, which is what a torpedo
    (water is a ceiling) or a depth charge (water is a trigger) needs and no
    per-element attribute on the aircraft can express. See `markCollisionGroup`.
    */
    markCollisionGroup(this.mesh, 'water')

    /*
    THE WATER DRAWS THE SCENE TWICE MORE, once mirrored for the reflection and
    once for the refraction. Both were 1024 and redrawn every frame on every
    device, whatever the tier (and a comment on `follow` said otherwise). On a
    standalone headset that was two extra full scene draws per frame on top of
    two eyes. Size and rate now come from the budget, and on a headset from the
    XR tier, because the textures are built once.
    */
    const xr = headsetDevice()
    const textureSize = resolveBudget(attrs.textureSize, 'waterTextureSize', {
      xr,
    })
    this.waterMaterial = new WaterMaterial(
      'water',
      scene,
      new BABYLON.Vector2(textureSize, textureSize)
    )
    if (patched) this._wireCloudShadows(this.waterMaterial, scene)
    const refresh = Math.max(
      1,
      Math.round(resolveBudget(attrs.reflectionRefresh, 'waterRefresh', { xr }))
    )
    const targets = this.waterMaterial.getRenderTargetTextures?.().data ?? []
    /*
    EVERY FRAME WHILE A SESSION IS PRESENTING. Babylon advances a target's
    refresh counter once per CAMERA, and a headset has two: a rate of 2 drew
    the reflection for the left eye only (and saved nothing), a rate of 3
    alternated eyes, and the skipped eye showed the other eye's reflection.
    Found by the 0.8.15 review; skipping whole frames for both eyes together
    is the real fix and is not built yet. The smaller TEXTURE still applies
    in a headset, which is where most of the saving was.
    */
    const applyRefresh = () => {
      const rate = (this.owner as any)?.xrActive === true ? 1 : refresh
      for (const target of targets) {
        if (target != null && target.refreshRate !== rate)
          target.refreshRate = rate
      }
    }
    applyRefresh()
    if (this._refreshObserver != null)
      scene.onBeforeRenderObservable.remove(this._refreshObserver)
    this._refreshObserver =
      refresh > 1 ? scene.onBeforeRenderObservable.add(applyRefresh) : null
    const normalMap = fetchedUrl(attrs.normalMap, 'b3d-water normalMap')
    this.waterMaterial.bumpTexture = normalMap
      ? // An explicit path: load it, but SAY SO if it fails. The checkerboard
        // fallback is indistinguishable from a style choice, so silence here is
        // what cost ensemble the confusion in the first place.
        new BABYLON.Texture(
          normalMap,
          scene,
          undefined,
          undefined,
          undefined,
          undefined,
          () => {
            console.error(
              `b3d-water: normalMap "${attrs.normalMap}" failed to load — the sea will render as a checkerboard. ` +
                `Leave normalMap unset for the built-in procedural map.`
            )
          }
        )
      : waterNormalTexture(scene)
    this.updateWater()
    this.mesh.material = this.waterMaterial

    if (this._causticsOn()) this._caustics = new CausticsMap(scene)
    this._callback = this.waterCallback.bind(this)
    owner.addSceneListener(this._callback)

    // FOLLOW: ride the camera in x/z so the finite plane always surrounds you (an endless sea),
    // while the bump pattern is scrolled back into WORLD space so the ripples stay put instead
    // of sliding along with the mesh. The plane's y stays where the attr puts it (sea level).
    /*
    THE SCENE'S WIND CHANGES WITHOUT THIS ELEMENT RENDERING.

    `updateWater` runs on this component's own render, and a write to the
    SCENE's `windSpeed` does not queue one here — so water kept the wind it had
    while the clouds turned. (Clouds were fine by luck: they read the wind
    inside their own per-frame drift.)

    Cheap because it compares first: the material is only touched when the
    resolved wind actually differs, so a steady scene costs a hypot per frame.
    */
    this._windTick = () => {
      const mat = this.waterMaterial
      if (mat == null) return
      /*
      THE WATER'S CLOCK IS OURS.

      WaterMaterial advances its own time only on a frame whose duration
      DIFFERS from the last one's ("prevent adding delta time if it hasn't
      changed": its way of not counting a frame twice when it binds more than
      once). Where frame times are steady, which is any browser that rounds
      its timer and any display holding its rate, consecutive frames are the
      same length and the clock barely moves: the ripples crawl and the surf
      stands still. So the time is written here, once a frame, and the
      material is told this frame's duration is already counted. It also
      stops when the scene is paused, which the material's never did.
      */
      this._clock += sceneDelta(scene) * 1000
      const clocked = mat as unknown as {
        _lastTime: number
        _lastDeltaTime: number
      }
      clocked._lastTime = this._clock
      clocked._lastDeltaTime = scene.getEngine().getDeltaTime()
      const next = this._wind()
      if (
        Math.abs(mat.windForce - next.windForce) < 1e-4 &&
        Math.abs(mat.windDirection.x - next.windDirectionX) < 1e-4 &&
        Math.abs(mat.windDirection.y - next.windDirectionY) < 1e-4
      ) {
        return
      }
      mat.windForce = next.windForce
      mat.windDirection = new BABYLON.Vector2(
        next.windDirectionX,
        next.windDirectionY
      )
    }
    scene.registerBeforeRender(this._windTick)

    this._ceilingTick = () => {
      this._updateCeiling(scene)
      this._updateCaustics(scene)
    }
    scene.registerBeforeRender(this._ceilingTick)

    if (this._shore != null) {
      this._shoreTick = () => this._updateShore(false)
      scene.registerBeforeRender(this._shoreTick)
    }

    if (attrs.follow) {
      // Run it on beforeRender (authoritative, right before the scene draws) AND re-run it from
      // render() below — because AbstractMesh.render() rewrites the mesh position from the x/z
      // attrs, which would yank a followed plane back to the origin for a frame.
      this._followTick = () => this._applyFollow()
      scene.registerBeforeRender(this._followTick)
    }

    // UNDERWATER — a fog LAYER, not a switch.
    //
    // This used to snap: `if (underwater && !wasUnderwater) { fogMode = EXP2; … }`. Two
    // discontinuities in one line — fogMode is a shader DEFINE (so every material recompiled:
    // that's the hitch), and colour/density jumped at the exact plane of the surface. The
    // "thunk".
    //
    // Now the weight RAMPS over a band around the waterline (so passing through reads as
    // *entering the water* rather than teleporting into it) and keeps deepening as you go
    // down. The scene composites and smooths it; nothing toggles. See atmosphere.ts.
    /*
    PUBLISH THE WATER AS A MEDIUM.

    The surface height and the transition band already exist here — they drive
    the fog layer below — so a projectile asking "how much drag?" or a vehicle
    asking "am I under?" can read them instead of hunting down the water mesh
    and re-deriving the answer. Two derivations of one fact is how the sky and
    the fog ended up disagreeing about where the surface was (#12/#15).

    `y` tracks the mesh each frame (a followed plane moves), so the medium is a
    live view rather than a value captured at setup.
    */
    this._medium = mediumPlane({
      name: 'water',
      y: this.mesh?.absolutePosition.y ?? (this as any).y ?? 0,
      band: Math.max(0.02, (this as any).fogTransition),
      // A round entering water sheds speed hard; the number is a starting point
      // for depth charges and torpedoes, not a physical constant.
      drag: 40,
      density: 1000,
      /*
      ⚠️ EXPERIMENTAL, and deliberately NOT load-bearing yet.

      These are the same numbers the fog layer below computes from, published so
      the underside shader, the light shafts and anything else that wants "how
      murky is it here" can read ONE answer instead of deriving a second (which
      is how the fogged sky and the transparent window ended up contradicting
      each other). The shipped fog layer still computes its own, because that
      path is verified and swapping it is a visual change that wants an eye on
      it — see MEDIUM-DESIGN.md §7 step 1.
      */
      optics: {
        color: this._fogRgb(),
        density: (this as any).underwaterFog,
        murk: (this as any).underwaterMurk,
        murkDepth: 30,
        minVisibility: 6,
      },
    })
    this._removeMedium = owner.addMedium(this._medium as PlaneMedium)

    this._removeFogLayer = owner.addFogLayer(() => {
      if (this._medium != null && this.mesh != null) {
        this._medium.y = this.mesh.absolutePosition.y
      }
      const cam = scene.activeCamera
      if (!cam || !this.mesh) return null
      const depth = this.mesh.absolutePosition.y - cam.globalPosition.y
      // A TIGHT band across the surface — full underwater within ~20cm of crossing.
      //
      // Killing the "thunk" meant killing the DISCONTINUITY (the shader recompile from
      // switching fogMode, and the instant jump at a plane), NOT the contrast. A wide band
      // reads as mush: at the waterline you'd be only ~10% submerged and the sea would fade
      // in over metres. Being underwater should be OBVIOUS the moment you are — and being out
      // should be obvious the moment you're out. Fast, but continuous.
      const attrs = this as any
      const w = band(depth, -0.05, Math.max(0.02, attrs.fogTransition))
      this._underW = w
      this._fogTheSky(w > 0)
      if (w <= 0) return null
      // Murk with depth is both true and useful — it hides what's below you.
      const deeper = Math.min(1, Math.max(0, depth / 30))
      /*
      AND THE BASE FOG EASES OFF AS YOU APPROACH THE SURFACE.

      It used to be full-strength the instant you were under, so the whole
      transition happened in the 20 cm crossing band: fog, then no fog. Tonio:
      "we should make the water fog attenuate slightly as we approach the
      surface."

      Physically it is light getting in — the last couple of metres are the
      brightest water there is — and it reads as the surface becoming visible
      *before* you reach it rather than arriving all at once. `SHALLOW_EASE`
      keeps it slight: a bit over half strength at the surface, full by two
      metres, which is enough to feel without making shallow water look clear.

      Deliberately separate from the crossing band above: that one is about not
      flickering the fog mode at the plane, this one is about how the medium
      looks. Folding them together would tie a visual choice to a numerical
      guard.
      */
      const SHALLOW_EASE = 0.55
      const SHALLOW_DEPTH = 2
      const lit = Math.min(1, Math.max(0, depth / SHALLOW_DEPTH))
      const nearSurface = SHALLOW_EASE + (1 - SHALLOW_EASE) * lit
      const density =
        attrs.underwaterFog * nearSurface + attrs.underwaterMurk * deeper
      const fogRgb = this._fogRgb()
      // The medium's optics follow a live colour change too.
      if (this._medium?.optics != null) this._medium.optics.color = fogRgb
      return {
        weight: w,
        color: fogRgb,
        density,
        // b3d-fog defaults to LINEAR, which IGNORES density and uses start/end — so contribute a
        // short `end` too (as clouds do), else underwater tints but never thickens. Visibility
        // shrinks as the sea deepens (~25m near the surface, ~15m in the murk).
        start: 0,
        end: Math.max(6, 3 / density),
      }
    })
  }

  /**
   * THE SKY IS UNDERWATER TOO.
   *
   * A skybox is built `applyFog = false` and `infiniteDistance = true` — correct
   * in air, where a long fog layer would otherwise swallow the whole sky. But
   * submerged it means the fog does its job on everything EXCEPT the thing
   * filling most of the screen, so you fly through a faintly-tinted SKY instead
   * of through water. (tosijs-3d#12, manta-recon: "can't see anything underwater
   * except for the skybox".)
   *
   * Nastier than it sounds because of the trap it sets: turning `underwaterFog`
   * down to fix over-murky water makes it WORSE, since the heavy fog was the only
   * thing disguising an unfogged sky. So tuning clarity walks you into it.
   *
   * Under EXP2 fog an infinite-distance mesh resolves to the fog colour in every
   * direction, which is exactly what deep water looks like. This belongs here
   * because `b3d-water` already owns the fog layer and already computes camera
   * depth — anything else would have to duplicate both inputs and could disagree
   * with them at the boundary.
   *
   * Keyed off the same band weight as the fog itself (`w > 0`), so sky and fog
   * cannot disagree about where the surface is. It's a step where everything else
   * is a ramp, but density is ~0 at the crossing, so there is nothing to see;
   * `applyFog` is a boolean, so a true cross-fade would need per-mesh fog
   * strength, which Babylon doesn't offer.
   */
  private _fogTheSky(submerged: boolean): void {
    if (submerged === this._skyFogged) return
    this._skyFogged = submerged
    for (const sky of this._skyMeshes()) {
      if (submerged) {
        this._skyWasFogged.set(sky, sky.applyFog)
        sky.applyFog = true
      } else {
        sky.applyFog = this._skyWasFogged.get(sky) ?? false
      }
    }
  }

  /** The skybox meshes to fog. Asks the `<tosi-b3d-skybox>` elements first —
   * a named element beats a name match — and falls back to the naming convention
   * so a hand-built or GLB skybox still works. */
  private _skyMeshes(): BABYLON.AbstractMesh[] {
    const out: BABYLON.AbstractMesh[] = []
    const owner = this.owner
    if (owner == null) return out
    for (const el of owner.querySelectorAll('tosi-b3d-skybox')) {
      const m = (el as unknown as { mesh?: BABYLON.AbstractMesh | null }).mesh
      if (m) out.push(m)
    }
    if (out.length > 0) return out
    const scene = owner.scene
    if (scene == null) return out
    for (const m of scene.meshes) {
      if (m.infiniteDistance && /skybox|skydome/i.test(m.name)) out.push(m)
    }
    return out
  }

  /*
  SNELL'S WINDOW. From below, `WaterMaterial` has nothing to say: it is built
  for the view from above, so a `twoSided` underside was flat dark blue.

  One opaque plane just under the surface, riding the camera in x/z, shaded
  by EMISSIVE FRESNEL: near-perpendicular it is the window (bright, sky
  coloured), at grazing angles the mirror of the depths. No shader, no extra
  render target, one draw call, and only while submerged. Its shimmer comes
  from a clone of the water's own normal map, so the window's edge and the
  surface's ripples are the same motion.

  OPAQUE, and the sky stays fogged. manta-recon's prototype made the ceiling
  see-through and un-fogged the skybox so the window showed the real sky, but
  then a horizontal look under water also sees an un-fogged sky, which is
  wrong. Here the window's light is the ceiling's own emissive, and the scene
  fog dims it with distance, which is physically right: far overhead water
  is murk.
  */
  private _fogKey = ''
  private _fogCache = { r: 0, g: 0.15, b: 0.3 }
  /** `fogColor` as {r,g,b}, parsed only when it changes. */
  private _fogRgb(): { r: number; g: number; b: number } {
    const v = String((this as any).fogColor ?? '')
    if (v !== this._fogKey) {
      this._fogKey = v
      const c = this._hexOr(v, '#00264d')
      this._fogCache = { r: c.r, g: c.g, b: c.b }
    }
    return this._fogCache
  }

  private _hexOr(v: string, d: string): BABYLON.Color3 {
    try {
      return BABYLON.Color3.FromHexString((v || d).slice(0, 7))
    } catch {
      return BABYLON.Color3.FromHexString(d)
    }
  }

  private _undersideOn(): boolean {
    const u = (this as any).underside
    if (u === 'off') return false
    if (u === 'on') return true
    return (this as any).twoSided === true
  }

  private _updateCeiling(scene: BABYLON.Scene): void {
    try {
      const cam = scene.activeCamera
      const w = this._underW
      if (!this._undersideOn() || cam == null || this.mesh == null || w <= 0) {
        this._ceiling?.setEnabled(false)
        this._pauseWindow()
        return
      }
      if (this._ceiling == null) this._ceiling = this._buildCeiling(scene)
      const waterY = this.mesh.absolutePosition.y
      const c = cam.globalPosition
      this._ceiling.setEnabled(true)
      this._updateWindow(scene, waterY, c)
      // With shore data the underside moves in 4 m steps (its fine cell),
      // so its vertices stay on the same world lines as it follows.
      const cs = this._ceilingShore
      const ux = cs != null ? Math.round(c.x / 4) * 4 : c.x
      const uz = cs != null ? Math.round(c.z / 4) * 4 : c.z
      this._ceiling.position.set(ux, waterY - 0.08, uz)
      if (cs != null) this._updateCeilingShore(cs, ux, uz, waterY)
      this._ceiling.visibility = w
      const bump = this._ceilingBump
      if (bump != null) {
        // Anchored to the WORLD (not the camera the plane rides with), and
        // drifting slowly so the window's edge shimmers.
        this._shimmer += sceneDelta(scene) * 0.03
        const cell = 2000 / bump.uScale
        bump.uOffset = ux / cell + this._shimmer
        bump.vOffset = uz / cell + this._shimmer * 0.6
      }
      // Live colours: a slider on either should move the window now.
      const key = `${(this as any).undersideColor}|${
        (this as any).undersideDepthColor
      }`
      if (key !== this._ceilingKey) {
        this._ceilingKey = key
        const f = (this._ceiling.material as BABYLON.StandardMaterial)
          .emissiveFresnelParameters
        if (f != null) {
          f.leftColor = this._hexOr(
            (this as any).undersideDepthColor,
            '#06283a'
          )
          f.rightColor = this._hexOr((this as any).undersideColor, '#9fdcf0')
        }
      }
    } catch {
      /* never throw in the render loop — it skips every observer after this */
    }
  }

  /*
  THE WINDOW SHOWS THE SKY (Tonio: "more transparent looking straight up (at
  low depths) to show the distorted sky rather than have this weird throbbing
  circle" — the glare sprite that preceded this).

  The ceiling cannot simply be see-through: underwater the sky is FOGGED (a
  horizontal look must not see blue sky), so looking through would show fog.
  Instead a small reflection probe photographs the sky with its fog OFF, and
  the ceiling REFRACTS that cube through the water's own normal map. So the
  sky, and the sun in it, arrive bent and rippled, which is what the window
  is; the fresnel still turns it to the dark mirror at grazing angles, and it
  fades with depth. Sky only, 128 px a face, every few frames, and only
  while you are under: the sky changes slowly.
  */
  private _skyProbe: BABYLON.ReflectionProbe | null = null

  private _updateWindow(
    scene: BABYLON.Scene,
    waterY: number,
    eye: BABYLON.Vector3
  ): void {
    const mat = this._ceiling?.material as BABYLON.StandardMaterial | undefined
    if (mat == null) return
    const want = Math.max(0, Number((this as any).undersideSky) || 0)
    const skies = this._skyMeshes()
    if (want <= 0 || skies.length === 0) {
      this._pauseWindow()
      mat.refractionTexture = null
      return
    }
    if (this._skyProbe == null) {
      // HALF-FLOAT: the sun is captured far above 1 (b3dSunHdr) so it can
      // still blaze after the surface transmits only part of it.
      const probe = new BABYLON.ReflectionProbe(
        'water-window-sky',
        128,
        scene,
        true,
        true
      )
      for (const sky of skies) probe.renderList!.push(sky)
      // Photograph the sky UNFOGGED, then put the underwater fog back.
      /*
      The sky hides itself underwater TWICE: Babylon fog (applyFog), and the
      skybox's own VEIL (b3dVeil = the scene's fogVeil, 1 when submerged),
      which paints it the fog colour. Both off for the photograph, both back
      after; the first version lifted only the fog and photographed a flat
      fog-blue cube.
      */
      const veil = (v: number, sunHdr: number) => {
        for (const sky of skies) {
          const m = sky.material as {
            setFloat?: (n: string, x: number) => void
          }
          m?.setFloat?.('b3dVeil', v)
          m?.setFloat?.('b3dSunHdr', sunHdr)
        }
      }
      probe.cubeTexture.onBeforeRenderObservable.add(() => {
        for (const sky of skies)
          sky.applyFog = this._skyWasFogged.get(sky) ?? false
        // The sun only exists above the horizon, and dims with the day.
        veil(0, 20 * Math.min(1, this._sunUp(scene)))
      })
      probe.cubeTexture.onAfterRenderObservable.add(() => {
        if (this._skyFogged) for (const sky of skies) sky.applyFog = true
        veil((this.owner as any)?.fogVeil ?? 0, 0)
      })
      this._skyProbe = probe
    }
    const probe = this._skyProbe
    probe.position.copyFrom(eye)
    if (probe.refreshRate !== 6) probe.refreshRate = 6
    // Clearest in the shallows: the light has less water to cross.
    const depth = Math.max(0, waterY - eye.y)
    const level = want * 3 * Math.exp(-depth / 15)
    const tex = probe.cubeTexture
    if (mat.refractionTexture !== tex) mat.refractionTexture = tex
    tex.level = level
    // The flat window colour gives way to the real sky as it clears.
    const f = mat.emissiveFresnelParameters
    if (f != null) {
      const win = this._hexOr((this as any).undersideColor, '#9fdcf0')
      f.rightColor = win.scale(Math.max(0, 1 - level))
    }
  }

  /** How much sun there is to blaze through: its light's intensity, 0 when
   * it is below the horizon. */
  private _sunUp(scene: BABYLON.Scene): number {
    const sun = scene.lights.find(
      (l) => l instanceof BABYLON.DirectionalLight
    ) as BABYLON.DirectionalLight | undefined
    if (sun == null || sun.direction.y > -0.02) return 0
    return Math.max(0, sun.intensity)
  }

  /** Stop photographing the sky while there is no window to show it in. */
  private _pauseWindow(): void {
    const p = this._skyProbe
    if (p != null && p.refreshRate !== 0) p.refreshRate = 0
  }

  private _buildCeiling(scene: BABYLON.Scene): BABYLON.Mesh {
    const size = 2000
    let ceiling: BABYLON.Mesh
    if (this._shore != null) {
      // With a shore, the underside carries the same [depth, ice] data as
      // the surface, so the ice is there from below too.
      const grid = shoreGrid(size, 32, 4, 12)
      ceiling = new BABYLON.Mesh('water-underside_nocast', scene)
      const data = new BABYLON.VertexData()
      data.positions = grid.positions
      data.normals = grid.normals
      data.uvs = grid.uvs
      data.indices = grid.indices
      data.applyToMesh(ceiling)
      const shore = new Float32Array(grid.count * grid.count * 4)
      for (let i = 0; i < shore.length; i += 4) {
        shore[i] = 60
        shore[i + 3] = 40 // far from any shore
      }
      ceiling.setVerticesData(BABYLON.VertexBuffer.ColorKind, shore, true, 4)
      this._ceilingShore = { grid, data: shore, key: '' }
    } else {
      ceiling = BABYLON.MeshBuilder.CreateGround(
        'water-underside_nocast',
        { width: size, height: size, subdivisions: 1 },
        scene
      )
    }
    ceiling.isPickable = false
    ceiling.receiveShadows = false
    /*
    UNFOGGED: the fog washed the refracted sky out to a smudge. Distance is
    handled anyway: the far ceiling is seen at grazing angles, which the
    fresnel already turns to the dark mirror, and depth dims the window
    (_updateWindow).
    */
    ceiling.applyFog = false
    // FACE DOWN, toward the swimmer. A ground's normal points up, so from below
    // every pixel is its BACK face, and Fresnel reads a back face as fully
    // grazing: the whole ceiling came out the dark mirror colour, identical to
    // the fog, as if it were not there.
    ceiling.rotation.x = Math.PI
    const mat = new BABYLON.StandardMaterial('water-underside-mat', scene)
    mat.disableLighting = true
    mat.backFaceCulling = false
    mat.diffuseColor = BABYLON.Color3.Black()
    mat.emissiveColor = BABYLON.Color3.White()
    const f = new BABYLON.FresnelParameters()
    // Babylon's Fresnel: `leftColor` at grazing angles, `rightColor` facing.
    f.leftColor = this._hexOr((this as any).undersideDepthColor, '#06283a')
    f.rightColor = this._hexOr((this as any).undersideColor, '#9fdcf0')
    f.power = 2.4
    f.bias = 0.1
    mat.emissiveFresnelParameters = f
    /*
    Looking UP out of water, light bends away from the vertical (n 1.33 to
    1), and past the critical angle there is no window at all: the fresnel
    hands those angles to the mirror of the depths.
    */
    mat.indexOfRefraction = 1.33
    // A probe's cube comes out Y-flipped for refraction lookups: without this
    // the window showed the horizon haze and the sun sat in the -Y face
    // (read off the probe's pixels: 68x in face 3, nothing overhead).
    mat.invertRefractionY = true
    const rf = new BABYLON.FresnelParameters()
    rf.leftColor = BABYLON.Color3.Black() // grazing: no sky, the mirror
    rf.rightColor = BABYLON.Color3.White() // straight up: the sky
    rf.power = 3
    rf.bias = 0.05
    mat.refractionFresnelParameters = rf
    /*
    ITS OWN normal map, the same one the water uses, built fresh. Not a
    `clone()`: a cloned DynamicTexture never reports ready, so the material
    never became ready and the ceiling was silently never drawn (found with a
    debug fog colour; the pixels were fog and sky, never the ceiling). Not
    the water's own instance either: `follow` moves that one's offsets.
    */
    const url = fetchedUrl((this as any).normalMap, 'b3d-water normalMap')
    const b: BABYLON.Texture = url
      ? new BABYLON.Texture(url, scene)
      : waterNormalTexture(scene)
    b.uScale = size / 24
    b.vScale = size / 24
    mat.bumpTexture = b
    this._ceilingBump = b
    if (this._ceilingShore != null) new IceUndersidePlugin(mat)
    ceiling.material = mat
    return ceiling
  }

  private _refreshObserver: BABYLON.Observer<BABYLON.Scene> | null = null

  /*
  CLOUD SHADOWS ON THE SURFACE. WaterMaterial builds its effect from a fixed
  list of uniforms and samplers and offers no hook to extend it, so the names
  the patched shader added are appended as the effect is created; without that
  the locations are never looked up and every set is a silent no-op.
  */
  private _wireCloudShadows(mat: WaterMaterial, scene: BABYLON.Scene): void {
    const ready = mat.isReadyForSubMesh.bind(mat)
    mat.isReadyForSubMesh = (mesh, subMesh, useInstances) => {
      const engine = scene.getEngine() as any
      const create = engine.createEffect
      engine.createEffect = function (name: unknown, options: any) {
        if (name === 'water' && Array.isArray(options?.uniformsNames)) {
          options.uniformsNames.push(...CLOUD_UNIFORMS)
          options.samplers?.push(CLOUD_SAMPLER)
        }
        // eslint-disable-next-line prefer-rest-params
        return create.apply(this, arguments)
      }
      try {
        return ready(mesh, subMesh, useInstances)
      } finally {
        engine.createEffect = create
      }
    }
    mat.onBindObservable.add(() => {
      const effect = mat.getEffect()
      if (effect == null) return
      const map = cloudShadowMapOf(scene)
      if (map == null || this.mesh?.receiveShadows !== true) {
        effect.setFloat('b3dCloudStrength', 0)
        return
      }
      effect.setFloat4(
        'b3dCloudWindow',
        map.centerX,
        map.centerZ,
        1 / map.worldSize,
        map.layerTop
      )
      effect.setFloat4('b3dCloudSun', map.sunX, map.sunY, map.sunZ, map.groundY)
      const st = map.strengthSource?.() ?? 1
      effect.setFloat(
        'b3dCloudStrength',
        Number.isFinite(st) ? Math.max(0, Math.min(1, st)) : 1
      )
      effect.setTexture(CLOUD_SAMPLER, map.sourceTexture ?? map.texture)
    })
  }

  sceneDispose(): void {
    if (this._refreshObserver != null)
      this.owner?.scene?.onBeforeRenderObservable.remove(this._refreshObserver)
    this._refreshObserver = null
    if (this._shoreTick != null)
      this.owner?.scene?.unregisterBeforeRender(this._shoreTick)
    this._shoreTick = undefined
    this._shore = null
    this._ceilingShore = null
    this._iceHeight = null
    this._removeMedium?.()
    this._removeMedium = undefined
    this._medium = null
    // Hand the sky back exactly as we found it — a disposed water element must
    // not leave the sky permanently fogged.
    this._fogTheSky(false)
    if (this.owner && this._callback) {
      this.owner.removeSceneListener(this._callback)
    }
    if (this._followTick) {
      this.owner?.scene.unregisterBeforeRender(this._followTick)
      this._followTick = undefined
    }
    if (this._ceilingTick) {
      this.owner?.scene.unregisterBeforeRender(this._ceilingTick)
      this._ceilingTick = undefined
    }
    this._caustics?.dispose()
    this._caustics = null
    this._skyProbe?.dispose()
    this._skyProbe = null
    this._ceiling?.material?.dispose(true, true)
    this._ceiling?.dispose()
    this._ceiling = null
    this._ice?.dispose()
    this._ice = null
    this._ceilingBump = null
    this._ceilingKey = ''
    this._underW = 0
    if (this._windTick) {
      this.owner?.scene.unregisterBeforeRender(this._windTick)
      this._windTick = undefined
    }
    if (this._removeFogLayer) {
      this._removeFogLayer() // the scene composites fog; nothing to restore, nothing to snap
      this._removeFogLayer = undefined
    }
    this.waterMaterial = undefined
    super.sceneDispose()
  }

  /** Reposition the plane under the camera — but SNAPPED to a coarse grid, so it moves
   * occasionally (once per cell crossed), not every frame. Per-frame movement was the flicker.
   * The waves are world-anchored (procedural + the bump UV offset), so a snap is seamless: the
   * same sea, a differently-centred mesh. `follow` only. */
  private _shore: { grid: ShoreGrid; data: Float32Array; key: string } | null =
    null
  private _ceilingShore: {
    grid: ShoreGrid
    data: Float32Array
    key: string
  } | null = null

  /** The climate at sea level this time of year, on the temperature scale
   * (0 = 0 °C, 1 = 50 °C); warm (never freezes) without a biome terrain. */
  private _seaTemperature(terrain: any): number {
    const p = terrain?.biomePlugin?.isEnabled
      ? terrain.biomePlugin.params
      : null
    return p != null
      ? planetTemperature(
          p.baseTemperature + seasonOf(p.season, p.seasonality).temperature
        )
      : 1
  }

  private _iceHeight: {
    key: string
    fn: (x: number, z: number) => number
  } | null = null

  /**
   * Whether the ice at a point in the scene carries weight: solid ice does,
   * plates and a cracked sheet do not (see water-shore's `iceBears`). Always
   * false without `shore="on"` and a terrain. One terrain sample per call.
   */
  iceBearsAt(x: number, z: number): boolean {
    if (this._shore == null || this.mesh == null) return false
    const terrain = this.owner?.querySelector('tosi-b3d-terrain') as any
    if (terrain == null || typeof terrain.heightSampler !== 'function') {
      return false
    }
    const temperature = this._seaTemperature(terrain)
    if (!iceBears(temperature, 0)) return false // nothing bears anywhere
    const off = terrain.originOffset ?? { x: 0, z: 0 }
    const key = `${terrain.generationKey ?? ''}|${off.x}|${off.z}`
    if (this._iceHeight?.key !== key) {
      this._iceHeight = { key, fn: terrain.heightSampler() }
    }
    const depth =
      this.mesh.absolutePosition.y - this._iceHeight.fn(x + off.x, z + off.z)
    return iceBears(temperature, depth)
  }

  private _updateCeilingShore(
    cs: { grid: ShoreGrid; data: Float32Array; key: string },
    x: number,
    z: number,
    waterY: number
  ): void {
    const terrain = this.owner?.querySelector('tosi-b3d-terrain') as any
    if (terrain == null || typeof terrain.heightSampler !== 'function') return
    const off = terrain.originOffset ?? { x: 0, z: 0 }
    const temperature = this._seaTemperature(terrain)
    const key = [
      x + off.x,
      z + off.z,
      waterY,
      terrain.generationKey ?? '',
      temperature.toFixed(3),
    ].join('|')
    if (key === cs.key) return
    cs.key = key
    // The underside is turned over about X, so its local +z is world -z.
    shoreData(
      cs.grid,
      x + off.x,
      z + off.z,
      waterY,
      terrain.heightSampler(),
      temperature,
      cs.data,
      true
    )
    this._ceiling?.updateVerticesData(BABYLON.VertexBuffer.ColorKind, cs.data)
  }
  private _shoreTick?: () => void
  private _shoreNext = 0
  private _shoreSince = performance.now()
  private _warnedNoTerrain = false

  /*
  Write [depth, ice] for every vertex from the terrain under it. Cheap (one
  height sample per vertex, under ten thousand of them), and done only when
  something it depends on has changed: where the mesh is, the water level,
  the terrain's shape, or the climate at sea level (which the season moves).
  */
  private _updateShore(force: boolean): void {
    const shore = this._shore
    const mesh = this.mesh
    const owner = this.owner
    if (shore == null || mesh == null || owner == null) return
    const now = performance.now()
    if (!force && now < this._shoreNext) return
    this._shoreNext = now + 250
    const terrain = owner.querySelector('tosi-b3d-terrain') as any
    if (terrain == null || typeof terrain.heightSampler !== 'function') {
      // Given a few seconds for a terrain to arrive, then said once.
      if (!this._warnedNoTerrain && now - this._shoreSince > 5000) {
        this._warnedNoTerrain = true
        console.warn(
          'tosi-b3d-water: shore="on" needs a <tosi-b3d-terrain> in the scene to read depths from; there is none, so the water has no shoreline. Ice also needs the terrain\'s biome="on".'
        )
      }
      return
    }
    const off = terrain.originOffset ?? { x: 0, z: 0 }
    // The climate AT SEA LEVEL, this time of year. No biome: never freezes.
    const temperature = this._seaTemperature(terrain)
    const cx = mesh.position.x + off.x
    const cz = mesh.position.z + off.z
    const y = mesh.position.y
    const key = [
      cx,
      cz,
      y,
      terrain.generationKey ?? '',
      temperature.toFixed(3),
    ].join('|')
    if (key === shore.key) return
    shore.key = key
    shoreData(
      shore.grid,
      cx,
      cz,
      y,
      terrain.heightSampler(),
      temperature,
      shore.data
    )
    mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, shore.data)
    this._updateIceMesh(shore)
  }

  /** The walkable ice: see where it is built. */
  private _ice: BABYLON.Mesh | null = null

  private _updateIceMesh(shore: { grid: ShoreGrid; data: Float32Array }): void {
    const ice = this._ice
    const mesh = this.mesh
    if (ice == null || mesh == null) return
    const kept = bearingTriangles(shore.grid.indices, shore.data)
    ice.position.copyFrom(mesh.position)
    if (kept.length === 0) {
      ice.setEnabled(false)
      return
    }
    ice.setIndices(kept, shore.grid.count * shore.grid.count, true)
    ice.setEnabled(true)
    ice.computeWorldMatrix(true)
  }

  private _applyFollow(): void {
    const cam = this.owner?.scene.activeCamera
    if (!cam || !this.mesh) return
    const size = Math.max(1, (this as any).waterSize)
    // snap cell — small vs the plane, so its edge is never near the view. With
    // a shore grid it is a whole number of its fine cells (4 m), so after a
    // snap the vertices around the viewer land on the same world lines and
    // the shoreline does not swim.
    const step = this._shore != null ? Math.min(32, size / 16) : size / 16
    const p = cam.globalPosition
    const sx = Math.round(p.x / step) * step
    const sz = Math.round(p.z / step) * step
    if (this.mesh.position.x === sx && this.mesh.position.z === sz) return
    this.mesh.position.x = sx
    this.mesh.position.z = sz
    this._updateShore(true)
    // Re-anchor the ripple to WORLD space at the new centre, so the surface detail stays put.
    const bump = this.waterMaterial?.bumpTexture as BABYLON.Texture | undefined
    if (bump) {
      bump.uOffset = (sx / size) * (bump.uScale ?? 1)
      bump.vOffset = (sz / size) * (bump.vScale ?? 1)
    }
  }

  render() {
    super.render()
    this.updateWater()
    // super.render() just wrote the plane back to its x/z attrs — put it back under the camera.
    if (this._followTick) this._applyFollow()
  }
}

export const b3dWater = B3dWater.elementCreator()
