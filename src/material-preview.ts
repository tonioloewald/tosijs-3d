/*
A material's swatch, rendered: one small picture of a recipe on a cube seen
from above a corner (three faces: flat areas show a texture, edges catch the
light), on grey, in a fixed studio, cached by the recipe, so a picker shows
what a material LOOKS like rather than its base colour. Grey, not black, so a
dark material reads against it.

One hidden engine renders every preview on the page, made the first time one
is asked for (one more WebGL context, once). Renders are queued and drawn one
at a time; a recipe already drawn costs nothing, so a panel full of fabrics
in a headset renders each once.
*/

import * as BABYLON from '@babylonjs/core'
import { applyMaterial } from './material-apply.js'
import { clothShading, type ClothShading } from './cloth-shading.js'
import { studioEnvironment } from './environment.js'
import { canonicalMaterial, type MaterialRecipe } from './material-recipe.js'

const SIZE = 128

interface Stage {
  engine: BABYLON.Engine
  scene: BABYLON.Scene
  canvas: HTMLCanvasElement
  pbr: BABYLON.PBRMaterial
  cloth: BABYLON.PBRMaterial
  /**
   * The cloth material's shading, made ONCE: a new one per preview took the
   * last preview's picture for the garment's own texture.
   */
  clothLook: ClothShading | null
  /** What the material goes on. */
  shapes: BABYLON.AbstractMesh[]
}

let stage: Stage | null = null
const cache = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()

function makeStage(): Stage | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  let engine: BABYLON.Engine
  try {
    engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      alpha: true,
    })
  } catch {
    return null
  }
  const scene = new BABYLON.Scene(engine)
  // Grey behind it, so dark and black materials read.
  scene.clearColor = new BABYLON.Color4(0.42, 0.42, 0.44, 1)
  studioEnvironment(scene, { intensity: 0.9 })
  // Above a corner: the top and two sides, each lit differently.
  const camera = new BABYLON.ArcRotateCamera(
    'preview',
    -Math.PI / 4,
    0.95,
    3.4,
    BABYLON.Vector3.Zero(),
    scene
  )
  camera.fov = 0.6
  const key = new BABYLON.DirectionalLight(
    'key',
    new BABYLON.Vector3(-0.6, -0.8, 0.5),
    scene
  )
  key.intensity = 2.2
  // Each face carries the whole texture (a box's own UVs).
  const cube = BABYLON.MeshBuilder.CreateBox('cube', { size: 1.25 }, scene)
  const pbr = new BABYLON.PBRMaterial('preview-pbr', scene)
  const cloth = new BABYLON.PBRMaterial('preview-cloth', scene)
  return { engine, scene, canvas, pbr, cloth, clothLook: null, shapes: [cube] }
}

async function draw(recipe: MaterialRecipe): Promise<string | null> {
  stage ??= makeStage()
  if (stage == null) return null
  const { scene, canvas } = stage
  const wear = (m: BABYLON.Material) => {
    for (const shape of stage!.shapes) shape.material = m
  }
  if (recipe.type === 'pbr') {
    applyMaterial(stage.pbr, recipe)
    wear(stage.pbr)
  } else if (recipe.type === 'cloth') {
    // A fresh look each time: the shading keeps what a recipe leaves out.
    stage.cloth.roughness = 0.85
    stage.cloth.metallic = 0
    stage.cloth.sheen.isEnabled = false
    stage.clothLook ??= clothShading(stage.cloth)
    stage.clothLook.set({ recipe })
    wear(stage.cloth)
  } else return null
  await scene.whenReadyAsync()
  scene.render()
  return canvas.toDataURL('image/png')
}

/**
 * A picture of the recipe, as a data URL, or `null` where none can be drawn
 * (no WebGL, or a type with no preview). Cached by the canonical recipe.
 */
export function materialPreview(
  recipe: MaterialRecipe
): Promise<string | null> {
  const key = JSON.stringify(canonicalMaterial(recipe))
  let p = cache.get(key)
  if (p == null) {
    const r = canonicalMaterial(recipe)
    p = queue.then(() => draw(r)).catch(() => null)
    queue = p
    cache.set(key, p)
    // Oldest out first: a long edit session should not hold every step.
    if (cache.size > 300) cache.delete(cache.keys().next().value!)
  }
  return p
}
