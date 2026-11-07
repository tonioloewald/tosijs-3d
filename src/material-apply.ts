/*
A material recipe onto a Babylon material. Split from material-recipe so the
recipe stays headless. Pictures are loaded once per scene and URL, so a
picker dragging a slider does not reload them.
*/

import * as BABYLON from '@babylonjs/core'
import {
  materialAsType,
  resolveMaterial,
  type MaterialRecipe,
} from './material-recipe.js'
import { pictureUrl } from './material-pictures.js'

const textures = new WeakMap<BABYLON.Scene, Map<string, BABYLON.Texture>>()

/**
 * A recipe's picture as a texture, loaded once per scene: a URL, or a picture
 * chosen from disk (`material-pictures`). Null for one this page does not have.
 * `tile` is the metres one repeat covers (1 / tile repeats per UV unit) and
 * `level` a normal map's strength: kept per texture, so the same picture at
 * two scales is two textures (one image loaded).
 */
export function pictureTexture(
  scene: BABYLON.Scene,
  ref: string,
  options: { tile?: number; level?: number } = {}
): BABYLON.Texture | null {
  const url = pictureUrl(ref)
  return url == null
    ? null
    : texture(scene, url, options.tile ?? 1, options.level ?? 1)
}

function texture(
  scene: BABYLON.Scene,
  url: string,
  tile: number,
  level: number
): BABYLON.Texture {
  let cache = textures.get(scene)
  if (cache == null) textures.set(scene, (cache = new Map()))
  const key = `${url}|${tile}|${level}`
  let t = cache.get(key)
  if (t == null || t.getScene() == null) {
    const base = cache.get(`${url}|1|1`)
    t =
      base != null && base.getScene() != null && key !== `${url}|1|1`
        ? (base.clone() as BABYLON.Texture)
        : new BABYLON.Texture(url, scene)
    t.uScale = t.vScale = 1 / Math.max(0.001, tile)
    t.level = level
    cache.set(key, t)
  }
  return t
}

/**
 * A normal map in OpenGL's convention (glTF's, and Poly Haven's), read the way
 * Babylon's glTF loader reads one for the scene's handedness.
 */
export function normalMapConvention(material: BABYLON.PBRMaterial): void {
  const rh = material.getScene().useRightHandedSystem
  material.invertNormalMapX = !rh
  material.invertNormalMapY = rh
}

/** A greyscale roughness picture on a PBR material (roughness from its green channel). */
export function roughnessMap(
  material: BABYLON.PBRMaterial,
  map: BABYLON.Texture | null,
  flat: number
): void {
  material.metallicTexture = map
  if (map) {
    material.useRoughnessFromMetallicTextureGreen = true
    material.useRoughnessFromMetallicTextureAlpha = false
    material.useMetallnessFromMetallicTextureBlue = false
    // The picture is the roughness; the flat value scales it.
    material.roughness = 1
  } else material.roughness = flat
}

const linear = (hex: string) =>
  BABYLON.Color3.FromHexString(hex.slice(0, 7)).toLinearSpace()

/**
 * Set a PBR material from a recipe. Inputs left out go back to their
 * defaults; a recipe of another type (a fabric) gives the inputs it shares.
 */
export function applyMaterial(
  material: BABYLON.PBRMaterial,
  recipe: MaterialRecipe
): void {
  const scene = material.getScene()
  const r = resolveMaterial(materialAsType(recipe, 'pbr'))
  const tile = r.tile.value as number
  const img = (url: string | null, level = 1) =>
    url == null ? null : pictureTexture(scene, url, { tile, level })

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

  roughnessMap(material, img(r.roughness.image), r.roughness.value as number)
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

  material.bumpTexture = img(r.normal.image, r.normal.intensity)
  if (material.bumpTexture) normalMapConvention(material)
}
