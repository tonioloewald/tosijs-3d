import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils.js'
import { PerlinNoise } from './perlin-noise.js'
import type { B3d } from './tosi-b3d.js'

/** A 2×2 checker drawn to a DynamicTexture — no external asset, tiles via uScale/vScale. */
function makeCheckerTexture(
  name: string,
  scene: BABYLON.Scene,
  colorA = '#9a9a9a',
  colorB = '#767676'
): BABYLON.DynamicTexture {
  const size = 128
  const tex = new BABYLON.DynamicTexture(
    name,
    { width: size, height: size },
    scene,
    false
  )
  const ctx = tex.getContext() as CanvasRenderingContext2D
  const half = size / 2
  ctx.fillStyle = colorA
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = colorB
  ctx.fillRect(0, 0, half, half)
  ctx.fillRect(half, half, half, half)
  tex.update()
  return tex
}

/**
 * A soft mottled ground, drawn ONCE at the size of the whole plane.
 *
 * The checker it replaces was legible but ugly, and the ugliness is structural:
 * a tiled pattern on a large ground announces its own period, so the eye reads
 * the repeat rather than the surface. This is drawn at `uScale = 1` — one
 * texture across the entire plane — so there IS no period to see, at the cost
 * of a texture that must be generated rather than looked up.
 *
 * fBm rather than noise: a single octave is a blur, and it is the octaves that
 * make it read as ground with things going on in it at several scales. The
 * variation is in VALUE only, around the mesh's own `color`, because a ground
 * that shifts hue reads as a material change — moss, or mud — which is a claim
 * a flat-shaded plane cannot support.
 */
function makeNoiseTexture(
  name: string,
  scene: BABYLON.Scene,
  color: string,
  features: number,
  size = 512
): BABYLON.DynamicTexture {
  const tex = new BABYLON.DynamicTexture(
    name,
    { width: size, height: size },
    scene,
    true
  )
  const ctx = tex.getContext() as CanvasRenderingContext2D
  const img = ctx.createImageData(size, size)
  const base = BABYLON.Color3.FromHexString(color)
  const noise = new PerlinNoise(1337)
  const f = Math.max(1, features) / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Two scales, deliberately: a broad one that gives the ground shape, and
      // a fine one that keeps it from looking like a gradient up close.
      const broad = noise.fractal(x * f, y * f, 0, 4)
      const fine = noise.fractal(x * f * 7, y * f * 7, 11, 2)
      const v = 1 + broad * 0.42 + fine * 0.12
      const i = (y * size + x) * 4
      img.data[i] = Math.max(0, Math.min(255, base.r * 255 * v))
      img.data[i + 1] = Math.max(0, Math.min(255, base.g * 255 * v))
      img.data[i + 2] = Math.max(0, Math.min(255, base.b * 255 * v))
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  tex.update()
  return tex
}

/**
 * The material a primitive gets, from its attributes.
 *
 * `mirror` picks a polished PBR metal, everything else a StandardMaterial —
 * and either way `glow` applies. This was written out twice, identically, in
 * B3dSphere and B3dBox, which is how the sphere came to be missing `glow`
 * about ninety seconds after the box got it: the same code in two places
 * disagrees the first time you touch one of them.
 *
 * On glow: `emissiveColor` is what it means to a StandardMaterial — colour
 * added regardless of the lighting, so the surface reads as lit from within
 * rather than merely pale. The parent's `glowLayerIntensity` is what makes it
 * BLEED past the silhouette; the two are separate, and a glow with no glow
 * layer is a common "why isn't this glowing" (it is, it just isn't blooming).
 */
export const primitiveMaterial = (
  meshName: string,
  scene: BABYLON.Scene,
  attrs: {
    mirror?: boolean
    color: string
    glow?: number
    glowColor?: string
  }
): BABYLON.Material => {
  if (attrs.mirror) {
    const material = new BABYLON.PBRMaterial(meshName + '-mat', scene)
    material.albedoColor = BABYLON.Color3.FromHexString(attrs.color)
    material.metallic = 1
    material.roughness = 0.05
    return material
  }
  const material = new BABYLON.StandardMaterial(meshName + '-mat', scene)
  material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color)
  const g = Math.max(0, Math.min(1, attrs.glow ?? 0))
  if (g > 0) {
    material.emissiveColor = BABYLON.Color3.FromHexString(
      attrs.glowColor || attrs.color
    ).scale(g)
  }
  return material
}

