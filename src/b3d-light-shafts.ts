/*#
# b3d-light-shafts

**Shafts of sunlight** (WEATHER-DESIGN stage 4, board #1084), under a broken
cloud deck and under the water, from one model ([[light-rays]]):

- A shaft **starts at the edge the light comes through** — the underside of
  the [`<tosi-b3d-cloud-deck>`](/b3d-cloud-deck/), the underside of the
  [water](/b3d-water/) — and runs away from it along the light, widening
  slightly with distance.
- It is an **additive, flat fill of the light's colour**, not a blur:
  `strength` (0.25) at the edge, falling linearly to nothing.
- It is **most prominent looking toward the sun** (light scattered forward),
  and faint looking away.
- Under cloud, only where the sky is **broken but not closed**: local
  coverage 0.8 up to 1. Clear skies and overcast have none.
- Under water, the light is the sun's **tinted by the water's fog**, bent by
  Snell's law so the shafts lean toward vertical, and they shimmer as the
  surface moves. Only when the sun is reaching the water.

Rain helps (it scatters the light): the strength rises with the
precipitation where you are.

`count` is the budget; `0` switches the sky shafts off, `underwater="off"`
the water ones.

## Demo

Late afternoon under a broken deck. Shafts hang from the gaps, brightest
toward the sun; drag to look away from it and they fade.

```js
import { b3d, b3dSun, b3dSkybox, b3dCloudDeck, b3dLightShafts, b3dGround } from 'tosijs-3d'

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 40, 0), el.scene)
        cam.setTarget(new BABYLON.Vector3(-1000, 250, 0))
        cam.maxZ = 20000
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
      },
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: 16.5, realtimeScale: 0 }),
    b3dGround({ width: 12000, height: 12000, color: '#4a5a44' }),
    b3dCloudDeck({ altitude: 450, coverage: 0.85 }),
    b3dLightShafts({}),
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `count` | `10` | How many sky shafts at most (the budget). `0` = off |
| `radius` | `3000` | How far from you (m) to look for gaps. Shafts read best from a distance |
| `width` | `120` | Sky shaft width at the cloud (m) |
| `spread` | `0.04` | How much wider per metre of length |
| `strength` | `0.25` | Brightness at the edge the light comes through; it falls linearly to 0 |
| `rainBoost` | `0.5` | How much precipitation where you are multiplies the strength |
| `color` | `''` | The light's colour; empty = the sun's (whitish by day) |
| `underwater` | `'on'` | Shafts under the water surface too |
| `underwaterCount` | `16` | Their budget |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, isOff, sceneDelta } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import { hash01 } from './lightning.js'
import { fogLayerFor, type Medium } from './medium.js'
import {
  refractDown,
  shaftCoverageGate,
  shaftWidthAt,
  sunPhase,
} from './light-rays.js'

type Deck = {
  opacityAbove?: (x: number, z: number) => number
  coverageAt?: (x: number, z: number) => number
  altitude?: number
}

type Kind = 'sky' | 'water'

interface Shaft {
  kind: Kind
  key: string
  mesh: BABYLON.Mesh
  /** Where the light comes through (world). */
  x: number
  y: number
  z: number
  width: number
  /** Fade 0–1 and where it is heading. */
  level: number
  target: number
  /** Multiplier from the sky/water gate at this shaft (0–1). */
  gate: number
}

const UP = new BABYLON.Vector3(0, 1, 0)
const SHADER = 'tosiLightShaft'
/** The phase term's shape; mirrors `sunPhase` in light-rays.ts. */
const PHASE_SHARP = 6
const PHASE_FLOOR = 0.08

function ensureShader(): void {
  if (BABYLON.Effect.ShadersStore[`${SHADER}VertexShader`]) return
  BABYLON.Effect.ShadersStore[`${SHADER}VertexShader`] = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec4 color;
uniform mat4 world;
uniform mat4 viewProjection;
varying float vAlong;
varying vec4 vColor;
varying vec3 vWorld;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vWorld = w.xyz;
  vAlong = uv.y;
  vColor = color;
  gl_Position = viewProjection * w;
}`
  // FLAT across, linear along, forward-scattered toward the sun: the whole
  // look is these three lines (light-rays.ts holds the same math, tested).
  BABYLON.Effect.ShadersStore[`${SHADER}FragmentShader`] = `
