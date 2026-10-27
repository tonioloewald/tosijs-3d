/*#
# skin-shading

Skin that reads as skin without a subsurface pipeline: three cheap terms a
material plugin adds to a PBR material, lit by the scene's sun. The
[character builder](/character-builder/) uses it on every body.

- **Scatter**: light wraps a little past the shadow line, reddened, the way
  light that went into skin comes out again beside where it went in. It
  softens the terminator, which is most of what makes a lit body look like
  painted plastic.
- **Rim**: a soft lift at grazing angles, the fine hair and oil on skin.
- **Back-light**: light from behind shows through the THIN parts (ears, the
  nose, fingers), reddened. Thinness is per vertex, worked out once from the
  mesh by `skinThinness`, and carried in the vertex colour's alpha. Babylon's
  own translucency needs a thickness texture, and without one it lit the
  whole back of a torso red.

`skinShading(material, options)` attaches it and returns the plugin, whose
`scatter`, `rim` and `backlight` can be changed live. It reads the scene's
first directional light each frame (or the `sun` you give it).
*/
/*{ "parent": "character-builder", "order": 45 }*/

import * as BABYLON from '@babylonjs/core'

/**
 * How thin a body is at each vertex, 0 (thick) to 1 (thin): the distance
 * through it, inward along the vertex normal, to the first surface facing the
 * other way, mapped from `thick` metres (0) to `thin` (1). Pure.
 */
