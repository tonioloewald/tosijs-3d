/*
A material recipe onto a Babylon material. Split from material-recipe so the
recipe stays headless. Pictures are loaded once per scene and URL, so a
picker dragging a slider does not reload them.
*/
import * as BABYLON from '@babylonjs/core';
import { materialAsType, resolveMaterial, } from './material-recipe.js';
const textures = new WeakMap();
function texture(scene, url) {
    let cache = textures.get(scene);
    if (cache == null)
        textures.set(scene, (cache = new Map()));
    let t = cache.get(url);
    if (t == null || t.getScene() == null) {
        t = new BABYLON.Texture(url, scene);
        cache.set(url, t);
    }
    return t;
}
const linear = (hex) => BABYLON.Color3.FromHexString(hex.slice(0, 7)).toLinearSpace();
/**
 * Set a PBR material from a recipe. Inputs left out go back to their
 * defaults; a recipe of another type (a fabric) gives the inputs it shares.
 */
export function applyMaterial(material, recipe) {
    const scene = material.getScene();
    const r = resolveMaterial(materialAsType(recipe, 'pbr'));
    const img = (url) => (url == null ? null : texture(scene, url));
    material.albedoTexture = img(r.albedo.image);
    const albedo = r.albedo.image == null
        ? linear(r.albedo.value)
        : BABYLON.Color3.White();
    material.albedoColor = albedo;
    material.opacityTexture = img(r.alpha.image);
    material.alpha = r.alpha.image == null ? r.alpha.value : 1;
    material.transparencyMode =
        material.alpha < 1 || r.alpha.image != null
            ? BABYLON.Material.MATERIAL_ALPHABLEND
            : BABYLON.Material.MATERIAL_OPAQUE;
    material.roughness = r.roughness.value;
    material.metallic = r.metallic.value;
    material.environmentIntensity = r.reflections.value;
    const sheen = r.sheen.value;
    material.sheen.isEnabled = sheen > 0;
    material.sheen.intensity = sheen;
    material.sheen.roughness = r.sheenRoughness.value;
    // The sheen takes a lighter version of the colour, as fibres catch light.
    material.sheen.color = new BABYLON.Color3(0.6 + 0.4 * albedo.r, 0.6 + 0.4 * albedo.g, 0.6 + 0.4 * albedo.b);
    material.emissiveTexture = img(r.emissive.image);
    material.emissiveColor =
        r.emissive.image == null
            ? linear(r.emissive.value)
            : BABYLON.Color3.White();
    material.emissiveIntensity = r.emissive.intensity;
    const bump = img(r.normal.image);
    if (bump)
        bump.level = r.normal.intensity;
    material.bumpTexture = bump;
}
//# sourceMappingURL=material-apply.js.map