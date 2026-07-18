/*#
# cloud-shadows

**Projected cloud shadows** — the classic technique, and the only one that works over real
terrain. A flat decal can't conform to hills; the shadow map can't reach a cloud at 300 m
(and would render every cloud into four cascades every frame if it could). So instead the
whole cloud field is painted **top-down into one small texture**, and any material that
receives shadows samples it **by world position** in the fragment shader. Because the
darkening happens per-pixel, it drapes over any topology — hills, valleys, a rolling sea —
for the cost of one texture sample and **zero raycasts**.

The texture is repainted only when something changes (a cloud recycles, coverage moves, the
window recentres on the camera, the sun swings) — the steady state is just the sample.

## Geometry-independent

The painter takes abstract **blobs** (`x, z, rx, rz, strength`), not meshes — so the cost is
the same whether a cloud is a squashed sphere or a 5,000-triangle sculpt. When modeled clouds
land, a per-model top-down **silhouette sprite** can be stamped instead of the soft ellipse
(`CloudShadowBlob.sprite`) for shadows that read the actual shape — still one-time per model,
still zero per-frame geometry cost.

## Who receives

`attachTo(material)` injects a tiny fragment hook (a Babylon **material plugin**) into a
`StandardMaterial` or `PBRMaterial`. [b3d-clouds](?b3d-clouds.ts) attaches it automatically to
every mesh with `receiveShadows` — the scene's existing "I receive shadows" declaration is
exactly the right opt-in. Sun-direction offset is applied at *paint* time (blob positions are
projected along the light before stamping), so the shader stays a plain straight-down lookup.
*/
/*{ "parent": "Effects" }*/

import * as BABYLON from '@babylonjs/core'

/** Where a blob's shadow lands: slide from its altitude down the sun direction to the ground
 * plane. `sunDir` is the light's TRAVEL direction (y < 0 when shining down); a sun at/below
 * the horizon throws no useful shadow, so the blob's own footprint is returned unmoved. */
export function projectShadowXZ(
  x: number,
  y: number,
  z: number,
  sunDir: { x: number; y: number; z: number },
  groundY = 0
): { x: number; z: number } {
  if (sunDir.y >= -1e-3) return { x, z }
  const t = (groundY - y) / sunDir.y
  return { x: x + sunDir.x * t, z: z + sunDir.z * t }
}

/** World XZ → texture UV inside a square window centred on (cx, cz). Matches the shader's
 * mapping (`(pos - centre) / size + 0.5`); outside 0…1 the shader skips the lookup. */
export function shadowWindowUv(
  px: number,
  pz: number,
  cx: number,
  cz: number,
  worldSize: number
): { u: number; v: number } {
  return {
    u: (px - cx) / worldSize + 0.5,
    v: (pz - cz) / worldSize + 0.5,
  }
}

export interface CloudShadowBlob {
  x: number
  z: number
  /** Footprint radii in world metres (x/z of the squashed ellipsoid, or the model's extent). */
  rx: number
  rz: number
  /** 0…1 darkness of this blob's shadow. */
  strength: number
  /** Optional pre-baked top-down silhouette (e.g. a modeled cloud rendered once from above).
   * Stamped instead of the soft ellipse; `strength` becomes its opacity. */
  sprite?: CanvasImageSource
}

/** The fragment hook: sample the shadow texture by world XZ and darken. One instance per
 * material; all instances read the same {@link CloudShadowMap}. Injected at MAIN_END with
 * `gl_FragColor` so the identical code serves Standard AND PBR materials. */
class CloudShadowPlugin extends BABYLON.MaterialPluginBase {
  map: CloudShadowMap | null = null
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'CloudShadow', 200, { CLOUDSHADOW: false })
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
    defines.CLOUDSHADOW = this._isEnabled && this.map != null
  }

  getClassName(): string {
    return 'CloudShadowPlugin'
  }

  getSamplers(samplers: string[]): void {
    samplers.push('cloudShadowSampler')
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [{ name: 'cloudShadowWindow', size: 4, type: 'vec4' }],
      fragment: `#ifdef CLOUDSHADOW
        uniform vec4 cloudShadowWindow;
      #endif`,
    }
  }

  bindForSubMesh(
    uniformBuffer: BABYLON.UniformBuffer,
    _scene: BABYLON.Scene,
    _engine: BABYLON.AbstractEngine,
    _subMesh: BABYLON.SubMesh
  ): void {
    const map = this.map
    if (!this._isEnabled || map == null) return
    map.bindCount++
    uniformBuffer.updateFloat4(
      'cloudShadowWindow',
      map.centerX,
      map.centerZ,
      1 / map.worldSize,
      0
    )
    uniformBuffer.setTexture('cloudShadowSampler', map.texture)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef CLOUDSHADOW
        uniform sampler2D cloudShadowSampler;
      #endif`,
      CUSTOM_FRAGMENT_MAIN_END: `#ifdef CLOUDSHADOW
      {
        vec2 csUv = (vPositionW.xz - cloudShadowWindow.xy) * cloudShadowWindow.z + 0.5;
        if (csUv.x > 0.0 && csUv.x < 1.0 && csUv.y > 0.0 && csUv.y < 1.0) {
          gl_FragColor.rgb *= texture2D(cloudShadowSampler, csUv).r;
        }
      }
      #endif`,
    }
  }
}

