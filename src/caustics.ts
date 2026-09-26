/*#
# caustics

**Light through a moving surface, dancing on what is under it:** the single
strongest "this is underwater" cue after the colour (tosijs-3d#16, board
#198). `b3d-water` turns it on with `caustics`; this module is the mechanism.

It is the projected-texture technique, the same one `cloud-shadows` uses: a
material plugin samples a tiling caustic pattern by WORLD position, so it lands
on terrain, hulls, the player, anything, with no per-mesh setup. Only below the
water surface; projected along the sun, so the pattern slants as the sun does;
two layers scrolling at different rates combined with `min`, which is what makes
caustics shimmer rather than slide; and fading with depth, and with the fog,
because a fully fogged fragment must stay fog.

The pattern is a pure function (`causticPattern`): a seeded cellular (Worley)
field on a torus, so it tiles by construction, bright along the cell EDGES the
way real caustic networks are. No file, no network.
*/
/*{ "parent": "Effects" }*/

import * as BABYLON from '@babylonjs/core'
import { Xoshiro128 } from './mersenne-twister.js'

/**
 * A tiling caustic network, `size`×`size` bytes of brightness (0–255).
 *
 * Worley F2 − F1 on a torus: near an edge between two cells the two nearest
 * feature points are almost equidistant, so F2 − F1 → 0, and that is where
 * light concentrates. Inverted and sharpened, it gives the bright web of real
 * caustics. Tiles because the feature points wrap.
 */
export function causticPattern(size = 256, cells = 6, seed = 7): Uint8Array {
  const rng = new Xoshiro128(seed)
  const pts: Array<[number, number]> = []
  for (let i = 0; i < cells * cells; i++) {
    const cx = i % cells
    const cy = Math.floor(i / cells)
    pts.push([(cx + rng.random()) / cells, (cy + rng.random()) / cells])
  }
  const out = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const v = (y + 0.5) / size
      let f1 = Infinity
      let f2 = Infinity
      for (const [px, py] of pts) {
        // Torus distance: the shortest way round in each axis.
        let dx = Math.abs(u - px)
        let dy = Math.abs(v - py)
        if (dx > 0.5) dx = 1 - dx
        if (dy > 0.5) dy = 1 - dy
        const d = dx * dx + dy * dy
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) f2 = d
      }
      const edge = (Math.sqrt(f2) - Math.sqrt(f1)) * cells // 0 on an edge
      const b = Math.pow(Math.max(0, 1 - edge * 2.2), 3)
      out[y * size + x] = Math.round(b * 255)
    }
  }
  return out
}

/** Everything the caustic plugin binds, shared by every material it rides. */
export class CausticsMap {
  readonly texture: BABYLON.RawTexture
  /** World Y of the water surface. */
  waterY = 0
  /** World metres per pattern tile. */
  cellSize = 6
  /** How bright the web gets (added light, as a fraction of the lit colour). */
  strength = 0.6
  /** Depth (m) over which caustics fade to nothing. */
  fadeDepth = 18
  /** Sun travel direction (y < 0 shining down); the pattern slants with it. */
  sunX = 0
  sunY = -1
  sunZ = 0
  time = 0
  private _plugins: CausticsPlugin[] = []

  constructor(scene: BABYLON.Scene, size = 256) {
    const data = causticPattern(size)
    this.texture = new BABYLON.RawTexture(
      data,
      size,
      size,
      BABYLON.Constants.TEXTUREFORMAT_LUMINANCE,
      scene,
      true,
      false,
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE
    )
    this.texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
    this.texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
  }

  get attachedCount(): number {
    return this._plugins.length
  }

  /** Put caustics on a material (idempotent). */
  attachTo(material: BABYLON.Material): void {
    let plugin = material.pluginManager?.getPlugin(
      'Caustics'
    ) as CausticsPlugin | null
    if (plugin == null) plugin = new CausticsPlugin(material)
    if (!this._plugins.includes(plugin)) this._plugins.push(plugin)
    plugin.map = this
    plugin.isEnabled = true
  }

  dispose(): void {
    for (const p of this._plugins) {
      p.isEnabled = false
      p.map = null
    }
    this._plugins = []
    this.texture.dispose()
  }
}

class CausticsPlugin extends BABYLON.MaterialPluginBase {
  map: CausticsMap | null = null
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'Caustics', 210, { CAUSTICS: false })
  }

  get isEnabled(): boolean {
    return this._isEnabled
  }

  set isEnabled(enabled: boolean) {
    if (this._isEnabled === enabled) return
    this._isEnabled = enabled
    this.markAllDefinesAsDirty()
    this._enable(enabled)
  }

  prepareDefines(defines: BABYLON.MaterialDefines): void {
    defines.CAUSTICS = this._isEnabled && this.map != null
  }

  getClassName(): string {
    return 'CausticsPlugin'
  }

  getSamplers(samplers: string[]): void {
    samplers.push('causticsSampler')
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [
        { name: 'causticsParams', size: 4, type: 'vec4' },
        { name: 'causticsSun', size: 4, type: 'vec4' },
      ],
      fragment: `#ifdef CAUSTICS
        uniform vec4 causticsParams;
        uniform vec4 causticsSun;
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    const m = this.map
    if (!this._isEnabled || m == null) return
    // x = water Y, y = 1 / cellSize, z = strength, w = time
    uniformBuffer.updateFloat4(
      'causticsParams',
      m.waterY,
      1 / Math.max(0.01, m.cellSize),
      m.strength,
      m.time
    )
    // xyz = sun travel direction, w = fade depth
    uniformBuffer.updateFloat4(
      'causticsSun',
      m.sunX,
      m.sunY,
      m.sunZ,
      Math.max(0.1, m.fadeDepth)
    )
    uniformBuffer.setTexture('causticsSampler', m.texture)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef CAUSTICS
        uniform sampler2D causticsSampler;
      #endif`,
      CUSTOM_FRAGMENT_MAIN_END: `#ifdef CAUSTICS
      {
        float kDepth = causticsParams.x - vPositionW.y;
        if (kDepth > 0.0) {
          // Up the sun to the surface: the pattern is where the light came
          // THROUGH, so it slants as the sun does.
          float kT = causticsSun.y < -0.05 ? kDepth / -causticsSun.y : kDepth;
          vec2 kP = (vPositionW.xz - causticsSun.xz * kT) * causticsParams.y;
          float kTime = causticsParams.w;
          float kA = texture2D(causticsSampler, kP + vec2(kTime * 0.031, kTime * 0.017)).r;
          float kB = texture2D(causticsSampler, kP * 1.21 - vec2(kTime * 0.023, kTime * 0.037)).r;
          // min of two moving webs: light only where both agree, which is
          // what makes it shimmer rather than slide.
          float kC = min(kA, kB);
          float kFade = exp(-kDepth / causticsSun.w) * clamp(kDepth * 4.0, 0.0, 1.0);
          float kAdd = kC * causticsParams.z * kFade;
          #ifdef FOG
            kAdd *= clamp(CalcFogFactor(), 0.0, 1.0);
          #endif
          gl_FragColor.rgb += gl_FragColor.rgb * kAdd;
        }
      }
      #endif`,
    }
  }
}

// In the registry, or Material.clone() throws on a material that carries it
// (the same trap cloud-shadows documents).
BABYLON.RegisterMaterialPlugin(
  'CausticsPlugin',
  (material) => new CausticsPlugin(material)
)
