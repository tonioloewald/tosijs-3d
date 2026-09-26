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
| `waterSize` | `128` | Size of the water plane |
| `subdivisions` | `32` | Mesh subdivisions |
| `twoSided` | `false` | Render both sides |
| `underside` | `'auto'` | Snell's window from below: straight up, a bright window onto the sky; toward grazing angles, a mirror of the depths. `'auto'` = on whenever `twoSided`; `'on'`/`'off'` force it. Fades in with the underwater fog |
| `undersideColor` | `'#9fdcf0'` | The window: the sky's light, looking up |
| `undersideDepthColor` | `'#06283a'` | The mirror: the dark water, at grazing angles |
| `caustics` | `'auto'` | Light through the moving surface, dancing on everything beneath it (terrain, hulls, the player). `'auto'` = on whenever `twoSided`. Fades with depth and fog; follows the sun |
| `causticsStrength` | `0.6` | How bright the web gets |
| `causticsScale` | `6` | Metres per caustic cell: bigger is coarser and calmer |
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
/*{ "parent": "Environment" }*/

import { plane as mediumPlane, type PlaneMedium } from './medium.js'
import * as BABYLON from '@babylonjs/core'
import { waterNormalTexture } from './water-normal.js'
import { WaterMaterial } from '@babylonjs/materials'
import { AbstractMesh, markCollisionGroup, sceneDelta } from './b3d-utils.js'
import { inheritedWind, waterWind } from './wind.js'
import { band } from './atmosphere.js'
import { CausticsMap } from './caustics.js'
import type { B3d, SceneAdditions, SceneAdditionHandler } from './tosi-b3d.js'

export class B3dWater extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-water'

  static initAttributes = {
    // Underwater fog: how thick, and how sharply it takes over as you cross the surface.
    // The transition is deliberately TIGHT (see the fog layer below): killing the "thunk"
    // meant killing the discontinuity, not the contrast.
    underwaterFog: 0.12, // density the moment you're under
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
    textureSize: 1024,
    twoSided: false,
    // Follow the camera in x/z so a finite plane reads as an ENDLESS sea. The mesh rides with
    // you but the ripple pattern is offset back into WORLD space (so the surface looks fixed, not
    // dragged along), and the reflection map refreshes every few frames instead of every one
    // (a moving sea doesn't need a perfect mirror). Off by default (a small pond doesn't need it).
    follow: false,
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
    const scene = inheritedWind(attrs.wind, this.owner?.wind)
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

    if (attrs.spherical) {
      this.mesh = BABYLON.MeshBuilder.CreateSphere(
        'water_nocast',
        { segments: attrs.subdivisions, diameter: attrs.waterSize },
        scene
      )
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

    this.waterMaterial = new WaterMaterial(
      'water',
      scene,
      new BABYLON.Vector2(attrs.textureSize, attrs.textureSize)
    )
    this.waterMaterial.bumpTexture = attrs.normalMap
      ? // An explicit path: load it, but SAY SO if it fails. The checkerboard
        // fallback is indistinguishable from a style choice, so silence here is
        // what cost ensemble the confusion in the first place.
        new BABYLON.Texture(
          attrs.normalMap,
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
        color: { r: 0, g: 0.15, b: 0.3 },
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
      return {
        weight: w,
        color: { r: 0, g: 0.15, b: 0.3 },
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
        return
      }
      if (this._ceiling == null) this._ceiling = this._buildCeiling(scene)
      const waterY = this.mesh.absolutePosition.y
      const c = cam.globalPosition
      this._ceiling.setEnabled(true)
      this._ceiling.position.set(c.x, waterY - 0.08, c.z)
      this._ceiling.visibility = w
      const bump = this._ceilingBump
      if (bump != null) {
        // Anchored to the WORLD (not the camera the plane rides with), and
        // drifting slowly so the window's edge shimmers.
        this._shimmer += sceneDelta(scene) * 0.03
        const cell = 2000 / bump.uScale
        bump.uOffset = c.x / cell + this._shimmer
        bump.vOffset = c.z / cell + this._shimmer * 0.6
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

  private _buildCeiling(scene: BABYLON.Scene): BABYLON.Mesh {
    const size = 2000
    const ceiling = BABYLON.MeshBuilder.CreateGround(
      'water-underside_nocast',
      { width: size, height: size, subdivisions: 1 },
      scene
    )
    ceiling.isPickable = false
    ceiling.receiveShadows = false
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
    ITS OWN normal map, the same one the water uses, built fresh. Not a
    `clone()`: a cloned DynamicTexture never reports ready, so the material
    never became ready and the ceiling was silently never drawn (found with a
    debug fog colour; the pixels were fog and sky, never the ceiling). Not
    the water's own instance either: `follow` moves that one's offsets.
    */
    const url = (this as any).normalMap as string
    const b: BABYLON.Texture = url
      ? new BABYLON.Texture(url, scene)
      : waterNormalTexture(scene)
    b.uScale = size / 24
    b.vScale = size / 24
    mat.bumpTexture = b
    this._ceilingBump = b
    ceiling.material = mat
    return ceiling
  }

  sceneDispose(): void {
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
    this._ceiling?.material?.dispose(true, true)
    this._ceiling?.dispose()
    this._ceiling = null
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
  private _applyFollow(): void {
    const cam = this.owner?.scene.activeCamera
    if (!cam || !this.mesh) return
    const size = Math.max(1, (this as any).waterSize)
    const step = size / 16 // snap cell — small vs the plane, so its edge is never near the view
    const p = cam.globalPosition
    const sx = Math.round(p.x / step) * step
    const sz = Math.round(p.z / step) * step
    if (this.mesh.position.x === sx && this.mesh.position.z === sz) return
    this.mesh.position.x = sx
    this.mesh.position.z = sz
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
