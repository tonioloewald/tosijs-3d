/*
A material's swatch, rendered: one small picture of a recipe on a sphere in
a fixed studio, cached by the recipe, so a picker shows what a material LOOKS
like rather than its base colour.

One hidden engine renders every preview on the page, made the first time one
is asked for (one more WebGL context, once). Renders are queued and drawn one
at a time; a recipe already drawn costs nothing, so a panel full of fabrics
in a headset renders each once.
*/

import * as BABYLON from '@babylonjs/core'
import { applyMaterial } from './material-apply.js'
import { clothShading } from './cloth-shading.js'
import { studioEnvironment } from './environment.js'
import { canonicalMaterial, type MaterialRecipe } from './material-recipe.js'

const SIZE = 128

interface Stage {
  engine: BABYLON.Engine
  scene: BABYLON.Scene
  canvas: HTMLCanvasElement
  pbr: BABYLON.PBRMaterial
  cloth: BABYLON.PBRMaterial
  ball: BABYLON.Mesh
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
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0)
  studioEnvironment(scene, { intensity: 0.9 })
  const camera = new BABYLON.ArcRotateCamera(
    'preview',
    -Math.PI / 2 - 0.5,
    1.15,
    3.1,
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
  const ball = BABYLON.MeshBuilder.CreateSphere(
    'ball',
    { diameter: 1.6, segments: 48 },
    scene
  )
  const pbr = new BABYLON.PBRMaterial('preview-pbr', scene)
  const cloth = new BABYLON.PBRMaterial('preview-cloth', scene)
  return { engine, scene, canvas, pbr, cloth, ball }
}

async function draw(recipe: MaterialRecipe): Promise<string | null> {
  stage ??= makeStage()
  if (stage == null) return null
  const { scene, canvas, ball } = stage
  if (recipe.type === 'pbr') {
    applyMaterial(stage.pbr, recipe)
    ball.material = stage.pbr
  } else if (recipe.type === 'cloth') {
    // A fresh look each time: the shading keeps what a recipe leaves out.
    stage.cloth.roughness = 0.85
    stage.cloth.metallic = 0
    stage.cloth.sheen.isEnabled = false
    clothShading(stage.cloth).set({ recipe })
    ball.material = stage.cloth
  } else return null
  await scene.whenReadyAsync()
  scene.render()
  return canvas.toDataURL('image/png')
}

/**
 * A picture of the recipe, as a data URL, or `null` where none can be drawn
 * (no WebGL, or a type with no preview). Cached by the canonical recipe.
 */
export function materialPreview(recipe: MaterialRecipe): Promise<string | null> {
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
