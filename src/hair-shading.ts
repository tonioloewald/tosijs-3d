/*#
# hair-shading

Hair coloured the way a colourist describes it: a BASE colour and a
HIGHLIGHT colour. A material plugin tints the hair texture with the base,
leans its brighter strands toward the highlight (so a dark base with caramel
highlights reads as highlighted hair, not a flat tint), and colours the
strand sheen with the highlight too.

`HAIR_COLOURS` are presets in pairs, natural and dyed: each base with the
highlight it usually comes with, which a picker can then move anywhere.

`hairShading(material, { desaturate })` attaches it; `desaturate` reads a
texture that is already coloured (MakeHuman's hair and beards) as grey first,
so the same colours apply to every library's hair.
*/
/*{ "parent": "character-builder", "order": 57 }*/

import * as BABYLON from '@babylonjs/core'
import { parseColor } from './color.js'

/** Hair colour presets: a base and its usual highlight, sRGB hex. */
export const HAIR_COLOURS: Readonly<Record<string, { base: string; highlight: string }>> =
  Object.freeze({
    black: { base: '#17130f', highlight: '#3a4152' },
    'dark brown': { base: '#2c1f17', highlight: '#6b4a32' },
    brown: { base: '#4a3122', highlight: '#9a6b43' },
    chestnut: { base: '#5c321d', highlight: '#a5603a' },
    auburn: { base: '#6a2b1a', highlight: '#b2552e' },
    copper: { base: '#9c4622', highlight: '#df8f52' },
    'golden blonde': { base: '#a8814b', highlight: '#e8cb90' },
    'ash blonde': { base: '#9c937c', highlight: '#dcd5c2' },
    platinum: { base: '#d6ccb8', highlight: '#f6f1e6' },
    grey: { base: '#86837f', highlight: '#cfcfd2' },
    white: { base: '#dedbd5', highlight: '#ffffff' },
    'pastel pink': { base: '#d494a8', highlight: '#f6d4df' },
    lavender: { base: '#9a84c0', highlight: '#d8caf0' },
    'electric blue': { base: '#2f56b8', highlight: '#8fb0ff' },
    teal: { base: '#2a7f7b', highlight: '#86dcd5' },
    'cherry red': { base: '#7f1a25', highlight: '#d84a55' },
  })

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

/** An sRGB colour (anything `parseColor` reads) as linear `Color3`. */
function linear(colour: string): BABYLON.Color3 {
  const c = parseColor(colour) ?? { r: 0.3, g: 0.2, b: 0.15, a: 1 }
  return new BABYLON.Color3(toLinear(c.r), toLinear(c.g), toLinear(c.b))
}

/*
The hair textures average about this much (linear), so the base colour is
divided by it to come out as itself.
*/
const TEXTURE_MEAN = 0.42

export class HairShadingPlugin extends BABYLON.MaterialPluginBase {
  highlight = new BABYLON.Color3(0.5, 0.35, 0.2)
  /** How far the bright strands lean to the highlight, 0 to 1. */
  strength = 0.4
  desaturate = false
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'HairShading', 230, { HAIRSHADE: false, HAIRGREY: false })
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
    defines.HAIRSHADE = this._isEnabled
    defines.HAIRGREY = this._isEnabled && this.desaturate
  }

  getClassName(): string {
    return 'HairShadingPlugin'
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [{ name: 'hairHighlight', size: 4, type: 'vec4' }],
      fragment: `#ifdef HAIRSHADE
        uniform vec4 hairHighlight;
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    if (!this._isEnabled) return
    const h = this.highlight
    uniformBuffer.updateFloat4('hairHighlight', h.r, h.g, h.b, this.strength)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_UPDATE_ALBEDO: `#if defined(HAIRSHADE) && defined(ALBEDO)
      {
        vec3 hT = albedoTexture.rgb;
        #ifdef GAMMAALBEDO
          hT = toLinearSpace(hT);
        #endif
        float hL = dot(hT, vec3(0.2126, 0.7152, 0.0722));
        #ifdef HAIRGREY
          // A coloured texture read as grey, so the base colour is the colour.
          surfaceAlbedo = vAlbedoColor.rgb * vec3(hL);
        #endif
        // The brighter strands lean to the highlight, at their own brightness.
        float hK = smoothstep(0.45, 0.9, hL / ${TEXTURE_MEAN.toFixed(2)} * 0.5) * hairHighlight.a;
        surfaceAlbedo = mix(surfaceAlbedo, hairHighlight.rgb * hL / ${TEXTURE_MEAN.toFixed(2)}, hK);
      }
      #endif`,
    }
  }
}

BABYLON.RegisterMaterialPlugin(
  'HairShadingPlugin',
  (material) => new HairShadingPlugin(material)
)

export interface HairShading {
  plugin: HairShadingPlugin
  /** Recolour: a base and a highlight, sRGB (anything `parseColor` reads). */
  setColours(base: string, highlight: string): void
}

/**
 * Colour a hair material by a base and a highlight. `desaturate` for a
 * texture that is already coloured.
 */
export function hairShading(
  material: BABYLON.PBRMaterial,
  options: { desaturate?: boolean; base?: string; highlight?: string } = {}
): HairShading {
  const plugin = material.pluginManager?.getPlugin('HairShading') as HairShadingPlugin | null
  if (plugin == null) throw new Error('hair-shading: plugin not registered')
  plugin.desaturate = options.desaturate ?? false
  plugin.isEnabled = true
  const setColours = (base: string, highlight: string) => {
    const b = linear(base)
    const k = 1 / TEXTURE_MEAN
    material.albedoColor = new BABYLON.Color3(
      Math.min(1, b.r * k),
      Math.min(1, b.g * k),
      Math.min(1, b.b * k)
    )
    plugin.highlight = linear(highlight)
    // The strand sheen takes the highlight.
    if (material.sheen.isEnabled) material.sheen.color = plugin.highlight.clone()
  }
  setColours(options.base ?? HAIR_COLOURS.brown.base, options.highlight ?? HAIR_COLOURS.brown.highlight)
  return { plugin, setColours }
}