precision highp float;
varying float vAlong;
varying vec4 vColor;
varying vec3 vWorld;
uniform vec3 eye;
uniform vec3 toSun;
uniform float edge;
void main() {
  vec3 v = normalize(vWorld - eye);
  float c = max(dot(v, toSun), 0.0);
  float phase = ${PHASE_FLOOR.toFixed(3)} + ${(1 - PHASE_FLOOR).toFixed(
    3
  )} * pow(c, ${PHASE_SHARP.toFixed(1)});
  float along = edge * clamp(1.0 - vAlong, 0.0, 1.0);
  gl_FragColor = vec4(vColor.rgb * vColor.a * along * phase, 1.0);
}`
}

export class B3dLightShafts extends B3dChild {
  static preferredTagName = 'tosi-b3d-light-shafts'

  static initAttributes = {
    count: 10,
    radius: 3000,
    width: 120,
    spread: 0.04,
    strength: 0.25,
    rainBoost: 0.5,
    color: '',
    underwater: 'on' as 'on' | 'off',
    underwaterCount: 16,
  }

  declare count: number
  declare radius: number
  declare width: number
  declare spread: number
  declare strength: number
  declare rainBoost: number
  declare color: string
  declare underwater: 'on' | 'off'
  declare underwaterCount: number

  private _shafts: Shaft[] = []
  private _mats: Partial<Record<Kind, BABYLON.ShaderMaterial>> = {}
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _since = 1e9
  private _seq = 0
  private _time = 0

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    ensureShader()
    this._obs = scene.onBeforeRenderObservable.add(() => {
      try {
        this._tick(owner, scene)
      } catch (e) {
        // Garnish must never break the frame, but must not fail SILENTLY
        // either (an unbound method once hid every shaft this way).
        owner.logDebug?.('light-shafts', { error: String(e) })
      }
    })
  }

  private _material(kind: Kind, scene: BABYLON.Scene): BABYLON.ShaderMaterial {
    const have = this._mats[kind]
    if (have != null) return have
    const m = new BABYLON.ShaderMaterial(`shaft-${kind}`, scene, SHADER, {
      attributes: ['position', 'uv', 'color'],
      uniforms: ['world', 'viewProjection', 'eye', 'toSun', 'edge'],
      needAlphaBlending: true,
    })
    m.alphaMode = BABYLON.Constants.ALPHA_ONEONE
    m.disableDepthWrite = true
    m.backFaceCulling = false
    this._mats[kind] = m
    return m
  }

  /** The light's colour, normalised so its brightest channel is 1. */
  private _lightColor(sun: BABYLON.DirectionalLight): BABYLON.Color3 {
    if (this.color) {
      try {
        return BABYLON.Color3.FromHexString(this.color)
      } catch {
        /* fall through to the sun */
      }
    }
    const d = sun.diffuse
    const m = Math.max(d.r, d.g, d.b, 1e-3)
    return new BABYLON.Color3(d.r / m, d.g / m, d.b / m)
  }

  private _tick(owner: B3d, scene: BABYLON.Scene): void {
    const dt = sceneDelta(scene)
    this._time += dt
    const cam = scene.activeCamera
    const sun = scene.lights.find(
      (l) => l instanceof BABYLON.DirectionalLight
    ) as BABYLON.DirectionalLight | undefined
    // The light's TRAVEL direction; shafts need it pointing down.
    const dir = sun?.direction.clone().normalize()
    const sunUp =
      sun != null && dir != null && dir.y < -0.08 && sun.intensity > 0.05
    const deck = owner.querySelector(
      'tosi-b3d-cloud-deck'
    ) as unknown as Deck | null
    const eye = cam?.globalPosition
    const water = eye == null ? null : this._waterAbove(owner, eye)

    // Which set is live: under water, the water's; under the deck, the sky's.
    const base = deck?.altitude ?? 0
    const skyLive =
      sunUp &&
      eye != null &&
      water == null &&
      deck?.opacityAbove != null &&
      eye.y < base &&
      this.count > 0
    const waterLive =
      sunUp && eye != null && water != null && !isOff(this.underwater)

    this._since += dt
    if (this._since > 0.4) {
      this._since = 0
      const want = new Map<
        string,
        {
          x: number
          y: number
          z: number
          gate: number
          kind: Kind
          width: number
        }
      >()
      if (skyLive) this._placeSky(deck!, eye!, base, water0(owner), dir!, want)
      if (waterLive) this._placeWater(deck, eye!, dir!, water!, want)
      for (const s of this._shafts) {
        const w = want.get(s.key)
        s.target = w != null ? 1 : 0
        if (w != null) s.gate = w.gate
        want.delete(s.key)
      }
      for (const [key, w] of want) {
        const mesh = this._makeMesh(scene, w.kind)
        this._shafts.push({ key, mesh, level: 0, target: 1, ...w })
      }
    }
    if (!skyLive)
      for (const s of this._shafts) if (s.kind === 'sky') s.target = 0
    if (!waterLive)
      for (const s of this._shafts) if (s.kind === 'water') s.target = 0

    if (sun == null || dir == null || eye == null) {
      for (const s of this._shafts) s.mesh.isVisible = false
      this._sweep()
      return
    }
    const light = this._lightColor(sun)
    const rain = owner.weatherHere?.().precipitation ?? 0
    const boost = 1 + Math.max(0, this.rainBoost) * rain
    const waterDir =
      water != null ? refractDown({ x: dir.x, y: dir.y, z: dir.z }) : null
    const wDir =
      waterDir != null
        ? new BABYLON.Vector3(waterDir.x, waterDir.y, waterDir.z)
        : dir
    const waterTint = water != null ? this._waterTint(light, water) : light
    for (const kind of ['sky', 'water'] as Kind[]) {
      const m = this._mats[kind]
      if (m == null) continue
      const d = kind === 'water' ? wDir : dir
      m.setVector3('eye', eye)
      m.setVector3('toSun', d.scale(-1))
      m.setFloat(
        'edge',
        Math.max(0, this.strength) * (kind === 'sky' ? boost : 1)
      )
    }
    for (const s of this._shafts) {
      s.level += Math.max(-1, Math.min(1, (s.target - s.level) * dt * 1.2))
      s.level = Math.max(0, Math.min(1, s.level))
      const d = s.kind === 'water' ? wDir : dir
      const len =
        s.kind === 'water'
          ? water!.reach
          : Math.max(50, s.y - water0(owner)) / Math.max(0.1, -d.y)
      const mid = new BABYLON.Vector3(s.x, s.y, s.z).add(d.scale(len / 2))
      const fog =
        s.kind === 'sky' ? fogFactor(scene, mid.subtract(eye).length()) : 1
      const a = s.level * s.gate * fog
      s.mesh.isVisible = a > 0.003
      if (!s.mesh.isVisible) continue
      const tint = s.kind === 'water' ? waterTint : light
      this._shape(s, d, len, eye)
      const c = [tint.r, tint.g, tint.b, a]
      s.mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, [
        ...c,
        ...c,
        ...c,
        ...c,
      ])
    }
    this._sweep()
  }

  /** Drop shafts that have faded out and are no longer wanted. */
  private _sweep(): void {
    this._shafts = this._shafts.filter((s) => {
      if (s.target === 0 && s.level <= 0.001) {
        s.mesh.dispose()
        return false
      }
      return true
    })
  }

  /**
   * Under the deck: score a world-anchored grid around you. A GAP (low
   * opacity) beside CLOUD is where the sun breaks through, and only where the
   * local cover is broken (0.8 up to 1). Keep the best `count`.
   */
  private _placeSky(
    deck: Deck,
    eye: BABYLON.Vector3,
    base: number,
    groundY: number,
    sunDir: BABYLON.Vector3,
    want: Map<string, any>
  ): void {
    // BOUND: detached, `this` is undefined inside it and it throws.
    const op = deck.opacityAbove!.bind(deck)
    const cov = deck.coverageAt?.bind(deck)
    const midLen = (base - groundY) / 2 / Math.max(0.1, -sunDir.y)
    const r = Math.max(100, this.radius)
    const N = 16
    const step = (2 * r) / N
    const scored: Array<{ x: number; z: number; score: number; gate: number }> =
      []
    const gx0 = Math.floor((eye.x - r) / step)
    const gz0 = Math.floor((eye.z - r) / step)
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = (gx0 + i) * step
        const z = (gz0 + j) * step
        const away = Math.hypot(x - eye.x, z - eye.z)
        // Seen from the side, at a distance: a shaft you stand in is a wall.
        if (away > r || away < r * 0.12) continue
        const gate = cov == null ? 1 : shaftCoverageGate(cov(x, z))
        if (gate <= 0) continue
        const here = op(x, z)
        if (here > 0.4) continue // not a gap
        const d = step * 0.5
        const around = Math.max(
          op(x + d, z),
          op(x - d, z),
          op(x, z + d),
          op(x, z - d)
        )
        // Prefer shafts you would see toward the sun: they are the ones
        // that show (forward scatter), radiating from where it is.
        const mx = x + sunDir.x * midLen - eye.x
        const my = base + sunDir.y * midLen - eye.y
        const mz = z + sunDir.z * midLen - eye.z
        const cosSun =
          -(mx * sunDir.x + my * sunDir.y + mz * sunDir.z) /
          Math.max(1e-6, Math.hypot(mx, my, mz))
        const score =
          (1 - here) * around * gate * (0.25 + sunPhase(cosSun, 3, 0))
        if (score > 0.1) scored.push({ x, z, score, gate })
      }
    }
    scored.sort((a, b) => b.score - a.score)
    for (const c of scored.slice(0, Math.floor(this.count))) {
      want.set(`s:${Math.round(c.x)},${Math.round(c.z)}`, {
        kind: 'sky',
        x: c.x,
        y: base,
        z: c.z,
        gate: c.gate,
        width: Math.max(1, this.width),
      })
    }
  }

  /**
   * Under the water: shafts come down from the surface where the waves focus
   * the light. A world-anchored grid on the SURFACE, around the point your
   * view reaches it along the light; each cell lit or not by a hash that
   * changes every few seconds, so the shafts shimmer in and out.
   */
  private _placeWater(
    deck: Deck | null,
    eye: BABYLON.Vector3,
    sunDir: BABYLON.Vector3,
    water: WaterHere,
    want: Map<string, any>
  ): void {
    const d = refractDown({ x: sunDir.x, y: sunDir.y, z: sunDir.z })
    // The surface point the light reaching you came through.
    const up = (water.y - eye.y) / Math.max(0.1, -d.y)
    const cx = eye.x - d.x * up
    const cz = eye.z - d.z * up
    const cell = 3
    const R = Math.min(30, water.reach)
    const n = Math.ceil(R / cell)
    const ix0 = Math.floor(cx / cell)
    const iz0 = Math.floor(cz / cell)
    const cands: Array<{ x: number; z: number; key: string; dist: number }> = []
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const ix = ix0 + i
        const iz = iz0 + j
        // Each cell has its own slow clock, so they don't all change at once.
        const epoch = Math.floor(this._time / 3 + hash01(ix, iz, 5))
        if (hash01(ix, iz, epoch, 9) > 0.22) continue
        const x = (ix + hash01(ix, iz, epoch, 1)) * cell
        const z = (iz + hash01(ix, iz, epoch, 2)) * cell
        const dist = Math.hypot(x - cx, z - cz)
        if (dist > R) continue
        // Not through your face: a shaft you are inside is a flat wash.
        if (Math.hypot(x - eye.x, z - eye.z) < 2.5) continue
        cands.push({ x, z, key: `w:${ix},${iz},${epoch}`, dist })
      }
    }
    cands.sort((a, b) => a.dist - b.dist)
    const op = deck?.opacityAbove?.bind(deck)
    // The sun has to REACH the water: cloud overhead dims it.
    const sky = op == null ? 1 : 1 - op(cx, cz)
    if (sky <= 0.02) return
    for (const c of cands.slice(0, Math.floor(this.underwaterCount))) {
      want.set(c.key, {
        kind: 'water',
        x: c.x,
        y: water.y,
        z: c.z,
        gate: sky,
        width: 0.25 + hash01(Math.round(c.x), Math.round(c.z), 3) * 0.6,
      })
    }
  }

  /** The water medium you are under, if any, with how far light carries. */
  private _waterAbove(owner: B3d, eye: BABYLON.Vector3): WaterHere | null {
    const media: Medium[] = (owner as any).media ?? []
    for (const m of media) {
      if (m.kind !== 'plane' || m.optics == null) continue
      if (eye.y >= m.y) continue
      const fog = fogLayerFor({ x: eye.x, y: eye.y, z: eye.z }, m)
      return {
        y: m.y,
        color: m.optics.color ?? { r: 0, g: 0.15, b: 0.3 },
        reach: Math.max(8, Math.min(60, fog?.end ?? 25)),
      }
    }
    return null
  }

  /** Sunlight tinted by the water's fog: the fog's HUE (its brightest
   * channel at 1), leaning the white light most of the way toward it. */
  private _waterTint(light: BABYLON.Color3, water: WaterHere): BABYLON.Color3 {
    const c = water.color
    const m = Math.max(c.r, c.g, c.b, 1e-3)
    const hue = new BABYLON.Color3(c.r / m, c.g / m, c.b / m)
    return light.multiply(BABYLON.Color3.Lerp(BABYLON.Color3.White(), hue, 0.6))
  }

  private _makeMesh(scene: BABYLON.Scene, kind: Kind): BABYLON.Mesh {
    const mesh = new BABYLON.Mesh(`shaft-${kind}-${this._seq++}`, scene)
    const vd = new BABYLON.VertexData()
    vd.positions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    // v: 0 at the edge the light comes through, 1 at the far end.
    vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1]
    vd.colors = new Array(16).fill(0)
    vd.indices = [0, 1, 2, 0, 2, 3]
    vd.applyToMesh(mesh, true)
    mesh.material = this._material(kind, scene)
    mesh.isPickable = false
    /*
    Drawn AFTER the deck and the water: from beneath, the shaft is between
    you and them. Babylon's default alphaIndex is Number.MAX_VALUE, so any
    finite "big" number sorts FIRST and the deck painted over every shaft
    ("behind (above) the clouds", Tonio). Infinity sorts after it; depth
    still hides a shaft behind terrain or real cloud (the deck discards its
    gaps, so it only writes depth where there is cloud).
    */
    mesh.alphaIndex = Infinity
    mesh.alwaysSelectAsActiveMesh = true
    return mesh
  }

  /**
   * The shaft's shape this frame: a trapezoid hanging from its source along
   * the light, widening with distance, turned about its own axis to face you.
   */
  private _shape(
    s: Shaft,
    dir: BABYLON.Vector3,
    len: number,
    eye: BABYLON.Vector3
  ): void {
    const top = new BABYLON.Vector3(s.x, s.y, s.z)
    const centre = top.add(dir.scale(len / 2))
    const axis = dir.scale(-1) // local +Y points back UP toward the source
    let right = BABYLON.Vector3.Cross(axis, eye.subtract(centre))
    if (right.lengthSquared() < 1e-6) right = BABYLON.Vector3.Cross(axis, UP)
    right.normalize()
    const normal = BABYLON.Vector3.Cross(right, axis).normalize()
    s.mesh.rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(
      right,
      axis,
      normal
    )
    s.mesh.position.copyFrom(top)
    const w0 = s.width / 2
    const w1 =
      shaftWidthAt(len, s.width, s.kind === 'water' ? 0.02 : this.spread) / 2
    s.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, [
      -w0,
      0,
      0,
      w0,
      0,
      0,
      w1,
      -len,
      0,
      -w1,
      -len,
      0,
    ])
    // The bounds were computed for the empty mesh at creation.
    s.mesh.refreshBoundingInfo()
  }

  sceneDispose() {
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
    for (const s of this._shafts) s.mesh.dispose()
    this._shafts = []
    for (const m of Object.values(this._mats)) m?.dispose()
    this._mats = {}
  }
}

interface WaterHere {
  y: number
  color: { r: number; g: number; b: number }
  /** How far light carries (m): the shafts' length. */
  reach: number
}

/** Where a sky shaft ends: the sea surface if there is one, else 0. */
function water0(owner: B3d): number {
  const media: Medium[] = (owner as any).media ?? []
  for (const m of media) if (m.kind === 'plane') return m.y
  return 0
}

/** How much of an additive shaft survives the scene's fog at distance `d`.
 * Additive geometry can't be fogged by the material (fog would ADD the fog
 * colour), so it is attenuated here instead. */
function fogFactor(scene: BABYLON.Scene, d: number): number {
  switch (scene.fogMode) {
    case BABYLON.Scene.FOGMODE_EXP:
      return Math.exp(-d * scene.fogDensity)
    case BABYLON.Scene.FOGMODE_EXP2:
      return Math.exp(-((d * scene.fogDensity) ** 2))
    case BABYLON.Scene.FOGMODE_LINEAR: {
      const span = scene.fogEnd - scene.fogStart
      return span > 0 ? Math.min(1, Math.max(0, (scene.fogEnd - d) / span)) : 1
    }
    default:
      return 1
  }
}

export const b3dLightShafts = B3dLightShafts.elementCreator()