export class B3dSphere extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-sphere'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'sphere',
    segments: 16,
    diameter: 1,
    color: '#ff0000',
    /**
     * Self-illumination, 0..1, as a fraction of `color` — `0.3` is a lit-from-
     * within look, `1` is a lamp. Needs `glowLayerIntensity` on the parent
     * `<tosi-b3d>` for the BLOOM; without it the surface still brightens, it
     * just doesn't bleed past its edges.
     *
     * `glowColor` overrides the hue, so a dull red box can throw yellow light.
     */
    glow: 0,
    glowColor: '',
    mirror: false,
    /**
     * `'on'` makes it SOLID — a character walks into it instead of through it.
     *
     * Off by default because most primitives in most scenes are scenery, and a
     * decorative box that silently starts blocking a doorway is a worse
     * surprise than one you have to ask to be solid. A `b3dGround` is always
     * solid; it is the one primitive nobody wants to fall through.
     */
    solid: 'off' as 'on' | 'off',
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName
    this.mesh = BABYLON.MeshBuilder.CreateSphere(
      meshName,
      {
        segments: attrs.segments,
        diameter: attrs.diameter,
      },
      scene
    )
    this.mesh.material = primitiveMaterial(meshName, scene, attrs)
    // A character's grounding probe and `moveWithCollisions` only see meshes
    // with this set, so `solid` is the whole of what makes a wall a wall.
    this.mesh.checkCollisions = !isOff(attrs.solid)
    owner.register({ meshes: [this.mesh] })
  }
}

export const b3dSphere = B3dSphere.elementCreator()

export class B3dBox extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-box'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'box',
    size: 1,
    width: 0, // 0 = use size
    height: 0,
    depth: 0,
    color: '#ff0000',
    mirror: false,
    /**
     * Self-illumination, 0..1, as a fraction of `color` — `0.3` is a lit-from-
     * within look, `1` is a lamp. Needs `glowLayerIntensity` on the parent
     * `<tosi-b3d>` for the BLOOM; without it the surface still brightens, it
     * just doesn't bleed past its edges.
     *
     * `glowColor` overrides the hue, so a dull red box can throw yellow light.
     */
    glow: 0,
    glowColor: '',
    /**
     * `'on'` makes it SOLID — a character walks into it instead of through it.
     *
     * Off by default because most primitives in most scenes are scenery, and a
     * decorative box that silently starts blocking a doorway is a worse
     * surprise than one you have to ask to be solid. A `b3dGround` is always
     * solid; it is the one primitive nobody wants to fall through.
     */
    solid: 'off' as 'on' | 'off',
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      meshName,
      {
        size: attrs.size,
        width: attrs.width || attrs.size,
        height: attrs.height || attrs.size,
        depth: attrs.depth || attrs.size,
      },
      scene
    )
    this.mesh.material = primitiveMaterial(meshName, scene, attrs)
    // A character's grounding probe and `moveWithCollisions` only see meshes
    // with this set, so `solid` is the whole of what makes a wall a wall.
    this.mesh.checkCollisions = !isOff(attrs.solid)
    owner.register({ meshes: [this.mesh] })
  }
}

export const b3dBox = B3dBox.elementCreator()

export class B3dGround extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-ground'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'ground',
    size: 0, // square shortcut; >0 overrides width/height
    width: 4,
    height: 4,
    color: '#888888',
    // Optional surface texture on the (shadow-receiving) StandardMaterial: an
    // image URL, or a built-in procedural value — `'checker'` (a ruler: you can
    // count the squares) or `'noise'` (a mottled natural ground). Empty = flat
    // `color`. `textureTiles` is the repeat count across the plane for an image
    // or the checker; for `'noise'` it is the FEATURE COUNT, since that texture
    // is drawn once at the size of the whole plane and never repeats.
    texture: '',
    textureTiles: 8,
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    const meshName = attrs.meshName || 'ground'
    this.mesh = BABYLON.MeshBuilder.CreateGround(
      meshName,
      {
        width: attrs.size || attrs.width,
        height: attrs.size || attrs.height,
      },
      scene
    )
    const material = new BABYLON.StandardMaterial(meshName + '-mat', scene)
    material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color)
    if (attrs.texture) {
      const tiles = Math.max(1, attrs.textureTiles)
      const noise = attrs.texture === 'noise'
      const tex = noise
        ? makeNoiseTexture(meshName + '-tex', scene, attrs.color, tiles)
        : attrs.texture === 'checker'
        ? makeCheckerTexture(meshName + '-tex', scene, attrs.color)
        : new BABYLON.Texture(attrs.texture, scene)
      // The noise texture already spans the plane — repeating it would put back
      // exactly the period it exists to avoid.
      tex.uScale = noise ? 1 : tiles
      tex.vScale = noise ? 1 : tiles
      material.diffuseTexture = tex
      material.diffuseColor = BABYLON.Color3.White()
      material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    }
    this.mesh.material = material
    // Opt into collisions so character controllers (biped/car) can stand on it —
    // their grounding probe and moveWithCollisions only see `checkCollisions` meshes.
    this.mesh.checkCollisions = true
    owner.register({ meshes: [this.mesh] })
  }
}

export const b3dGround = B3dGround.elementCreator()
