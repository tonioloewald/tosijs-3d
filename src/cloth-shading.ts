/*#
# cloth-shading

What makes cloth read as cloth at any distance is how it takes light, not its
texture: soft, rough cotton; a velvet that glows where it turns away; a satin
with a long, bright highlight; leather that is smooth and a little glossy.
`FABRICS` are those as presets over Babylon's PBR material (roughness, and its
SHEEN, the grazing-angle glow fibres give cloth), and `clothShading` puts one
on a garment's material, with a RECOLOUR on top.

The recolour reads the garment's texture as grey (its shading: folds,
stitching, a weave) and tints it, blended by `amount`: 0 keeps the texture's
own colours, 1 is the colour wholly, and a print shows through in between.
One sweater becomes a red one, a pastel one and a black one.

```javascript
const shade = clothShading(material, { fabric: 'denim' })
shade.set({ fabric: 'wool', colour: '#7a2e2e', amount: 0.8 })
```
*/
/*{ "parent": "character-builder", "order": 67 }*/

import * as BABYLON from '@babylonjs/core'
import { parseColor } from './color.js'

export interface Fabric {
  /** How rough the surface is, 0 (mirror) to 1. */
  roughness: number
  /** The grazing glow of fibres, 0 to 1, and how spread it is. */
  sheen: number
  sheenRoughness: number
}

/** Fabric presets, by how they take light. */
export const FABRICS: Readonly<Record<string, Fabric>> = Object.freeze({
  cotton: { roughness: 0.85, sheen: 0.25, sheenRoughness: 0.6 },
  denim: { roughness: 0.9, sheen: 0.15, sheenRoughness: 0.7 },
  wool: { roughness: 0.95, sheen: 0.45, sheenRoughness: 0.5 },
  linen: { roughness: 0.9, sheen: 0.2, sheenRoughness: 0.65 },
  velvet: { roughness: 0.9, sheen: 0.9, sheenRoughness: 0.25 },
  silk: { roughness: 0.4, sheen: 0.55, sheenRoughness: 0.3 },
  satin: { roughness: 0.28, sheen: 0.75, sheenRoughness: 0.2 },
  synthetic: { roughness: 0.55, sheen: 0.2, sheenRoughness: 0.5 },
  leather: { roughness: 0.45, sheen: 0, sheenRoughness: 0.5 },
  rubber: { roughness: 0.6, sheen: 0, sheenRoughness: 0.5 },
})

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

class ClothShadingPlugin extends BABYLON.MaterialPluginBase {
  tint = new BABYLON.Color3(1, 1, 1)
  amount = 0
  /** The texture's mean brightness (linear), so a tint keeps its value. */
  mean = 0.35
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'ClothShading', 231, { CLOTHSHADE: false })
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
    defines.CLOTHSHADE = this._isEnabled
  }

  getClassName(): string {
    return 'ClothShadingPlugin'
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [{ name: 'clothTint', size: 4, type: 'vec4' }],
      fragment: `#ifdef CLOTHSHADE
        uniform vec4 clothTint;
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    if (!this._isEnabled) return
    const t = this.tint
    const k = 1 / Math.max(0.05, this.mean)
    uniformBuffer.updateFloat4('clothTint', t.r * k, t.g * k, t.b * k, this.amount)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_UPDATE_ALBEDO: `#if defined(CLOTHSHADE) && defined(ALBEDO)
      {
        vec3 cT = albedoTexture.rgb;
        #ifdef GAMMAALBEDO
          cT = toLinearSpace(cT);
        #endif
        float cL = dot(cT, vec3(0.2126, 0.7152, 0.0722));
        surfaceAlbedo = mix(surfaceAlbedo, clothTint.rgb * cL, clothTint.a);
      }
      #endif`,
    }
  }
}

BABYLON.RegisterMaterialPlugin(
  'ClothShadingPlugin',
  (material) => new ClothShadingPlugin(material)
)

export interface ClothLook {
  fabric?: string
  /** The recolour, sRGB (anything `parseColor` reads). */
  colour?: string
  /** 0 keeps the texture's colours, 1 is the colour wholly. */
  amount?: number
}

export interface ClothShading {
  set(look: ClothLook): void
}

/** Measure a texture's mean brightness (linear) once it has loaded. */
function measureMean(texture: BABYLON.BaseTexture, done: (mean: number) => void): void {
  const read = () => {
    const p = texture.readPixels()
    if (p == null) return
    void p.then((data) => {
      const bytes = data as Uint8Array
      let sum = 0
      let n = 0
      for (let i = 0; i < bytes.length; i += 4 * 37) {
        sum +=
          0.2126 * toLinear(bytes[i] / 255) +
          0.7152 * toLinear(bytes[i + 1] / 255) +
          0.0722 * toLinear(bytes[i + 2] / 255)
        n++
      }
      if (n > 0) done(sum / n)
    })
  }
  if (texture.isReady()) read()
  else (texture as BABYLON.Texture).onLoadObservable?.addOnce(read)
}

/** Fabric and recolour on a garment's PBR material. */
export function clothShading(
  material: BABYLON.PBRMaterial,
  look: ClothLook = {}
): ClothShading {
  const plugin = material.pluginManager?.getPlugin('ClothShading') as ClothShadingPlugin | null
  if (plugin == null) throw new Error('cloth-shading: plugin not registered')
  plugin.isEnabled = true
  if (material.albedoTexture) {
    measureMean(material.albedoTexture, (mean) => {
      plugin.mean = mean
    })
  }
  const set = (l: ClothLook) => {
    const fabric = l.fabric != null ? FABRICS[l.fabric] : undefined
    if (fabric) {
      material.roughness = fabric.roughness
      material.sheen.isEnabled = fabric.sheen > 0
      material.sheen.intensity = fabric.sheen
      material.sheen.roughness = fabric.sheenRoughness
    }
    if (l.colour != null) {
      const c = parseColor(l.colour)
      if (c) plugin.tint = new BABYLON.Color3(toLinear(c.r), toLinear(c.g), toLinear(c.b))
      // The sheen takes a lighter version of the cloth's colour.
      if (material.sheen.isEnabled && c) {
        material.sheen.color = new BABYLON.Color3(0.6 + 0.4 * c.r, 0.6 + 0.4 * c.g, 0.6 + 0.4 * c.b)
      }
    }
    if (l.amount != null) plugin.amount = Math.min(1, Math.max(0, l.amount))
  }
  set(look)
  return { set }
}
