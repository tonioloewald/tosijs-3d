import * as BABYLON from '@babylonjs/core'
import { AbstractMesh } from './b3d-utils.js'
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
    // Optional surface texture on the (shadow-receiving) StandardMaterial:
    // an image URL, or the built-in procedural value `'checker'`. Empty = flat
    // `color`. `textureTiles` sets the repeat count across the plane.
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
      const tex =
        attrs.texture === 'checker'
          ? makeCheckerTexture(meshName + '-tex', scene, attrs.color)
          : new BABYLON.Texture(attrs.texture, scene)
      tex.uScale = tiles
      tex.vScale = tiles
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