/** One top-down shadow texture for a whole cloud field, shared by every receiving material. */
export class CloudShadowMap {
  readonly texture: BABYLON.DynamicTexture
  readonly resolution: number
  /** World size (metres) of the square window the texture covers. */
  worldSize: number
  centerX = 0
  centerZ = 0

  private _plugins: CloudShadowPlugin[] = []
  /** How many blobs the last {@link paint} stamped — a debug readout. */
  lastPaintCount = 0
  /** Debug: how many times the shader hook has bound (0 ⇒ bindForSubMesh never runs). */
  bindCount = 0

  /** How many materials carry the (enabled) hook — a debug readout. */
  get attachedCount(): number {
    return this._plugins.length
  }

  constructor(scene: BABYLON.Scene, worldSize: number, resolution = 256) {
    this.worldSize = worldSize
    this.resolution = resolution
    this.texture = new BABYLON.DynamicTexture(
      'cloud-shadow-map',
      { width: resolution, height: resolution },
      scene,
      false
    )
    this.texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
    this.texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
    this.paint([]) // start fully lit
  }

  /** Inject (or re-enable) the shadow hook on a material. Idempotent. */
  attachTo(material: BABYLON.Material): void {
    let plugin = material.pluginManager?.getPlugin(
      'CloudShadow'
    ) as CloudShadowPlugin | null
    if (plugin == null) {
      plugin = new CloudShadowPlugin(material)
      this._plugins.push(plugin)
    }
    plugin.map = this
    plugin.isEnabled = true
  }

  /** Recentre the sampling window (world XZ). The caller repaints after moving it. */
  setCenter(x: number, z: number): void {
    this.centerX = x
    this.centerZ = z
  }

  /** Repaint the whole field. Blob positions are WORLD XZ of where the shadow LANDS (project
   * along the sun with {@link projectShadowXZ} first). White = lit; blobs darken. */
  paint(blobs: CloudShadowBlob[]): void {
    this.lastPaintCount = blobs.length
    const res = this.resolution
    const ctx = this.texture.getContext() as unknown as CanvasRenderingContext2D
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, res, res)
    const scale = res / this.worldSize // world metres → pixels
    for (const b of blobs) {
      const px = (b.x - this.centerX) * scale + res / 2
      // DynamicTexture's canvas is y-down with invertY on: v=1 is canvas row 0.
      const py = res / 2 - (b.z - this.centerZ) * scale
      const rx = Math.max(1, b.rx * scale)
      const rz = Math.max(1, b.rz * scale)
      if (px + rx < 0 || px - rx > res || py + rz < 0 || py - rz > res) continue
      const a = Math.min(1, Math.max(0, b.strength))
      if (a <= 0) continue
      if (b.sprite) {
        ctx.globalAlpha = a
        ctx.drawImage(b.sprite, px - rx, py - rz, rx * 2, rz * 2)
        ctx.globalAlpha = 1
        continue
      }
      ctx.save()
      ctx.translate(px, py)
      ctx.scale(1, rz / rx)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
      // Full strength at the core, a long soft shoulder. Overlapping blobs (source-over)
      // compound, so a dense patch of sky darkens harder than a lone puff — as it should.
      g.addColorStop(0, `rgba(0,0,0,${a.toFixed(3)})`)
      g.addColorStop(0.5, `rgba(0,0,0,${(a * 0.7).toFixed(3)})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, rx, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    this.texture.update()
  }

  dispose(): void {
    for (const p of this._plugins) p.isEnabled = false
    this._plugins = []
    this.texture.dispose()
  }
}