export function skinThinness(
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
  options: { thin?: number; thick?: number } = {}
): Float32Array {
  const thin = options.thin ?? 0.006
  // Ears and the edges of fingers, not a palm (about 3 cm) or a foot: a
  // looser 3.5 cm lit whole hands and the soles from behind.
  const thick = options.thick ?? 0.022
  const n = positions.length / 3
  // A hash grid, so each vertex looks only at its neighbours.
  const cell = thick
  const grid = new Map<string, number[]>()
  const key = (x: number, y: number, z: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  for (let i = 0; i < n; i++) {
    const k = key(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
    let list = grid.get(k)
    if (list == null) grid.set(k, (list = []))
    list.push(i)
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const px = positions[i * 3]
    const py = positions[i * 3 + 1]
    const pz = positions[i * 3 + 2]
    const nx = normals[i * 3]
    const ny = normals[i * 3 + 1]
    const nz = normals[i * 3 + 2]
    const cx = Math.floor(px / cell)
    const cy = Math.floor(py / cell)
    const cz = Math.floor(pz / cell)
    let depth = thick
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`)
          if (list == null) continue
          for (const j of list) {
            // The other side faces away from this one...
            const facing =
              nx * normals[j * 3] +
              ny * normals[j * 3 + 1] +
              nz * normals[j * 3 + 2]
            if (facing > -0.3) continue
            const ox = positions[j * 3] - px
            const oy = positions[j * 3 + 1] - py
            const oz = positions[j * 3 + 2] - pz
            // ...and lies inward, roughly along the normal.
            const along = -(ox * nx + oy * ny + oz * nz)
            if (along <= 0) continue
            const off = Math.sqrt(
              Math.max(0, ox * ox + oy * oy + oz * oz - along * along)
            )
            if (off > along * 0.6 + 0.004) continue
            if (along < depth) depth = along
          }
        }
      }
    }
    out[i] = Math.min(1, Math.max(0, (thick - depth) / (thick - thin)))
  }
  return out
}

export interface SkinShadingOptions {
  /** The softened, reddened terminator (default 1; 3 is lurid). */
  scatter?: number
  /** The grazing-angle lift (default 0.6). */
  rim?: number
  /** Light through thin parts from behind (default 2.5: an ear glows against the sun). */
  backlight?: number
  /** The colour light comes out of skin, linear (default a deep red). */
  tint?: BABYLON.Color3
  /** The light; default the scene's first directional light. */
  sun?: BABYLON.DirectionalLight
}

export class SkinShadingPlugin extends BABYLON.MaterialPluginBase {
  scatter = 1
  rim = 0.6
  backlight = 2.5
  tint = new BABYLON.Color3(0.9, 0.28, 0.16)
  sun: BABYLON.DirectionalLight | null = null
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'SkinShading', 220, { SKINSHADE: false })
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
    defines.SKINSHADE = this._isEnabled
  }

  getClassName(): string {
    return 'SkinShadingPlugin'
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [
        { name: 'skinSun', size: 4, type: 'vec4' },
        { name: 'skinSunColor', size: 4, type: 'vec4' },
        { name: 'skinTerms', size: 4, type: 'vec4' },
      ],
      fragment: `#ifdef SKINSHADE
        uniform vec4 skinSun;
        uniform vec4 skinSunColor;
        uniform vec4 skinTerms;
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    if (!this._isEnabled) return
    const scene = this._material.getScene()
    const sun =
      this.sun ??
      (scene.lights.find(
        (l) => l instanceof BABYLON.DirectionalLight && l.isEnabled()
      ) as BABYLON.DirectionalLight | undefined) ??
      null
    // xyz = the direction TO the light, w = its strength.
    const d = sun
      ? sun.direction.normalizeToNew()
      : new BABYLON.Vector3(0, -1, 0)
    const strength = sun && sun.isEnabled() ? sun.intensity : 0
    uniformBuffer.updateFloat4('skinSun', -d.x, -d.y, -d.z, strength)
    const c = sun ? sun.diffuse : BABYLON.Color3.White()
    // Scattered light takes the skin's own colour: deep red under fair skin,
    // a dark brown-red under dark skin, not the same orange on both.
    const a =
      (this._material as BABYLON.PBRMaterial).albedoColor ??
      BABYLON.Color3.White()
    const k = (x: number) => Math.min(1, x * 2.2)
    uniformBuffer.updateFloat4(
      'skinSunColor',
      c.r * this.tint.r * k(a.r),
      c.g * this.tint.g * k(a.g),
      c.b * this.tint.b * k(a.b),
      0
    )
    uniformBuffer.updateFloat4(
      'skinTerms',
      this.scatter,
      this.rim,
      this.backlight,
      0
    )
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    /*
    Thinness rides in the vertex colour's alpha, but Babylon drops that alpha
    before the fragment shader unless the mesh BLENDS by vertex alpha
    (vColor.a is then 1), which read every vertex as paper-thin and lit a
    whole body from behind. So it gets its own varying.
    */
    if (shaderType === 'vertex')
      return {
        CUSTOM_VERTEX_DEFINITIONS: `#ifdef SKINSHADE
        varying float vSkinThin;
      #endif`,
        CUSTOM_VERTEX_MAIN_END: `#ifdef SKINSHADE
        #ifdef VERTEXCOLOR
          vSkinThin = color.a;
        #else
          vSkinThin = 0.0;
        #endif
      #endif`,
      }
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef SKINSHADE
        varying float vSkinThin;
      #endif`,
      CUSTOM_FRAGMENT_BEFORE_FOG: `#ifdef SKINSHADE
      {
        vec3 sL = normalize(skinSun.xyz);
        vec3 sN = normalize(normalW);
        vec3 sV = normalize(viewDirectionW);
        float sNL = dot(sN, sL);
        // Scatter: the light a wrapped diffuse adds past plain Lambert,
        // which is a band about the terminator.
        float sWrap = 0.45;
        float sBand = max(0.0, (sNL + sWrap) / (1.0 + sWrap)) - max(0.0, sNL);
        vec3 sAdd = skinSunColor.rgb * skinSun.w * sBand * skinTerms.x * 0.6;
        // Rim: grazing angles, brighter on the lit side.
        float sRim = pow(1.0 - clamp(dot(sN, sV), 0.0, 1.0), 3.0);
        sAdd += finalColor.rgb * sRim * skinTerms.y * (0.4 + 0.6 * max(0.0, sNL + 0.3));
        // Back-light through thin parts, when looking toward the light.
        float sThin = vSkinThin;
        // Only looking nearly INTO the light: a cube lobe still lit a hand
        // with the sun 60 degrees off the line of sight.
        float sBack = pow(max(0.0, dot(-sV, sL)), 8.0) * max(0.0, -sNL + 0.2);
        sAdd += skinSunColor.rgb * skinSun.w * sBack * sThin * skinTerms.z;
        finalColor.rgb += sAdd;
      }
      #endif`,
    }
  }
}

// In the registry, or Material.clone() throws on a material that carries it.
BABYLON.RegisterMaterialPlugin(
  'SkinShadingPlugin',
  (material) => new SkinShadingPlugin(material)
)

/** Turn skin shading on for a PBR material, and set its terms. */
export function skinShading(
  material: BABYLON.PBRMaterial,
  options: SkinShadingOptions = {}
): SkinShadingPlugin {
  const plugin = material.pluginManager?.getPlugin(
    'SkinShading'
  ) as SkinShadingPlugin | null
  if (plugin == null) throw new Error('skin-shading: plugin not registered')
  if (options.scatter != null) plugin.scatter = options.scatter
  if (options.rim != null) plugin.rim = options.rim
  if (options.backlight != null) plugin.backlight = options.backlight
  if (options.tint != null) plugin.tint = options.tint
  if (options.sun != null) plugin.sun = options.sun
  plugin.isEnabled = true
  return plugin
}
