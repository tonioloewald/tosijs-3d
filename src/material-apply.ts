/*
A material recipe onto a Babylon material. Split from material-recipe so the
recipe stays headless. Pictures are loaded once per scene and URL, so a
picker dragging a slider does not reload them.
*/

import * as BABYLON from '@babylonjs/core'
import {
  materialType,
  resolveMaterial,
  type MaterialRecipe,
} from './material-recipe.js'

const textures = new WeakMap<BABYLON.Scene, Map<string, BABYLON.Texture>>()

function texture(scene: BABYLON.Scene, url: string): BABYLON.Texture {
  let cache = textures.get(scene)
  if (cache == null) textures.set(scene, (cache = new Map()))
  let t = cache.get(url)
  if (t == null || t.getScene() == null) {
    t = new BABYLON.Texture(url, scene)
    cache.set(url, t)
  }
  return t
}

const linear = (hex: string) =>
  BABYLON.Color3.FromHexString(hex.slice(0, 7)).toLinearSpace()

/** Set a PBR material from a `pbr` recipe. Inputs left out go back to their defaults. */
export function applyMaterial(
  material: BABYLON.PBRMaterial,
  recipe: MaterialRecipe
): void {
  if (materialType(recipe.type)?.name !== 'pbr')
    throw new Error(`applyMaterial: no Babylon material for type ${recipe.type}`)
  const scene = material.getScene()
  const r = resolveMaterial(recipe)
  const img = (url: string | null) => (url == null ? null : texture(scene, url))

  material.albedoTexture = img(r.albedo.image)
  const albedo =
    r.albedo.image == null
      ? linear(r.albedo.value as string)
      : BABYLON.Color3.White()
  material.albedoColor = albedo

  material.opacityTexture = img(r.alpha.image)
  material.alpha = r.alpha.image == null ? (r.alpha.value as number) : 1
  material.transparencyMode =
    material.alpha < 1 || r.alpha.image != null
      ? BABYLON.Material.MATERIAL_ALPHABLEND
      : BABYLON.Material.MATERIAL_OPAQUE

  material.roughness = r.roughness.value as number
  material.metallic = r.metallic.value as number
  material.environmentIntensity = r.reflections.value as number

  const sheen = r.sheen.value as number
  material.sheen.isEnabled = sheen > 0
  material.sheen.intensity = sheen
  material.sheen.roughness = r.sheenRoughness.value as number
  // The sheen takes a lighter version of the colour, as fibres catch light.
  material.sheen.color = new BABYLON.Color3(
    0.6 + 0.4 * albedo.r,
    0.6 + 0.4 * albedo.g,
    0.6 + 0.4 * albedo.b
  )

  material.emissiveTexture = img(r.emissive.image)
  material.emissiveColor =
    r.emissive.image == null
      ? linear(r.emissive.value as string)
      : BABYLON.Color3.White()
  material.emissiveIntensity = r.emissive.intensity

  const bump = img(r.normal.image)
  if (bump) bump.level = r.normal.intensity
  material.bumpTexture = bump
}
